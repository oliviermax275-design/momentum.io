"use strict";
// MOMENTUM.IO shared arena beta. Node 20+, no production payments.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const PORT=Number(process.env.PORT||3000),ROOT=path.join(__dirname,'public'),WORLD=4200,TAU=Math.PI*2;
const AUTH_URL=String(process.env.SUPABASE_URL||'').replace(/\/$/,''),AUTH_KEY=String(process.env.SUPABASE_ANON_KEY||'');
const AUTH_ENABLED=!!(AUTH_URL&&AUTH_KEY&&/^https:\/\//.test(AUTH_URL));
// Admin identity is established from the Supabase user endpoint, NEVER from client messages.
// Owner address is stored as a digest to avoid printing the mailbox in a public repository.
const ADMIN_EMAIL_DIGEST='51e2d6b35035181d80d239abc9344470e61dc4d2ca47a73b7652c5dca829da4f';
function isAdminUser(user){
 if(!user||typeof user.email!=='string')return false;
 const digest=crypto.createHash('sha256').update(user.email.trim().toLowerCase()).digest('hex');
 if(digest!==ADMIN_EMAIL_DIGEST)return false;
 const providers=Array.isArray(user.app_metadata?.providers)?user.app_metadata.providers:[];
 const linked=Array.isArray(user.identities)?user.identities:[];
 return user.app_metadata?.provider==='google'||providers.includes('google')||linked.some(id=>id.provider==='google');
}

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
function broadcast(obj){const buf=WSframe(obj);for(const c of peers)try{if(c.joined&&!c.socket.destroyed&&c.socket.writableLength<256000)c.socket.write(buf)}catch{}}
function safeName(s){return String(s||'PILOT').replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,16)||'PILOTE'}
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
 const p=spawn(),id='bot-'+(++nextId),angle=rand(-Math.PI,Math.PI);
 const skill=rand(.62,.94),aggression=rand(.41,.84);
 return {id,bot:true,name:botNames[nextId%botNames.length],x:p.x,y:p.y,
  vx:Math.cos(angle)*rand(140,230),vy:Math.sin(angle)*rand(140,230),angle,
  hue:hues[nextId%hues.length],level:1,score:Math.round(rand(0,1100)),energy:100,
  boosting:false,invuln:2,thought:0,target:angle,targetId:null,
  aggression,skill,personality:rand(0,1),sway:rand(-.5,.5),space:rand(80,190),mode:'cruise',modeUntil:0,aimX:p.x+600*Math.cos(angle),aimY:p.y+600*Math.sin(angle),
  boostUntil:0,boostDecisionAt:0,prevX:p.x,prevY:p.y,prevAngle:angle,respawn:0,alive:true,history:[]};
}
function fillSlots(){const want=Math.max(0,20-ships.size);while(botShips.size>want)botShips.delete(botShips.keys().next().value);while(botShips.size<want){const b=createBot();botShips.set(b.id,b)}}
function pack(p){return {id:p.id,bot:!!p.bot,name:p.name,x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10,vx:Math.round(p.vx),vy:Math.round(p.vy),angle:p.angle,hue:p.hue,level:p.level,score:p.score,energy:p.energy,boosting:p.boosting,invuln:p.invuln}}
function depart(c){if(!c.joined)return;c.joined=false;c.isAdmin=false;c.adminSpeed=1;ships.delete(c.id);fillSlots()}
async function receive(c,m){if(!m||typeof m!=='object')return;
 if(m.type==='leave'){depart(c);return}
 if(m.type==='join'){
  if(c.authPending)return;
  c.authPending=true;
  const user=await verifyToken(m.accessToken);
  c.authPending=false;
  if(!user){send(c,{type:'error',message:'Please sign in again from Profile.'});return}
  if(c.joined){depart(c)}
  if(ships.size>=20){send(c,{type:'error',message:'Arena full (20/20)'});return}
  // One active connection per authenticated user (prevents duplicate simultaneous slots).
  for(const other of peers)if(other!==c&&other.joined&&other.userId===user.id){depart(other);send(other,{type:'error',message:'Account signed in on another device'});}
  c.userId=user.id;c.isAdmin=isAdminUser(user);c.adminSpeed=1;
  const pos=spawn();c.joined=true;c.id=c.id||'p-'+(++nextId);
  const p={id:c.id,bot:false,name:safeName(m.name),prevX:pos.x,prevY:pos.y,prevAngle:0,x:pos.x,y:pos.y,vx:0,vy:0,angle:0,hue:180,level:1,score:0,energy:100,boosting:false,invuln:3,last:Date.now(),alive:true,history:[]};
  ships.set(c.id,p);fillSlots();send(c,{type:'joined',id:c.id,room:'MAIN ARENA',spawn:pos,planets,isAdmin:c.isAdmin});return;
 }
 if(!c.joined)return;
 if(m.type==='admin'){
  // Commands are rejected unless this socket was authenticated as the approved Google account.
  if(!c.isAdmin){send(c,{type:'admin-denied',message:'Admin access denied.'});return}
  const p=ships.get(c.id);if(!p||!p.alive)return;
  const action=String(m.action||'');const value=Number(m.value);
  const result={type:'admin-result',action};
  if(action==='level'){
   if(!Number.isInteger(value)||value<1||value>500)return;
   p.level=value;result.level=value;
  }else if(action==='add-level'){
   p.level=Math.min(500,p.level+1);result.level=p.level;
  }else if(action==='speed'){
   if(![1,3,10].includes(value))return;
   c.adminSpeed=value;result.speed=value;
  }else if(action==='combo'){
   if(![2,5,10].includes(value))return;
   result.combo=value;
  }else if(action==='shield'){
   p.invuln=Math.max(p.invuln,60);result.shield=60;
  }else if(action==='chest'){
   // Client-side test reward only. This is NOT a secure currency transaction.
   result.chest=true;
  }else if(action==='top1'){
   // UI demonstration, no tokens are credited.
   result.top1=true;
  }else if(action==='reset'){
   p.level=1;p.score=0;p.invuln=Math.min(p.invuln,3);c.adminSpeed=1;
   Object.assign(result,{level:1,speed:1,reset:true});
  }else return;
  send(c,result);return;
 }

 if(m.type==='ping'){
  if(Number.isFinite(Number(m.t)))send(c,{type:'pong',t:Number(m.t)});
  return;
 }
 if(m.type==='contact'){
  const me=ships.get(c.id),other=botShips.get(String(m.victim||''))||ships.get(String(m.victim||''));
  if(!me||!other||!me.alive||!other.alive||other===me)return;
  const now=Date.now();c.contactCooldown??=new Map();
  if(now-(c.contactCooldown.get(other.id)||0)<100)return;
  c.contactCooldown.set(other.id,now);
  const claimedX=Number(m.x),claimedY=Number(m.y),claimedAngle=Number(m.angle);
  if(![claimedX,claimedY,claimedAngle].every(Number.isFinite))return;
  const age=clamp((now-me.last)/1000,.01,.20);
  const maxDeviation=Math.min(95,34+Math.hypot(me.vx,me.vy)*age*.95);
  if(Math.hypot(claimedX-me.x,claimedY-me.y)>maxDeviation){send(c,{type:'contact-result',victim:other.id,valid:false});return}
  const signedDiff=Math.atan2(Math.sin(claimedAngle-me.angle),Math.cos(claimedAngle-me.angle));
  if(Math.abs(signedDiff)>1.1){send(c,{type:'contact-result',victim:other.id,valid:false});return}
  const proxy={...me,x:claimedX,y:claimedY,angle:claimedAngle,prevX:claimedX,prevY:claimedY,prevAngle:claimedAngle};
  const result=validatedClientContact(proxy,other,now,m);
  send(c,{type:'contact-result',victim:other.id,valid:!!result,aTip:!!result?.aTip,bTip:!!result?.bTip});
  if(result)resolveImpact(me,other,result);
  return;
 }
 if(m.type==='local-death'){depart(c);return}
 if(m.type==='pilot'){
  const p=ships.get(c.id);if(!p)return;
  const nums=['x','y','vx','vy','angle','level','score','energy'];if(!nums.every(k=>Number.isFinite(Number(m[k]))))return;
  let x=clamp(Number(m.x),-WORLD,WORLD),y=clamp(Number(m.y),-WORLD,WORLD),vx=Number(m.vx),vy=Number(m.vy);
  const speed=Math.hypot(vx,vy),level=clamp(Math.floor(Number(m.level)),1,5000);
  const top=(310+Math.min(220,((Math.min(20,level)-1)*17)+(level>20?62*(1-Math.exp(-(level-20)/20)):0)))*1.44*1.25*(c.isAdmin?c.adminSpeed||1:1);
  if(speed>top*1.25){vx=vx/speed*top;vy=vy/speed*top}
  const age=Math.max(.015,Math.min(.25,(Date.now()-p.last)/1000));
  // Basic plausibility check; not a substitute for true authoritative physics.
  if(Math.hypot(x-p.x,y-p.y)>Math.max(140,top*age*3.3)&&Date.now()-p.last<1200)return;
  p.prevX=p.x;p.prevY=p.y;p.prevAngle=p.angle;p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.angle=Number(m.angle);p.level=level;p.score=clamp(Number(m.score),0,10000000);p.energy=clamp(Number(m.energy),0,100);p.boosting=!!m.boosting;p.last=Date.now();recordHistory(p);
 }
}
function hullAt(s,f){
 const x=(Number.isFinite(s.prevX)?s.prevX:s.x)*(1-f)+s.x*f;
 const y=(Number.isFinite(s.prevY)?s.prevY:s.y)*(1-f)+s.y*f;
 const da=Math.atan2(Math.sin(s.angle-(s.prevAngle??s.angle)),Math.cos(s.angle-(s.prevAngle??s.angle)));
 const angle=(s.prevAngle??s.angle)+da*f,c=Math.cos(angle),z=Math.sin(angle);
 return [[22,0],[-12,-13],[-6,0],[-12,13]].map(([u,v])=>({x:x+u*c-v*z,y:y+u*z+v*c}));
}
function hullSegmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
 const t=den?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/den,0,1):0;
 return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
