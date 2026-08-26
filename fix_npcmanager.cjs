const fs = require('fs');
let npcMan = fs.readFileSync('src/components/NpcManager.tsx', 'utf-8');
npcMan = npcMan.replace(
  'items.sort((a, b) => (a.name || a.nome || "").localeCompare(b.name || b.nome || ""));',
  'items.sort((a, b) => (a.name || (a as any).nome || "").localeCompare(b.name || (b as any).nome || ""));'
);
fs.writeFileSync('src/components/NpcManager.tsx', npcMan);
