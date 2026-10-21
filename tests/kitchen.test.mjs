import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOM, COLLIDERS, TOILET, roomName } from '../src/spaces.js';
import { movePlayer, traceStream } from '../src/physics.js';
import { PuddleField, PuddleMask, resolvePuddlePoint } from '../src/puddles.js';
import { footprintContains } from '../src/collision.js';
import { WaterSimulation } from '../src/water.js';

test('the widened living room has an unobstructed route into and out of the kitchen',()=>{
  const p={x:.5,z:6.35,feet:0};
  movePlayer(p,6,0,.21,ROOM,COLLIDERS);assert.ok(p.x>6.4);assert.equal(roomName(p),'廚房');
  movePlayer(p,0,4,.21,ROOM,COLLIDERS);assert.ok(p.z>10.3);
  movePlayer(p,0,-4,.21,ROOM,COLLIDERS);movePlayer(p,-6,0,.21,ROOM,COLLIDERS);
  assert.ok(p.x<.6);assert.equal(roomName(p),'客廳');
});
test('widening the living room preserves the bathroom wall and the apartment front wall',()=>{
  const bath={x:3,z:1,feet:0};movePlayer(bath,6,0,.21,ROOM,COLLIDERS);assert.ok(bath.x<3.3);
  const kitchen={x:6.5,z:6.3,feet:0};movePlayer(kitchen,0,-6,.21,ROOM,COLLIDERS);assert.ok(kitchen.z>4.37);
  const hit=traceStream({x:3,y:1.2,z:1},{x:5,y:0,z:0},TOILET,ROOM,COLLIDERS);
  assert.equal(COLLIDERS[hit.obstacle].id,'bathroom-exterior');
  const runoff=resolvePuddlePoint(hit,TOILET,ROOM,COLLIDERS);assert.ok(runoff.x<3.5);
});
test('kitchen cabinets, fridge and island block both movement and airborne water',()=>{
  for(const [start,delta,velocity,id] of [
    [{x:6.5,z:10.6},{x:0,z:2},{x:0,y:-1,z:4},'kitchen-back-counter'],
    [{x:7.4,z:7},{x:2,z:0},{x:4,y:-1,z:0},'kitchen-side-counter'],
    [{x:7.4,z:5.2},{x:2,z:0},{x:4,y:0,z:0},'kitchen-fridge'],
    [{x:5.2,z:7.4},{x:0,z:2},{x:0,y:-1,z:4},'kitchen-island'],
  ]){
    const p={...start,feet:0};movePlayer(p,delta.x,delta.z,.21,ROOM,COLLIDERS);
    assert.ok(Math.hypot(p.x-start.x,p.z-start.z)<Math.hypot(delta.x,delta.z)-.5,id+' should block the player');
    const hit=traceStream({...start,y:1.1},velocity,TOILET,ROOM,COLLIDERS);
    assert.equal(hit.kind,'object');assert.equal(COLLIDERS[hit.obstacle].id,id);
    const runoff=resolvePuddlePoint(hit,TOILET,ROOM,COLLIDERS);
    assert.equal(COLLIDERS.some(b=>(b.minY??0)<.05&&footprintContains(runoff,b,.025)),false,id+' runoff must reach exposed floor');
  }
});
test('the new exterior wall contains people and water at the widened right edge',()=>{
  const p={x:7,z:6.2,feet:0};movePlayer(p,10,0,.21,ROOM,COLLIDERS);assert.equal(p.x,ROOM.maxX-.21);
  const hit=traceStream({x:8,y:1.2,z:6.2},{x:5,y:0,z:0},TOILET,ROOM,COLLIDERS);assert.equal(hit.kind,'wall');assert.ok(Math.abs(hit.point.x-ROOM.maxX)<.05);
});
test('kitchen floor impacts arrive before deposition and render beyond the old room edge',()=>{
  const water=new WaterSimulation(TOILET,ROOM,COLLIDERS),field=new PuddleField(),mask=new PuddleMask(ROOM);
  const source={origin:{x:6.5,y:1.1,z:6.2},velocity:{x:0,y:0,z:3}},impacts=[];
  const first=water.advance(1/60,source,1200);assert.equal(first.impacts.length,0);assert.equal(field.patches.length,0);
  for(let i=0;i<90;i++)impacts.push(...water.advance(1/60,null,1200).impacts);
  assert.equal(impacts.length,1);assert.equal(impacts[0].kind,'floor');assert.ok(impacts[0].point.x>3.5);
  const point=resolvePuddlePoint(impacts[0],TOILET,ROOM,COLLIDERS),{patch}=field.add(point,impacts[0].volume);mask.stamp(patch);
  assert.ok(mask.alphaAt(point)>200);assert.equal(mask.alphaAt({x:2,z:point.z}),0);
  assert.ok(Math.abs(field.pools[0].volume-92/60)<1e-9);
});
