import { FLOW_RATE, GRAVITY, pointAt, sweepWater } from './physics.js';
import { resolvePuddlePoint } from './puddles.js';

export const EMISSION_INTERVAL=1/60;
const copySource=source=>({origin:{...source.origin},velocity:{...source.velocity}});
const lerpPoint=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});

export class WaterSimulation{
  constructor(toilet,room,obstacles){this.toilet=toilet;this.room=room;this.obstacles=obstacles;this.clear();}
  clear(){this.parcels=[];this.remainder=0;this.lastSource=null;this.nextId=0;}
  emit(source,volume,duration){
    const parcel={id:this.nextId++,...copySource(source),position:{...source.origin},age:0,phase:'flight',inBowl:false,volume,duration:Math.min(.018,duration*.72)};
    this.parcels.push(parcel);return parcel;
  }
  advanceParcel(parcel,dt,impacts){
    let remaining=dt;
    while(remaining>1e-8&&parcel.phase!=='landed'){
      if(parcel.phase==='flight'){
        const h=Math.min(remaining,1/120),next=pointAt(parcel.origin,parcel.velocity,parcel.age+h);
        const hit=sweepWater(parcel.position,next,parcel,this.toilet,this.room,this.obstacles);
        if(!hit){parcel.age+=h;parcel.position=next;remaining-=h;continue;}
        const elapsed=h*hit.fraction;parcel.age+=elapsed;remaining-=elapsed;
        parcel.position={...hit.point};parcel.hit=hit;parcel.phase='contact';parcel.contact=0;
        parcel.contactTail=pointAt(parcel.origin,parcel.velocity,Math.max(0,parcel.age-parcel.duration));
      }else if(parcel.phase==='contact'){
        const elapsed=Math.min(remaining,parcel.duration-parcel.contact);parcel.contact+=elapsed;remaining-=elapsed;
        if(parcel.contact<parcel.duration-1e-8)continue;
        if(parcel.hit.kind==='floor'||parcel.hit.kind==='bowl'){
          impacts.push({...parcel.hit,volume:parcel.volume,parcelId:parcel.id});parcel.phase='landed';
        }else{
          // A wall/fixture hit is not floor water yet. The same visible segment
          // must finish sliding/falling to the projected drainage point first.
          parcel.phase='runoff';parcel.runoffAge=0;parcel.runoffStart={...parcel.hit.point};
          parcel.runoffEnd=resolvePuddlePoint(parcel.hit,this.toilet,this.room,this.obstacles);
          parcel.runoffTime=Math.max(.12,Math.sqrt(2*Math.max(0,parcel.runoffStart.y-parcel.runoffEnd.y)/GRAVITY),Math.hypot(parcel.runoffEnd.x-parcel.runoffStart.x,parcel.runoffEnd.z-parcel.runoffStart.z)/1.2);
        }
      }else{
        const elapsed=Math.min(remaining,parcel.runoffTime+parcel.duration-parcel.runoffAge);parcel.runoffAge+=elapsed;remaining-=elapsed;
        parcel.position=this.runoffPoint(parcel,parcel.runoffAge);
        if(parcel.runoffAge>=parcel.runoffTime+parcel.duration-1e-8){impacts.push({kind:'floor',surfaceKind:parcel.hit.kind,point:{...parcel.runoffEnd},volume:parcel.volume,parcelId:parcel.id});parcel.phase='landed';}
      }
    }
  }
  runoffPoint(parcel,age){
    const t=Math.min(1,Math.max(0,age/parcel.runoffTime));
    return {x:parcel.runoffStart.x+(parcel.runoffEnd.x-parcel.runoffStart.x)*t,y:parcel.runoffStart.y+(parcel.runoffEnd.y-parcel.runoffStart.y)*t*t,z:parcel.runoffStart.z+(parcel.runoffEnd.z-parcel.runoffStart.z)*t};
  }
  advance(dt,source,available){
    const impacts=[];let emitted=0;
    // Advance existing chunks first; newly emitted chunks get only the time
    // since their own birth, never the age of the entire stream.
    for(const parcel of this.parcels)this.advanceParcel(parcel,dt,impacts);
    if(source&&available>0){
      this.lastSource=copySource(source);this.remainder+=dt;
      while(this.remainder>=EMISSION_INTERVAL-1e-9&&available-emitted>1e-9){
        this.remainder-=EMISSION_INTERVAL;
        const volume=Math.min(available-emitted,FLOW_RATE*EMISSION_INTERVAL);
        const parcel=this.emit(source,volume,volume/FLOW_RATE);emitted+=volume;
        this.advanceParcel(parcel,this.remainder,impacts);
      }
      if(available-emitted<1e-9)this.remainder=0;
    }else if(this.lastSource&&this.remainder>1e-9){
      const volume=Math.min(available,FLOW_RATE*this.remainder);
      if(volume>1e-9){this.emit(this.lastSource,volume,volume/FLOW_RATE);emitted+=volume;}
      this.remainder=0;this.lastSource=null;
    }
    this.parcels=this.parcels.filter(p=>p.phase!=='landed');
    return {emitted,impacts};
  }
  segments(){
    return this.parcels.map(parcel=>{
      let tail;
      if(parcel.phase==='flight')tail=pointAt(parcel.origin,parcel.velocity,Math.max(0,parcel.age-parcel.duration));
      else if(parcel.phase==='contact')tail=lerpPoint(parcel.contactTail,parcel.position,Math.min(1,parcel.contact/parcel.duration));
      else tail=this.runoffPoint(parcel,Math.max(0,parcel.runoffAge-parcel.duration));
      return {id:parcel.id,head:{...parcel.position},tail,phase:parcel.phase,volume:parcel.volume};
    });
  }
}
