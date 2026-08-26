const fs = require('fs');

let disc = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf-8');
disc = disc.replace(
  'items.sort((a, b) => (a.name || "").localeCompare(b.name || ""));',
  'items.sort((a, b) => (a.name || (a as any).nome || "").localeCompare(b.name || (b as any).nome || ""));'
);
fs.writeFileSync('src/components/DiscordNotebook.tsx', disc);

console.log("Patched localeCompare 2");
