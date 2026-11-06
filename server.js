"use strict";
// MOMENTUM.IO shared arena beta. Node 20+, no production payments.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const PORT=Number(process.env.PORT||3000),ROOT=path.join(__dirname,'public'),WORLD=4200,TAU=Math.PI*2;
const AUTH_URL=String(process.env.SUPABASE_URL||'').replace(/\/$/,''),AUTH_KEY=String(process.env.SUPABASE_ANON_KEY||'');
const AUTH_ENABLED=!!(AUTH_URL&&AUTH_KEY&&/^https:\/\//.test(AUTH_URL));
async function verifyToken(token){
 if(!AUTH_ENABLED||typeof token!=='string'||token.length<20||token.length>6000)return null;
 try{
  const response=await fetch(AUTH_URL+'/auth/v1/user',{headers:{apikey:AUTH_KEY,Authorization:'Bearer '+token},signal:AbortSignal.timeout(7000)});
  if(!response.ok)return null;
  const user=await response.json();return user&&typeof user.id==='string'&&user.id.length<100?user:null;
 }catch{return null}
}

const peers=new Set(),ships=new Map(),botShips=new Map();let nextId=0,serverTime=0;
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function WSframe(obj){const b=Buffer.from(JSON.stringify(obj));let h;if(b.length<126)h=Buffer.from([129,b.length]);else if(b.length<65536)h=Buffer.from([129,126,b.length>>8,b.length&255]);else{h=Buffer.alloc(10);h[0]=129;h[1]=127;h.writeBigUInt64BE(BigInt(b.length),2)}return Buffer.concat([h,b])}
function send(c,obj){try{if(!c.socket.destroyed)c.socket.write(WSframe(obj))}catch{}}
function broadcast(obj){const buf=WSframe(obj);for(const c of peers)try{if(c.joined&&!c.socket.destroyed)c.socket.write(buf)}catch{}}
function safeName(s){return String(s||'PILOTE').replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,16)||'PILOTE'}
const hues=[15,25,48,115,165,195,215,245,275,300,325,350];
const botNames=['Vortex','Nitro','Pulse','Arc','Glitch','Rift','Nova','Kite','Turbo','Bolt','Zephyr','Flash','Ion','Comet','Flux','Aero','Jinx','Vector','Rush','Ghost','Hyper','Quark','Zoom'];
const planets=[];
for(const [type,count] of [['large',2],['medium',5],['small',9]])for(let k=0;k<count;k++){
 let r=type==='large'?rand(320,440):type==='medium'?rand(144,192):rand(78,105);
 for(let i=0;i<650;i++){let x=rand(-WORLD+r+150,WORLD-r-150),y=rand(-WORLD+r+150,WORLD-r-150);
  if(Math.hypot(x,y)<Math.max(560,r+280))continue;
  if(planets.some(p=>Math.hypot(x-p.x,y-p.y)<p.r+r+Math.max(235,(p.r+r)*.72)))continue;
  let a=rand(0,TAU),v=rand(1.7,5.8);planets.push({x,y,r,size:type,vx:Math.cos(a)*v,vy:Math.sin(a)*v,phase:rand(0,TAU),hue:type==='large'?36:type==='medium'?278:208});break;
 }
}
function emptyAt(x,y,extra=40){return !planets.some(p=>Math.hypot(p.x-x,p.y-y)<p.r+extra)}
function spawn(){for(let i=0;i<100;i++){let x=rand(-3500,3500),y=rand(-3500,3500);if(emptyAt(x,y,220)&&[...ships.values(),...botShips.values()].every(s=>Math.hypot(s.x-x,s.y-y)>160))return {x,y}}return {x:0,y:0}}
function createBot(){
 const p=spawn(),id='bot-'+(++nextId);
 // Des comportements persistants : certains attaquent, d'autres explorent,
 // d'autres saisissent les occasions ou se replient si l'angle est mauvais.
 const role=Math.random();
 const style=role<.30?'hunter':role<.58?'balanced':role<.80?'scavenger':'cautious';
 const aggression={hunter:.88,balanced:.60,scavenger:.43,cautious:.30}[style];
 const skill=rand(.52,1),courage=rand(.33,.95);
 const angle=rand(-Math.PI,Math.PI);
 return {id,bot:true,name:botNames[nextId%botNames.length],x:p.x,y:p.y,
  vx:Math.cos(angle)*rand(85,185),vy:Math.sin(angle)*rand(85,185),angle,
  hue:hues[nextId%hues.length],level:1,score:Math.round(rand(0,1100)),energy:100,
  boosting:false,invuln:2,thought:0,target:angle,targetId:null,
  style,aggression,skill,courage,mode:'cruise',modeUntil:0,aimX:p.x+500*Math.cos(angle),aimY:p.y+500*Math.sin(angle),
  passes:0,failedApproaches:0,lastDistance:Infinity,stuckFor:0,prevX:p.x,prevY:p.y,
  engageUntil:0,roamUntil:0,avoidUntil:0,respawn:0,alive:true};
}
function fillSlots(){const want=Math.max(0,20-ships.size);while(botShips.size>want)botShips.delete(botShips.keys().next().value);while(botShips.size<want){const b=createBot();botShips.set(b.id,b)}}
function pack(p){return {id:p.id,bot:!!p.bot,name:p.name,x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10,vx:Math.round(p.vx),vy:Math.round(p.vy),angle:p.angle,hue:p.hue,level:p.level,score:p.score,energy:p.energy,boosting:p.boosting,invuln:p.invuln}}
function depart(c){if(!c.joined)return;c.joined=false;ships.delete(c.id);fillSlots()}
async function receive(c,m){if(!m||typeof m!=='object')return;
 if(m.type==='leave'){depart(c);return}
 if(m.type==='join'){
  if(c.authPending)return;
  c.authPending=true;
  const user=await verifyToken(m.accessToken);
  c.authPending=false;
  if(!user){send(c,{type:'error',message:'Connexion requise : reconnecte-toi depuis Profil.'});return}
  if(c.joined){depart(c)}
  if(ships.size>=20){send(c,{type:'error',message:'Arène pleine (20/20)'});return}
  // One active connection per authenticated user (prevents duplicate simultaneous slots).
  for(const other of peers)if(other!==c&&other.joined&&other.userId===user.id){depart(other);send(other,{type:'error',message:'Compte connecté sur un autre appareil'});}
  c.userId=user.id;
  const pos=spawn();c.joined=true;c.id=c.id||'p-'+(++nextId);
  const p={id:c.id,bot:false,name:safeName(m.name),x:pos.x,y:pos.y,vx:0,vy:0,angle:0,hue:180,level:1,score:0,energy:100,boosting:false,invuln:3,last:Date.now(),alive:true};
  ships.set(c.id,p);fillSlots();send(c,{type:'joined',id:c.id,room:'ARÈNE PRINCIPALE',spawn:pos,planets});return;
 }
 if(!c.joined)return;
 if(m.type==='local-death'){depart(c);return}
 if(m.type==='pilot'){
  const p=ships.get(c.id);if(!p)return;
  const nums=['x','y','vx','vy','angle','level','score','energy'];if(!nums.every(k=>Number.isFinite(Number(m[k]))))return;
  let x=clamp(Number(m.x),-WORLD,WORLD),y=clamp(Number(m.y),-WORLD,WORLD),vx=Number(m.vx),vy=Number(m.vy);
  const speed=Math.hypot(vx,vy),level=clamp(Math.floor(Number(m.level)),1,5000);
  const top=(310+Math.min(220,((Math.min(20,level)-1)*17)+(level>20?62*(1-Math.exp(-(level-20)/20)):0)))*1.44*1.25;
  if(speed>top*1.25){vx=vx/speed*top;vy=vy/speed*top}
  const age=Math.max(.015,Math.min(.25,(Date.now()-p.last)/1000));
  // Basic plausibility check; not a substitute for true authoritative physics.
  if(Math.hypot(x-p.x,y-p.y)>Math.max(140,top*age*3.3)&&Date.now()-p.last<1200)return;
  p.prevX=p.x;p.prevY=p.y;p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.angle=Number(m.angle);p.level=level;p.score=clamp(Number(m.score),0,10000000);p.energy=clamp(Number(m.energy),0,100);p.boosting=!!m.boosting;p.last=Date.now();
 }
}
// Géométrie du vaisseau identique au tracé canvas du client (pointe à +22).
const HULL_LOCAL=[[22,0],[-12,-13],[-6,0],[-12,13]];
function hullAt(e,x,y){const c=Math.cos(e.angle),s=Math.sin(e.angle);return HULL_LOCAL.map(([hx,hy])=>({x:x+hx*c-hy*s,y:y+hx*s+hy*c}))}
function pointSegDist2(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy;const t=d?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/d,0,1):0;return (p.x-a.x-t*dx)**2+(p.y-a.y-t*dy)**2}
// Le polygone est concave (entailles latérales), donc utiliser un rayon au lieu
// du test de demi-plans convexes.
function insideShip(p,h){let inside=false;for(let i=0,j=h.length-1;i<h.length;j=i++){
 const a=h[i],b=h[j];if(pointSegDist2(p,a,b)<1e-6)return true;
 if((a.y>p.y)!=(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }return inside}
function segmentsIntersect(a,b,c,d){
 const abx=b.x-a.x,aby=b.y-a.y,cdx=d.x-c.x,cdy=d.y-c.y,den=abx*cdy-aby*cdx;
 if(Math.abs(den)<1e-8)return pointSegDist2(a,c,d)<1e-6||pointSegDist2(b,c,d)<1e-6||pointSegDist2(c,a,b)<1e-6||pointSegDist2(d,a,b)<1e-6;
 const rx=c.x-a.x,ry=c.y-a.y,t=(rx*cdy-ry*cdx)/den,u=(rx*aby-ry*abx)/den;
 return t>=0&&t<=1&&u>=0&&u<=1;
}
function hullTouch(a,b){if(a.some(p=>insideShip(p,b))||b.some(p=>insideShip(p,a)))return true;
 for(let i=0;i<4;i++)for(let j=0;j<4;j++)if(segmentsIntersect(a[i],a[(i+1)%4],b[j],b[(j+1)%4]))return true;return false}
function tipTouches(tip,other){if(insideShip(tip,other))return true;for(let i=0;i<4;i++)if(pointSegDist2(tip,other[i],other[(i+1)%4])<=9*9)return true;return false}
function collide(a,b){
 if(a.invuln>0||b.invuln>0||!a.alive||!b.alive)return;
 const ax0=Number.isFinite(a.prevX)?a.prevX:a.x,ay0=Number.isFinite(a.prevY)?a.prevY:a.y;
 const bx0=Number.isFinite(b.prevX)?b.prevX:b.x,by0=Number.isFinite(b.prevY)?b.prevY:b.y;
 const adx=a.x-ax0,ady=a.y-ay0,bdx=b.x-bx0,bdy=b.y-by0;
 const rx=ax0-bx0,ry=ay0-by0,dx=adx-bdx,dy=ady-bdy;
 const denom=dx*dx+dy*dy,tNear=denom?clamp(-(rx*dx+ry*dy)/denom,0,1):1;
 // Rayon de préfiltrage englobant toutes les pointes, quelle que soit l'orientation.
 if(Math.hypot(rx+dx*tNear,ry+dy*tNear)>64)return;
 // Échantillonnage adaptatif: le déplacement d'une image ne doit pas sauter un vaisseau.
 const travel=Math.hypot(dx,dy),steps=Math.min(64,Math.max(3,Math.ceil(travel/6)));
 let hit=null;
 const candidates=[];for(let i=0;i<=steps;i++)candidates.push(i/steps);
 candidates.push(tNear);candidates.sort((x,y)=>x-y);
 for(const t of candidates){
  const hxA=hullAt(a,ax0+adx*t,ay0+ady*t),hxB=hullAt(b,bx0+bdx*t,by0+bdy*t);
  const aTip=tipTouches(hxA[0],hxB),bTip=tipTouches(hxB[0],hxA);
  if(!aTip&&!bTip&&!hullTouch(hxA,hxB))continue;
  // Conserver le premier contact, pour ne pas perdre une attaque par derrière
  // lorsqu'une pénétration plus profonde change la classification de l'impact.
  hit={aTip,bTip,x:(hxA[0].x+hxB[0].x)/2,y:(hxA[0].y+hxB[0].y)/2};break;
 }
 if(!hit)return;
 let winner=null,loser=null;
 if(hit.aTip&&hit.bTip){
  const va=Math.hypot(a.vx,a.vy),vb=Math.hypot(b.vx,b.vy);
  if(Math.abs(va-vb)>Math.max(18,Math.min(va,vb)*.045)){winner=va>vb?a:b;loser=winner===a?b:a}
 }else if(hit.aTip){winner=a;loser=b}
 else if(hit.bTip){winner=b;loser=a}
 if(!loser){
  // Flanc/flanc ou pointes de vitesse presque égale : vrai contact = rebond.
  const nx=(b.x-a.x)/(Math.hypot(b.x-a.x,b.y-a.y)||1),ny=(b.y-a.y)/(Math.hypot(b.x-a.x,b.y-a.y)||1);
  const rvx=b.vx-a.vx,rvy=b.vy-a.vy,closing=rvx*nx+rvy*ny;
  if(closing<0){a.vx+=nx*closing*.3;a.vy+=ny*closing*.3;b.vx-=nx*closing*.3;b.vy-=ny*closing*.3}
  a.x-=nx*5;a.y-=ny*5;b.x+=nx*5;b.y+=ny*5;
  return;
 }
 loser.invuln=5;loser.alive=false;
 if(loser.bot){loser.respawn=serverTime+2;broadcast({type:'bot-down',victim:loser.id,x:loser.x,y:loser.y,level:loser.level,hue:loser.hue,killer:winner.id});}
 else{const c=[...peers].find(c=>c.id===loser.id);if(c){send(c,{type:'defeat',victim:loser.id,killer:winner.id});depart(c)}}
 if(winner.bot){winner.score+=140+22*loser.level;winner.level=Math.min(100,1+Math.floor(winner.score/950));}
 else {const c=[...peers].find(c=>c.id===winner.id);if(c)send(c,{type:'reward',victim:loser.id,level:loser.level})}
}
// Les bots anticipent les murs suivant leur vitesse (pas de modification des joueurs).
function avoidWall(b){
 const speed=Math.hypot(b.vx,b.vy),edge=WORLD-16;
 const ahead=Math.max(1.25,Math.min(2.5,speed/220));
 const margin=Math.max(450,Math.min(1250,speed*2.2+210));
 const px=b.x+b.vx*ahead,py=b.y+b.vy*ahead;
 const dangerX=Math.abs(px)>edge-margin||Math.abs(b.x)>edge-margin;
 const dangerY=Math.abs(py)>edge-margin||Math.abs(b.y)>edge-margin;
 if(!dangerX&&!dangerY)return false;
 // Vise le centre, puis ajuste la trajectoire latéralement pour ne pas vibrer sur le mur.
 const toX=-b.x,toY=-b.y;
 let heading=Math.atan2(toY,toX);
 const futureX=b.x+Math.cos(heading)*300,futureY=b.y+Math.sin(heading)*300;
 for(const p of planets){if(Math.hypot(futureX-p.x,futureY-p.y)<p.r+85){heading+=.55;break}}
 b.target=heading;
 return true;
}
function chooseBotMode(b){
 const speed=Math.hypot(b.vx,b.vy);
 // Détermination d'une intention persistante, plutôt que de changer de cible
 // à chaque image. Les cibles sont choisies selon leur proximité et leur cap.
 const nearby=[...botShips.values(),...ships.values()].filter(q=>q!==b&&q.alive&&q.invuln<=0)
  .map(q=>({q,dist:Math.hypot(q.x-b.x,q.y-b.y)})).filter(e=>e.dist>95&&e.dist<1500);
 let choice=null,best=-Infinity;
 for(const {q,dist} of nearby){
  const facing=Math.cos(Math.atan2(q.y-b.y,q.x-b.x)-b.angle);
  const themFacing=Math.cos(Math.atan2(b.y-q.y,b.x-q.x)-q.angle);
  const score=2*(1-dist/1500)+facing*.65+Math.random()*.75+(q.bot?.24:-.05)
   +((b.style==='hunter')?.35:0)-(themFacing>.7&&b.style==='cautious'?.5:0);
  if(score>best){best=score;choice=q}
 }
 const probability=b.aggression*(b.mode==='hunt'?.93:1);
 if(choice&&Math.random()<probability){
  b.mode='hunt';b.targetId=choice.id;
  b.modeUntil=serverTime+rand(3.6,7.2)*(b.style==='hunter'?1.35:1);
  b.passes=0;b.failedApproaches=0;b.lastDistance=Infinity;
 }else{
  b.mode=Math.random()<(b.style==='scavenger'?.55:.27)?'forage':'cruise';
  b.targetId=null;b.modeUntil=serverTime+rand(2.5,5.5);
  const angle=b.angle+rand(-.75,.75);
  b.aimX=clamp(b.x+Math.cos(angle)*rand(650,1450),-WORLD+500,WORLD-500);
  b.aimY=clamp(b.y+Math.sin(angle)*rand(650,1450),-WORLD+500,WORLD-500);
 }
}
function step(dt){serverTime+=dt;
 for(const p of planets){p.x+=p.vx*dt;p.y+=p.vy*dt;for(const axis of ['x','y'])if(Math.abs(p[axis])>WORLD-p.r-150){p[axis]=clamp(p[axis],-WORLD+p.r+150,WORLD-p.r-150);p['v'+axis]*=-1}}
 for(const b of botShips.values()){
  if(!b.alive){if(serverTime>=b.respawn){const pos=spawn();b.x=pos.x;b.y=pos.y;b.prevX=b.x;b.prevY=b.y;
   b.invuln=2;b.vx=b.vy=0;b.alive=true;b.mode='cruise';b.targetId=null;b.modeUntil=0;b.passes=0;}continue}
  b.prevX=b.x;b.prevY=b.y;b.invuln=Math.max(0,b.invuln-dt);b.thought-=dt;
  let speed=Math.hypot(b.vx,b.vy);
  const prey=b.targetId&&(botShips.get(b.targetId)||ships.get(b.targetId));
  if(b.mode==='hunt'&&(!prey?.alive||serverTime>b.modeUntil)){
   b.targetId=null;b.mode='cruise';b.modeUntil=serverTime+rand(.8,2.2);
  }
  if(serverTime>b.modeUntil)chooseBotMode(b);
  let aim=b.angle;
  if(b.mode==='hunt'&&prey?.alive){
   const dx=prey.x-b.x,dy=prey.y-b.y,dist=Math.hypot(dx,dy);
   // Interception dynamique avec déviation latérale faible et limitée dans le temps.
   const closing=Math.max(140,speed+Math.hypot(prey.vx,prey.vy)*.35);
   const lead=clamp(dist/closing,.10,.72)*b.skill;
   let tx=prey.x+prey.vx*lead,ty=prey.y+prey.vy*lead;
   aim=Math.atan2(ty-b.y,tx-b.x);
   // À très courte distance, ne pas effectuer des tours sur place : continuer
   // la passe d'attaque. Le bot pourra faire UNE nouvelle tentative, puis repartir.
   if(dist<145){
    b.passes++;b.mode='pass';b.modeUntil=serverTime+rand(.45,.9);
    b.targetId=null;b.target=aim;
   }else if(dist>b.lastDistance+55&&b.lastDistance<230){
    b.failedApproaches++;
    if(b.failedApproaches>=2){b.mode='cruise';b.modeUntil=serverTime+rand(1.2,2.7);b.targetId=null;b.target=b.angle+rand(-.4,.4)}
   }
   b.lastDistance=dist;
  }else if(b.mode==='pass'){
   aim=b.target;
   if(serverTime>b.modeUntil){b.mode='cruise';b.modeUntil=serverTime+rand(.7,1.6);b.targetId=null;}
  }else{
   aim=Math.atan2(b.aimY-b.y,b.aimX-b.x);
   if(Math.hypot(b.aimX-b.x,b.aimY-b.y)<150)b.modeUntil=0;
  }
  // Un adversaire qui s'approche pointe en avant peut déclencher une brève
  // esquive, mais ne fait pas fuir tous les bots indéfiniment.
  if(b.mode!=='pass'&&b.style!=='hunter'&&serverTime>b.avoidUntil){
   for(const q of [...ships.values(),...botShips.values()]){
    if(q===b||!q.alive)continue;
    const d=Math.hypot(q.x-b.x,q.y-b.y);
    if(d>215||d<20)continue;
    const towards=Math.cos(q.angle-Math.atan2(b.y-q.y,b.x-q.x));
    if(towards>.83&&Math.hypot(q.vx,q.vy)>speed*.90&&Math.random()<(.014*(1-b.courage))){
     b.mode='evade';b.modeUntil=serverTime+rand(.65,1.25);b.targetId=null;
     b.target=Math.atan2(b.y-q.y,b.x-q.x)+(Math.random()<.5?.6:-.6);b.avoidUntil=serverTime+4;break;
    }
   }
  }
  if(b.mode==='evade')aim=b.target;
  // Les planètes sont évitées sans annuler continuellement l'objectif.
  for(const p of planets){let dx=b.x+b.vx*.65-p.x,dy=b.y+b.vy*.65-p.y,d=Math.hypot(dx,dy);
   if(d<p.r+125){aim=Math.atan2(dy,dx)+.32;break}}
  b.target=aim;
  const wallDanger=avoidWall(b);
  const diff=Math.atan2(Math.sin(b.target-b.angle),Math.cos(b.target-b.angle));
  const turnSpeed=(wallDanger?4.2:(1.9+b.skill*.95));
  b.angle+=clamp(diff,-turnSpeed*dt,turnSpeed*dt);
  // Rythme de boost différent selon le pilote : franches accélérations pour
  // intercepter, respiration en exploration, freinage aux murs.
  const boostIntent=b.mode==='hunt'?(.72+b.aggression*.22):b.mode==='pass'?.70:b.mode==='evade'?.81:b.mode==='forage'?.33:.45;
  b.boosting=!wallDanger&&b.energy>15&&Math.sin(serverTime*(.6+b.skill*.3)+b.hue) > (1-2*boostIntent);
  b.energy=clamp(b.energy+(b.boosting?-24:14)*dt,0,100);
  const acc=b.boosting&&b.energy>0?520:270;
  b.vx=b.vx*Math.pow(.991,dt*60)+Math.cos(b.angle)*acc*dt;
  b.vy=b.vy*Math.pow(.991,dt*60)+Math.sin(b.angle)*acc*dt;
  let cap=b.boosting?440:326;
  if(wallDanger){
   cap=Math.min(cap,185);const safe=WORLD-16-290;
   if(Math.abs(b.x)>safe&&b.vx*Math.sign(b.x)>0)b.vx*=Math.pow(.92,dt*60);
   if(Math.abs(b.y)>safe&&b.vy*Math.sign(b.y)>0)b.vy*=Math.pow(.92,dt*60);
  }
  let v=Math.hypot(b.vx,b.vy);if(v>cap){b.vx*=cap/v;b.vy*=cap/v}
  for(const p of planets){let dx=p.x-b.x,dy=p.y-b.y,d=Math.hypot(dx,dy);
   if(d>p.r&&d<p.r*3.25){let inf=Math.pow(1-(d-p.r)/(p.r*2.25),1.7),s=Math.hypot(b.vx,b.vy);
    b.vx+=dx/d*335*inf*dt;b.vy+=dy/d*335*inf*dt;let ns=Math.hypot(b.vx,b.vy);if(ns){b.vx*=s/ns;b.vy*=s/ns}}}
  b.x+=b.vx*dt;b.y+=b.vy*dt;
  for(const p of planets){let dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy),lim=p.r+13;if(d<lim){let nx=dx/(d||1),ny=dy/(d||1);b.x=p.x+nx*lim;b.y=p.y+ny*lim;
   let dot=b.vx*nx+b.vy*ny;if(dot<0){b.vx-=1.7*dot*nx;b.vy-=1.7*dot*ny}b.vx*=.65;b.vy*=.65;}}
  if(Math.abs(b.x)>WORLD-16){b.x=clamp(b.x,-WORLD+16,WORLD-16);b.vx*=-.55}
  if(Math.abs(b.y)>WORLD-16){b.y=clamp(b.y,-WORLD+16,WORLD-16);b.vy*=-.55}
 }
 for(const p of ships.values())p.invuln=Math.max(0,p.invuln-dt);
 const all=[...ships.values(),...botShips.values()].filter(x=>x.alive);
 for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)collide(all[i],all[j]);
 // Une trajectoire reçue du client ne doit pas être retestée aux ticks suivants.
 for(const p of ships.values()){p.prevX=p.x;p.prevY=p.y}
}
const app=http.createServer((req,res)=>{
 let url;try{url=new URL(req.url,'http://localhost')}catch{res.writeHead(400).end();return}
 if(url.pathname==='/auth-config'){
  res.writeHead(200,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
  res.end(JSON.stringify({enabled:AUTH_ENABLED,url:AUTH_ENABLED?AUTH_URL:'',anonKey:AUTH_ENABLED?AUTH_KEY:''}));return;
 }
 if(url.pathname==='/healthz'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({ok:true,humans:ships.size,bots:botShips.size,capacity:20,mode:'beta-multiplayer'}));return}
 const urlPath=url.pathname==='/'?'/index.html':url.pathname;
 let full=path.resolve(ROOT,'.'+decodeURIComponent(urlPath));if(!full.startsWith(ROOT+path.sep)){res.writeHead(403).end();return}
 fs.readFile(full,(err,buf)=>{if(err){res.writeHead(404).end('Not found');return}res.writeHead(200,{'Content-Type':full.endsWith('.html')?'text/html; charset=utf-8':'text/plain','Cache-Control':'no-cache'});res.end(buf)})
});
function consume(c,chunk){c.buffer=Buffer.concat([c.buffer,chunk]);while(c.buffer.length>=2){const b=c.buffer,op=b[0]&15,masked=!!(b[1]&128);let len=b[1]&127,off=2;if(len===126){if(b.length<4)return;len=b.readUInt16BE(2);off=4}else if(len===127){if(b.length<10)return;let n=b.readBigUInt64BE(2);if(n>65536n){c.socket.destroy();return}len=Number(n);off=10}if(!masked||len>65536){c.socket.destroy();return}if(b.length<off+4+len)return;const key=b.subarray(off,off+4),msg=Buffer.from(b.subarray(off+4,off+4+len));for(let i=0;i<msg.length;i++)msg[i]^=key[i%4];c.buffer=b.subarray(off+4+len);if(op===8){c.socket.end();return}if(op===9){c.socket.write(Buffer.from([0x8a,0]));continue}if(op===1){try{receive(c,JSON.parse(msg.toString('utf8')))}catch{}}}}
app.on('upgrade',(req,socket)=>{if(req.url!=='/live'||req.headers.upgrade?.toLowerCase()!=='websocket'||!req.headers['sec-websocket-key']){socket.destroy();return}
 const origin=req.headers.origin;
 if(origin){try{const originHost=new URL(origin).host;if(originHost!==req.headers.host){socket.destroy();return}}catch{socket.destroy();return}}
 const accept=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
 const c={socket,buffer:Buffer.alloc(0),joined:false,id:null,userId:null,authPending:false};peers.add(c);socket.on('data',b=>consume(c,b));socket.on('error',()=>{});socket.on('close',()=>{depart(c);peers.delete(c)});
});
fillSlots();let prev=Date.now(),broadcastElapsed=0;setInterval(()=>{let now=Date.now(),dt=clamp((now-prev)/1000,0,.07);prev=now;step(dt);broadcastElapsed+=dt;if(broadcastElapsed>.08){broadcastElapsed=0;broadcast({type:'state',humans:ships.size,bots:botShips.size,ships:[...ships.values(),...botShips.values()].filter(x=>x.alive).map(pack),planets})}},1000/30);
app.listen(PORT,'0.0.0.0',()=>console.log('MOMENTUM.IO beta shared arena listening on '+PORT));
