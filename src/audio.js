export class BathroomAudio {
  constructor(){this.enabled=true;this.context=null;this.flowGain=null;}
  init(){
    if(this.context){this.context.resume();return;}
    const ctx=this.context=new AudioContext();
    const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    this.noise=buffer;
    const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;
    const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=1400;filter.Q.value=.6;
    this.filter=filter;this.flowGain=ctx.createGain();this.flowGain.gain.value=0;
    source.connect(filter).connect(this.flowGain).connect(ctx.destination);source.start();
  }
  flow(active,inBowl){if(!this.context)return;this.flowGain.gain.setTargetAtTime(active&&this.enabled?(inBowl?.065:.028):0,this.context.currentTime,.06);this.filter.frequency.setTargetAtTime(inBowl?1800:950,this.context.currentTime,.12);}
  flush(){
    if(!this.context||!this.enabled)return;const ctx=this.context,t=ctx.currentTime,noise=ctx.createBufferSource();noise.buffer=this.noise;noise.loop=true;
    const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(280,t);filter.frequency.exponentialRampToValueAtTime(1900,t+.7);filter.frequency.exponentialRampToValueAtTime(110,t+2.8);
    const gain=ctx.createGain();gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(.18,t+.4);gain.gain.exponentialRampToValueAtTime(.001,t+3.1);noise.connect(filter).connect(gain).connect(ctx.destination);noise.start();noise.stop(t+3.2);
  }
  chime(){if(!this.context||!this.enabled)return;const t=this.context.currentTime;for(let i=0;i<3;i++){const o=this.context.createOscillator(),g=this.context.createGain();o.type='sine';o.frequency.value=[523.25,659.25,783.99][i];g.gain.setValueAtTime(0,t+i*.11);g.gain.linearRampToValueAtTime(.065,t+i*.11+.02);g.gain.exponentialRampToValueAtTime(.001,t+i*.11+.55);o.connect(g).connect(this.context.destination);o.start(t+i*.11);o.stop(t+i*.11+.6);}}
}
