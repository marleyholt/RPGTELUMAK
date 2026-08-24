const fs = require('fs');

let code = fs.readFileSync('src/components/BattleMap.tsx', 'utf8');

const badTokenDoc = `    const tokenDoc: ArenaToken = {
      id,
      name,
      img,
      type: spawnType,
      x: Math.floor(gridWidth / 2),
      y: Math.floor(gridHeight / 2),
      sqm: Number(spawnSqm) || 1,
      charId: charId || undefined
    };`;

const goodTokenDoc = `    const tokenDoc: ArenaToken = {
      id,
      name,
      img,
      type: spawnType,
      x: Math.floor(gridWidth / 2),
      y: Math.floor(gridHeight / 2),
      sqm: Number(spawnSqm) || 1,
      ...(charId ? { charId } : {})
    };`;

if (code.includes(badTokenDoc)) {
  code = code.replace(badTokenDoc, goodTokenDoc);
  fs.writeFileSync('src/components/BattleMap.tsx', code);
  console.log('Patched BattleMap.tsx (charId fix)');
} else {
  console.log('Could not find target in BattleMap.tsx');
}
