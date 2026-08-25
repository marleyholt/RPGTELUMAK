const fs = require('fs');

// 1. Fix CharacterSheet.tsx
let charSheet = fs.readFileSync('src/components/CharacterSheet.tsx', 'utf-8');
if (!charSheet.includes('import { useEffect }')) {
  charSheet = charSheet.replace("import { useState, useRef } from 'react';", "import { useState, useRef, useEffect } from 'react';");
  if (!charSheet.includes('import { useState, useRef, useEffect } from \'react\';')) {
      // Just in case it's something else
      charSheet = charSheet.replace("import { useState } from 'react';", "import { useState, useEffect } from 'react';");
      charSheet = charSheet.replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';");
  }
  fs.writeFileSync('src/components/CharacterSheet.tsx', charSheet);
}

// 2. Fix NpcSelectorWindow.tsx making onCloneNpc optional
let npcSel = fs.readFileSync('src/components/NpcSelectorWindow.tsx', 'utf-8');
if (npcSel.includes('onCloneNpc: (id: string) => void;')) {
  npcSel = npcSel.replace('onCloneNpc: (id: string) => void;', 'onCloneNpc?: (id: string) => void;');
  npcSel = npcSel.replace('onCloneNpc(npc.id)', 'onCloneNpc?.(npc.id)');
  fs.writeFileSync('src/components/NpcSelectorWindow.tsx', npcSel);
}

// 3. Fix NpcManager.tsx _type error
let npcMan = fs.readFileSync('src/components/NpcManager.tsx', 'utf-8');
npcMan = npcMan.replace(/npc\._type === 'character'/g, "(npc as any)._type === 'character'");
npcMan = npcMan.replace(/viewingNpc\._type === 'character'/g, "(viewingNpc as any)._type === 'character'");
fs.writeFileSync('src/components/NpcManager.tsx', npcMan);

console.log("Fixed TS Errors");
