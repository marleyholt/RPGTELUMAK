const fs = require('fs');
let types = fs.readFileSync('src/types.ts', 'utf8');

const target = `export interface CharVersion {`;
const newTypes = `export interface NPC {
  id: string;
  name: string;
  content: string; // HTML content
  images: string[];
  coverImageIndex: number;
  createdAt: any;
  updatedAt: any;
}

export interface CharVersion {`;

types = types.replace(target, newTypes);
fs.writeFileSync('src/types.ts', types);
console.log('Patched types');
