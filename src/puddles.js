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

export class PuddleField{
  constructor(){this.patches=[];this.parents=[];this.nextId=0;this._pools=[];this.dirty=true;}
  root(id){
    while(this.parents[id]!==id){this.parents[id]=this.parents[this.parents[id]];id=this.parents[id];}
    return id;
  }
  contains(point){return this.patches.some(p=>Math.hypot(point.x-p.x,point.z-p.z)<=p.radius);}
  get pools(){
    if(!this.dirty)return this._pools;
    const groups=new Map();
    for(const patch of this.patches){
      const id=this.root(patch.id);
      if(!groups.has(id)){
        const anchor=this.patches[id];
        groups.set(id,{id,x:anchor.x,y:anchor.y,z:anchor.z,volume:0,radius:0,depth:0,patchCount:0});
      }
      const group=groups.get(id);group.volume+=patch.volume;group.patchCount++;
      group.radius=Math.max(group.radius,Math.hypot(patch.x-group.x,patch.z-group.z)+patch.radius);
      group.depth=Math.max(group.depth,patch.depth);
    }
    this._pools=[...groups.values()];this.dirty=false;return this._pools;
  }
  add(point,volume){
    if(!Number.isFinite(volume)||volume<=0)throw new RangeError('Puddle volume must be positive.');
    // There is no nearest-pool attraction. A dry point creates a new footprint,
    // even when it is very close to another puddle.
    let patch=null,best=Infinity;
    for(const candidate of this.patches){
      const distance=Math.hypot(point.x-candidate.x,point.z-candidate.z);
      if(distance<=candidate.radius&&distance<best){patch=candidate;best=distance;}
    }
    if(!patch){
      patch={id:this.nextId++,x:point.x,z:point.z,y:point.y,volume:0,radius:0,depth:0};
      this.patches.push(patch);this.parents.push(patch.id);
    }
    patch.volume+=volume;
    patch.radius=Math.sqrt(.0004+patch.volume*.0008);
    patch.depth=.002+Math.min(.012,patch.volume*.000012);
    // Union only changes connectivity. Every lobe keeps its centre, radius and
    // volume, so touching water cannot inflate an untouched neighbouring lobe.
    for(const other of this.patches){
      if(other===patch||Math.hypot(patch.x-other.x,patch.z-other.z)>patch.radius+other.radius)continue;
      const a=this.root(patch.id),b=this.root(other.id);this.parents[Math.max(a,b)]=Math.min(a,b);
    }
    this.dirty=true;
    return {patch,poolId:this.root(patch.id)};
  }
  clear(){this.patches.length=0;this.parents.length=0;this._pools=[];this.nextId=0;this.dirty=true;}
}

// A single mask renders the geometric union. MAX coverage means overlapping
// footprints have exactly one surface, rather than stacked transparent discs.
export class PuddleMask{
  constructor(room,cellSize=.025){
    this.room=room;this.width=Math.ceil((room.maxX-room.minX)/cellSize);this.height=Math.ceil((room.maxZ-room.minZ)/cellSize);
    this.dx=(room.maxX-room.minX)/this.width;this.dz=(room.maxZ-room.minZ)/this.height;
    this.data=new Uint8Array(this.width*this.height*4);this.clear();
  }
  clear(){for(let i=0;i<this.data.length;i+=4){this.data[i]=255;this.data[i+1]=255;this.data[i+2]=255;this.data[i+3]=0;}this.version=(this.version||0)+1;}
  stamp(patch){
    const feather=Math.max(this.dx,this.dz),r=patch.radius+feather;
    const x0=clamp(Math.floor((patch.x-r-this.room.minX)/this.dx),0,this.width-1),x1=clamp(Math.ceil((patch.x+r-this.room.minX)/this.dx),0,this.width-1);
    const z0=clamp(Math.floor((this.room.maxZ-patch.z-r)/this.dz),0,this.height-1),z1=clamp(Math.ceil((this.room.maxZ-patch.z+r)/this.dz),0,this.height-1);
    for(let row=z0;row<=z1;row++)for(let col=x0;col<=x1;col++){
      const x=this.room.minX+(col+.5)*this.dx,z=this.room.maxZ-(row+.5)*this.dz;
      const alpha=Math.round(clamp((patch.radius-Math.hypot(x-patch.x,z-patch.z))/feather+.5,0,1)*255);
      const index=(row*this.width+col)*4+3;this.data[index]=Math.max(this.data[index],alpha);
    }
    this.version++;
  }
  alphaAt(point){
    const x=Math.floor((point.x-this.room.minX)/this.dx),z=Math.floor((this.room.maxZ-point.z)/this.dz);
    return x>=0&&z>=0&&x<this.width&&z<this.height?this.data[(z*this.width+x)*4+3]:0;
  }
}
