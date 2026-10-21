import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Materials and room boundaries are preserved. Geometry in a room can share a
// draw call, while closed-door room culling remains independent of the camera.
export function batchStaticScene(scene){
  scene.updateMatrixWorld(true);const buckets=new Map(),groups={},originals=[];
  scene.traverse(object=>{
    if(!object.isMesh||object.isReflector||Array.isArray(object.material)||!object.visible)return;
    for(let p=object;p&&p!==scene;p=p.parent)if(p.userData.dynamic)return;
    const zone=object.userData.zone||'bathroom',key=[zone,object.material.uuid,object.castShadow,object.receiveShadow,object.renderOrder].join(':');
    if(!buckets.has(key))buckets.set(key,{zone,material:object.material,cast:object.castShadow,receive:object.receiveShadow,order:object.renderOrder,geometries:[]});
    let geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);geometry.clearGroups();
    buckets.get(key).geometries.push(geometry);originals.push(object);
  });
  for(const bucket of buckets.values()){
    const geometry=mergeGeometries(bucket.geometries,false);
    if(!geometry)throw new Error('Static geometry could not be batched.');
    for(const source of bucket.geometries)source.dispose();
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const batch=new THREE.Mesh(geometry,bucket.material);batch.castShadow=bucket.cast;batch.receiveShadow=bucket.receive;batch.renderOrder=bucket.order;
    batch.matrixAutoUpdate=false;
    if(!groups[bucket.zone]){groups[bucket.zone]=new THREE.Group();groups[bucket.zone].name=bucket.zone+'-static';scene.add(groups[bucket.zone]);}
    groups[bucket.zone].add(batch);
  }
  for(const object of originals)object.removeFromParent();
  return {groups,before:originals.length,after:buckets.size};
}
