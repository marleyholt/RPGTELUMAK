const fs = require('fs');

// 1. NpcManager.tsx
let npcMan = fs.readFileSync('src/components/NpcManager.tsx', 'utf-8');
npcMan = npcMan.replace(
  'items.sort((a, b) => a.name.localeCompare(b.name));',
  'items.sort((a, b) => (a.name || a.nome || "").localeCompare(b.name || b.nome || ""));'
);
fs.writeFileSync('src/components/NpcManager.tsx', npcMan);

// 2. DiscordNotebook.tsx
let disc = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf-8');
disc = disc.replace(
  'items.sort((a, b) => a.name.localeCompare(b.name));',
  'items.sort((a, b) => (a.name || "").localeCompare(b.name || ""));'
);
fs.writeFileSync('src/components/DiscordNotebook.tsx', disc);

console.log("Patched localeCompare");
