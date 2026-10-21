import * as THREE from 'three';
import { TOILET, ROOM, COLLIDERS } from './world.js';
import { PuddleField, resolvePuddlePoint } from './puddles.js';

export class Fluids {
  constructor(scene) {
    this.scene=scene;this.field=new PuddleField();this.puddles=this.field.pools;this.puddleMeshes=new Map();this.drops=[];this.ripples=[];
    const segments=112,sides=7,positions=new Float32Array((segments+1)*sides*3),indices=[];
    this.segments=segments;this.sides=sides;
    for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides;indices.push(a,b,a+sides,b,b+sides,a+sides);}
    this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));this.geometry.setIndex(indices);
    this.stream=new THREE.Mesh(this.geometry,new THREE.MeshPhysicalMaterial({color:'#efe3a4',transparent:true,opacity:.65,transmission:.42,thickness:.035,roughness:.13,metalness:.03,clearcoat:1,depthWrite:false,side:THREE.DoubleSide}));
    this.stream.frustumCulled=false;this.stream.visible=false;scene.add(this.stream);
    this.puddleMaterial=new THREE.MeshPhysicalMaterial({color:'#d2bd66',transparent:true,opacity:.57,roughness:.07,metalness:.12,clearcoat:1,depthWrite:false,side:THREE.DoubleSide});
    const puddleVertices=[0,0,1],puddleIndices=[],rings=4,edges=48;
    for(let ring=1;ring<=rings;ring++)for(let j=0;j<edges;j++){
      const a=j/edges*Math.PI*2,t=ring/rings,r=t*(1+Math.sin(a*3+.4)*.08+Math.cos(a*5)*.045);
      puddleVertices.push(Math.cos(a)*r,Math.sin(a)*r,1-t*t);
    }
    for(let j=0;j<edges;j++)puddleIndices.push(0,1+j,1+(j+1)%edges);
    for(let ring=1;ring<rings;ring++)for(let j=0;j<edges;j++){
      const a=1+(ring-1)*edges+j,b=1+(ring-1)*edges+(j+1)%edges,c=a+edges,d=b+edges;
      puddleIndices.push(a,c,b,b,c,d);
    }
    this.puddleGeometry=new THREE.BufferGeometry();
    this.puddleGeometry.setAttribute('position',new THREE.Float32BufferAttribute(puddleVertices,3));
    this.puddleGeometry.setIndex(puddleIndices);
    this.puddleGeometry.computeVertexNormals();
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
    const landing=trace.kind==='bowl'?trace.point:resolvePuddlePoint(trace,TOILET,ROOM,COLLIDERS);
    this.target.position.set(landing.x,landing.y+.012,landing.z);
    this.target.material.color.set(trace.kind==='bowl'?'#c9e9aa':'#f4eac7');
    this.target.rotation.set(-Math.PI/2,0,0);
  }
  addPuddle(impact,volume){
    const landing=resolvePuddlePoint(impact,TOILET,ROOM,COLLIDERS);
    const {pool,removed}=this.field.add(landing,volume);
    for(const id of removed){const oldMesh=this.puddleMeshes.get(id);if(oldMesh)this.scene.remove(oldMesh);this.puddleMeshes.delete(id);}
    let mesh=this.puddleMeshes.get(pool.id);
    if(!mesh){
      mesh=new THREE.Mesh(this.puddleGeometry,this.puddleMaterial);
      mesh.rotation.set(-Math.PI/2,0,pool.id*2.39996);mesh.position.set(pool.x,pool.y,pool.z);mesh.renderOrder=2;
      this.puddleMeshes.set(pool.id,mesh);this.scene.add(mesh);
    }
    mesh.scale.set(pool.radius,pool.radius,pool.depth);
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
  clearFloor(){for(const mesh of this.puddleMeshes.values())this.scene.remove(mesh);this.puddleMeshes.clear();this.field.clear();}
  reset(){this.clearFloor();for(const d of this.drops){d.life=0;d.mesh.visible=false;}for(const r of this.ripples){r.life=0;r.mesh.visible=false;}}
  update(dt){
    for(const d of this.drops){if(d.life<=0)continue;d.life-=dt;d.v.y-=9.81*dt;d.mesh.position.addScaledVector(d.v,dt);if(d.life<=0||d.mesh.position.y<.025)d.mesh.visible=false;}
    for(const r of this.ripples){if(r.life<=0)continue;r.life-=dt;r.mesh.scale.setScalar((.6-r.life)*.27+.02);r.mesh.material.opacity=Math.max(0,r.life*.45);if(r.life<=0)r.mesh.visible=false;}
  }
}
