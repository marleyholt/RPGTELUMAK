const fs = require('fs');
let code = fs.readFileSync('src/components/QuickSheetPanel.tsx', 'utf8');

const interfaceTarget = `interface QuickSheetPanelProps {
  character: Character;
  sections: string[];
  onClose: () => void;
  onOpenFull: () => void;
}`;
const newInterfaceTarget = `interface QuickSheetPanelProps {
  character: Character;
  sections: string[];
  onClose: () => void;
  onOpenFull: () => void;
  initialPos?: { x: number, y: number };
  startMinimized?: boolean;
}`;
code = code.replace(interfaceTarget, newInterfaceTarget);

const functionTarget = `export function QuickSheetPanel({ character, sections, onClose, onOpenFull }: QuickSheetPanelProps) {`;
const newFunctionTarget = `export function QuickSheetPanel({ character, sections, onClose, onOpenFull, initialPos, startMinimized = false }: QuickSheetPanelProps) {`;
code = code.replace(functionTarget, newFunctionTarget);

const posTarget = `  const [pos, setPos] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 340 });`;
const newPosTarget = `  const [pos, setPos] = useState(initialPos || { x: window.innerWidth - 340, y: window.innerHeight - 340 });`;
code = code.replace(posTarget, newPosTarget);

const minimizedTarget = `const [isMinimized, setIsMinimized] = useState(false);`;
const newMinimizedTarget = `const [isMinimized, setIsMinimized] = useState(startMinimized);`;
code = code.replace(minimizedTarget, newMinimizedTarget);

fs.writeFileSync('src/components/QuickSheetPanel.tsx', code);
console.log('QuickSheetPanel patched');