function hullContains(p,h){
 let inside=false;
 for(let i=0,j=h.length-1;i<h.length;j=i++){
  const a=h[j],b=h[i];
  if(hullSegmentDistance(p,a,b)<=1.5)return true;
  if(((a.y>p.y)!==(b.y>p.y))&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return inside;
}
function hullCross(a,b,c,d){
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);
 return (ab1*ab2<0&&cd1*cd2<0)||
  (Math.abs(ab1)<1e-8&&hullSegmentDistance(c,a,b)<1e-6)||
  (Math.abs(ab2)<1e-8&&hullSegmentDistance(d,a,b)<1e-6)||
  (Math.abs(cd1)<1e-8&&hullSegmentDistance(a,c,d)<1e-6)||
  (Math.abs(cd2)<1e-8&&hullSegmentDistance(b,c,d)<1e-6);
}
function hullsOverlap(a,b){
 if(a.some(p=>hullContains(p,b))||b.some(p=>hullContains(p,a)))return true;
 for(let i=0;i<4;i++)for(let j=0;j<4;j++)
  if(hullCross(a[i],a[(i+1)%4],b[j],b[(j+1)%4]))return true;
 return false;
}
function tipTouchesHull(tip,h){
 if(hullContains(tip,h))return true;
 for(let i=0;i<4;i++)if(hullSegmentDistance(tip,h[i],h[(i+1)%4])<7)return true;
 return false;
}
// Keep the last 300 ms of actual server positions. Browser state is displayed
// between snapshots, so contact must be validated against the visible time window.
function recordHistory(s){
 const t=Date.now();s.history??=[];
 s.history.push({t,x:s.x,y:s.y,angle:s.angle,vx:s.vx,vy:s.vy});
 while(s.history.length>2&&s.history[0].t<t-350)s.history.shift();
}
function validatedClientContact(me,other,now,reported){
 if(me.invuln>0||other.invuln>0)return null;
 const shapeA=hullAt(me,1);
 // Validate the actually displayed opponent, not an arbitrary historic hitbox.
 const latest=(other.history||[]).filter(h=>h.t>=now-330);
 const vx=Number(reported?.viewX),vy=Number(reported?.viewY),va=Number(reported?.viewAngle);
 const visibleAt=Number(reported?.seenAt);
 if(reported && [vx,vy,va,visibleAt].every(Number.isFinite) && visibleAt>=now-330 && visibleAt<=now+90){
  const plausible=latest.concat([{t:now,x:other.x,y:other.y,angle:other.angle,vx:other.vx,vy:other.vy}]).some(h=>{
   const dT=clamp((visibleAt-h.t)/1000,-.15,.13);
   if(Math.abs((visibleAt-h.t)/1000)>.22)return false;
   const predictedX=h.x+(h.vx||0)*dT,predictedY=h.y+(h.vy||0)*dT;
   const d=Math.hypot(vx-predictedX,vy-predictedY);
   const ang=Math.abs(Math.atan2(Math.sin(va-h.angle),Math.cos(va-h.angle)));
   return d<34+Math.hypot(h.vx||0,h.vy||0)*Math.min(.05,Math.abs(dT)) && ang<.53;
  });
  if(plausible){
   const visual=hullAt({...other,x:vx,y:vy,angle:va,prevX:vx,prevY:vy,prevAngle:va},1);
   if(Math.hypot(me.x-vx,me.y-vy)<50&&hullsOverlap(shapeA,visual)){
    return {aTip:tipTouchesHull(shapeA[0],visual),bTip:tipTouchesHull(visual[0],shapeA)};
   }
  }
 }
 // Fallback for older clients: recent history, prioritising the attacking tip.
 const times=latest.slice();
 times.push({x:other.x,y:other.y,angle:other.angle});
 for(const time of [0.025,0.05,0.075,0.1])times.push({x:other.x+other.vx*time,y:other.y+other.vy*time,angle:other.angle});
 let best=null,tipFromOpponent=null;
 for(const q of times){
  if(Math.hypot(me.x-q.x,me.y-q.y)>46)continue;
  const h=hullAt({...other,...q,prevX:q.x,prevY:q.y,prevAngle:q.angle},1);
  if(!hullsOverlap(shapeA,h))continue;
  const aTip=tipTouchesHull(shapeA[0],h),bTip=tipTouchesHull(h[0],shapeA);
  if(aTip)return {aTip,bTip};
  if(bTip)tipFromOpponent={aTip,bTip};
  best={aTip,bTip};
 }
 return tipFromOpponent||best;
}
function resolveImpact(a,b,contact){
 if(!a.alive||!b.alive)return;
 if(a.invuln>0||b.invuln>0){contact={aTip:false,bTip:false};}
 if(!contact.aTip&&!contact.bTip){
  if(serverTime<(a.nextBump||0)&&serverTime<(b.nextBump||0))return;
  a.nextBump=b.nextBump=serverTime+.14;
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,nx=dx/d,ny=dy/d;
  if(a.bot){a.x-=nx*5;a.y-=ny*5}
  if(b.bot){b.x+=nx*5;b.y+=ny*5}
  const aOut=a.vx*nx+a.vy*ny,bOut=b.vx*nx+b.vy*ny;
  if(aOut>bOut){const imp=Math.min(160,(aOut-bOut)*.65);a.vx-=imp*nx;a.vy-=imp*ny;b.vx+=imp*nx;b.vy+=imp*ny;}
  for(const v of [a,b])if(!v.bot){const c=[...peers].find(c=>c.id===v.id);if(c)send(c,{type:'bump',nx:v===a?-nx:nx,ny:v===a?-ny:ny});}
  return;
 }
 let winner,loser;
 if(contact.aTip&&contact.bTip){
  const va=Math.hypot(a.vx,a.vy),vb=Math.hypot(b.vx,b.vy);
  if(Math.abs(va-vb)<18)return;
  winner=va>vb?a:b;loser=winner===a?b:a;
 }else{winner=contact.aTip?a:b;loser=winner===a?b:a}
 loser.invuln=5;loser.alive=false;
 // Cosmetic impact event only. The existing server collision verdict is unchanged.
 const impactSpeed=Math.hypot((winner.vx||0)-(loser.vx||0),(winner.vy||0)-(loser.vy||0));
 broadcast({type:'impact',victim:loser.id,killer:winner.id,x:loser.x,y:loser.y,hue:loser.hue,level:winner.level,speed:Math.round(impactSpeed)});
 if(loser.bot){loser.respawn=serverTime+2;broadcast({type:'bot-down',victim:loser.id,x:loser.x,y:loser.y,level:loser.level,hue:loser.hue,killer:winner.id});}
 else{const c=[...peers].find(c=>c.id===loser.id);if(c){send(c,{type:'defeat',victim:loser.id,killer:winner.id});depart(c)}}
 if(winner.bot){winner.score+=140+22*loser.level;winner.level=Math.min(100,1+Math.floor(winner.score/950));}
 else{const c=[...peers].find(c=>c.id===winner.id);if(c)send(c,{type:'reward',victim:loser.id,level:loser.level})}
}
function collide(a,b){
 if(!a.alive||!b.alive)return;
 const ax0=Number.isFinite(a.prevX)?a.prevX:a.x,ay0=Number.isFinite(a.prevY)?a.prevY:a.y;
 const bx0=Number.isFinite(b.prevX)?b.prevX:b.x,by0=Number.isFinite(b.prevY)?b.prevY:b.y;
 const r0x=bx0-ax0,r0y=by0-ay0,drx=(b.x-bx0)-(a.x-ax0),dry=(b.y-by0)-(a.y-ay0);
 const closest=clamp(-(r0x*drx+r0y*dry)/(drx*drx+dry*dry||1),0,1);
 if(Math.hypot(r0x+drx*closest,r0y+dry*closest)>44)return;
 // Check swept shape, not just tip vs center; include the closest approach.
 const samples=[0,.2,.4,.6,.8,1,closest].sort((x,y)=>x-y);
 let contact=null;
 for(const t of samples){
  const aHull=hullAt(a,t),bHull=hullAt(b,t);
  if(!hullsOverlap(aHull,bHull))continue;
  contact={aTip:tipTouchesHull(aHull[0],bHull),bTip:tipTouchesHull(bHull[0],aHull)};
  break;
 }
 if(!contact)return;
 resolveImpact(a,b,contact);
}
// Les bots anticipent les murs suivant leur vitesse (pas de modification des joueurs).
function avoidWall(b){
 const edge=WORLD-40,speed=Math.hypot(b.vx,b.vy);
 const look=clamp(.45+speed/1200,.60,1.12);
 const px=b.x+b.vx*look,py=b.y+b.vy*look;
 // Only steer when headed toward a wall. Do not brake across a huge strip of the map.
 const dangerX=Math.abs(px)>edge-140&&Math.sign(b.vx)===Math.sign(px);
 const dangerY=Math.abs(py)>edge-140&&Math.sign(b.vy)===Math.sign(py);
 if(!dangerX&&!dangerY)return false;
 let tx=b.x+Math.cos(b.target)*650,ty=b.y+Math.sin(b.target)*650;
 if(dangerX)tx=-Math.sign(px)*Math.max(400,Math.min(1400,Math.abs(px)-(edge-140)+380));
 if(dangerY)ty=-Math.sign(py)*Math.max(400,Math.min(1400,Math.abs(py)-(edge-140)+380));
 // Local detour toward open space, away from the wall, keeping speed wherever possible.
 b.target=Math.atan2((dangerY?ty:b.y+Math.sin(b.target)*650)-b.y,
                             (dangerX?tx:b.x+Math.cos(b.target)*650)-b.x);
 return true;
}
function chooseBotMode(b){
 const nearby=[...botShips.values(),...ships.values()].filter(q=>q!==b&&q.alive&&q.invuln<=0);
 let best=null,bestScore=-Infinity;
 const isBusy=b.mode==='hunt';
 for(const q of nearby){
  const d=Math.hypot(q.x-b.x,q.y-b.y);
  if(d<85||d>1450)continue;
  const angle=Math.atan2(q.y-b.y,q.x-b.x);
  const ahead=Math.cos(angle-b.angle);
  // Do not put all bots on the same target or in the same little chase circle.
  let pursuers=0,crowd=0;
  for(const other of botShips.values())if(other!==b&&other.alive){
   if(other.mode==='hunt'&&other.targetId===q.id)pursuers++;
   if(Math.hypot(other.x-q.x,other.y-q.y)<175)crowd++;
  }
  const score=(1-d/1450)*1.1+ahead*.5+Math.random()*.7-pursuers*.95-crowd*.22+(b.targetId===q.id?.2:0);
  if(score>bestScore){bestScore=score;best=q;}
 }
 const nearBots=nearby.filter(q=>Math.hypot(q.x-b.x,q.y-b.y)<320).length;
 const wantsHunt=best&&Math.random()<(b.aggression*(nearBots>4?.50:1));
 if(wantsHunt){
  b.mode='hunt';b.targetId=best.id;b.modeUntil=serverTime+rand(2.3,4.6);
 }else{
  b.mode='cruise';b.targetId=null;b.modeUntil=serverTime+rand(1.3,3.0);
  // Independent long waypoints create exploration across the entire map.
  const a=b.angle+rand(-1.3,1.3)+b.sway;
  const distance=rand(1100,2500);
  b.aimX=clamp(b.x+Math.cos(a)*distance,-WORLD+400,WORLD-400);
  b.aimY=clamp(b.y+Math.sin(a)*distance,-WORLD+400,WORLD-400);
 }
}
function step(dt){serverTime+=dt;
 for(const p of planets){p.x+=p.vx*dt;p.y+=p.vy*dt;for(const axis of ['x','y'])if(Math.abs(p[axis])>WORLD-p.r-150){p[axis]=clamp(p[axis],-WORLD+p.r+150,WORLD-p.r-150);p['v'+axis]*=-1}}
 for(const b of botShips.values()){
  if(!b.alive){if(serverTime>=b.respawn){const pos=spawn();b.x=pos.x;b.y=pos.y;b.prevX=b.x;b.prevY=b.y;
   b.invuln=2;b.vx=b.vy=0;b.alive=true;b.mode='cruise';b.targetId=null;b.modeUntil=0;b.boostUntil=0;b.boostDecisionAt=0;b.history=[];}continue}
  b.prevX=b.x;b.prevY=b.y;b.prevAngle=b.angle;b.invuln=Math.max(0,b.invuln-dt);b.thought-=dt;
  const speed=Math.hypot(b.vx,b.vy);
  const prey=b.targetId&&(botShips.get(b.targetId)||ships.get(b.targetId));
  if(b.mode==='hunt'&&(!prey?.alive||serverTime>b.modeUntil))b.modeUntil=0;
  if(serverTime>b.modeUntil)chooseBotMode(b);
  let aim=b.angle;
  const currentTarget=b.mode==='hunt'&&b.targetId&&(botShips.get(b.targetId)||ships.get(b.targetId));
  if(currentTarget?.alive){
   const dx=currentTarget.x-b.x,dy=currentTarget.y-b.y,dist=Math.hypot(dx,dy);
   // Direct pursuit with modest interception; no forced "pass" or long escape mode.
   const lead=clamp(dist/Math.max(300,speed+160),.05,.55)*b.skill;
   aim=Math.atan2(currentTarget.y+currentTarget.vy*lead-b.y,
                  currentTarget.x+currentTarget.vx*lead-b.x);
  }else{
   aim=Math.atan2(b.aimY-b.y,b.aimX-b.x);
   if(Math.hypot(b.aimX-b.x,b.aimY-b.y)<175)b.modeUntil=0;
  }
  // Avoid planets, but keep the pursuit goal intact.
  for(const p of planets){const dx=b.x+b.vx*.83-p.x,dy=b.y+b.vy*.83-p.y,d=Math.hypot(dx,dy);
   if(d<p.r+150){aim=Math.atan2(dy,dx)+Math.sign(Math.sin(aim-Math.atan2(dy,dx))||1)*.36;break}}
  // Gentle separation from other bots, except our selected target in a real attack.
  let sepX=0,sepY=0,contacts=0;
  for(const other of botShips.values()){
   if(other===b||!other.alive||other.id===b.targetId)continue;
   const dx=b.x-other.x,dy=b.y-other.y,d=Math.hypot(dx,dy);
   if(d>1&&d<b.space){const weight=Math.pow(1-d/b.space,2);sepX+=dx/d*weight;sepY+=dy/d*weight;contacts++;}
  }
  if(contacts){const weight=clamp(Math.hypot(sepX,sepY)*.7,0,.8);const escape=Math.atan2(sepY,sepX);aim=Math.atan2(Math.sin(aim)*(1-weight)+Math.sin(escape)*weight,Math.cos(aim)*(1-weight)+Math.cos(escape)*weight);}
  b.target=aim;
  const wallDanger=avoidWall(b);
  const diff=Math.atan2(Math.sin(b.target-b.angle),Math.cos(b.target-b.angle));
  const turnSpeed=wallDanger?4.9:(2.85+b.skill*.90);
  b.prevAngle=b.angle;
  b.angle+=clamp(diff,-turnSpeed*dt,turnSpeed*dt);
  // Short boosts, not one continuous boost or long periods of flight.
  if(serverTime>=b.boostDecisionAt){
   const chance=b.mode==='hunt'?.80:.48;
   const desire=b.energy>27&&Math.random()<chance;
   b.boostUntil=desire?serverTime+rand(.40,.98):serverTime;
   b.boostDecisionAt=serverTime+rand(.48,1.20);
  }
  b.boosting=b.energy>4&&serverTime<b.boostUntil;
  b.energy=clamp(b.energy+(b.boosting?-34:23)*dt,0,100);
  const acc=b.boosting&&b.energy>0?640:300;
  const beforeSpeed=Math.hypot(b.vx,b.vy);
  b.vx=b.vx*Math.pow(.991,dt*60)+Math.cos(b.angle)*acc*dt;
  b.vy=b.vy*Math.pow(.991,dt*60)+Math.sin(b.angle)*acc*dt;
  const cap=b.boosting?(560+Math.min(b.level,14)*7+75*(b.skill-.60)):(365+Math.min(b.level,10)*7);
  // Emergency dampening only at the very edge when still moving outward.
  const edge=WORLD-16;
  if(Math.abs(b.x)>edge-85&&b.vx*Math.sign(b.x)>0)b.vx*=Math.pow(.92,dt*60);
  if(Math.abs(b.y)>edge-85&&b.vy*Math.sign(b.y)>0)b.vy*=Math.pow(.92,dt*60);
  let v=Math.hypot(b.vx,b.vy);const allowed=(!b.boosting&&!wallDanger)?Math.max(cap,beforeSpeed):cap;if(v>allowed){b.vx*=allowed/v;b.vy*=allowed/v}
  for(const p of planets){let dx=p.x-b.x,dy=p.y-b.y,d=Math.hypot(dx,dy);
   if(d>p.r&&d<p.r*3.25){let inf=Math.pow(1-(d-p.r)/(p.r*2.25),1.7),s=Math.hypot(b.vx,b.vy);
    b.vx+=dx/d*335*inf*dt;b.vy+=dy/d*335*inf*dt;let ns=Math.hypot(b.vx,b.vy);if(ns){b.vx*=s/ns;b.vy*=s/ns}}}
  b.x+=b.vx*dt;b.y+=b.vy*dt;

  for(const p of planets){let dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy),lim=p.r+13;if(d<lim){let nx=dx/(d||1),ny=dy/(d||1);b.x=p.x+nx*lim;b.y=p.y+ny*lim;
   let dot=b.vx*nx+b.vy*ny;if(dot<0){b.vx-=1.7*dot*nx;b.vy-=1.7*dot*ny}b.vx*=.65;b.vy*=.65;}}
  if(Math.abs(b.x)>WORLD-16){b.x=clamp(b.x,-WORLD+16,WORLD-16);b.vx*=-.55}
  if(Math.abs(b.y)>WORLD-16){b.y=clamp(b.y,-WORLD+16,WORLD-16);b.vy*=-.55}
  recordHistory(b);
 }
 for(const p of ships.values())p.invuln=Math.max(0,p.invuln-dt);
 const all=[...ships.values(),...botShips.values()].filter(x=>x.alive);
 for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)collide(all[i],all[j]);
 // Une trajectoire reçue du client ne doit pas être retestée aux ticks suivants.
 for(const p of ships.values()){p.prevX=p.x;p.prevY=p.y;p.prevAngle=p.angle}
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
 const c={socket,buffer:Buffer.alloc(0),joined:false,id:null,userId:null,isAdmin:false,adminSpeed:1,authPending:false};peers.add(c);socket.on('data',b=>consume(c,b));socket.on('error',()=>{});socket.on('close',()=>{depart(c);peers.delete(c)});
});
if(process.env.MOMENTUM_ENGINE_TEST==='1'){
 module.exports={ships,botShips,planets,fillSlots,spawn,step,collide,resolveImpact,validatedClientContact,recordHistory,hullAt,hullsOverlap,createBot,isAdminUser,verifyToken,receive,WSframe};
}else{
 fillSlots();let prev=Date.now(),broadcastElapsed=0,planetSyncElapsed=0;setInterval(()=>{let now=Date.now(),dt=clamp((now-prev)/1000,0,.07);prev=now;step(dt);broadcastElapsed+=dt;planetSyncElapsed+=dt;if(broadcastElapsed>=.05){broadcastElapsed=0;const state={type:'state',at:Date.now(),humans:ships.size,bots:botShips.size,ships:[...ships.values(),...botShips.values()].filter(x=>x.alive).map(pack)};if(planetSyncElapsed>=.5){state.planets=planets;planetSyncElapsed=0;}broadcast(state)}},1000/30);
 app.listen(PORT,'0.0.0.0',()=>console.log('MOMENTUM.IO beta shared arena listening on '+PORT));
}
