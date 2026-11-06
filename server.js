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
function createBot(){let p=spawn(),id='bot-'+(++nextId);return {id,bot:true,name:botNames[nextId%botNames.length],x:p.x,y:p.y,vx:rand(-80,80),vy:rand(-80,80),angle:rand(-3,3),hue:hues[nextId%hues.length],level:1,score:Math.round(rand(0,1100)),energy:100,boosting:false,invuln:2,thought:0,target:0,targetId:null,roamUntil:0,engageUntil:0,avoidUntil:0,respawn:0,alive:true}}
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
  p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.angle=Number(m.angle);p.level=level;p.score=clamp(Number(m.score),0,10000000);p.energy=clamp(Number(m.energy),0,100);p.boosting=!!m.boosting;p.last=Date.now();
 }
}
function collide(a,b){if(a.invuln>0||b.invuln>0||!a.alive||!b.alive)return;
 const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>37)return;
 const ax=a.x+Math.cos(a.angle)*22,ay=a.y+Math.sin(a.angle)*22;
 const bx=b.x+Math.cos(b.angle)*22,by=b.y+Math.sin(b.angle)*22;
 const at=Math.hypot(ax-b.x,ay-b.y)<19,bt=Math.hypot(bx-a.x,by-a.y)<19;
 if(!at&&!bt)return;
 let winner,loser;
 if(at&&bt){let va=Math.hypot(a.vx,a.vy),vb=Math.hypot(b.vx,b.vy);if(Math.abs(va-vb)<18)return;winner=va>vb?a:b;loser=winner===a?b:a}
 else {winner=at?a:b;loser=at?b:a}
 loser.invuln=5;loser.alive=false;
 if(loser.bot){loser.respawn=serverTime+2;broadcast({type:'bot-down',victim:loser.id,x:loser.x,y:loser.y,level:loser.level,hue:loser.hue,killer:winner.id});}
 else {const c=[...peers].find(c=>c.id===loser.id);if(c){send(c,{type:'defeat',victim:loser.id,killer:winner.id});depart(c)}}
 if(winner.bot){winner.score+=140+22*loser.level;winner.level=Math.min(100,1+Math.floor(winner.score/950));}else {const c=[...peers].find(c=>c.id===winner.id);if(c)send(c,{type:'reward',victim:loser.id,level:loser.level})}
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
function step(dt){serverTime+=dt;
 for(const p of planets){p.x+=p.vx*dt;p.y+=p.vy*dt;for(const axis of ['x','y'])if(Math.abs(p[axis])>WORLD-p.r-150){p[axis]=clamp(p[axis],-WORLD+p.r+150,WORLD-p.r-150);p['v'+axis]*=-1}}
 for(const b of botShips.values()){
  if(!b.alive){if(serverTime>=b.respawn){let x=spawn();b.x=x.x;b.y=x.y;b.invuln=2;b.vx=b.vy=0;b.alive=true}continue}
  b.invuln=Math.max(0,b.invuln-dt);b.thought-=dt;
  if(b.thought<=0){
   // Phases distinctes : patrouille, courte interception, puis désengagement.
   // Cela évite les poursuites circulaires interminables entre deux bots.
   b.thought=rand(.85,1.6);
   const canEngage=serverTime>=b.roamUntil && Math.random()<.48;
   const choices=canEngage?[...botShips.values(),...ships.values()].filter(q=>q!==b&&q.alive&&q.invuln<=0&&Math.hypot(q.x-b.x,q.y-b.y)>185&&Math.hypot(q.x-b.x,q.y-b.y)<1150):[];
   // Ne jamais concentrer automatiquement la totalité des bots sur le joueur.
   const botChoices=choices.filter(q=>q.bot),humanChoices=choices.filter(q=>!q.bot);
   const pool=botChoices.length&&(Math.random()<.78||!humanChoices.length)?botChoices:humanChoices;
   const target=pool.length?pool[Math.floor(Math.random()*pool.length)]:null;
   b.targetId=target?.id||null;
   if(target){b.engageUntil=serverTime+rand(1.5,3);}
   else{
    b.engageUntil=0;
    // Cap libre et durable ; jamais de réorientation autour d'une cible proche.
    b.roamUntil=Math.max(b.roamUntil,serverTime+rand(1.8,4.0));
    b.target=b.angle+rand(-.9,.9);
   }
  }
  const chase=b.targetId&&(botShips.get(b.targetId)||ships.get(b.targetId));
  const dist=chase?.alive?Math.hypot(chase.x-b.x,chase.y-b.y):Infinity;
  // Fin de poursuite dès que la cible est proche / tourne en rond / après quelques secondes.
  if(!chase?.alive||serverTime>b.engageUntil||dist<190||dist>1450){
   if(b.targetId){
    b.targetId=null;b.engageUntil=0;b.roamUntil=serverTime+rand(2.4,4.8);
    b.target=b.angle+rand(-.65,.65);
    b.thought=Math.max(b.thought,1.2);
   }
  }else{
   // Vise le point d'interception en avance sur la trajectoire, pas la queue du vaisseau.
   const lead=clamp(dist/600,.12,.72);
   const aim=Math.atan2(chase.y+chase.vy*lead-b.y,chase.x+chase.vx*lead-b.x);
   const delta=Math.atan2(Math.sin(aim-b.angle),Math.cos(aim-b.angle));
   // Si le cap exige un demi-tour presque complet, la poursuite est abandonnée.
   if(Math.abs(delta)>2.3&&dist<550){b.targetId=null;b.roamUntil=serverTime+3;b.target=b.angle+rand(-.55,.55);}
   else b.target=aim;
  }

  for(const p of planets){let dx=b.x+b.vx*.5-p.x,dy=b.y+b.vy*.5-p.y,d=Math.hypot(dx,dy);if(d<p.r+130){b.target=Math.atan2(dy,dx)+.35;break}}
  const wallDanger=avoidWall(b);
  let diff=Math.atan2(Math.sin(b.target-b.angle),Math.cos(b.target-b.angle)),v=Math.hypot(b.vx,b.vy);
  b.angle+=clamp(diff,-(wallDanger?4.3:2.5)*dt,(wallDanger?4.3:2.5)*dt);b.boosting=!wallDanger&&Math.sin(serverTime*.7+b.hue)>.25;
  b.energy=clamp(b.energy+(b.boosting?-24:14)*dt,0,100);
  let acc=b.boosting&&b.energy>0?520:270;
  b.vx=b.vx*Math.pow(.991,dt*60)+Math.cos(b.angle)*acc*dt;
  b.vy=b.vy*Math.pow(.991,dt*60)+Math.sin(b.angle)*acc*dt;
  v=Math.hypot(b.vx,b.vy);let cap=b.boosting?440:326;
  if(wallDanger){
   cap=Math.min(cap,185);
   // A l'approche des murs, réduire la composante allant vers l'extérieur.
   const safe=WORLD-16-290;
   if(Math.abs(b.x)>safe&&b.vx*Math.sign(b.x)>0)b.vx*=Math.pow(.92,dt*60);
   if(Math.abs(b.y)>safe&&b.vy*Math.sign(b.y)>0)b.vy*=Math.pow(.92,dt*60);
  }
  v=Math.hypot(b.vx,b.vy);if(v>cap){b.vx*=cap/v;b.vy*=cap/v}
  for(const p of planets){let dx=p.x-b.x,dy=p.y-b.y,d=Math.hypot(dx,dy);if(d>p.r&&d<p.r*3.25){let inf=Math.pow(1-(d-p.r)/(p.r*2.25),1.7),s=Math.hypot(b.vx,b.vy);b.vx+=dx/d*335*inf*dt;b.vy+=dy/d*335*inf*dt;let ns=Math.hypot(b.vx,b.vy);if(ns){b.vx*=s/ns;b.vy*=s/ns}}}
  b.x+=b.vx*dt;b.y+=b.vy*dt;
  for(const p of planets){let dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy),lim=p.r+13;if(d<lim){let nx=dx/(d||1),ny=dy/(d||1);b.x=p.x+nx*lim;b.y=p.y+ny*lim;let dot=b.vx*nx+b.vy*ny;if(dot<0){b.vx-=1.7*dot*nx;b.vy-=1.7*dot*ny}b.vx*=.65;b.vy*=.65;}}
  if(Math.abs(b.x)>WORLD-16){b.x=clamp(b.x,-WORLD+16,WORLD-16);b.vx*=-.55}if(Math.abs(b.y)>WORLD-16){b.y=clamp(b.y,-WORLD+16,WORLD-16);b.vy*=-.55}
 }
 for(const p of ships.values())p.invuln=Math.max(0,p.invuln-dt);
 const all=[...ships.values(),...botShips.values()].filter(x=>x.alive);
 for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)collide(all[i],all[j]);
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
