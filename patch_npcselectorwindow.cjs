const fs = require('fs');
let code = fs.readFileSync('src/components/NpcSelectorWindow.tsx', 'utf8');

const target = `  const [pos, setPos] = useState({ x: 50, y: 50 });`;
const newTarget = `  const [pos, setPos] = useState({ 
    x: Math.max(10, window.innerWidth / 2 - 128), 
    y: Math.max(10, window.innerHeight / 2 - 160) 
  });`;
code = code.replace(target, newTarget);

const target2 = `z-50`;
const newTarget2 = `z-[100]`;
code = code.replace(target2, newTarget2);

fs.writeFileSync('src/components/NpcSelectorWindow.tsx', code);
console.log('NpcSelectorWindow updated');
