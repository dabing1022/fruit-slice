const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname, '..', 'game.js'),'utf8').replace('export function segmentDistance','function segmentDistance');
for(const viewport of [{width:1024,height:700},{width:366,height:717}]){
 const nodes=new Map(),registered=[];
 function node(id){if(nodes.has(id))return nodes.get(id);const n={textContent:'',hidden:false,events:{},classList:{add(){},remove(){}},focus(){},setPointerCapture(){},getBoundingClientRect(){return{...viewport,left:0,top:0}},getContext(){return new Proxy({},{get:()=>()=>{}})},addEventListener(event,fn){this.events[event]=fn}};nodes.set(id,n);return n;}
 const doc={hidden:false,querySelector:node,createElement:()=>node(Symbol()),addEventListener(){},modelContext:{registerTool(t){registered.push(t)}}};
 const sandbox={document:doc,window:{addEventListener(){}},matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){}},devicePixelRatio:2,requestAnimationFrame(){},setTimeout(){},clearTimeout(){},performance:{now:()=>0},crypto:require('node:crypto'),AbortController,Math,console};vm.createContext(sandbox);vm.runInContext(source,sandbox);
 const run=code=>vm.runInContext(code,sandbox);
 assert.equal(run('segmentDistance(0,0,100,0,50,0)'),0);assert.equal(run('segmentDistance(0,0,100,0,50,20)'),20);assert.equal(run('segmentDistance(0,0,0,0,3,4)'),5);
 run('start()');assert.equal(run('state.score'),0);run('step(.2)');assert.ok(run('state.fruits.length')>0);run('state.fruits[0].x=150;state.fruits[0].y=200;');run('swipe({x:100,y:200},{x:220,y:200})');assert.equal(run('state.score'),10);assert.equal(run('state.cut'),1);assert.equal(run('state.halves.length'),2);assert.ok(run('state.drops.length')>0);run('swipe({x:100,y:200},{x:220,y:200})');assert.equal(run('state.score'),10,'Cannot score twice from same fruit');
 run('spawn();state.fruits[0].x=150;state.fruits[0].y=200;');const c=node('#game');c.events.pointerdown({button:0,pointerId:1,clientX:100,clientY:200,preventDefault(){}});c.events.pointermove({pointerId:1,clientX:220,clientY:200,preventDefault(){}});c.events.pointerup({pointerId:1});assert.equal(run('state.score'),20);assert.equal(run('state.activePointer'),null);
 run('pause()');assert.equal(run('state.paused'),true);run('resume()');assert.equal(run('state.paused'),false);run('start()');assert.equal(run('state.score'),0);assert.equal(run('state.fruits.length'),0);
 run('spawn();state.fruits[0].y=200');c.events.keydown({code:'Space',preventDefault(){}});assert.equal(run('state.score'),10);
 assert.equal(registered.length,2);assert.equal(registered[0].execute({}).score,10);assert.throws(()=>registered[1].execute({bad:true}));assert.equal(registered[1].execute({}).score,0);
 console.log(JSON.stringify({viewport,tests:'PASS: segment hit/miss, spawn, swipe, split pieces, particles, scoring, no double-score, pointer lifecycle, keyboard, restart, pause/resume, WebMCP mock inputs'}));
}
