import test from 'node:test';
import assert from 'node:assert/strict';
import { traceStream, movePlayer, pointAt, standingHeight } from '../src/physics.js';

const toilet={x:0,z:-2,seat:.72,water:.39,innerX:.345,innerZ:.49,outerX:.51,outerZ:.69};
const room={minX:-3.5,maxX:3.5,minZ:-4,maxZ:4};
test('stream follows gravity and lands inside the open bowl',()=>{
  assert.equal(pointAt({x:0,y:1,z:0},{x:0,y:0,z:-4},1).y,1-9.81/2);
  const hit=traceStream({x:0,y:1.1,z:-.8},{x:0,y:0,z:-4},toilet,room,[]);
  assert.equal(hit.kind,'bowl');assert.equal(hit.point.y,.39);assert.ok(hit.points.length>10);
});
test('missing the toilet creates a floor hit, not a bowl hit',()=>{
  const hit=traceStream({x:1.5,y:1.1,z:-.8},{x:0,y:0,z:-4},toilet,room,[]);
  assert.equal(hit.kind,'floor');assert.equal(hit.point.y,.018);
});
test('the ceramic rim intercepts the arc before the floor',()=>{
  const hit=traceStream({x:.43,y:1.1,z:-.8},{x:0,y:0,z:-4},toilet,room,[]);
  assert.equal(hit.kind,'rim');assert.equal(hit.point.y,.72);
});
test('walls and furniture stop a stream',()=>{
  assert.equal(traceStream({x:3,y:1,z:0},{x:6,y:1,z:0},toilet,room,[]).kind,'wall');
  assert.equal(traceStream({x:1.5,y:1,z:0},{x:0,y:-2,z:-4},toilet,room,[{minX:1,maxX:2,minZ:-1,maxZ:-.2,height:.8}]).kind,'object');
});
test('movement cannot tunnel through furniture or the room boundary',()=>{
  const p={x:0,z:0,feet:0};const boxes=[{minX:.5,maxX:1,minZ:-1,maxZ:1,height:1}];
  movePlayer(p,3,0,.21,room,boxes);assert.ok(p.x<.3);
  movePlayer(p,-100,0,.21,room,boxes);assert.equal(p.x,-3.29);
});
test('landing respects raised furniture and allows jumping over it',()=>{
  const boxes=[{minX:-1,maxX:1,minZ:-1,maxZ:1,height:.7}];
  assert.equal(standingHeight({x:0,z:0,previousFeet:.8},boxes),.7);
  assert.equal(standingHeight({x:0,z:0,previousFeet:.2},boxes),0);
  const p={x:-2,z:0,feet:1};movePlayer(p,2,0,.2,room,boxes);assert.ok(p.x>-.1);
});
