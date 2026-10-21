import { DoorController, DOOR } from './door.js';
export const TOILET={x:-.82,z:-2.65,seat:.72,water:.39,innerX:.345,innerZ:.49,outerX:.51,outerZ:.69};
export const ROOM={minX:-3.5,maxX:9,minZ:-4,maxZ:12};
export const KITCHEN={minX:4.7,maxX:9,minZ:4.17,maxZ:12};
export const DOOR_CONTROLLER=new DoorController();
export const COLLIDERS=[
  {minX:-1.37,maxX:-.27,minZ:-3.62,maxZ:-1.91,height:.76,toilet:true},
  {minX:-3.5,maxX:-2.48,minZ:-2.92,maxZ:-1.35,height:1.08},
  {minX:1.73,maxX:3.2,minZ:-2.78,maxZ:.22,height:.75},
  {minX:2.05,maxX:2.93,minZ:-3.87,maxZ:-3.07,height:.78},
  {minX:-3.2,maxX:-2.48,minZ:.7,maxZ:2.3,height:.65},
  {minX:-1.26,maxX:-.38,minZ:-3.48,maxZ:-3.15,height:1.42},
  {id:'partition-left',minX:-3.5,maxX:DOOR.hingeX,minZ:3.97,maxZ:4.17,height:3.4},
  {id:'partition-right',minX:DOOR.hingeX+DOOR.width,maxX:3.5,minZ:3.97,maxZ:4.17,height:3.4},
  {id:'door-header',minX:DOOR.hingeX,maxX:DOOR.hingeX+DOOR.width,minZ:3.97,maxZ:4.17,minY:2.38,height:3.4},
  {id:'sofa',minX:-3.07,maxX:.79,minZ:10.15,maxZ:11.6,height:1.0},
  {id:'coffee-table',minX:-1.76,maxX:.26,minZ:8.2,maxZ:9.2,height:.51},
  {id:'armchair',oriented:true,centerX:2.15,centerZ:9.65,angle:-.35,halfWidth:.53,halfDepth:.56,height:.94},
  {id:'tv-console',minX:1.38,maxX:3.22,minZ:4.24,maxZ:4.91,height:1.73},
  {id:'bookshelf',minX:-3.5,maxX:-2.72,minZ:5.35,maxZ:7.06,height:2.05},
  {id:'living-plant',minX:-2.75,maxX:-2.13,minZ:4.35,maxZ:4.98,height:.7},
  {id:'side-table',minX:.9,maxX:1.53,minZ:10.4,maxZ:11.08,height:.62},
  // The apartment is L shaped: widening the living room must not open up the
  // bathroom's right wall or allow water into the space outside its footprint.
  {id:'bathroom-exterior',minX:3.5,maxX:9,minZ:-4,maxZ:4.17,height:3.4},
  {id:'kitchen-fridge',minX:7.92,maxX:8.94,minZ:4.42,maxZ:5.95,height:2.23},
  {id:'kitchen-back-counter',minX:5,maxX:8.94,minZ:11.14,maxZ:11.96,height:.96},
  {id:'kitchen-side-counter',minX:8.17,maxX:8.94,minZ:6.5,maxZ:11.14,height:.96},
  {id:'kitchen-upper-cabinets',minX:7.25,maxX:8.94,minZ:11.62,maxZ:11.96,minY:1.58,height:2.35},
  {id:'kitchen-hood',minX:8.35,maxX:8.94,minZ:7.85,maxZ:8.95,minY:1.78,height:2.6},
  {id:'kitchen-island',minX:4.55,maxX:5.85,minZ:8,maxZ:10.15,height:.97},
  ...[8.41,9.65].map(z=>({id:'kitchen-stool',minX:3.76,maxX:4.22,minZ:z-.23,maxZ:z+.23,height:.71})),
  DOOR_CONTROLLER.collider,
];
export const roomName=position=>position.z>DOOR.z?(position.x>=KITCHEN.minX?'廚房':'客廳'):'浴室';
