const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const $ = (selector) => document.querySelector(selector);
const types = [
  {emoji:'🍉',name:'西瓜',juice:'#ff6f84'},
  {emoji:'🍊',name:'橙子',juice:'#ffb249'},
  {emoji:'🥝',name:'猕猴桃',juice:'#b0e76e'},
  {emoji:'🍎',name:'苹果',juice:'#ff6676'},
  {emoji:'🍋',name:'柠檬',juice:'#ffdd65'},
  {emoji:'🍓',name:'草莓',juice:'#ff7795'},
];
const state = {started:false,paused:false,score:0,cut:0,fruits:[],halves:[],drops:[],labels:[],trail:[],clock:0,nextSpawn:.35,lastCut:-10,combo:0,activePointer:null};
let width=0,height=0,previous=0,resizeTimer,announcementTimer;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const random=(a,b)=>a+Math.random()*(b-a);
const sprites=types.map(type=>{
  const art=document.createElement('canvas');art.width=art.height=192;
  const brush=art.getContext('2d');brush.font='148px "Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji",sans-serif';brush.textAlign='center';brush.textBaseline='middle';brush.fillText(type.emoji,96,103);return art;
});
function resize(){
  const rect=canvas.getBoundingClientRect(),oldWidth=width,oldHeight=height;
  width=rect.width;height=rect.height;
  const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  if(oldWidth&&oldHeight)for(const f of state.fruits){f.x=f.x/oldWidth*width;f.y=f.y/oldHeight*height;}
}
new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,30);}).observe(canvas);
resize();
function updateScore(){ $('#score').textContent=state.score;$('#fruit-count').textContent=`切开 ${state.cut} 个水果`; }
function announce(text){clearTimeout(announcementTimer);announcementTimer=setTimeout(()=>{$('#announcement').textContent=text;},200);}
function start(){
  Object.assign(state,{started:true,paused:false,score:0,cut:0,fruits:[],halves:[],drops:[],labels:[],trail:[],clock:0,nextSpawn:.15,lastCut:-10,combo:0,activePointer:null});
  $('#welcome').hidden=true;$('#pause-panel').hidden=true;$('#tip').classList.add('visible');updateScore();canvas.focus({preventScroll:true});announce('开始！用手指或鼠标划过水果，也可以按空格切水果。');
}
function pause(){if(!state.started||state.paused)return;state.paused=true;state.activePointer=null;state.trail=[];$('#pause-panel').hidden=false;}
function resume(){state.paused=false;$('#pause-panel').hidden=true;previous=performance.now();canvas.focus({preventScroll:true});}
$('#start').addEventListener('click',start);$('#restart').addEventListener('click',start);$('#resume').addEventListener('click',resume);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('blur',()=>{state.activePointer=null;});
function spawn(){
  const size=Math.min(55,Math.max(37,width*.07)),batch=state.clock>8&&Math.random()<.35?2:1;
  for(let i=0;i<batch;i++){
    const radius=random(size*.83,size),index=Math.floor(Math.random()*types.length);
    state.fruits.push({x:random(radius+15,width-radius-15),y:-radius-12,radius,index,vx:random(-22,22),vy:random(65,105)+Math.min(state.clock,80)*.25,rotation:random(-.5,.5),spin:random(-.8,.8),id:crypto.randomUUID()});
  }
}
export function segmentDistance(ax,ay,bx,by,px,py){const dx=bx-ax,dy=by-ay,d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/d)):0;return Math.hypot(px-ax-t*dx,py-ay-t*dy);}
function cut(f){
  const index=state.fruits.indexOf(f);if(index<0)return;state.fruits.splice(index,1);
  state.combo=state.clock-state.lastCut<.58?state.combo+1:1;state.lastCut=state.clock;
  const gain=10;state.score+=gain;state.cut++;updateScore();$('#tip').classList.remove('visible');
  for(const side of [-1,1])state.halves.push({...f,side,vx:f.vx+side*random(90,150),vy:random(-100,-55),spin:side*random(1,2.7),life:1});
  for(let i=0;i<(reducedMotion?5:16);i++){const angle=random(0,Math.PI*2),speed=random(40,220);state.drops.push({x:f.x,y:f.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-30,size:random(2,7),life:random(.4,.85),color:types[f.index].juice});}
  state.labels.push({x:f.x,y:f.y-35,text:state.combo>1?`${state.combo} 连切！`:'+10',life:1.05,combo:state.combo>1});
  if(state.cut===1||state.cut%5===0)announce(`切开 ${state.cut} 个水果，得分 ${state.score}`);
}
function swipe(a,b){
  if(!state.started||state.paused)return;
  state.trail.push({...b,life:.2});
  for(const f of [...state.fruits])if(f.y>0&&segmentDistance(a.x,a.y,b.x,b.y,f.x,f.y)<f.radius*.82)cut(f);
}
function point(event){const rect=canvas.getBoundingClientRect();return{x:event.clientX-rect.left,y:event.clientY-rect.top};}
let lastPoint=null;
canvas.addEventListener('pointerdown',event=>{if(!state.started||state.paused||event.button>0)return;event.preventDefault();state.activePointer=event.pointerId;lastPoint=point(event);canvas.setPointerCapture(event.pointerId);state.trail=[];swipe(lastPoint,lastPoint);});
canvas.addEventListener('pointermove',event=>{if(state.activePointer!==event.pointerId||!lastPoint)return;event.preventDefault();const events=event.getCoalescedEvents?.()||[event];for(const e of events.length?events:[event]){const p=point(e);swipe(lastPoint,p);lastPoint=p;}});
function endPointer(event){if(event.pointerId!==state.activePointer)return;state.activePointer=null;lastPoint=null;}
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);canvas.addEventListener('lostpointercapture',endPointer);
canvas.addEventListener('keydown',event=>{if(event.code==='Space'){event.preventDefault();if(!state.started)start();if(state.paused){resume();return;}const f=state.fruits.filter(f=>f.y>45&&f.y<height-40).sort((a,b)=>b.y-a.y)[0];if(f){const a={x:f.x-f.radius*1.5,y:f.y+20},b={x:f.x+f.radius*1.5,y:f.y-20};state.trail.push({...a,life:.2});swipe(a,b);}}else if(event.code==='Escape'){if(state.paused)resume();else pause();}});
function drawFruit(f,half=false){
 ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.rotation);ctx.globalAlpha=half?Math.min(1,f.life*1.6):1;
 if(half){ctx.beginPath();ctx.rect(f.side<0?-f.radius*1.4:0,-f.radius*1.4,f.radius*1.4,f.radius*2.8);ctx.clip();}
 ctx.shadowColor='#041a2860';ctx.shadowBlur=15;ctx.shadowOffsetY=10;ctx.drawImage(sprites[f.index],-f.radius*1.22,-f.radius*1.22,f.radius*2.44,f.radius*2.44);ctx.restore();
}
function step(dt){
 if(state.started&&!state.paused){
  state.clock+=dt;state.nextSpawn-=dt;if(state.nextSpawn<=0){spawn();state.nextSpawn=random(.72,1.02);}
  for(const f of state.fruits){f.vy+=29*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.rotation+=f.spin*dt;if(f.x<f.radius||f.x>width-f.radius)f.vx*=-1;}
  state.fruits=state.fruits.filter(f=>f.y<height+f.radius*2);
  for(const f of state.halves){f.vy+=360*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.rotation+=f.spin*dt;f.life-=dt*.9;}
  for(const p of state.drops){p.vy+=250*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
  for(const p of state.labels){p.y-=40*dt;p.life-=dt;}
  for(const p of state.trail)p.life-=dt;
  state.halves=state.halves.filter(f=>f.life>0);state.drops=state.drops.filter(p=>p.life>0);state.labels=state.labels.filter(p=>p.life>0);state.trail=state.trail.filter(p=>p.life>0).slice(-30);
 }
}
function draw(){
 ctx.clearRect(0,0,width,height);
 for(const p of state.drops){ctx.save();ctx.globalAlpha=Math.min(1,p.life*2);ctx.fillStyle=p.color;ctx.beginPath();ctx.ellipse(p.x,p.y,p.size,p.size*.75,0,0,Math.PI*2);ctx.fill();ctx.restore();}
 for(const f of state.fruits)drawFruit(f);for(const f of state.halves)drawFruit(f,true);
 for(const p of state.labels){ctx.save();ctx.globalAlpha=Math.min(1,p.life*3);ctx.textAlign='center';ctx.font=`800 ${p.combo?27:24}px system-ui,sans-serif`;ctx.fillStyle=p.combo?'#e7ff99':'#fff8de';ctx.shadowColor='#0b273c';ctx.shadowBlur=10;ctx.fillText(p.text,p.x,p.y);ctx.restore();}
 if(state.trail.length>1){ctx.save();ctx.lineCap='round';ctx.lineJoin='round';for(let i=1;i<state.trail.length;i++){const a=state.trail[i-1],b=state.trail[i];ctx.globalAlpha=Math.min(1,b.life*6);ctx.strokeStyle='#d8ffa7';ctx.shadowColor='#c3ff9a';ctx.shadowBlur=16;ctx.lineWidth=8*i/state.trail.length+2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#fffef0';ctx.lineWidth=2;ctx.stroke();}ctx.restore();}
}
function loop(now){const dt=Math.min((now-previous)/1000||0,.035);previous=now;step(dt);draw();requestAnimationFrame(loop);}
requestAnimationFrame(loop);
const context=document.modelContext;if(context?.registerTool){
 const lifecycle=new AbortController();
 const empty={type:'object',properties:{},additionalProperties:false};
 const validate=input=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('This tool expects an empty object.');};
 const read=()=>({started:state.started,paused:state.paused,score:state.score,fruitSliced:state.cut});
 for(const tool of [{name:'read_fruit_game',title:'读取水果游戏',description:'Read the current score and game status.',inputSchema:empty,annotations:{readOnlyHint:true},execute(input){validate(input);return read();}},{name:'restart_fruit_game',title:'重新开始水果游戏',description:'Start or restart the game and reset the score to zero, just like the restart button.',inputSchema:empty,annotations:{readOnlyHint:false},execute(input){validate(input);start();return read();}}]){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
