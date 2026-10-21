import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { TOILET, DOOR_CONTROLLER } from './spaces.js';
import { DOOR } from './door.js';
import { createLivingRoom } from './living-room.js';
export { TOILET, ROOM, COLLIDERS } from './spaces.js';

export function createWorld(scene, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new RoomEnvironment();
  const environment = pmrem.fromScene(env, .04);
  scene.environment = environment.texture;
  env.dispose(); pmrem.dispose();
  scene.background = new THREE.Color('#ddd8c1');
  scene.fog = new THREE.Fog('#d7d3bc', 12, 26);
  scene.environmentIntensity = .48;
  scene.add(new THREE.HemisphereLight('#fff5dc', '#829175', .95));
  const sunlight = new THREE.DirectionalLight('#fff3c9', 3.1);
  sunlight.position.set(3.4, 6.5, -3.1); sunlight.target.position.set(-1.8, 0, 1.5);
  sunlight.castShadow = true; sunlight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunlight.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: .5, far: 18 });
  sunlight.shadow.normalBias = .025; sunlight.shadow.bias = -.0001;
  sunlight.shadow.blurSamples = 8;
  scene.add(sunlight, sunlight.target);
  const warm = new THREE.PointLight('#ffdfab', 5, 7, 2); warm.position.set(-2.5, 2.5, -1.7); scene.add(warm);

  const materials = {
    porcelain: new THREE.MeshPhysicalMaterial({ color: '#f9f5e9', roughness: .18, metalness: .02, clearcoat: .5, clearcoatRoughness: .1 }),
    ivory: new THREE.MeshStandardMaterial({ color: '#e9e2cb', roughness: .8 }),
    wall: new THREE.MeshStandardMaterial({ color: '#e3deca', roughness: .9 }),
    dark: new THREE.MeshStandardMaterial({ color: '#424e40', roughness: .6 }),
    brass: new THREE.MeshStandardMaterial({ color: '#b4a17a', metalness: .8, roughness: .26 }),
    wood: new THREE.MeshStandardMaterial({ map: woodTexture(), color: '#bba17d', roughness: .65 }),
    cloth: new THREE.MeshStandardMaterial({ color: '#cb977b', roughness: 1 }),
  };
  function mesh(geo, material, position, scale) {
    const m = new THREE.Mesh(geo, material); if (position) m.position.set(...position); if (scale) m.scale.set(...scale);
    m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
  }
  function box(x, y, z, w, h, d, material, radius = .02) { return mesh(radius ? new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d), material, [x, y, z]); }
  function cylinder(x, y, z, r, h, material, bottom = r) { return mesh(new THREE.CylinderGeometry(r, bottom, h, 32), material, [x, y, z]); }
  function pipe(points, r, material) { return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 28, r, 8, false), material); }

  // Individual grout lines and a small amount of tile variation are baked into
  // local procedural textures. The scene needs no remote assets or fonts.
  const floorTex = tileTexture(['#d6cfb7', '#d1c8ae', '#ded6bd', '#cfc6ac'], '#aba58d', 4, false);
  floorTex.repeat.set(3.5, 4);
  const floor = mesh(new THREE.PlaneGeometry(7, 8), new THREE.MeshStandardMaterial({ map: floorTex, roughness: .47, metalness: .03 }), [0, 0, 0]); floor.rotation.x = -Math.PI / 2;
  const wallTex = tileTexture(['#849888', '#90a08c', '#889e91', '#82988c'], '#c6ccaf', 4, true);
  wallTex.repeat.set(3.5, .72);
  box(0, 2.4, -4.09, 7.2, 2.0, .18, materials.wall);
  box(0, .72, -4.04, 7.2, 1.44, .12, new THREE.MeshStandardMaterial({ map: wallTex, roughness: .3 }));
  const sideTex = wallTex.clone(); sideTex.repeat.set(4, .72);
  box(-3.59, 1.7, 0, .18, 3.4, 8.2, materials.wall);
  box(-3.48, .72, 0, .03, 1.44, 8, new THREE.MeshStandardMaterial({ map: sideTex, roughness: .3 }));
  box(3.59, 1.7, 0, .18, 3.4, 8.2, materials.wall);
  box(3.48, .72, 0, .03, 1.44, 8, new THREE.MeshStandardMaterial({ map: sideTex, roughness: .3 }));
  box(0, 1.46, -3.94, 7, .055, .055, materials.ivory, .01);
  box(-3.45, 1.46, 0, .055, .055, 8, materials.ivory, .01);
  box(3.45, 1.46, 0, .055, .055, 8, materials.ivory, .01);
  box(0, .065, -3.91, 7, .13, .065, materials.ivory, .01);
  box(-3.44, .065, 0, .07, .13, 8, materials.ivory, .01);
  box(3.44, .065, 0, .07, .13, 8, materials.ivory, .01);
  // A real opening connects the rooms; there is no solid wall behind the door.
  box(-1.84,1.7,4.07,3.32,3.4,.2,materials.wall);
  box(2.29,1.7,4.07,2.42,3.4,.2,materials.wall);
  box(.45,2.89,4.07,1.26,1.02,.2,materials.wall);
  for (const x of [-.22, 1.12]) box(x, 1.2, 3.89, .08, 2.5, .12, materials.ivory);
  box(.45, 2.43, 3.89, 1.42, .08, .12, materials.ivory);
  for(const x of [-.22,1.12])box(x,1.2,4.23,.08,2.5,.12,materials.ivory);
  box(.45,2.43,4.23,1.42,.08,.12,materials.ivory);
  const doorPivot=new THREE.Group();doorPivot.position.set(DOOR.hingeX,0,DOOR.z);scene.add(doorPivot);
  const doorPart=part=>{doorPivot.add(part);return part;};
  doorPart(box(DOOR.width/2,1.19,0,DOOR.width,2.36,DOOR.thickness,materials.wood,.025));
  for(const side of [-1,1]){
    const handle=doorPart(cylinder(DOOR.width-.14,1.08,side*.052,.038,.038,materials.brass));handle.rotation.x=Math.PI/2;
    doorPart(box(DOOR.width-.21,1.08,side*.079,.2,.027,.035,materials.brass,.008));
  }
  for(const y of [.42,1.9])doorPart(cylinder(0,y,0,.025,.12,materials.brass));
  DOOR_CONTROLLER.reset();

  // White porcelain toilet, with an actual open bowl and water surface.
  const { x: tx, z: tz } = TOILET;
  mesh(new THREE.LatheGeometry([new THREE.Vector2(.17, .02), new THREE.Vector2(.22, .05), new THREE.Vector2(.18, .18), new THREE.Vector2(.23, .34), new THREE.Vector2(.3, .41)], 48), materials.porcelain, [tx, 0, tz], [1, 1, 1.25]);
  const profile = [[.03,.25],[.15,.27],[.26,.34],[.34,.48],[.405,.64],[.44,.69],[.47,.69],[.48,.61],[.42,.43],[.32,.28],[.18,.22],[.03,.22]].map(p => new THREE.Vector2(...p));
  mesh(new THREE.LatheGeometry(profile.reverse(), 64), materials.porcelain, [tx, 0, tz], [1, 1, 1.35]);
  const seat = mesh(new THREE.TorusGeometry(.443, .042, 16, 72), materials.porcelain, [tx, .715, tz]); seat.rotation.x = Math.PI / 2; seat.scale.y = 1.35;
  box(tx, 1.0, tz-.66, .84, .72, .28, materials.porcelain, .065);
  box(tx, 1.37, tz-.66, .9, .065, .34, materials.porcelain, .03);
  cylinder(tx+.22, 1.411, tz-.66, .066, .025, materials.brass);
  const lid = mesh(new THREE.SphereGeometry(1, 40, 24), materials.porcelain, [tx, 1.1, tz-.48], [.425, .47, .045]); lid.rotation.x = -.11;
  const water = mesh(new THREE.CircleGeometry(.3, 64), new THREE.MeshPhysicalMaterial({ color: '#aebfa0', roughness: .08, metalness: .12, transparent: true, opacity: .8, clearcoat: 1 }), [tx, TOILET.water, tz], [1, 1.35, 1]); water.rotation.x = -Math.PI / 2; water.castShadow = false;
  contactShadow(scene, tx, tz, .7, .95, .22);
  // Paper holder and a wall print.
  pipe([[-1.75,.93,-3.95],[-1.75,.93,-3.7],[-1.75,.93,-3.45]], .017, materials.brass);
  const paper = cylinder(-1.75,.93,-3.6,.095,.24,materials.porcelain); paper.rotation.x = Math.PI/2;
  box(-1.75,.8,-3.46,.18,.19,.012,materials.ivory,.003);
  const print = new THREE.CanvasTexture(canvas(512, 640, ctx => {
    ctx.fillStyle='#eee9d7';ctx.fillRect(0,0,512,640);ctx.fillStyle='#8e9e7e';ctx.beginPath();ctx.arc(256,244,105,Math.PI,0);ctx.lineTo(361,330);ctx.lineTo(151,330);ctx.closePath();ctx.fill();
    ctx.fillStyle='#c99b70';ctx.beginPath();ctx.arc(300,233,42,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#eee9d7';ctx.lineWidth=3;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(150,300+i*17);ctx.lineTo(360,260+i*17);ctx.stroke();}
    ctx.fillStyle='#5e6c51';ctx.textAlign='center';ctx.font='36px Georgia';ctx.fillText('take it easy.',256,446);ctx.font='12px sans-serif';ctx.fillText('ONE LITTLE MOMENT AT A TIME',256,488);
  })); print.colorSpace=THREE.SRGBColorSpace;
  box(tx,2.24,-3.91,.69,.87,.06,materials.wood);
  mesh(new THREE.PlaneGeometry(.61,.79),new THREE.MeshBasicMaterial({map:print}),[tx,2.24,-3.872]);

  // Sunlit frosted window, including the mullions and a deep sill.
  box(1.6,2.36,-3.96,1.77,1.42,.15,materials.wood);
  const sky = new THREE.CanvasTexture(canvas(256,256,ctx=>{ const g=ctx.createLinearGradient(0,0,0,256);g.addColorStop(0,'#d3dcc7');g.addColorStop(.55,'#f4edcd');g.addColorStop(1,'#b9c5a2');ctx.fillStyle=g;ctx.fillRect(0,0,256,256); }));sky.colorSpace=THREE.SRGBColorSpace;
  mesh(new THREE.PlaneGeometry(1.61,1.26), new THREE.MeshBasicMaterial({map:sky}),[1.6,2.36,-3.868]);
  for(const x of [.76,1.6,2.44])box(x,2.36,-3.81,.045,1.42,.07,materials.ivory,.007);
  box(1.6,2.36,-3.8,1.72,.045,.07,materials.ivory,.006);
  box(1.6,1.64,-3.72,1.91,.09,.39,materials.ivory,.015);

  // Oak vanity, basin, real mirror and a little soap bottle.
  box(-2.99,.53,-2.1,.79,.72,1.35,materials.wood,.025);
  for(const z of [-2.76,-2.11,-1.44])box(-2.576,.53,z,.024,.6,.016,materials.brass,.005);
  for(const z of [-2.45,-1.77])box(-2.564,.7,z,.027,.025,.2,materials.brass,.005);
  box(-2.98,.96,-2.1,.91,.12,1.48,materials.porcelain,.035);
  const basinProfile = [[.02,0],[.15,.015],[.25,.055],[.32,.13],[.34,.16],[.37,.16],[.36,.07],[.29,-.03],[.02,-.03]].map(p=>new THREE.Vector2(...p));
  mesh(new THREE.LatheGeometry(basinProfile.reverse(),48),materials.porcelain,[-2.97,1.01,-2.08],[.86,1,1.12]);
  cylinder(-2.97,1.026,-2.08,.025,.012,materials.brass);
  pipe([[-3.23,1.03,-2.16],[-3.23,1.32,-2.16],[-3.05,1.35,-2.16],[-3.02,1.27,-2.16]],.022,materials.brass);
  cylinder(-3.12,1.06,-1.55,.055,.17,new THREE.MeshStandardMaterial({color:'#9b7750',transparent:true,opacity:.8,roughness:.3}));
  box(-3.12,1.17,-1.55,.09,.026,.04,materials.brass,.01);
  const mirror = new Reflector(new THREE.CircleGeometry(.57,64),{color:0xc4cbbb,textureWidth:512,textureHeight:512,clipBias:.003});mirror.rotation.y=Math.PI/2;mirror.position.set(-3.425,2.03,-2.08);scene.add(mirror);
  const mirrorRim=mesh(new THREE.TorusGeometry(.59,.022,12,64),materials.brass,[-3.4,2.03,-2.08]);mirrorRim.rotation.y=Math.PI/2;
  box(-3.35,2.74,-2.08,.12,.055,.69,materials.brass);
  contactShadow(scene,-2.98,-2.1,.64,1.0,.17);

  // Freestanding bath with a hollow top, shallow water and terracotta towel.
  const tubShape = roundRect(1.43,2.75,.24);
  const hole = roundRect(1.16,2.47,.2); tubShape.holes.push(new THREE.Path(hole.getPoints().reverse()));
  const tub = mesh(new THREE.ExtrudeGeometry(tubShape,{depth:.6,bevelEnabled:true,bevelSize:.045,bevelThickness:.045,bevelSegments:3,steps:1}),materials.porcelain,[2.46,.72,-1.28]);tub.rotation.x=Math.PI/2;
  box(2.46,.15,-1.28,1.19,.14,2.48,materials.porcelain,.15);
  const tubWater=mesh(new THREE.ShapeGeometry(roundRect(1.12,2.42,.19)),new THREE.MeshPhysicalMaterial({color:'#a3b5a1',roughness:.14,metalness:.1,transparent:true,opacity:.7}),[2.46,.3,-1.28]);tubWater.rotation.x=-Math.PI/2;tubWater.castShadow=false;
  pipe([[3.2,.05,-1.8],[3.2,.98,-1.8],[2.95,1.08,-1.8],[2.83,.97,-1.8]],.025,materials.brass);
  box(2.48,.8,-.4,.7,.025,.52,materials.cloth,.012);
  box(2.48,.58,-.105,.7,.44,.025,materials.cloth,.012);
  for(let i=0;i<9;i++)box(2.18+i*.075,.38,-.1,.008,.08,.012,materials.cloth,.003);
  contactShadow(scene,2.46,-1.28,.92,1.6,.16);

  // A potted olive plant, with distinct stems and softly shaded leaves.
  cylinder(2.51,.23,-3.45,.23,.44,new THREE.MeshStandardMaterial({color:'#ba8a67',roughness:1}),.17);
  cylinder(2.51,.46,-3.45,.213,.02,new THREE.MeshStandardMaterial({color:'#695944',roughness:1}));
  const leafMats=['#6e815c','#8d9a70','#778b62'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.85}));
  const seeded=(n)=>{const a=Math.sin(n*12.9898)*43758.5453;return a-Math.floor(a);};
  for(let b=0;b<7;b++){
    const ang=b*2.4, end=new THREE.Vector3(2.51+Math.cos(ang)*.28,.95+seeded(b+8)*.6,-3.45+Math.sin(ang)*.25);
    pipe([[2.51,.43,-3.45],[2.51,.84,-3.45],end.toArray()],.009,materials.wood);
    for(let j=0;j<6;j++){
      const t=.4+j*.11, cx=THREE.MathUtils.lerp(2.51,end.x,t),cy=THREE.MathUtils.lerp(.59,end.y,t),cz=THREE.MathUtils.lerp(-3.45,end.z,t);
      const leaf=mesh(new THREE.SphereGeometry(1,10,6),leafMats[(b+j)%3],[cx+Math.cos(ang+j)*.1,cy,cz+Math.sin(ang+j)*.1],[.035,.11,.014]);leaf.rotation.set(.3,ang+j,.6+seeded(j+b)*1.1);
    }
  }
  contactShadow(scene,2.51,-3.45,.4,.4,.15);

  // A woven bath mat and slatted bench make the room feel lived in.
  const rugMat=new THREE.MeshStandardMaterial({map:rugTexture(),color:'#e4d5ad',roughness:1});
  box(-.72,.016,-.73,1.25,.025,.72,rugMat,.06);
  for(let i=0;i<15;i++){box(-1.27+i*.08,.022,-.31,.025,.016,.14,materials.ivory,.004);box(-1.27+i*.08,.022,-1.15,.025,.016,.14,materials.ivory,.004);}
  box(-2.92,.52,1.48,.64,.07,1.5,materials.wood,.025);
  for(const x of [-3.14,-2.7])for(const z of [.86,2.08])box(x,.26,z,.055,.52,.055,materials.wood,.012);
  box(-2.92,.58,1.76,.48,.1,.51,new THREE.MeshStandardMaterial({color:'#b6baa0',roughness:1}),.04);
  box(-2.92,.66,1.77,.46,.08,.49,materials.ivory,.035);
  box(-3.41,1.7,.5,.06,.045,1.1,materials.brass);
  box(-3.3,1.48,.57,.025,.45,.55,materials.cloth,.01);
  createLivingRoom(scene,{mesh,box,cylinder,pipe,materials,shadow:(...args)=>contactShadow(scene,...args)});
  return {
    water,tubWater,sunlight,environment,materials,mirror,door:DOOR_CONTROLLER,
    update(dt,player){const changed=DOOR_CONTROLLER.step(dt,player);doorPivot.rotation.y=DOOR_CONTROLLER.angle;if(changed)renderer.shadowMap.needsUpdate=true;},
    resetDoor(){DOOR_CONTROLLER.reset();doorPivot.rotation.y=0;renderer.shadowMap.needsUpdate=true;},
  };
}

