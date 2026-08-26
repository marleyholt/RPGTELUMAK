const fs = require('fs');

// NpcManager.tsx
let npcMan = fs.readFileSync('src/components/NpcManager.tsx', 'utf-8');
npcMan = npcMan.replace(
  `items.sort((a, b) => (a.name || a.nome || "").localeCompare(b.name || b.nome || ""));
      setNpcs(items);
    });`,
  `items.sort((a, b) => (a.name || (a as any).nome || "").localeCompare(b.name || (b as any).nome || ""));
      setNpcs(items);
    }, (err) => {
      console.warn("NPC Snapshot erro:", err);
      setNpcs([]);
    });`
);
npcMan = npcMan.replace(
  `setDiscordChannels(channels);
    });`,
  `setDiscordChannels(channels);
    }, (err) => {
      console.warn("Discord Channels erro:", err);
      setDiscordChannels([]);
    });`
);
fs.writeFileSync('src/components/NpcManager.tsx', npcMan);

// GameTable.tsx
let gt = fs.readFileSync('src/components/GameTable.tsx', 'utf-8');
gt = gt.replace(
  `setNpcs(data);
    });`,
  `setNpcs(data);
    }, (err) => {
      console.warn("GameTable NPCs erro:", err);
    });`
);
fs.writeFileSync('src/components/GameTable.tsx', gt);

console.log("Patched snapshots");
