import test from 'node:test';
import assert from 'node:assert/strict';
import { WaterSimulation } from '../src/water.js';
import { FLOW_RATE } from '../src/physics.js';
const toilet={x:0,z:-2,seat:.72,water:.39,innerX:.345,innerZ:.49,outerX:.51,outerZ:.69};
const room={minX:-3.5,maxX:3.5,minZ:-4,maxZ:4};
const source={origin:{x:1.5,y:1,z:1},velocity:{x:0,y:0,z:0}};
test('each visible chunk has its own age and cannot deposit water before landing',()=>{
  const sim=new WaterSimulation(toilet,room,[]),first=sim.advance(.1,source,1200);
  assert.equal(first.impacts.length,0);assert.equal(sim.parcels.length,4);
  assert.ok(sim.parcels[0].position.y<sim.parcels[3].position.y);
  for(const chunk of sim.segments())assert.ok(chunk.head.y>.9);
  let hits=[];for(let i=0;i<30;i++)hits.push(...sim.advance(.01,null,1200-first.emitted).impacts);
  assert.equal(hits.length,0);assert.equal(sim.parcels.length,4);
  while(hits.length===0)hits.push(...sim.advance(.005,null,1200-first.emitted).impacts);
  assert.ok(sim.parcels.length>0,'later chunks must still be airborne when the first lands');
  for(let i=0;i<100;i++)hits.push(...sim.advance(.01,null,1200-first.emitted).impacts);
  assert.equal(hits.length,4);assert.ok(Math.abs(hits.reduce((s,h)=>s+h.volume,0)-first.emitted)<1e-8);
});
test('stopping emission leaves already emitted chunks flying along their original trajectories',()=>{
  const sim=new WaterSimulation(toilet,room,[]);sim.advance(.1,source,1200);
  sim.advance(.05,{origin:{x:-1.5,y:1,z:1},velocity:{x:1,y:0,z:0}},1100);
  const original=sim.parcels.find(p=>p.id===0);assert.equal(original.origin.x,1.5);assert.equal(original.position.x,1.5);
  const count=sim.parcels.length;sim.advance(.02,null,1000);assert.ok(sim.segments().length>=count);
});
test('a segment must finish landing its tail before crediting its volume',()=>{
  const sim=new WaterSimulation(toilet,room,[]);sim.advance(.025,source,1200);
  let impacts=[];
  while(sim.parcels[0].phase==='flight')impacts.push(...sim.advance(.001,null,1197.7).impacts);
  assert.equal(impacts.length,0);assert.equal(sim.parcels[0].phase,'contact');
  assert.ok(sim.segments()[0].tail.y>sim.segments()[0].head.y);
  assert.equal(sim.advance(.004,null,1197.7).impacts.length,0);
  assert.equal(sim.advance(.02,null,1197.7).impacts.length,1);assert.equal(sim.parcels.length,0);
});
test('a short tap emits its partial chunk after release without losing water',()=>{
  const sim=new WaterSimulation(toilet,room,[]);assert.equal(sim.advance(.008,source,1200).emitted,0);
  const released=sim.advance(.01,null,1200);assert.ok(Math.abs(released.emitted-FLOW_RATE*.008)<1e-9);
  assert.equal(sim.parcels.length,1);let landed=0;
  for(let i=0;i<100;i++)landed+=sim.advance(.01,null,1200-released.emitted).impacts.reduce((s,h)=>s+h.volume,0);
  assert.ok(Math.abs(landed-released.emitted)<1e-9);
});
test('a wall hit must visibly drain down to the floor before creating floor water',()=>{
  const sim=new WaterSimulation(toilet,room,[]);
  sim.advance(.1,{origin:{x:3,y:1,z:1},velocity:{x:4,y:0,z:0}},1200);
  const wall=sim.advance(.17,null,1100);assert.equal(wall.impacts.length,0);
  assert.ok(sim.parcels.some(p=>p.phase==='runoff'));
  assert.ok(sim.segments().some(s=>s.phase==='runoff'&&s.head.y>.1));
  const hits=[];for(let i=0;i<200;i++)hits.push(...sim.advance(.01,null,1100).impacts);
  assert.equal(hits.length,4);assert.ok(hits.every(h=>h.kind==='floor'&&h.surfaceKind==='wall'));
});
test('chunk emission and landed volume remain consistent across frame rates',()=>{
  for(const fps of [30,60,144]){
    const sim=new WaterSimulation(toilet,room,[]);let available=1200,landed=0;
    for(let i=0;i<fps;i++){const step=sim.advance(1/fps,source,available);available-=step.emitted;landed+=step.impacts.reduce((s,h)=>s+h.volume,0);}
    for(let i=0;i<240;i++){const step=sim.advance(1/120,null,available);available-=step.emitted;landed+=step.impacts.reduce((s,h)=>s+h.volume,0);}
    assert.ok(Math.abs(1200-available-FLOW_RATE)<1e-7);assert.ok(Math.abs(landed-FLOW_RATE)<1e-7);assert.equal(sim.parcels.length,0);
  }
});
test('a small remaining supply cannot create or lose water',()=>{
  const sim=new WaterSimulation(toilet,room,[]),step=sim.advance(.1,source,3);assert.equal(step.emitted,3);
  let landed=0;for(let i=0;i<150;i++)landed+=sim.advance(.01,null,0).impacts.reduce((s,h)=>s+h.volume,0);
  assert.ok(Math.abs(landed-3)<1e-8);assert.equal(sim.parcels.length,0);
});
