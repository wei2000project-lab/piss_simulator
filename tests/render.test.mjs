import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { DemandLoop, renderPixelRatio } from '../src/render-loop.js';
import { batchStaticScene } from '../src/static-scene.js';

function harness(hz=144,stampOffset=0){
  let time=0,id=0,continuous=false,visible=true;const events=new Map(),updates=[],draws=[];
  const timer=(fn,ms)=>{const key=id++;events.set(key,{time:time+ms,fn});return key;};
  const loop=new DemandLoop({update:dt=>updates.push(dt),render:t=>draws.push(t),continuous:()=>continuous,visible:()=>visible,
    now:()=>time,timer,cancelTimer:key=>events.delete(key),cancelRaf:key=>events.delete(key),
    raf:fn=>timer(()=>fn(time-stampOffset),(Math.floor((time+1e-6)/(1000/hz))+1)*(1000/hz)-time)});
  return {loop,updates,draws,events,set continuous(value){continuous=value;},set visible(value){visible=value;},
    advance(ms){const end=time+ms;let iterations=0;while(events.size){
      const [key,event]=[...events.entries()].sort((a,b)=>a[1].time-b[1].time)[0];if(event.time>end+1e-7)break;
      time=event.time;events.delete(key);event.fn();if(++iterations>10000)throw new Error('Busy loop');
    }time=end;}};
}
test('a static scene renders once and retains that frame without scheduling more work',()=>{
  const h=harness();h.loop.invalidate();h.advance(10000);assert.equal(h.draws.length,1);assert.equal(h.events.size,0);
  h.loop.invalidate();h.loop.invalidate();h.loop.invalidate();h.advance(1000);assert.equal(h.draws.length,2);assert.equal(h.events.size,0);
});
test('continuous rendering is capped at 60 FPS on 60, 144 and 240 Hz displays',()=>{
  for(const hz of [60,144,240]){
    const h=harness(hz);h.continuous=true;h.loop.invalidate();h.advance(5000);
    assert.ok(h.draws.length>=295&&h.draws.length<=300,hz+' Hz: '+h.draws.length+' frames');
    const elapsed=h.updates.reduce((sum,dt)=>sum+dt,0);assert.ok(Math.abs(elapsed-5)<.04,'simulation should retain real elapsed time');
  }
});
test('completed animation stops the loop and a later action starts with a fresh clock',()=>{
  const h=harness();h.continuous=true;h.loop.invalidate();h.advance(300);h.continuous=false;h.advance(100);
  const count=h.draws.length;h.advance(10000);assert.equal(h.draws.length,count);assert.equal(h.events.size,0);
  h.loop.invalidate();h.advance(100);assert.equal(h.draws.length,count+1);assert.equal(h.updates.at(-1),1/60);
});
test('stale RAF timestamps cannot cause catch-up frames after a slow wake-up',()=>{
  const h=harness(144,60);h.continuous=true;h.loop.invalidate();h.advance(5000);
  assert.ok(h.draws.length>=295&&h.draws.length<=300);assert.ok(h.updates.every(dt=>dt>0&&dt<=.04));
});
test('suspending cancels queued work and resuming never simulates the hidden interval',()=>{
  const h=harness();h.continuous=true;h.loop.invalidate();h.advance(200);h.loop.suspend();const count=h.draws.length;
  h.loop.invalidate();h.advance(20000);assert.equal(h.draws.length,count);assert.equal(h.events.size,0);
  h.loop.resume();h.advance(8);assert.equal(h.draws.length,count+1);assert.equal(h.updates.at(-1),1/60);
});
test('hidden views issue no draw calls and paused views can explicitly redraw after resize',()=>{
  const h=harness();h.visible=false;h.loop.invalidate();h.advance(1000);assert.equal(h.draws.length,0);
  h.visible=true;h.loop.resume();h.advance(100);assert.equal(h.draws.length,1);
  h.loop.stop();h.advance(1000);assert.equal(h.draws.length,1);h.loop.invalidate();h.advance(100);assert.equal(h.draws.length,2);
});
test('render resolution is bounded at 1080p worth of pixels on high-DPI and 4K displays',()=>{
  assert.equal(renderPixelRatio(3840,2160,2),.5);assert.equal(renderPixelRatio(1920,1080,2),1);
  assert.equal(renderPixelRatio(1024,768,1),1);assert.equal(renderPixelRatio(1024,768,2),1.25);
  for(const [w,h] of [[3840,2160],[2560,1440],[1536,864]])assert.ok(w*h*renderPixelRatio(w,h,2)**2<=1920*1080+1);
});
test('static batching preserves world transforms, material identity and independent room culling',()=>{
  const scene=new THREE.Scene(),material=new THREE.MeshStandardMaterial(),chair=new THREE.Group();chair.position.set(2,0,3);chair.rotation.y=Math.PI/2;scene.add(chair);
  const first=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);first.position.x=1;chair.add(first);
  const second=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);second.position.x=-2;scene.add(second);
  const kitchen=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);kitchen.userData.zone='kitchen';kitchen.position.x=8;scene.add(kitchen);
  const door=new THREE.Group();door.userData.dynamic=true;const panel=new THREE.Mesh(new THREE.BoxGeometry(1,2,.1),material);door.add(panel);scene.add(door);
  const water=new THREE.Mesh(new THREE.CircleGeometry(1),material);water.userData.dynamic=true;scene.add(water);
  const result=batchStaticScene(scene);assert.equal(result.before,3);assert.equal(result.after,2);
  const bath=result.groups.bathroom.children[0];assert.equal(bath.material,material);
  assert.deepEqual(bath.geometry.boundingBox.min.toArray(),[-2.5,-.5,0-0.5]);
  assert.deepEqual(bath.geometry.boundingBox.max.toArray(),[2.5,.5,2.5]);
  assert.equal(panel.parent,door);assert.equal(water.parent,scene);
  result.groups.kitchen.visible=false;assert.equal(result.groups.bathroom.visible,true);assert.equal(door.visible,true);
});
