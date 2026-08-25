const fs = require('fs');
let code = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf8');

const importTarget = `import { NpcSelectorWindow } from './NpcSelectorWindow';`;
const newImportTarget = `import { NpcSelectorWindow } from './NpcSelectorWindow';
import { PcSelectorWindow } from './PcSelectorWindow';`;
code = code.replace(importTarget, newImportTarget);

const stateTarget = `  const [openNpcIds, setOpenNpcIds] = useState<string[]>([]);
  const [showNpcMenu, setShowNpcMenu] = useState(false);`;
const newStateTarget = `  const [openNpcIds, setOpenNpcIds] = useState<string[]>([]);
  const [showNpcMenu, setShowNpcMenu] = useState(false);
  const [openPcIds, setOpenPcIds] = useState<string[]>([]);
  const [showPcMenu, setShowPcMenu] = useState(false);`;
code = code.replace(stateTarget, newStateTarget);

const btnTarget = `            {isGM && (
              <button
                type="button"
                onClick={() => setShowNpcMenu(!showNpcMenu)}
                className={\`p-1.5 rounded transition \${showNpcMenu ? 'bg-sky-500/20 text-sky-400' : 'hover:bg-[#35373c] hover:text-white'}\`}
                title="Janela de Seleção de NPCs"
              >
                <Bot className="h-3.5 w-3.5" />
              </button>
            )}`;
const newBtnTarget = `            {isGM && (
              <>
                <button
                  type="button"
                  onClick={() => setShowPcMenu(!showPcMenu)}
                  className={\`p-1.5 rounded transition \${showPcMenu ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-[#35373c] hover:text-white'}\`}
                  title="Janela de Seleção de Jogadores"
                >
                  <Users className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowNpcMenu(!showNpcMenu)}
                  className={\`p-1.5 rounded transition \${showNpcMenu ? 'bg-sky-500/20 text-sky-400' : 'hover:bg-[#35373c] hover:text-white'}\`}
                  title="Janela de Seleção de NPCs"
                >
                  <Bot className="h-3.5 w-3.5" />
                </button>
              </>
            )}`;
code = code.replace(btnTarget, newBtnTarget);

const lucideTarget = `import { 
  Send, Hash, Bold, Italic, Underline, Strikethrough, EyeOff, Quote, Code, 
  RefreshCw, X, Dices, Pin, PinOff, Search, Copy, Trash2, ArrowDown, 
  MessageSquareQuote, Volume2, Mic, MicOff, Headphones, ChevronDown, 
  ChevronRight, Plus, Download, FileText, Lock, Edit2, Check, Radio, UserCheck, Shield,
  Smile, Terminal, AlertTriangle, CheckCircle2, Info, Bug, ShieldAlert, Cpu, ArrowUp,
  Bot, Sparkles, ExternalLink, Sliders
} from 'lucide-react';`;
const newLucideTarget = `import { 
  Send, Hash, Bold, Italic, Underline, Strikethrough, EyeOff, Quote, Code, 
  RefreshCw, X, Dices, Pin, PinOff, Search, Copy, Trash2, ArrowDown, 
  MessageSquareQuote, Volume2, Mic, MicOff, Headphones, ChevronDown, 
  ChevronRight, Plus, Download, FileText, Lock, Edit2, Check, Radio, UserCheck, Shield,
  Smile, Terminal, AlertTriangle, CheckCircle2, Info, Bug, ShieldAlert, Cpu, ArrowUp,
  Bot, Sparkles, ExternalLink, Sliders, Users
} from 'lucide-react';`;
code = code.replace(lucideTarget, newLucideTarget);

const windowTarget = `      {showNpcMenu && isGM && (
        <NpcSelectorWindow
          npcs={allNpcs}
          openNpcIds={openNpcIds}
          onToggleNpc={(id) => {
            if (openNpcIds.includes(id)) {
              setOpenNpcIds(prev => prev.filter(x => x !== id));
            } else {
              setOpenNpcIds(prev => [...prev, id]);
            }
          }}
          onClose={() => setShowNpcMenu(false)}
        />
      )}`;
const newWindowTarget = `      {showPcMenu && isGM && (
        <PcSelectorWindow
          characters={characters}
          openPcIds={openPcIds}
          onTogglePc={(id) => {
            if (openPcIds.includes(id)) {
              setOpenPcIds(prev => prev.filter(x => x !== id));
            } else {
              setOpenPcIds(prev => [...prev, id]);
            }
          }}
          onClose={() => setShowPcMenu(false)}
        />
      )}

      {showNpcMenu && isGM && (
        <NpcSelectorWindow
          npcs={allNpcs}
          openNpcIds={openNpcIds}
          onToggleNpc={(id) => {
            if (openNpcIds.includes(id)) {
              setOpenNpcIds(prev => prev.filter(x => x !== id));
            } else {
              setOpenNpcIds(prev => [...prev, id]);
            }
          }}
          onClose={() => setShowNpcMenu(false)}
        />
      )}`;
code = code.replace(windowTarget, newWindowTarget);

const renderSheetsTarget = `      {isGM && openNpcIds.map((id, index) => {`;
const newRenderSheetsTarget = `      {isGM && openPcIds.map((id, index) => {
        const char = characters.find(c => c.id === id);
        if (!char) return null;
        return (
          <QuickSheetPanel
            key={id}
            character={char}
            sections={[]} // You could customize this if you want
            onClose={() => setOpenPcIds(prev => prev.filter(x => x !== id))}
            onOpenFull={() => {
              setOpenPcIds(prev => prev.filter(x => x !== id));
              const event = new CustomEvent('openCharacterSheet', { detail: char.id });
              window.dispatchEvent(event);
            }}
            initialPos={{ x: window.innerWidth - 300 - (index * 20), y: 100 + (index * 20) }}
            startMinimized={true}
          />
        );
      })}

      {isGM && openNpcIds.map((id, index) => {`;
code = code.replace(renderSheetsTarget, newRenderSheetsTarget);

fs.writeFileSync('src/components/DiscordNotebook.tsx', code);
console.log('DiscordNotebook patched');
