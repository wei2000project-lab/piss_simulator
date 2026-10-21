import * as THREE from 'three';
import { createWorld, TOILET, ROOM, COLLIDERS } from './world.js';
import { Fluids } from './fluids.js';
import { BathroomAudio } from './audio.js';
import { traceStream, movePlayer, standingHeight, FLOW_RATE, CAPACITY, GRAVITY } from './physics.js';

const $=id=>document.getElementById(id);
const desktop=window.bathroomDesktop;
const state={started:false,paused:false,shooting:false,reserve:CAPACITY,total:0,caught:0,floor:0,bowl:0,flushed:0,flushTime:0,completed:false,lock:null,nativeReady:false,time:0,streamAge:0,showHelp:false};
const player={x:.02,z:-.78,feet:0,previousFeet:0,vy:0,yaw:.432,pitch:-.4,grounded:true};
const keys=new Set(),pending=[];
let renderer,scene,camera,world,fluids,audio,previousTime=0,lastHud=0,frames=0,fpsTime=0,toastTimer,flowWasActive=false,lockSerial=0;
const stage=$('stage'),host=$('canvas-host');
function toast(message,duration=2600){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),duration);}
function active(){return state.started&&!state.paused&&!state.showHelp;}
function stopInput(){state.shooting=false;keys.clear();audio?.flow(false,false);}
function setLockUI(){
  document.body.classList.toggle('native-locked',!!state.lock);
  $('lock-status').innerHTML=state.lock==='center'?'<i></i> 視角鎖定 · Ctrl 釋放，Esc 暫停':state.lock==='current'?'<i></i> 原生游標固定中 · 放開右鍵釋放':'<i></i> 滑鼠自由 · 右鍵按住轉向';
}
async function unlock(){lockSerial++;state.lock=null;setLockUI();if(desktop)await desktop.unlock();else if(document.pointerLockElement)document.exitPointerLock();}
async function lock(mode){
  if(!active())return;
  const serial=++lockSerial;
  if(desktop){
    const success=await desktop.lock(mode);
    if(serial!==lockSerial){if(success)desktop.unlock();return;}
    if(success){state.lock=mode;setLockUI();return;}
    toast('原生滑鼠控制還在準備中，請稍候再試。');return;
  }
  try{await host.querySelector('canvas').requestPointerLock();if(serial===lockSerial){state.lock=mode;setLockUI();}}
  catch{toast('請在遊戲畫面內再次按下右鍵或 Ctrl。');}
}
function rotate(dx,dy){if(!active()||!state.lock)return;player.yaw-=dx*.0022;player.pitch=THREE.MathUtils.clamp(player.pitch-dy*.0022,-1.26,.98);}
function setPaused(paused){if(!state.started)return;state.paused=paused;$('pause-overlay').hidden=!paused;stopInput();unlock();$('crosshair').hidden=paused;$('aim-label').hidden=paused;}
function begin(){
  audio.init();state.started=true;state.paused=false;$('welcome').hidden=true;$('crosshair').hidden=false;$('aim-label').hidden=false;
  toast('WASD 自由走動 · 按住右鍵環顧，左鍵開始出水',4000);
  host.querySelector('canvas').focus();
}
function reset(){
  stopInput();unlock();pending.length=0;fluids.reset();Object.assign(state,{reserve:CAPACITY,total:0,caught:0,floor:0,bowl:0,flushed:0,flushTime:0,completed:false,streamAge:0});
  Object.assign(player,{x:.02,z:-.78,feet:0,previousFeet:0,vy:0,yaw:.432,pitch:-.4,grounded:true});
  world.water.material.color.set('#aebfa0');world.water.position.y=TOILET.water;world.water.scale.set(1,1.35,1);world.water.material.opacity=.8;
  $('mission-title').textContent='對準、放鬆、沖乾淨。';$('mission-copy').textContent='讓 300 ml 進入馬桶，然後沖水。';
  if(state.started)setPaused(false);toast('新的小練習，慢慢來就好。');updateHud();
}
function nearToilet(){return Math.hypot(player.x-TOILET.x,player.z-TOILET.z)<2.3;}
function flush(){
  if(!state.started){toast('先走進浴室，再開始練習。');return;}
  if(state.paused||state.showHelp)return;
  if(!nearToilet()){toast('再靠近馬桶一點，就能沖水了。');return;}
  if(state.flushTime>0)return;
  state.flushTime=3.2;state.flushed+=state.bowl;state.bowl=0;audio.flush();toast('嘩啦——把煩惱沖掉。',3000);
}
function clean(){
  if(!active()){toast('走進浴室後，隨時可以整理地板。');return;}
  if(state.floor<.01){toast('地板乾乾淨淨，保持得很好。');return;}
  fluids.clearFloor();state.floor=0;toast('地板擦乾了。下一次再對準一點點。');audio.chime();updateHud();
}
function refill(){if(!active())return;state.reserve=CAPACITY;toast('補給完成，1,200 ml 的新機會。');updateHud();}
function updateHud(){
  const percent=state.total>0?Math.round(state.caught/state.total*100):0;
  $('accuracy').textContent=state.total>.5?percent:'—';$('dial-fill').style.strokeDashoffset=151*(1-percent/100);
  $('in-volume').textContent=Math.round(state.caught).toLocaleString();$('floor-volume').textContent=Math.round(state.floor).toLocaleString();
  $('tank-label').textContent=Math.ceil(state.reserve).toLocaleString()+' ml';$('tank-fill').style.width=state.reserve/CAPACITY*100+'%';
  const goal=Math.min(300,state.caught);$('goal-progress').style.width=goal/3+'%';$('goal-text').textContent=`${Math.floor(goal)} / 300 ml`;$('goal-percent').textContent=Math.floor(goal/3)+'%';
  if(state.caught>=300&&!state.completed){$('mission-title').textContent='漂亮，最後記得沖水。';$('mission-copy').textContent='目標達成！靠近馬桶，按 F 收尾。';}
  $('flush-button').disabled=state.flushTime>0;
  $('flush-button').querySelector('span').textContent=state.flushTime>0?'正在沖水…':'沖個乾淨';
}
function completeGoal(){
  if(state.completed||state.caught<300||state.flushTime>0||state.flushed<300)return;
  state.completed=true;$('mission-title').textContent='今天的小事，完成了。';$('mission-copy').textContent=state.floor>1?'沖水完成！還可以按 C 整理地板。':'對準、放鬆、沖乾淨。做得很好。';
  toast('✓ 練習完成！每一件小事，都值得好好做。',5000);audio.chime();updateHud();
}
function streamTrace(){
  const direction=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
  const origin=camera.position.clone().addScaledVector(direction,.28).addScaledVector(right,.13);origin.y-=.63;
  const velocity=direction.multiplyScalar(4.7);velocity.y+=3.1;
  return traceStream(origin,velocity,TOILET,ROOM,COLLIDERS);
}
function updatePlayer(dt){
  const walk=(keys.has('ShiftLeft')||keys.has('ShiftRight'))?3.6:2.15;
  let forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
  let side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
  const length=Math.hypot(forward,side)||1;forward/=length;side/=length;
  const dx=(-Math.sin(player.yaw)*forward+Math.cos(player.yaw)*side)*walk*dt;
  const dz=(-Math.cos(player.yaw)*forward-Math.sin(player.yaw)*side)*walk*dt;
  movePlayer(player,dx,dz,.21,ROOM,COLLIDERS);
  player.previousFeet=player.feet;player.vy-=GRAVITY*dt;player.feet+=player.vy*dt;
  const floor=standingHeight(player,COLLIDERS);
  if(player.feet<=floor){player.feet=floor;player.vy=0;player.grounded=true;}else player.grounded=false;
  const bob=(forward||side)&&player.grounded?Math.sin(state.time*(walk>3?15:11))*.019:0;
  camera.position.set(player.x,1.64+player.feet+bob,player.z);camera.rotation.order='YXZ';camera.rotation.set(player.pitch,player.yaw,0);
}
function updateGame(dt){
  updatePlayer(dt);
  const trace=streamTrace(),shoot=state.shooting&&state.reserve>0;
  if(shoot){
    state.streamAge+=dt;const volume=Math.min(state.reserve,FLOW_RATE*dt);state.reserve-=volume;state.total+=volume;
    pending.push({due:state.time+trace.time,volume,kind:trace.kind,point:{...trace.point}});
    if(state.reserve<=0){state.shooting=false;toast('存量用完了，按 R 補充後再繼續。');}
  }else state.streamAge=0;
  // Each emitted parcel has its own flight time and destination. Moving away
  // after release cannot redirect water that is already in the air.
  for(let i=pending.length-1;i>=0;i--){const parcel=pending[i];if(parcel.due>state.time)continue;
    if(parcel.kind==='bowl'){
      state.caught+=parcel.volume;
      if(state.flushTime>0)state.flushed+=parcel.volume;else state.bowl+=parcel.volume;
    }else{state.floor+=parcel.volume;fluids.addPuddle(parcel.point,parcel.volume);}
    fluids.splash(parcel.point,parcel.kind,state.time);pending.splice(i,1);
  }
  fluids.showStream(trace,state.time,shoot,state.streamAge);
  fluids.aim(trace,true);fluids.update(dt);audio.flow(shoot,trace.kind==='bowl');
  $('crosshair').classList.toggle('on-target',trace.kind==='bowl');
  const aimMessage=trace.kind==='bowl'?'角度剛好，按住左鍵放輕鬆':trace.kind==='rim'?'再往內一點點，別碰到邊緣':'右鍵調整角度 · 淡色圓圈是落點';
  if($('aim-label').textContent!==aimMessage)$('aim-label').textContent=aimMessage;
  $('hint').hidden=!nearToilet()||state.flushTime>0||state.bowl<5;
  if(state.flushTime>0){
    state.flushTime=Math.max(0,state.flushTime-dt);const progress=1-state.flushTime/3.2;
    const shrink=1-Math.sin(progress*Math.PI)*.72;world.water.scale.set(shrink,shrink*1.35,1);
    world.water.rotation.z+=dt*8;world.water.position.y=TOILET.water-Math.sin(progress*Math.PI)*.13;
    world.water.material.color.lerp(new THREE.Color('#aebfa0'),dt*3);
    if(state.flushTime===0){world.water.scale.set(1,1.35,1);world.water.position.y=TOILET.water;completeGoal();updateHud();}
    if(Math.random()<dt*11)fluids.splash({x:TOILET.x+(Math.random()-.5)*.3,y:TOILET.water,z:TOILET.z+(Math.random()-.5)*.3},'bowl',state.time);
  }else{
    const tint=new THREE.Color('#aebfa0').lerp(new THREE.Color('#d8c064'),Math.min(.72,state.bowl/900));world.water.material.color.copy(tint);
    world.water.position.y=TOILET.water+Math.min(.04,state.bowl*.000035)+Math.sin(state.time*3)*.002;
  }
  if(shoot!==flowWasActive){flowWasActive=shoot;updateHud();}
}
function frame(time){
  requestAnimationFrame(frame);const dt=Math.min(.04,(time-previousTime)/1000||.016);previousTime=time;
  if(active()){state.time+=dt;updateGame(dt);}else{
    fluids.stream.visible=false;fluids.target.visible=false;audio.flow(false,false);
    if(!state.started){camera.position.set(2.9,2.2,2.8);camera.lookAt(-.1,.9,-2.35);}
  }
  renderer.render(scene,camera);
  frames++;if(time-fpsTime>900){$('fps').textContent=Math.round(frames*1000/(time-fpsTime));frames=0;fpsTime=time;}
  if(time-lastHud>120){updateHud();lastHud=time;}
}
function bindEvents(){
  $('start-button').addEventListener('click',begin);$('resume-button').addEventListener('click',()=>{audio.init();setPaused(false);});
  $('pause-button').addEventListener('click',()=>setPaused(!state.paused));
  $('flush-button').addEventListener('click',()=>{audio.init();flush();});$('clean-button').addEventListener('click',clean);$('reset-button').addEventListener('click',reset);
  $('sound-button').addEventListener('click',()=>{audio.init();audio.enabled=!audio.enabled;$('sound-button').setAttribute('aria-pressed',String(audio.enabled));toast(audio.enabled?'音效已開啟':'留一點安靜，音效已關閉。');});
  $('fullscreen-button').addEventListener('click',()=>{unlock();if(desktop)desktop.fullscreen();else if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>toast('此視窗不支援全螢幕。'));});
  $('help-button').addEventListener('click',()=>{stopInput();unlock();state.showHelp=true;$('help-dialog').showModal();});
  $('close-help').addEventListener('click',()=>$('help-dialog').close());$('help-dialog').addEventListener('close',()=>{state.showHelp=false;keys.clear();});
  host.addEventListener('contextmenu',event=>event.preventDefault());
  host.addEventListener('mousedown',event=>{
    if(!active())return;event.preventDefault();audio.init();
    if(event.button===0)state.shooting=true;
    if(event.button===2&&state.lock!=='center')lock('current');
  });
  window.addEventListener('mouseup',event=>{if(event.button===0)state.shooting=false;if(event.button===2&&state.lock==='current')unlock();});
  window.addEventListener('mousemove',event=>{if(!desktop&&document.pointerLockElement)rotate(event.movementX,event.movementY);});
  document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&!desktop){state.lock=null;setLockUI();}});
  window.addEventListener('keydown',event=>{
    const relevant=['Space','ControlLeft','ControlRight','Escape','KeyW','KeyA','KeyS','KeyD','KeyF','KeyC','KeyR','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
    if(relevant.includes(event.code))event.preventDefault();
    if(event.ctrlKey&&event.code==='KeyW'){event.preventDefault();toast('Ctrl+W 已攔截。要離開時，請按視窗的 ×。');return;}
    if(event.code==='Escape'&&!state.showHelp){setPaused(!state.paused);return;}
    if(!active())return;
    if(event.code==='ControlLeft'||event.code==='ControlRight'){if(!event.repeat){if(state.lock)unlock();else lock('center');}return;}
    keys.add(event.code);
    if(event.repeat)return;
    if(event.code==='Space'&&player.grounded){player.vy=4.35;player.grounded=false;}
    if(event.code==='KeyF')flush();if(event.code==='KeyC')clean();if(event.code==='KeyR')refill();
  });
  window.addEventListener('keyup',event=>keys.delete(event.code));
  window.addEventListener('blur',()=>{stopInput();if(state.started)setPaused(true);else unlock();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.started)setPaused(true);});
  if(desktop){desktop.onMotion(({x,y})=>rotate(x,y));desktop.onRelease(()=>{state.lock=null;setLockUI();});desktop.onStatus(ready=>{state.nativeReady=ready;});desktop.onShortcut(()=>toast('Ctrl+W 已攔截。要離開時，請按視窗的 ×。'));desktop.status().then(ready=>state.nativeReady=ready);}
  else $('desktop-note').textContent='網頁預覽使用瀏覽器 Pointer Lock；完整的原生游標定位和 Ctrl+W 攔截，請使用 start.bat 桌面模式。';
  new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}}).observe(host);
  window.addEventListener('pagehide',()=>{stopInput();unlock();});
}
try{
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','第一人稱 3D 浴室，可用 WASD 移動、空白鍵跳躍');host.appendChild(renderer.domElement);
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(66,1,.035,40);camera.position.set(2.9,2.2,2.8);camera.lookAt(-.1,.9,-2.35);
  world=createWorld(scene,renderer);fluids=new Fluids(scene);audio=new BathroomAudio();bindEvents();updateHud();$('loading').hidden=true;requestAnimationFrame(frame);
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  // Read-only diagnostics are useful for checking the live simulation without
  // changing gameplay or exposing Electron/Node capabilities to the page.
  window.bathroomDebug={snapshot:()=>({state:{...state},player:{...player},puddleCount:fluids.puddles.length,pending:pending.length,trace:active()?streamTrace():null,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles})};
}catch(error){
  console.error(error);$('loading').hidden=true;$('error-panel').hidden=false;$('error-panel').textContent='浴室暫時打不開。請確認顯示卡支援 WebGL 2，更新顯示驅動後重試。錯誤：'+error.message;
}
