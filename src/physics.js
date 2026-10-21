// Shared deterministic simulation, independent of WebGL and the user interface.
export const GRAVITY = 9.81;
export const FLOW_RATE = 92; // millilitres per second
export const CAPACITY = 1200;
export function ellipseContains(x, z, center, radiusX, radiusZ) {
  return ((x-center.x)/radiusX)**2 + ((z-center.z)/radiusZ)**2 <= 1;
}
export function pointAt(origin, velocity, t) {
  return { x: origin.x+velocity.x*t, y: origin.y+velocity.y*t-GRAVITY*t*t/2, z: origin.z+velocity.z*t };
}
function segmentBoxHit(start,end,box){
  let enter=0,exit=1;
  for(const [axis,min,max] of [['x',box.minX,box.maxX],['y',0,box.height],['z',box.minZ,box.maxZ]]){
    const delta=end[axis]-start[axis];
    if(Math.abs(delta)<1e-10){if(start[axis]<min||start[axis]>max)return null;continue;}
    const first=(min-start[axis])/delta,last=(max-start[axis])/delta;
    enter=Math.max(enter,Math.min(first,last));exit=Math.min(exit,Math.max(first,last));
    if(enter>exit)return null;
  }
  return enter;
}
export function traceStream(origin, velocity, toilet, room, obstacles) {
  const points = [{ ...origin }];
  let prev = origin, inBowl = false;
  for (let i=1;i<=110;i++) {
    const t=i*.012, p=pointAt(origin,velocity,t);
    if (prev.y>toilet.seat && p.y<=toilet.seat) {
      const fraction=(prev.y-toilet.seat)/(prev.y-p.y);
      const cross={x:prev.x+(p.x-prev.x)*fraction,y:toilet.seat,z:prev.z+(p.z-prev.z)*fraction};
      if (ellipseContains(cross.x,cross.z,toilet,toilet.innerX,toilet.innerZ)) inBowl=true;
      else if(ellipseContains(cross.x,cross.z,toilet,toilet.outerX,toilet.outerZ)) {
        points.push(cross); return {points,kind:'rim',point:cross,time:t};
      }
    }
    if(inBowl && p.y<=toilet.water){
      const f=(prev.y-toilet.water)/(prev.y-p.y),hit={x:prev.x+(p.x-prev.x)*f,y:toilet.water,z:prev.z+(p.z-prev.z)*f};
      points.push(hit);return {points,kind:'bowl',point:hit,time:t};
    }
    if(!inBowl && p.y<toilet.seat && p.y>.22 && ellipseContains(p.x,p.z,toilet,toilet.outerX*.86,toilet.outerZ*.86)){
      points.push(p);return {points,kind:'rim',point:p,time:t};
    }
    if(p.y<=.018){
      const f=(prev.y-.018)/(prev.y-p.y),hit={x:prev.x+(p.x-prev.x)*f,y:.018,z:prev.z+(p.z-prev.z)*f};
      points.push(hit);return {points,kind:'floor',point:hit,time:t};
    }
    if(p.x<room.minX+.03||p.x>room.maxX-.03||p.z<room.minZ+.03||p.z>room.maxZ-.03){
      const hit={x:Math.max(room.minX+.04,Math.min(room.maxX-.04,p.x)),y:Math.max(.02,p.y),z:Math.max(room.minZ+.04,Math.min(room.maxZ-.04,p.z))};
      points.push(hit);return {points,kind:'wall',point:hit,time:t};
    }
    let closest=null;
    for(let j=0;j<obstacles.length;j++){
      // The curved toilet bowl is handled above; the tank remains solid.
      const b=obstacles[j];
      if(b.toilet) continue;
      const fraction=segmentBoxHit(prev,p,b);
      if(fraction!==null&&(!closest||fraction<closest.fraction))closest={fraction,obstacle:j};
    }
    if(closest){
      const f=closest.fraction,hit={x:prev.x+(p.x-prev.x)*f,y:prev.y+(p.y-prev.y)*f,z:prev.z+(p.z-prev.z)*f};
      points.push(hit);return {points,kind:'object',point:hit,time:(i-1+f)*.012,obstacle:closest.obstacle};
    }
    points.push(p);prev=p;
  }
  return {points,kind:'floor',point:points.at(-1),time:1.32};
}
export function movePlayer(player, dx, dz, radius, room, obstacles) {
  const blocks=(x,z)=>obstacles.some(b=>player.feet<b.height-.04 && x+radius>b.minX&&x-radius<b.maxX&&z+radius>b.minZ&&z-radius<b.maxZ);
  // Substeps prevent Shift movement from tunnelling through a narrow collider.
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.09));
  for(let i=0;i<steps;i++){
    const x=Math.max(room.minX+radius,Math.min(room.maxX-radius,player.x+dx/steps));
    if(!blocks(x,player.z)) player.x=x;
    const z=Math.max(room.minZ+radius,Math.min(room.maxZ-radius,player.z+dz/steps));
    if(!blocks(player.x,z)) player.z=z;
  }
}
export function standingHeight(player, obstacles) {
  let height=0;
  for(const b of obstacles) if(player.x>b.minX-.12&&player.x<b.maxX+.12&&player.z>b.minZ-.12&&player.z<b.maxZ+.12&&player.previousFeet>=b.height-.025) height=Math.max(height,b.height);
  return height;
}
