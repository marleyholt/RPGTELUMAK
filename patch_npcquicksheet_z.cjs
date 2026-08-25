const fs = require('fs');
let code = fs.readFileSync('src/components/NpcQuickSheet.tsx', 'utf8');

const target2 = `z-[60]`;
const newTarget2 = `z-[100]`;
code = code.replace(target2, newTarget2);

fs.writeFileSync('src/components/NpcQuickSheet.tsx', code);
console.log('NpcQuickSheet z-index updated');
