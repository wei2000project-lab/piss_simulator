import * as THREE from 'three';

export function createLivingRoom(scene,{mesh,box,cylinder,pipe,materials,shadow}){
  const fabric=new THREE.MeshStandardMaterial({color:'#87927a',roughness:1});
  const linen=new THREE.MeshStandardMaterial({color:'#e5d8ba',roughness:1});
  const clay=new THREE.MeshStandardMaterial({color:'#b77c5d',roughness:.92});
  const darkWood=new THREE.MeshStandardMaterial({color:'#786344',roughness:.55});
  const floor=mesh(new THREE.PlaneGeometry(12.5,8),new THREE.MeshStandardMaterial({map:plankTexture(),roughness:.48}),[2.75,0,8]);floor.rotation.x=-Math.PI/2;
  box(-3.59,1.7,8,.18,3.4,8.2,materials.wall);
  box(9.09,1.7,8,.18,3.4,8.2,materials.wall);
  box(2.75,1.7,12.08,12.7,3.4,.16,materials.wall);
  box(6.25,1.7,4.07,5.5,3.4,.2,materials.wall);
  for(const x of [-3.44,8.94])box(x,.07,8,.07,.14,8,materials.ivory,.01);
  box(2.75,.07,11.94,12.5,.14,.07,materials.ivory,.01);
  box(6.25,.07,4.21,5.5,.14,.05,materials.ivory,.01);
  for(const [x,w] of [[-1.84,3.32],[2.29,2.42]])box(x,.07,4.21,w,.14,.05,materials.ivory,.01);

  // An uninterrupted walking route runs from the door into the seating area.
  box(-1.14,.33,10.86,3.7,.4,1.2,fabric,.12);
  box(-1.14,.83,11.35,3.74,.62,.28,fabric,.11);
  for(const x of [-2.99,.71])box(x,.64,10.86,.24,.55,1.3,fabric,.1);
  for(const x of [-2.27,-1.14,-.01]){
    box(x,.59,10.66,1.06,.2,.91,fabric,.08);
    const cushion=box(x,.91,11.08,1.03,.48,.18,fabric,.09);cushion.rotation.x=-.13;
  }
  for(const x of [-2.7,.42])for(const z of [10.35,11.29])cylinder(x,.13,z,.045,.24,darkWood);
  const pillow=box(-2.45,.89,10.77,.5,.48,.18,linen,.12);pillow.rotation.z=.16;pillow.rotation.x=-.2;
  const pillow2=box(.18,.87,10.76,.47,.43,.19,clay,.1);pillow2.rotation.z=-.2;
  box(-.67,.71,10.43,.53,.025,.73,linen,.01);
  box(-.67,.49,10.05,.53,.42,.027,linen,.01);
  shadow(-1.14,10.85,2.05,.8,.2);

  const rug=mesh(new THREE.PlaneGeometry(4.6,2.8),new THREE.MeshStandardMaterial({map:rugTexture(),roughness:1}),[-.72,.012,8.75]);rug.rotation.x=-Math.PI/2;rug.castShadow=false;
  box(-.75,.47,8.7,2.0,.085,.98,materials.wood,.14);
  for(const x of [-1.48,-.02])for(const z of [8.42,8.98])box(x,.25,z,.06,.45,.06,darkWood,.01);
  box(-1.05,.536,8.65,.44,.04,.33,clay,.012);
  box(-1.02,.572,8.63,.42,.025,.3,linen,.008);
  cylinder(-.3,.61,8.84,.061,.16,materials.porcelain);
  const cupHandle=mesh(new THREE.TorusGeometry(.048,.01,8,16),materials.porcelain,[-.22,.61,8.84]);cupHandle.rotation.y=Math.PI/2;
  shadow(-.75,8.7,1.13,.6,.14);

  const chair=new THREE.Group();chair.position.set(2.15,0,9.65);chair.rotation.y=-.35;scene.add(chair);
  const chairPart=part=>chair.add(part);
  chairPart(box(0,.46,0,1.0,.3,1.05,clay,.13));chairPart(box(0,.83,.42,1.04,.49,.23,clay,.12));
  for(const x of [-.47,.47])chairPart(box(x,.65,0,.16,.38,1.03,clay,.08));
  for(const x of [-.36,.36])for(const z of [-.36,.36])chairPart(cylinder(x,.16,z,.035,.3,darkWood));
  const chairPillow=box(0,.76,.22,.5,.4,.16,linen,.1);chairPart(chairPillow);chairPillow.rotation.x=-.16;
  shadow(2.15,9.65,.73,.75,.16);

  box(2.3,.37,4.58,1.8,.43,.57,materials.wood,.035);
  for(const x of [1.54,3.06])box(x,.13,4.58,.055,.25,.4,darkWood,.01);
  box(2.3,.39,4.878,.018,.3,.016,materials.brass,.003);
  box(2.3,1.18,4.48,1.47,.88,.065,materials.dark,.035);
  const tv=mesh(new THREE.PlaneGeometry(1.39,.79),new THREE.MeshBasicMaterial({map:tvTexture()}),[2.3,1.18,4.517]);
  pipe([[2.3,.6,4.49],[2.3,.8,4.49]],.035,materials.dark);box(2.3,.608,4.52,.39,.018,.19,materials.dark,.01);
  for(const x of [1.57,3.03])box(x,.7,4.61,.12,.23,.13,materials.dark,.02);

  // Oak shelving with small, individually coloured book spines.
  box(-3.34,1.03,6.2,.13,2.05,1.65,materials.wood,.02);
  for(const z of [5.39,7.01])box(-3.12,1.03,z,.58,2.05,.06,materials.wood,.012);
  for(const y of [.13,.6,1.08,1.56,2.04])box(-3.12,y,6.2,.62,.055,1.65,materials.wood,.012);
  const covers=[fabric,linen,clay,materials.ivory,darkWood];
  for(let shelf=0;shelf<3;shelf++)for(let i=0;i<7;i++){
    const height=.24+(i%3)*.045;box(-3.02,.65+shelf*.48+height/2,5.6+i*.135,.29,height,.09,covers[(i+shelf)%covers.length],.004);
  }
  cylinder(-3.08,1.77,6.67,.085,.32,clay,.06);

  // Large garden window, a deep sill, and pleated linen curtains.
  box(1.6,2.15,11.94,2.35,1.8,.15,materials.wood,.02);
  const view=mesh(new THREE.PlaneGeometry(2.18,1.63),new THREE.MeshBasicMaterial({map:gardenTexture()}),[1.6,2.15,11.85]);view.rotation.y=Math.PI;
  for(const x of [.45,1.6,2.75])box(x,2.15,11.79,.045,1.8,.06,materials.ivory,.008);
  box(1.6,2.15,11.77,2.3,.045,.07,materials.ivory,.006);
  box(1.6,1.24,11.74,2.52,.08,.33,materials.ivory,.02);
  box(1.6,3.11,11.7,3.0,.035,.045,materials.brass,.01);
  for(const x of [.18,3.02]){
    const geometry=new THREE.PlaneGeometry(.47,2.35,16,1),positions=geometry.attributes.position;
    for(let i=0;i<positions.count;i++)positions.setZ(i,Math.sin(positions.getX(i)*65)*.04);
    geometry.computeVertexNormals();const curtain=mesh(geometry,new THREE.MeshStandardMaterial({color:'#ddd0b1',side:THREE.DoubleSide,roughness:1}),[x,1.86,11.59]);curtain.castShadow=true;
  }
  const sun=new THREE.DirectionalLight('#fff0c5',2.0);sun.position.set(1.8,5.2,11.4);sun.target.position.set(-1.6,0,6.9);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.5,far:15});sun.shadow.normalBias=.025;scene.add(sun,sun.target);

  cylinder(1.2,.6,10.75,.29,.055,materials.wood);cylinder(1.2,.32,10.75,.035,.58,materials.brass);cylinder(1.2,.035,10.75,.19,.05,darkWood);
  cylinder(1.18,.7,10.75,.05,.15,materials.porcelain);
  cylinder(.99,.04,11.4,.19,.06,materials.brass);cylinder(.99,.89,11.4,.018,1.72,materials.brass);
  mesh(new THREE.CylinderGeometry(.24,.35,.39,32,1,true),new THREE.MeshStandardMaterial({color:'#e4d5ad',side:THREE.DoubleSide,roughness:.9}),[.99,1.85,11.4]);
  const lamp=new THREE.PointLight('#ffd59b',5,4,2);lamp.position.set(.99,1.8,11.4);scene.add(lamp);

  cylinder(-2.44,.23,4.66,.25,.43,clay,.18);cylinder(-2.44,.45,4.66,.23,.02,darkWood);
  const leaves=new THREE.MeshStandardMaterial({color:'#788e65',roughness:.9});
  for(let i=0;i<16;i++){
    const angle=i*2.4,y=.72+(i%5)*.15,r=.16+(i%3)*.08;
    const x=-2.44+Math.cos(angle)*r,z=4.66+Math.sin(angle)*r;
    pipe([[-2.44,.44,4.66],[-2.44,y-.15,4.66],[x,y,z]],.009,darkWood);
    const leaf=mesh(new THREE.SphereGeometry(1,10,6),leaves,[x,y,z],[.075,.18,.025]);leaf.rotation.set(.3,angle,.55);
  }
  const mat=mesh(new THREE.PlaneGeometry(1.06,.62),linen,[.45,.015,4.88]);mat.rotation.x=-Math.PI/2;mat.castShadow=false;
  const print=mesh(new THREE.PlaneGeometry(.72,1.0),new THREE.MeshBasicMaterial({map:artTexture()}),[-3.44,2.18,8.45]);print.rotation.y=Math.PI/2;
  box(-3.48,2.18,8.45,.055,1.09,.81,materials.wood,.015);
}

