import * as THREE from 'three';
import { KITCHEN } from './spaces.js';

export function createKitchen(scene,{mesh,box,cylinder,pipe,materials,shadow}){
  const sage=new THREE.MeshStandardMaterial({color:'#7b8d7b',roughness:.75});
  const inset=new THREE.MeshStandardMaterial({color:'#71836f',roughness:.8});
  const stone=new THREE.MeshStandardMaterial({color:'#e8e1cc',roughness:.34});
  const steel=new THREE.MeshStandardMaterial({color:'#aeb9b1',metalness:.78,roughness:.24});
  const glass=new THREE.MeshPhysicalMaterial({color:'#33433a',roughness:.16,metalness:.18,clearcoat:1});
  const terracotta=new THREE.MeshStandardMaterial({color:'#b57e59',roughness:.95});
  const floor=mesh(new THREE.PlaneGeometry(KITCHEN.maxX-KITCHEN.minX,KITCHEN.maxZ-KITCHEN.minZ),
    new THREE.MeshStandardMaterial({map:tileTexture(),roughness:.5}),[(KITCHEN.minX+KITCHEN.maxX)/2,.004,(KITCHEN.minZ+KITCHEN.maxZ)/2]);
  floor.rotation.x=-Math.PI/2;floor.castShadow=false;
  box(KITCHEN.minX,.009,8.085,.022,.01,7.83,materials.brass,.002);

  // L-shaped cabinets, a recessed toe kick and continuous pale stone worktop.
  box(6.97,.46,11.55,3.94,.82,.82,sage,.025);
  box(8.555,.46,8.82,.77,.82,4.64,sage,.025);
  box(6.97,.075,11.58,3.8,.15,.64,materials.dark,.01);
  box(8.65,.075,8.82,.52,.15,4.5,materials.dark,.01);
  // Four slabs surround the open sink; no solid countertop covers its basin.
  for(const [x,z,w,d] of [[5.275,11.55,.55,.82],[7.745,11.55,2.39,.82],[6.05,11.205,1,.13],[6.05,11.89,1,.14]])box(x,.925,z,w,.07,d,stone,.012);
  box(8.555,.925,8.82,.77,.07,4.64,stone,.012);
  for(const x of [5.35,6.05,6.75,7.45,8.15]){
    box(x,.48,11.125,.66,.69,.035,sage,.014);
    box(x,.48,11.102,.54,.57,.012,inset,.008);
    box(x,.72,11.075,.23,.023,.035,materials.brass,.006);
  }
  for(const z of [6.9,7.7,9.55,10.35]){
    box(8.152,.48,z,.035,.69,.73,sage,.014);
    box(8.128,.48,z,.012,.57,.61,inset,.008);
    box(8.1,.72,z,.035,.023,.23,materials.brass,.006);
  }
  const backsplash=new THREE.MeshStandardMaterial({map:backsplashTexture(),roughness:.32});
  box(6.97,1.23,11.965,3.94,.54,.035,backsplash,.003);
  const sideSplash=backsplash.clone();sideSplash.map=backsplash.map.clone();sideSplash.map.repeat.set(1,3);
  box(8.965,1.23,8.83,.035,.54,4.67,sideSplash,.003);
  shadow(6.98,11.5,2,.55,.12);shadow(8.55,8.8,.5,2.4,.12);

  // Brushed-metal sink with an open bowl, drain, bridge tap and soap bottle.
  box(6.05,.795,11.545,.98,.025,.54,steel,.05);
  for(const x of [5.56,6.54])box(x,.865,11.545,.022,.14,.55,steel,.009);
  for(const z of [11.28,11.81])box(6.05,.865,z,1,.14,.022,steel,.009);
  cylinder(6.05,.813,11.545,.045,.005,materials.dark);
  pipe([[6.05,.96,11.88],[6.05,1.32,11.88],[6.05,1.41,11.65],[6.05,1.31,11.5]],.024,steel);
  cylinder(6.23,.992,11.87,.027,.075,steel);box(6.23,1.035,11.85,.025,.015,.09,steel,.006);
  cylinder(5.28,1.05,11.75,.045,.18,terracotta);box(5.28,1.16,11.75,.08,.025,.035,materials.brass,.006);

  // Induction hob, four rings, oven and a wall-mounted extractor hood.
  box(8.55,.969,8.4,.64,.018,1.03,glass,.03);
  for(const x of [8.37,8.71])for(const z of [8.15,8.62]){
    const ring=mesh(new THREE.TorusGeometry(.112,.006,6,32),steel,[x,.982,z]);ring.rotation.x=Math.PI/2;
    const inner=mesh(new THREE.TorusGeometry(.077,.003,5,28),steel,[x,.982,z]);inner.rotation.x=Math.PI/2;
  }
  box(8.145,.49,8.4,.055,.7,.99,steel,.025);
  box(8.11,.43,8.4,.018,.46,.83,glass,.02);
  box(8.07,.7,8.4,.045,.027,.72,steel,.009);
  for(const z of [8.12,8.68]){const knob=cylinder(8.1,.79,z,.033,.02,steel);knob.rotation.z=Math.PI/2;}
  box(8.66,1.83,8.4,.58,.1,1.1,steel,.025);
  box(8.79,2.2,8.4,.31,.72,.45,steel,.015);
  box(8.56,1.773,8.4,.3,.012,.77,materials.ivory,.006);
  cylinder(8.56,1.055,8.62,.135,.14,terracotta);
  cylinder(8.56,1.133,8.62,.145,.025,steel);cylinder(8.56,1.16,8.62,.032,.03,materials.dark);
  for(const z of [8.435,8.805])box(8.56,1.095,z,.12,.035,.055,steel,.012);

  // A full-height fridge faces the living room across the entrance aisle.
  box(8.43,1.115,5.185,1.02,2.23,1.53,materials.ivory,.075);
  for(const [y,h] of [[.39,.65],[1.465,1.42]])box(7.905,y,5.185,.055,h,1.44,stone,.035);
  box(7.86,.61,5.185,.04,.035,1.1,steel,.009);
  box(7.852,1.45,4.63,.045,.57,.03,steel,.009);
  box(7.867,1.65,5.43,.018,.15,.24,inset,.015);
  for(let i=0;i<3;i++)box(7.854,1.67-i*.035,5.43,.006,.009,.13,materials.ivory,.002);
  shadow(8.4,5.19,.67,.91,.17);

  // Island and two oak stools leave a wide route along the front of the room.
  box(5.2,.46,9.075,1.1,.83,2.01,sage,.035);
  box(5.2,.075,9.075,.94,.15,1.83,materials.dark,.01);
  box(5.2,.93,9.075,1.3,.08,2.15,stone,.045);
  for(const z of [8.58,9.56]){
    box(4.635,.48,z,.025,.69,.93,sage,.012);box(4.612,.48,z,.012,.57,.8,inset,.008);
  }
  for(const z of [8.41,9.65]){
    cylinder(3.99,.675,z,.23,.07,materials.wood);
    for(const dx of [-.135,.135])for(const dz of [-.135,.135])box(3.99+dx,.32,z+dz,.045,.64,.045,materials.wood,.009);
    for(const dx of [-.135,.135])box(3.99+dx,.24,z,.026,.026,.31,materials.brass,.005);
    shadow(3.99,z,.3,.3,.12);
  }
  shadow(5.2,9.075,.78,1.2,.13);
  box(5.22,.985,9.62,.64,.03,.43,materials.wood,.065);
  const bowl=mesh(new THREE.SphereGeometry(.22,24,12,0,Math.PI*2,Math.PI/2,Math.PI/2),terracotta,[5.2,1.13,8.62],[1,.63,1]);
  bowl.material=terracotta.clone();bowl.material.side=THREE.DoubleSide;
  const fruit=new THREE.MeshStandardMaterial({color:'#c99b50',roughness:.72});
  for(const [dx,dz,y] of [[-.08,0,1.12],[.07,-.06,1.14],[.05,.08,1.13]])mesh(new THREE.SphereGeometry(.075,14,10),fruit,[5.2+dx,y,8.62+dz]);
  for(const z of [8.46,9.64]){
    cylinder(5.2,3.1,z,.015,.5,materials.brass);
    mesh(new THREE.CylinderGeometry(.1,.25,.19,32),stone,[5.2,2.77,z]);cylinder(5.2,2.669,z,.22,.012,materials.ivory);
  }
  const pendant=new THREE.PointLight('#ffe3ac',5,5,2);pendant.position.set(5.2,2.55,9.05);scene.add(pendant);

  // Sink window, upper cupboards, herbs and a small clock finish the kitchen.
  box(6.08,2.12,11.94,2.0,1.13,.12,materials.wood,.02);
  const view=mesh(new THREE.PlaneGeometry(1.85,.98),new THREE.MeshBasicMaterial({map:windowTexture()}),[6.08,2.12,11.868]);view.rotation.y=Math.PI;
  for(const x of [5.12,6.08,7.04])box(x,2.12,11.82,.04,1.13,.055,materials.ivory,.006);
  box(6.08,1.535,11.76,2.12,.07,.28,stone,.015);
  for(const x of [7.67,8.52]){
    box(x,1.965,11.8,.83,.77,.34,sage,.025);
    box(x,1.965,11.616,.75,.69,.025,sage,.016);
    box(x-.26,1.72,11.589,.023,.16,.035,materials.brass,.005);
  }
  const leafMat=new THREE.MeshStandardMaterial({color:'#607d53',roughness:.9});
  for(const x of [5.3,6.8]){
    cylinder(x,1.64,11.76,.075,.14,terracotta,.055);
    for(let i=0;i<7;i++){
      const a=i*2.4,leaf=mesh(new THREE.SphereGeometry(1,8,6),leafMat,[x+Math.cos(a)*.055,1.76+(i%3)*.035,11.76+Math.sin(a)*.045],[.035,.09,.022]);leaf.rotation.z=Math.cos(a)*.6;
    }
  }
  box(8.55,1.09,10.4,.34,.24,.12,materials.wood,.04);
  for(let i=0;i<4;i++){const tool=cylinder(8.55,1.32,10.4+(i-1.5)*.023,.01,.29,materials.wood);tool.rotation.x=(i-1.5)*.13;}
  const clock=mesh(new THREE.CircleGeometry(.29,48),stone,[5.75,2.25,4.19]);
  const rim=mesh(new THREE.TorusGeometry(.3,.018,8,48),materials.wood,[5.75,2.25,4.195]);
  box(5.75,2.31,4.214,.018,.14,.012,materials.dark,.004);
  const hand=box(5.83,2.22,4.217,.18,.014,.012,materials.dark,.004);hand.rotation.z=-.4;
  const sun=new THREE.DirectionalLight('#fff0d3',1.65);sun.position.set(7.4,5.2,11.4);sun.target.position.set(4.4,0,7.1);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.5,far:15});sun.shadow.normalBias=.025;scene.add(sun,sun.target);
}

