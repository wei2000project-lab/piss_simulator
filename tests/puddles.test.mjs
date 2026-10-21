import test from 'node:test';
import assert from 'node:assert/strict';
import { PuddleField, resolvePuddlePoint } from '../src/puddles.js';
const toilet={x:0,z:-2,outerX:.51,outerZ:.69};
const room={minX:-3.5,maxX:3.5,minZ:-4,maxZ:4};
test('holding a fixed landing point grows one anchored pool and conserves every ml',()=>{
  const field=new PuddleField();
  field.add({x:1,y:.043,z:1},1);const initial={...field.pools[0]};
  for(let i=0;i<599;i++)field.add({x:1,y:.043,z:1},1);
  assert.equal(field.pools.length,1);assert.equal(field.pools[0].volume,600);
  assert.equal(field.pools[0].x,initial.x);assert.equal(field.pools[0].z,initial.z);
  assert.ok(field.pools[0].radius>initial.radius);assert.ok(field.pools[0].depth>initial.depth);
});
test('minor aim jitter returns to the same pool without moving its anchor',()=>{
  const field=new PuddleField();field.add({x:1,y:.043,z:1},1);
  for(let i=0;i<300;i++)field.add({x:1+Math.sin(i)*.12,y:.043,z:1+Math.cos(i)*.12},1);
  assert.equal(field.pools.length,1);assert.equal(field.pools[0].x,1);assert.equal(field.pools[0].z,1);
  assert.equal(field.pools[0].volume,301);
});
test('distant drops still create their own pool after the old 48-pool limit',()=>{
  const field=new PuddleField();
  for(let i=0;i<60;i++)field.add({x:(i%10)*.65,y:.043,z:Math.floor(i/10)*.65},1);
  assert.equal(field.pools.length,60);assert.equal(field.pools.at(-1).volume,1);
  field.add({x:5.85,y:.043,z:3.25},9);assert.equal(field.pools.at(-1).volume,10);
});
test('coalescing pools preserves the oldest anchor and the total volume',()=>{
  const field=new PuddleField();field.add({x:0,y:.043,z:0},30);field.add({x:.75,y:.043,z:0},30);
  assert.equal(field.pools.length,2);
  for(let i=0;i<20;i++)field.add({x:0,y:.043,z:0},100);
  assert.equal(field.pools.length,1);assert.equal(field.pools[0].volume,2060);assert.equal(field.pools[0].x,0);
});
test('floor hits keep their location instead of being pushed away from the toilet',()=>{
  const p={x:.54,y:.018,z:-2};const resolved=resolvePuddlePoint({kind:'floor',point:p},toilet,room,[]);
  assert.equal(resolved.x,p.x);assert.equal(resolved.z,p.z);
});
test('fixture runoff reaches exposed floor, and rim runoff remains finite',()=>{
  const boxes=[{minX:1,maxX:2,minZ:-1,maxZ:1,height:1}];
  const p=resolvePuddlePoint({kind:'object',point:{x:1.02,y:.8,z:0}},toilet,room,boxes);
  assert.ok(p.x<1);assert.equal(p.z,0);
  const rim=resolvePuddlePoint({kind:'rim',point:{x:0,y:.72,z:-2}},toilet,room,[]);
  assert.ok(Number.isFinite(rim.x)&&Number.isFinite(rim.z));assert.ok(rim.z>-1.3);
});
