// Render only on demand. Timers keep high-refresh monitors from running a busy
// RAF loop; RAF still aligns the actual draw with the display's next refresh.
export class DemandLoop{
  constructor({update,render,continuous,visible=()=>true,fps=60,now=()=>performance.now(),raf=fn=>requestAnimationFrame(fn),cancelRaf=id=>cancelAnimationFrame(id),timer=(fn,ms)=>setTimeout(fn,ms),cancelTimer=id=>clearTimeout(id)}){
    Object.assign(this,{update,render,continuous,visible,now,raf,cancelRaf,timer,cancelTimer});
    this.interval=1000/fps;this.lastTime=null;this.deadline=0;this.rafId=null;this.timerId=null;this.dirty=false;this.suspended=false;
    this.tick=this.tick.bind(this);
  }
  invalidate(){this.dirty=true;this.schedule();}
  schedule(){
    if(this.suspended||!this.visible()||this.rafId!==null||this.timerId!==null)return;
    const delay=this.deadline-this.now()-1;
    if(delay>1)this.timerId=this.timer(()=>{this.timerId=null;this.scheduleRaf();},delay);
    else this.scheduleRaf();
  }
  scheduleRaf(){if(!this.suspended&&this.visible())this.rafId=this.raf(this.tick);}
  tick(){
    // RAF timestamps can precede a long shader compilation by many ms. Use
    // the wall clock so waking an idle scene cannot submit catch-up frames.
    const time=this.now();
    this.rafId=null;if(this.suspended||!this.visible()){this.lastTime=null;return;}
    if(time+.7<this.deadline){this.schedule();return;}
    const dt=this.lastTime===null?1/60:Math.min(.04,Math.max(0,(time-this.lastTime)/1000));
    this.lastTime=time;this.deadline=this.deadline===0||time-this.deadline>this.interval?time+this.interval:this.deadline+this.interval;
    this.dirty=false;this.update(dt,time);this.render(time);
    if(this.dirty||this.continuous())this.schedule();else{this.lastTime=null;this.deadline=0;}
  }
  stop(){
    if(this.rafId!==null)this.cancelRaf(this.rafId);if(this.timerId!==null)this.cancelTimer(this.timerId);
    this.rafId=null;this.timerId=null;this.lastTime=null;this.deadline=0;
  }
  suspend(){this.suspended=true;this.stop();}
  resume(){this.suspended=false;this.invalidate();}
}

export function renderPixelRatio(width,height,dpr){return Math.min(dpr,1.25,Math.sqrt(1920*1080/Math.max(1,width*height)));}
