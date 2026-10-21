import * as THREE from 'three';
import { TOILET, ROOM } from './world.js';

export class Fluids {
  constructor(scene) {
    this.scene=scene;this.puddles=[];this.drops=[];this.ripples=[];
    const segments=112,sides=7,positions=new Float32Array((segments+1)*sides*3),indices=[];
    this.segments=segments;this.sides=sides;
    for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides;indices.push(a,b,a+sides,b,b+sides,a+sides);}
    this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));this.geometry.setIndex(indices);
    this.stream=new THREE.Mesh(this.geometry,new THREE.MeshPhysicalMaterial({color:'#efe3a4',transparent:true,opacity:.65,transmission:.42,thickness:.035,roughness:.13,metalness:.03,clearcoat:1,depthWrite:false,side:THREE.DoubleSide}));
    this.stream.frustumCulled=false;this.stream.visible=false;scene.add(this.stream);
    this.puddleMaterial=new THREE.MeshPhysicalMaterial({color:'#d2bd66',transparent:true,opacity:.46,roughness:.09,metalness:.12,clearcoat:1,depthWrite:false,side:THREE.DoubleSide});
    const shape=new THREE.Shape();
    for(let i=0;i<=48;i++){const a=i/48*Math.PI*2,r=1+Math.sin(a*3+.4)*.08+Math.cos(a*5)*.045;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);}
    this.puddleGeometry=new THREE.ShapeGeometry(shape,48);
    this.dropGeo=new THREE.SphereGeometry(1,6,5);
    const dropMat=new THREE.MeshPhysicalMaterial({color:'#e9d991',transparent:true,opacity:.65,roughness:.15,clearcoat:1,depthWrite:false});
    for(let i=0;i<90;i++){const mesh=new THREE.Mesh(this.dropGeo,dropMat);mesh.visible=false;mesh.castShadow=false;scene.add(mesh);this.drops.push({mesh,life:0,v:new THREE.Vector3()});}
    const ringGeo=new THREE.RingGeometry(.8,1,40);
    for(let i=0;i<14;i++){const mesh=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:'#ecedc4',transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.visible=false;scene.add(mesh);this.ripples.push({mesh,life:0});}
    this.target=new THREE.Mesh(new THREE.RingGeometry(.045,.053,36),new THREE.MeshBasicMaterial({color:'#f4eac7',transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide}));this.target.rotation.x=-Math.PI/2;scene.add(this.target);
    this.dropIndex=0;this.rippleIndex=0;this.splashTime=0;
  }
  showStream(trace,time,active,age){
    this.stream.visible=active;if(!active)return;
    const points=trace.points,limit=Math.min(points.length-1,Math.max(1,age/.012));
    const attr=this.geometry.attributes.position, p=new THREE.Vector3(),next=new THREE.Vector3(),tangent=new THREE.Vector3(),normal=new THREE.Vector3(),binormal=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
    for(let i=0;i<=this.segments;i++){
      const f=i/this.segments*limit,index=Math.min(points.length-2,Math.floor(f)),alpha=f-index;
      p.copy(points[index]).lerp(points[index+1],alpha);next.copy(points[index+1]);tangent.subVectors(next,points[index]).normalize();
      normal.crossVectors(tangent,up).normalize();if(normal.lengthSq()<.1)normal.set(1,0,0);binormal.crossVectors(tangent,normal).normalize();
      const radius=(.0087+Math.sin(i*.5-time*28)*.0013)*(1-i/this.segments*.28);
      for(let j=0;j<this.sides;j++){const a=j/this.sides*Math.PI*2,c=Math.cos(a)*radius,s=Math.sin(a)*radius;attr.setXYZ(i*this.sides+j,p.x+normal.x*c+binormal.x*s,p.y+normal.y*c+binormal.y*s,p.z+normal.z*c+binormal.z*s);}
    }
    attr.needsUpdate=true;this.geometry.computeVertexNormals();
  }
  aim(trace,active){
    this.target.visible=active;
    if(!active)return;
    this.target.position.set(trace.point.x,trace.point.y+.008,trace.point.z);
    this.target.material.color.set(trace.kind==='bowl'?'#c9e9aa':'#f4eac7');
    this.target.rotation.set(-Math.PI/2,0,0);
    if(trace.kind==='wall'){
      if(Math.abs(trace.point.x)>3.4)this.target.rotation.set(0,Math.PI/2,0);
      else this.target.rotation.set(0,0,0);
    }
  }
  addPuddle(hit,volume){
    let x=hit.x,z=hit.z;
    const dx=x-TOILET.x,dz=z-TOILET.z;
    // Water that hits the outside ceramic runs down to the nearest floor edge.
    if((dx/.57)**2+(dz/.76)**2<1.05){const len=Math.hypot(dx/.57,dz/.76)||1;x=TOILET.x+dx/len*1.2;z=TOILET.z+dz/len*1.2;}
    x=THREE.MathUtils.clamp(x,ROOM.minX+.18,ROOM.maxX-.18);z=THREE.MathUtils.clamp(z,ROOM.minZ+.18,ROOM.maxZ-.18);
    let nearest=null,distance=Infinity;
    for(const p of this.puddles){const d=Math.hypot(x-p.x,z-p.z);if(d<distance){distance=d;nearest=p;}}
    if(!nearest || (distance>Math.max(.29,nearest.radius*.75) && this.puddles.length<48)){
      const mesh=new THREE.Mesh(this.puddleGeometry,this.puddleMaterial);mesh.rotation.x=-Math.PI/2;mesh.rotation.z=Math.random()*6;mesh.position.set(x,.045+this.puddles.length*.0001,z);mesh.renderOrder=2;this.scene.add(mesh);
      nearest={mesh,x,z,volume:0,radius:.04,stretch:.75+Math.random()*.4};this.puddles.push(nearest);
    }
    nearest.volume+=volume;nearest.radius=Math.min(1.6,Math.sqrt(.002+nearest.volume*.0017));
    nearest.mesh.scale.set(nearest.radius,nearest.radius*nearest.stretch,1);
  }
  splash(hit,kind,time){
    if(time-this.splashTime<.045)return;this.splashTime=time;
    for(let i=0;i<3;i++){
      const d=this.drops[this.dropIndex++%this.drops.length];d.life=.2+Math.random()*.25;
      d.mesh.visible=true;d.mesh.position.set(hit.x,hit.y+.02,hit.z);d.mesh.scale.set(.009,.017,.009);
      const a=Math.random()*Math.PI*2,s=.2+Math.random()*.5;d.v.set(Math.cos(a)*s,.3+Math.random()*.8,Math.sin(a)*s);
    }
    if(kind==='bowl' || kind==='floor'){
      const r=this.ripples[this.rippleIndex++%this.ripples.length];r.life=.6;r.mesh.visible=true;r.mesh.position.set(hit.x,hit.y+.005,hit.z);r.mesh.scale.setScalar(.035);
    }
  }
  clearFloor(){for(const p of this.puddles)this.scene.remove(p.mesh);this.puddles.length=0;}
  reset(){this.clearFloor();for(const d of this.drops){d.life=0;d.mesh.visible=false;}for(const r of this.ripples){r.life=0;r.mesh.visible=false;}}
  update(dt){
    for(const d of this.drops){if(d.life<=0)continue;d.life-=dt;d.v.y-=9.81*dt;d.mesh.position.addScaledVector(d.v,dt);if(d.life<=0||d.mesh.position.y<.025)d.mesh.visible=false;}
    for(const r of this.ripples){if(r.life<=0)continue;r.life-=dt;r.mesh.scale.setScalar((.6-r.life)*.27+.02);r.mesh.material.opacity=Math.max(0,r.life*.45);if(r.life<=0)r.mesh.visible=false;}
  }
}