function texture(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'));const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;}
function tileTexture(){const t=texture(512,512,ctx=>{ctx.fillStyle='#bcb5a1';ctx.fillRect(0,0,512,512);const shades=['#d1c9b5','#d8d0bb','#cec6b1','#d5cdb9'];for(let y=0;y<4;y++)for(let x=0;x<4;x++){ctx.fillStyle=shades[(x+y*3)%4];ctx.fillRect(x*128+1,y*128+1,126,126);}});t.repeat.set(1.5,2.7);return t;}
function backsplashTexture(){const t=texture(512,128,ctx=>{ctx.fillStyle='#ddd7c5';ctx.fillRect(0,0,512,128);for(let y=0;y<2;y++)for(let x=-1;x<8;x++){ctx.fillStyle=['#a4ae99','#b0b8a4','#9fab94'][(x+8+y)%3];ctx.fillRect(x*96+(y%2)*48+1,y*64+1,94,62);}});t.repeat.set(2,1);return t;}
function windowTexture(){return texture(512,300,ctx=>{const g=ctx.createLinearGradient(0,0,0,300);g.addColorStop(0,'#c9d9d2');g.addColorStop(1,'#eee3bd');ctx.fillStyle=g;ctx.fillRect(0,0,512,300);for(let i=0;i<8;i++){ctx.fillStyle=['#94a47e','#b0ba91','#7e9676'][i%3];ctx.beginPath();ctx.ellipse(i*80,300,100,65+i%3*35,0,0,Math.PI*2);ctx.fill();}});}
