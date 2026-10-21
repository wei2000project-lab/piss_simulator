import test from 'node:test';
import assert from 'node:assert/strict';
import { PuddleField, PuddleMask, resolvePuddlePoint } from '../src/puddles.js';
const toilet={x:0,z:-2,outerX:.51,outerZ:.69};
const room={minX:-3.5,maxX:3.5,minZ:-4,maxZ:4};
const point=(x,z=0)=>({x,y:.043,z});
test('repeated impacts grow only the touched footprint at its fixed centre',()=>{
  const field=new PuddleField();field.add(point(1,1),1);const before={...field.patches[0]};
  for(let i=0;i<599;i++)field.add(point(1,1),1);
  assert.equal(field.pools.length,1);assert.equal(field.patches.length,1);assert.equal(field.pools[0].volume,600);
  assert.equal(field.patches[0].x,before.x);assert.equal(field.patches[0].z,before.z);assert.ok(field.patches[0].radius>before.radius);
});
test('a dry impact near water creates its own patch instead of attracting water to a neighbour',()=>{
  const field=new PuddleField();field.add(point(0),10);const before={...field.patches[0]};
  field.add(point(.22),1);
  assert.equal(field.patches.length,2);assert.equal(field.pools.length,2);assert.deepEqual(field.patches[0],before);
  assert.equal(field.patches[1].x,.22);assert.equal(field.patches[1].volume,1);
});
test('touching joins connectivity while preserving both footprints and their volume',()=>{
  const field=new PuddleField();field.add(point(0),30);const left={...field.patches[0]};field.add(point(.24),30);
  assert.equal(field.pools.length,1);assert.equal(field.patches.length,2);assert.equal(field.pools[0].volume,60);
  assert.deepEqual(field.patches[0],left);assert.equal(field.patches[1].x,.24);
});
test('only the lobe actually hit by falling water grows after two pools have joined',()=>{
  const field=new PuddleField();field.add(point(0),30);field.add(point(.5),30);const right={...field.patches[1]};
  field.add(point(0),200);
  assert.equal(field.pools.length,1);assert.equal(field.patches.length,2);assert.deepEqual(field.patches[1],right);
  assert.equal(field.patches[0].volume,230);assert.equal(field.pools[0].volume,260);
});
test('the rendered union preserves both lobes, leaves dry gaps dry and does not double opacity',()=>{
  const field=new PuddleField(),mask=new PuddleMask(room),maskA=new PuddleMask(room),maskB=new PuddleMask(room);
  const a=field.add(point(0),30).patch;mask.stamp(a);maskA.stamp(a);
  const b=field.add(point(.24),30).patch;mask.stamp(b);maskB.stamp(b);
  assert.ok(mask.alphaAt(point(-.1))>200);assert.ok(mask.alphaAt(point(.34))>200);
  assert.equal(mask.alphaAt(point(.12,.2)),0);
  for(const p of [point(.12),point(.06,.08),point(.18,-.08)])
    assert.equal(mask.alphaAt(p),Math.max(maskA.alphaAt(p),maskB.alphaAt(p)));
});
test('touching/read-only grouping never expands a footprint without another impact',()=>{
  const field=new PuddleField();field.add(point(0),30);field.add(point(.24),30);
  const before=JSON.stringify(field.patches);for(let i=0;i<50;i++)assert.equal(field.pools.length,1);
  assert.equal(JSON.stringify(field.patches),before);
});
test('more than 48 distinct patches retain their actual locations and all water',()=>{
  const field=new PuddleField();
  for(let i=0;i<60;i++)field.add(point((i%10)*.65,Math.floor(i/10)*.65),1);
  assert.equal(field.pools.length,60);field.add(point(5.85,3.25),9);
  assert.equal(field.patches.at(-1).volume,10);assert.equal(field.pools.reduce((sum,p)=>sum+p.volume,0),69);
});
test('floor impacts retain their location and fixture runoff reaches exposed floor',()=>{
  const p=point(.54,-2),floor=resolvePuddlePoint({kind:'floor',point:p},toilet,room,[]);
  assert.equal(floor.x,p.x);assert.equal(floor.z,p.z);
  const boxes=[{minX:1,maxX:2,minZ:-1,maxZ:1,height:1}];
  const runoff=resolvePuddlePoint({kind:'object',point:{x:1.02,y:.8,z:0}},toilet,room,boxes);
  assert.ok(runoff.x<1);assert.equal(runoff.z,0);
  const rim=resolvePuddlePoint({kind:'rim',point:{x:0,y:.72,z:-2}},toilet,room,[]);
  assert.ok(Number.isFinite(rim.x)&&Number.isFinite(rim.z));
});