function texture(w,h,paint){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;paint(canvas.getContext('2d'));const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
function plankTexture(){
  const t=texture(1024,1024,ctx=>{
    const shades=['#b49a75','#baa17b','#bea580','#b79c77'];ctx.fillStyle='#8f7b5e';ctx.fillRect(0,0,1024,1024);
    for(let row=0;row<8;row++)for(let col=-1;col<4;col++){
      const x=col*342+(row%2)*171,y=row*128;ctx.fillStyle=shades[(row+col+8)%4];ctx.fillRect(x+1,y+1,340,126);
      for(let grain=0;grain<15;grain++){ctx.strokeStyle=grain%3?'#66533815':'#f4e1b624';ctx.lineWidth=.6+(grain%2);ctx.beginPath();ctx.moveTo(x+5,y+grain*8+4);ctx.bezierCurveTo(x+100,y+grain*8+8,x+220,y+grain*8, x+336,y+grain*8+5);ctx.stroke();}
    }
  });t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(25/7,2);return t;
}
function rugTexture(){return texture(512,512,ctx=>{ctx.fillStyle='#d8c8a2';ctx.fillRect(0,0,512,512);ctx.strokeStyle='#a6815c';ctx.lineWidth=5;ctx.strokeRect(25,25,462,462);ctx.strokeStyle='#899477';ctx.lineWidth=2;for(let x=-512;x<1024;x+=54){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+512,512);ctx.stroke();}ctx.strokeStyle='#eee1bd';ctx.strokeRect(38,38,436,436);});}
function gardenTexture(){return texture(512,384,ctx=>{const g=ctx.createLinearGradient(0,0,0,384);g.addColorStop(0,'#c6d4c5');g.addColorStop(.6,'#f2e9cb');g.addColorStop(1,'#9eaf87');ctx.fillStyle=g;ctx.fillRect(0,0,512,384);ctx.fillStyle='#f6ebc3';ctx.beginPath();ctx.arc(355,110,43,0,Math.PI*2);ctx.fill();for(let i=0;i<12;i++){ctx.fillStyle=['#96a580','#a8b48c','#879b7a'][i%3];ctx.beginPath();ctx.ellipse(i*48,350+(i%3)*20,90,80+i%4*20,0,0,Math.PI*2);ctx.fill();}});}
function tvTexture(){return texture(512,288,ctx=>{ctx.fillStyle='#c7ccae';ctx.fillRect(0,0,512,288);ctx.fillStyle='#e0d4ac';ctx.beginPath();ctx.arc(380,83,34,0,Math.PI*2);ctx.fill();for(let i=0;i<3;i++){ctx.fillStyle=['#a3b295','#81987e','#607d6a'][i];ctx.beginPath();ctx.moveTo(0,288);ctx.lineTo(0,180+i*30);ctx.bezierCurveTo(130,50+i*60,330,290-i*18,512,140+i*45);ctx.lineTo(512,288);ctx.fill();}ctx.fillStyle='#f6edd5';ctx.font='16px Georgia';ctx.fillText('a slow afternoon',25,38);});}
function artTexture(){return texture(360,500,ctx=>{ctx.fillStyle='#eee7d3';ctx.fillRect(0,0,360,500);ctx.fillStyle='#9ba383';ctx.beginPath();ctx.arc(180,210,110,Math.PI,0);ctx.lineTo(290,330);ctx.lineTo(70,330);ctx.fill();ctx.fillStyle='#c39469';ctx.beginPath();ctx.arc(185,210,50,0,Math.PI*2);ctx.fill();ctx.fillStyle='#586b4c';ctx.font='28px Georgia';ctx.textAlign='center';ctx.fillText('slow afternoons',180,413);});}