function canvas(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'));return c;}
function tileTexture(colors,grout,count,brick){
  const t=new THREE.CanvasTexture(canvas(1024,1024,ctx=>{
    ctx.fillStyle=grout;ctx.fillRect(0,0,1024,1024);const s=1024/count;
    for(let y=0;y<count;y++)for(let x=-1;x<=count;x++){
      const offset=brick&&y%2?s/2:0;ctx.fillStyle=colors[((x+count)*3+y*7)%colors.length];ctx.fillRect(x*s+offset+2,y*s+2,s-4,s-4);
      ctx.strokeStyle='#ffffff16';ctx.lineWidth=2;ctx.strokeRect(x*s+offset+4,y*s+4,s-8,s-8);
    }
    let seed=12;for(let i=0;i<18000;i++){seed=(seed*16807)%2147483647;const x=seed%1024;seed=(seed*16807)%2147483647;ctx.fillStyle=i%2?'#423e2710':'#ffffff12';ctx.fillRect(x,seed%1024,1,1);}
  }));t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;
}
function woodTexture(){const t=new THREE.CanvasTexture(canvas(256,512,ctx=>{ctx.fillStyle='#c6ab7f';ctx.fillRect(0,0,256,512);for(let i=0;i<110;i++){ctx.strokeStyle=i%3?'#a7885c28':'#efe2bb55';ctx.lineWidth=i%4+.5;ctx.beginPath();ctx.moveTo(i*2.4,0);ctx.bezierCurveTo(i*2.4-8,140,i*2.4+10,270,i*2.4,512);ctx.stroke();}}));t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}
function rugTexture(){const t=new THREE.CanvasTexture(canvas(256,256,ctx=>{ctx.fillStyle='#e4d4b1';ctx.fillRect(0,0,256,256);for(let i=0;i<128;i++){ctx.fillStyle=i%2?'#a6936940':'#ffffe950';ctx.fillRect(i*2,0,1,256);ctx.fillRect(0,i*2,256,1);}}));t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,2);return t;}
function roundRect(w,h,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
function contactShadow(scene,x,z,sx,sz,opacity){
  const t=new THREE.CanvasTexture(canvas(128,128,ctx=>{const g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#23332099');g.addColorStop(.45,'#23332044');g.addColorStop(1,'#23332000');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);}));
  const m=new THREE.Mesh(new THREE.PlaneGeometry(sx*2.6,sz*2.6),new THREE.MeshBasicMaterial({map:t,transparent:true,opacity,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.008,z);scene.add(m);
}
