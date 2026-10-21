import { circleHitsBox } from './collision.js';
export const DOOR={x:.45,z:4.06,hingeX:-.18,width:1.26,height:2.38,thickness:.07,openAngle:-Math.PI/2};
export class DoorController{
  constructor(){this.collider={id:'bathroom-door',oriented:true,height:DOOR.height,halfWidth:DOOR.width/2,halfDepth:DOOR.thickness/2};this.reset();}
  reset(){this.angle=0;this.openAngle=DOOR.openAngle;this.targetOpen=false;this.blocked=false;this.updateCollider();}
  updateCollider(){
    const c=Math.cos(this.angle),s=Math.sin(this.angle),b=this.collider;
    Object.assign(b,{angle:this.angle,centerX:DOOR.hingeX+c*DOOR.width/2,centerZ:DOOR.z-s*DOOR.width/2});
    const rx=Math.abs(c)*b.halfWidth+Math.abs(s)*b.halfDepth,rz=Math.abs(s)*b.halfWidth+Math.abs(c)*b.halfDepth;
    Object.assign(b,{minX:b.centerX-rx,maxX:b.centerX+rx,minZ:b.centerZ-rz,maxZ:b.centerZ+rz});
  }
  near(player){return Math.hypot(player.x-DOOR.x,player.z-DOOR.z)<1.65;}
  toggle(player){
    if(!this.targetOpen&&Math.abs(this.angle)<.02)this.openAngle=player&&player.z>DOOR.z?Math.PI/2:DOOR.openAngle;
    this.targetOpen=!this.targetOpen;this.blocked=false;
  }
  step(dt,player){
    const target=this.targetOpen?this.openAngle:0,difference=target-this.angle;if(Math.abs(difference)<1e-6)return false;
    const previous=this.angle;this.angle+=Math.sign(difference)*Math.min(Math.abs(difference),dt*2.7);this.updateCollider();
    if(player&&player.feet<DOOR.height&&circleHitsBox(player.x,player.z,.23,this.collider)){
      this.angle=previous;this.updateCollider();this.blocked=true;this.targetOpen=!this.targetOpen;return false;
    }
    this.blocked=false;return true;
  }
}
