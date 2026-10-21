import * as THREE from 'three';
import { TOILET, ROOM, COLLIDERS } from './world.js';
import { PuddleField, PuddleMask, resolvePuddlePoint } from './puddles.js';

export class Fluids {
  constructor(scene) {
    this.scene=scene;this.field=new PuddleField();this.mask=new PuddleMask(ROOM);this.drops=[];this.ripples=[];
    this.dummy=new THREE.Object3D();this.up=new THREE.Vector3(0,1,0);this.direction=new THREE.Vector3();
    this.stream=new THREE.InstancedMesh(new THREE.CapsuleGeometry(1,1,2,6),new THREE.MeshPhysicalMaterial({
      color:'#efe3a4',transparent:true,opacity:.6,roughness:.13,metalness:.03,clearcoat:1,depthWrite:false,
    }),256);
    this.stream.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.stream.count=0;this.stream.frustumCulled=false;this.stream.visible=false;scene.add(this.stream);

    this.puddleTexture=new THREE.DataTexture(this.mask.data,this.mask.width,this.mask.height,THREE.RGBAFormat);
    this.puddleTexture.magFilter=THREE.LinearFilter;this.puddleTexture.minFilter=THREE.LinearFilter;this.puddleTexture.needsUpdate=true;
    this.puddleMaterial=new THREE.MeshPhysicalMaterial({map:this.puddleTexture,color:'#d2bd66',transparent:true,opacity:.57,alphaTest:.015,roughness:.07,metalness:.12,clearcoat:1,depthWrite:false});
    this.puddleSurface=new THREE.Mesh(new THREE.PlaneGeometry(ROOM.maxX-ROOM.minX,ROOM.maxZ-ROOM.minZ),this.puddleMaterial);
    this.puddleSurface.rotation.x=-Math.PI/2;this.puddleSurface.position.set((ROOM.minX+ROOM.maxX)/2,.043,(ROOM.minZ+ROOM.maxZ)/2);
    this.puddleSurface.renderOrder=2;this.puddleSurface.receiveShadow=true;this.puddleSurface.visible=false;scene.add(this.puddleSurface);

    this.dropGeo=new THREE.SphereGeometry(1,6,5);
    const dropMat=new THREE.MeshPhysicalMaterial({color:'#e9d991',transparent:true,opacity:.65,roughness:.15,clearcoat:1,depthWrite:false});
    for(let i=0;i<90;i++){const mesh=new THREE.Mesh(this.dropGeo,dropMat);mesh.visible=false;scene.add(mesh);this.drops.push({mesh,life:0,v:new THREE.Vector3()});}
    const ringGeo=new THREE.RingGeometry(.8,1,40);
    for(let i=0;i<14;i++){const mesh=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:'#ecedc4',transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.visible=false;scene.add(mesh);this.ripples.push({mesh,life:0});}
    this.target=new THREE.Mesh(new THREE.RingGeometry(.045,.053,36),new THREE.MeshBasicMaterial({color:'#f4eac7',transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide}));this.target.rotation.x=-Math.PI/2;scene.add(this.target);
    this.dropIndex=0;this.rippleIndex=0;this.splashTime=0;
  }
  get puddles(){return this.field.pools;}
  get animating(){return this.drops.some(d=>d.life>0)||this.ripples.some(r=>r.life>0);}
  showSegments(segments){
    let count=0;
    for(const segment of segments){
      this.direction.set(segment.head.x-segment.tail.x,segment.head.y-segment.tail.y,segment.head.z-segment.tail.z);
      const length=this.direction.length();if(length<.001)continue;
      if(count>=this.stream.instanceMatrix.count)throw new RangeError('Water segment render capacity exceeded.');
      this.dummy.position.set((segment.head.x+segment.tail.x)/2,(segment.head.y+segment.tail.y)/2,(segment.head.z+segment.tail.z)/2);
      this.dummy.quaternion.setFromUnitVectors(this.up,this.direction.divideScalar(length));
      this.dummy.scale.set(.009,length/3,.009);this.dummy.updateMatrix();this.stream.setMatrixAt(count++,this.dummy.matrix);
    }
    this.stream.count=count;this.stream.instanceMatrix.needsUpdate=true;this.stream.visible=count>0;
  }
  aim(trace,active){
    this.target.visible=active;if(!active)return;
    const landing=trace.kind==='bowl'?trace.point:resolvePuddlePoint(trace,TOILET,ROOM,COLLIDERS);
    this.target.position.set(landing.x,landing.y+.012,landing.z);
    this.target.material.color.set(trace.kind==='bowl'?'#c9e9aa':'#f4eac7');
  }
  addPuddle(impact,volume){
    const landing=resolvePuddlePoint(impact,TOILET,ROOM,COLLIDERS);
    const {patch}=this.field.add(landing,volume);
    this.mask.stamp(patch);this.puddleTexture.needsUpdate=true;this.puddleSurface.visible=true;
  }
  splash(hit,kind,time){
    if(time-this.splashTime<.045)return;this.splashTime=time;
    for(let i=0;i<3;i++){
      const d=this.drops[this.dropIndex++%this.drops.length];d.life=.2+Math.random()*.25;
      d.mesh.visible=true;d.mesh.position.set(hit.x,hit.y+.02,hit.z);d.mesh.scale.set(.009,.017,.009);
      const a=Math.random()*Math.PI*2,s=.2+Math.random()*.5;d.v.set(Math.cos(a)*s,.3+Math.random()*.8,Math.sin(a)*s);
    }
    if(kind==='bowl'||kind==='floor'){
      const r=this.ripples[this.rippleIndex++%this.ripples.length];r.life=.6;r.mesh.visible=true;r.mesh.position.set(hit.x,Math.max(.048,hit.y+.005),hit.z);r.mesh.scale.setScalar(.035);
    }
  }
  clearFloor(){this.field.clear();this.mask.clear();this.puddleTexture.needsUpdate=true;this.puddleSurface.visible=false;}
  reset(){this.clearFloor();this.stream.count=0;this.stream.visible=false;for(const d of this.drops){d.life=0;d.mesh.visible=false;}for(const r of this.ripples){r.life=0;r.mesh.visible=false;}}
  update(dt){
    for(const d of this.drops){if(d.life<=0)continue;d.life-=dt;d.v.y-=9.81*dt;d.mesh.position.addScaledVector(d.v,dt);if(d.life<=0||d.mesh.position.y<.025)d.mesh.visible=false;}
    for(const r of this.ripples){if(r.life<=0)continue;r.life-=dt;r.mesh.scale.setScalar((.6-r.life)*.27+.02);r.mesh.material.opacity=Math.max(0,r.life*.45);if(r.life<=0)r.mesh.visible=false;}
  }
}
