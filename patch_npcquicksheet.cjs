const fs = require('fs');
let code = fs.readFileSync('src/components/NpcQuickSheet.tsx', 'utf8');

const interfaceTarget = `interface NpcQuickSheetProps {
  npc: NPC;
  onClose: () => void;
  initialPos?: { x: number, y: number };
}`;
const newInterfaceTarget = `interface NpcQuickSheetProps {
  npc: NPC;
  onClose: () => void;
  initialPos?: { x: number, y: number };
  startMinimized?: boolean;
}`;
code = code.replace(interfaceTarget, newInterfaceTarget);

const componentTarget = `export function NpcQuickSheet({ npc, onClose, initialPos }: NpcQuickSheetProps) {
  const [activeTab, setActiveTab] = useState<'fotos' | 'anotacoes'>('fotos');
  const [isMinimized, setIsMinimized] = useState(false);`;
const newComponentTarget = `export function NpcQuickSheet({ npc, onClose, initialPos, startMinimized = true }: NpcQuickSheetProps) {
  const [activeTab, setActiveTab] = useState<'fotos' | 'anotacoes'>('fotos');
  const [isMinimized, setIsMinimized] = useState(startMinimized);`;
code = code.replace(componentTarget, newComponentTarget);

fs.writeFileSync('src/components/NpcQuickSheet.tsx', code);
console.log('NpcQuickSheet patched');
