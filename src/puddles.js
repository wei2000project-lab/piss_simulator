// Stable world-space accumulation, shared by the marker and the simulation.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function resolvePuddlePoint(impact,toilet,room,obstacles){
  let {x,z}=impact.point;
  if(impact.kind==='rim'){
    let dx=x-toilet.x,dz=z-toilet.z;
    if(Math.hypot(dx,dz)<.001){dx=0;dz=1;}
    const scale=1/Math.hypot(dx/(toilet.outerX+.12),dz/(toilet.outerZ+.12));
    x=toilet.x+dx*scale;z=toilet.z+dz*scale;
  }
  // Runoff from a fixture reaches its nearest exposed edge instead of being
  // drawn underneath the fixture. Direct floor hits retain their exact point.
  if(impact.kind==='object'||impact.kind==='rim'){
    for(let pass=0;pass<obstacles.length+1;pass++){
      const box=obstacles.find(b=>x>b.minX-.025&&x<b.maxX+.025&&z>b.minZ-.025&&z<b.maxZ+.025);
      if(!box)break;
      const exits=[
        {x:box.minX-.065,z,d:Math.abs(x-box.minX)},
        {x:box.maxX+.065,z,d:Math.abs(x-box.maxX)},
        {x,z:box.minZ-.065,d:Math.abs(z-box.minZ)},
        {x,z:box.maxZ+.065,d:Math.abs(z-box.maxZ)},
      ].filter(p=>p.x>room.minX+.04&&p.x<room.maxX-.04&&p.z>room.minZ+.04&&p.z<room.maxZ-.04);
      exits.sort((a,b)=>a.d-b.d);
      if(!exits.length)break;
      ({x,z}=exits[0]);
    }
  }
  return {x:clamp(x,room.minX+.055,room.maxX-.055),y:.043,z:clamp(z,room.minZ+.055,room.maxZ-.055)};
}

function grow(pool){
  pool.radius=Math.sqrt(.004+pool.volume*.0008);
  pool.depth=.002+Math.min(.012,pool.volume*.000012);
}
export class PuddleField{
  constructor(){this.pools=[];this.nextId=0;}
  add(point,volume){
    if(!Number.isFinite(volume)||volume<=0)throw new RangeError('Puddle volume must be positive.');
    // A small fixed catchment absorbs sub-pixel aim jitter. The anchor never
    // follows the new droplets, so holding aim grows the same pool in place.
    let pool=null,best=Infinity;
    for(const candidate of this.pools){
      const distance=Math.hypot(point.x-candidate.x,point.z-candidate.z);
      if(distance<=Math.max(.32,candidate.radius+.055)&&distance<best){pool=candidate;best=distance;}
    }
    if(!pool){
      pool={id:this.nextId++,x:point.x,z:point.z,y:point.y,volume:0,radius:0,depth:0};
      this.pools.push(pool);
    }
    pool.volume+=volume;grow(pool);
    const removed=[];
    // Coalesce touching pools while preserving the oldest anchor and every ml.
    let merged=true;
    while(merged){
      merged=false;
      for(const other of this.pools){
        if(other===pool||Math.hypot(pool.x-other.x,pool.z-other.z)>(pool.radius+other.radius)*.8)continue;
        const keep=pool.id<other.id?pool:other,discard=keep===pool?other:pool;
        keep.volume+=discard.volume;grow(keep);removed.push(discard.id);
        this.pools.splice(this.pools.indexOf(discard),1);pool=keep;merged=true;break;
      }
    }
    return {pool,removed};
  }
  clear(){this.pools.length=0;this.nextId=0;}
}
