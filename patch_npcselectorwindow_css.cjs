const fs = require('fs');
let code = fs.readFileSync('src/components/NpcSelectorWindow.tsx', 'utf8');

const target = `  const [pos, setPos] = useState({ 
    x: Math.max(10, window.innerWidth / 2 - 128), 
    y: Math.max(10, window.innerHeight / 2 - 160) 
  });`;
const newTarget = `  const [pos, setPos] = useState<{ x: number, y: number } | null>(null);`;
code = code.replace(target, newTarget);

const dragTarget = `      x: e.clientX - pos.x,
      y: e.clientY - pos.y`;
const newDragTarget = `      x: e.clientX - (pos ? pos.x : (window.innerWidth / 2 - 128)),
      y: e.clientY - (pos ? pos.y : (window.innerHeight / 2 - 160))`;
code = code.replace(dragTarget, newDragTarget);

const returnTarget = `    <div 
      className="fixed bg-[#2b2d31] border border-[#1f2023] rounded-lg shadow-2xl z-[100] flex flex-col overflow-hidden animate-fade-in w-64 h-80"
      style={{ left: pos.x, top: pos.y }}`;
const newReturnTarget = `    <div 
      className="fixed bg-[#2b2d31] border border-[#1f2023] rounded-lg shadow-2xl z-[100] flex flex-col overflow-hidden animate-fade-in w-64 h-80"
      style={pos ? { left: pos.x, top: pos.y } : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}`;
code = code.replace(returnTarget, newReturnTarget);

fs.writeFileSync('src/components/NpcSelectorWindow.tsx', code);
console.log('NpcSelectorWindow updated');
