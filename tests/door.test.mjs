import test from 'node:test';
import assert from 'node:assert/strict';
import { DoorController, DOOR } from '../src/door.js';
import { ROOM, COLLIDERS, TOILET, roomName } from '../src/spaces.js';
import { movePlayer, traceStream } from '../src/physics.js';
import { circleHitsBox, footprintContains, segmentBoxHit } from '../src/collision.js';
import { resolvePuddlePoint } from '../src/puddles.js';
const obstacles=door=>[...COLLIDERS.filter(b=>b.id!=='bathroom-door'),door.collider];
const open=door=>{door.toggle();for(let i=0;i<60;i++)door.step(1/60,{x:.45,z:3,feet:0});};
test('the door can be operated from both rooms but not from far away',()=>{
  const door=new DoorController();assert.equal(door.near({x:.45,z:3}),true);assert.equal(door.near({x:.45,z:5.3}),true);assert.equal(door.near({x:.45,z:7}),false);
  assert.equal(roomName({z:3}),'浴室');assert.equal(roomName({z:6}),'客廳');
});
test('opening from the living room swings away from the person using the door',()=>{
  const door=new DoorController(),p={x:.45,z:DOOR.z+.26,feet:0};door.toggle(p);
  for(let i=0;i<60;i++)door.step(1/60,p);
  assert.ok(door.angle>1.5);assert.equal(door.blocked,false);assert.equal(circleHitsBox(p.x,p.z,.21,door.collider),false);
});
test('a closed door stops walking, jumping through it and emitted water',()=>{
  const door=new DoorController();for(const feet of [0,.9]){const p={x:.45,z:3,feet};movePlayer(p,0,3,.21,ROOM,obstacles(door));assert.ok(p.z<3.9);}
  const hit=traceStream({x:.45,y:1.3,z:3},{x:0,y:0,z:4},TOILET,ROOM,obstacles(door));
  assert.equal(hit.kind,'object');assert.equal(obstacles(door)[hit.obstacle].id,'bathroom-door');
});
test('an open doorway permits walking both ways and water entering the living room',()=>{
  const door=new DoorController();open(door);assert.ok(Math.abs(door.angle-DOOR.openAngle)<1e-8);
  const p={x:.45,z:3,feet:0};movePlayer(p,0,3.3,.21,ROOM,obstacles(door));assert.ok(p.z>6.2);
  movePlayer(p,0,-3.3,.21,ROOM,obstacles(door));assert.ok(p.z<3.1);
  const hit=traceStream({x:.45,y:1.3,z:3},{x:0,y:0,z:4},TOILET,ROOM,obstacles(door));assert.equal(hit.kind,'floor');assert.ok(hit.point.z>4.1);
});
test('opening the door does not remove the surrounding partition or lintel',()=>{
  const door=new DoorController();open(door);const p={x:2,z:3,feet:0};movePlayer(p,0,3,.21,ROOM,obstacles(door));assert.ok(p.z<3.9);
  const hit=traceStream({x:.45,y:2.9,z:3},{x:0,y:0,z:4},TOILET,ROOM,obstacles(door));assert.equal(hit.kind,'object');assert.equal(obstacles(door)[hit.obstacle].id,'door-header');
});
test('the rotating leaf uses its actual orientation rather than blocking an empty bounding-box corner',()=>{
  const door=new DoorController();door.angle=-Math.PI/4;door.updateCollider();const b=door.collider;
  const p={x:.55,y:1,z:4.15};assert.ok(p.x>b.minX&&p.x<b.maxX&&p.z>b.minZ&&p.z<b.maxZ);
  assert.equal(circleHitsBox(p.x,p.z,.1,b),false);assert.equal(segmentBoxHit(p,{...p,z:4.2},b),null);
});
test('closing stops and reverses before the leaf can trap a player in the doorway',()=>{
  const door=new DoorController();open(door);door.toggle();const p={x:.45,z:DOOR.z,feet:0};
  for(let i=0;i<90&&!door.blocked;i++)door.step(1/60,p);
  assert.equal(door.blocked,true);assert.equal(door.targetOpen,true);assert.equal(circleHitsBox(p.x,p.z,.21,door.collider),false);
});
test('runoff respects a rotated leaf and reset restores a closed door',()=>{
  const door=new DoorController();door.angle=-Math.PI/4;door.updateCollider();const b=door.collider;
  const hit={kind:'object',point:{x:b.centerX,y:1,z:b.centerZ}};
  const floor=resolvePuddlePoint(hit,TOILET,ROOM,[b]);assert.equal(footprintContains(floor,b,.025),false);
  door.reset();assert.equal(door.angle,0);assert.equal(door.targetOpen,false);assert.equal(circleHitsBox(.45,DOOR.z,.21,b),true);
});
