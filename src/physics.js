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
export function sweepWater(start,end,flight,toilet,room,obstacles){
  let hit=null;
  const offer=(kind,fraction,extra={})=>{
    const f=Math.max(0,Math.min(1,fraction));
    if(hit&&hit.fraction<=f)return;
    hit={kind,fraction:f,point:{x:start.x+(end.x-start.x)*f,y:start.y+(end.y-start.y)*f,z:start.z+(end.z-start.z)*f},...extra};
  };
  if(start.y>toilet.seat&&end.y<=toilet.seat){
    const f=(start.y-toilet.seat)/(start.y-end.y),x=start.x+(end.x-start.x)*f,z=start.z+(end.z-start.z)*f;
    if(ellipseContains(x,z,toilet,toilet.innerX,toilet.innerZ))flight.inBowl=true;
    else if(ellipseContains(x,z,toilet,toilet.outerX,toilet.outerZ))offer('rim',f);
  }
  if(flight.inBowl&&end.y<=toilet.water&&start.y>toilet.water)offer('bowl',(start.y-toilet.water)/(start.y-end.y));
  if(!flight.inBowl&&end.y<toilet.seat&&end.y>.22&&ellipseContains(end.x,end.z,toilet,toilet.outerX*.86,toilet.outerZ*.86))offer('rim',1);
  if(end.y<=.018)offer('floor',start.y>.018?(start.y-.018)/(start.y-end.y):0);
  for(const [axis,min,max] of [['x',room.minX+.03,room.maxX-.03],['z',room.minZ+.03,room.maxZ-.03]]){
    if(end[axis]<min)offer('wall',start[axis]>=min?(min-start[axis])/(end[axis]-start[axis]):0);
    if(end[axis]>max)offer('wall',start[axis]<=max?(max-start[axis])/(end[axis]-start[axis]):0);
  }
  for(let j=0;j<obstacles.length;j++){
    if(obstacles[j].toilet)continue;
    const fraction=segmentBoxHit(start,end,obstacles[j]);
    if(fraction!==null)offer('object',fraction,{obstacle:j});
  }
  return hit;
}
export function traceStream(origin,velocity,toilet,room,obstacles){
  const points=[{...origin}],flight={inBowl:false};let previous=origin;
  for(let i=1;i<=300;i++){
    const point=pointAt(origin,velocity,i*.012),hit=sweepWater(previous,point,flight,toilet,room,obstacles);
    if(hit){points.push(hit.point);return {...hit,points,time:(i-1+hit.fraction)*.012};}
    points.push(point);previous=point;
  }
  return {points,kind:'floor',point:points.at(-1),time:3.6};
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
