const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf-8');

const npcOld = `export interface NPC {
  id: string;
  name: string;
  content: string; // HTML content
  images: string[];
  coverImageIndex: number;
  createdAt: any;
  updatedAt: any;
}`;

const npcNew = `export interface NPC {
  id: string;
  name: string;
  content: string; // HTML content
  images: string[];
  coverImageIndex: number;
  createdAt: any;
  updatedAt: any;
  
  // Table markers
  hp_atual?: number;
  hp_max?: number;
  ether_atual?: number;
  ether_max?: number;
  poder_atual?: number;
  poder_max?: number;
  ferramentas_atual?: number;
  ferramentas_max?: number;
}`;

if (code.includes(npcOld)) {
  code = code.replace(npcOld, npcNew);
  fs.writeFileSync('src/types.ts', code);
}
