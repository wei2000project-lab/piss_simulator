const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function localPoint(point,box){
  if(!box.oriented)return {...point};
  const dx=point.x-box.centerX,dz=point.z-box.centerZ,c=Math.cos(box.angle),s=Math.sin(box.angle);
  return {x:dx*c-dz*s,y:point.y,z:dx*s+dz*c};
}
export function worldPoint(point,box){
  if(!box.oriented)return {...point};
  const c=Math.cos(box.angle),s=Math.sin(box.angle);
  return {x:box.centerX+point.x*c+point.z*s,y:point.y,z:box.centerZ-point.x*s+point.z*c};
}
export function localBounds(box){return box.oriented?{minX:-box.halfWidth,maxX:box.halfWidth,minZ:-box.halfDepth,maxZ:box.halfDepth}:box;}
export function footprintContains(point,box,padding=0){
  const p=localPoint(point,box),b=localBounds(box);
  return p.x>=b.minX-padding&&p.x<=b.maxX+padding&&p.z>=b.minZ-padding&&p.z<=b.maxZ+padding;
}
export function circleHitsBox(x,z,radius,box){
  const p=localPoint({x,z},box),b=localBounds(box),dx=p.x-clamp(p.x,b.minX,b.maxX),dz=p.z-clamp(p.z,b.minZ,b.maxZ);
  return dx*dx+dz*dz<radius*radius-1e-10;
}
export function segmentBoxHit(start,end,box){
  const a=localPoint(start,box),b=localPoint(end,box),bounds=localBounds(box);let enter=0,exit=1;
  for(const [axis,min,max] of [['x',bounds.minX,bounds.maxX],['y',box.minY??0,box.height],['z',bounds.minZ,bounds.maxZ]]){
    const delta=b[axis]-a[axis];
    if(Math.abs(delta)<1e-10){if(a[axis]<min||a[axis]>max)return null;continue;}
    const first=(min-a[axis])/delta,last=(max-a[axis])/delta;
    enter=Math.max(enter,Math.min(first,last));exit=Math.min(exit,Math.max(first,last));if(enter>exit)return null;
  }
  return enter;
}
export function footprintExits(point,box,room,margin=.065){
  const p=localPoint(point,box),b=localBounds(box);
  return [
    {x:b.minX-margin,z:p.z,d:Math.abs(p.x-b.minX)},
    {x:b.maxX+margin,z:p.z,d:Math.abs(p.x-b.maxX)},
    {x:p.x,z:b.minZ-margin,d:Math.abs(p.z-b.minZ)},
    {x:p.x,z:b.maxZ+margin,d:Math.abs(p.z-b.maxZ)},
  ].map(exit=>({...worldPoint(exit,box),d:exit.d}))
    .filter(e=>e.x>room.minX+.04&&e.x<room.maxX-.04&&e.z>room.minZ+.04&&e.z<room.maxZ-.04).sort((a,b)=>a.d-b.d);
}
