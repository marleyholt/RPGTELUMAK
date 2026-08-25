const fs = require('fs');
let code = fs.readFileSync('src/components/NpcManager.tsx', 'utf-8');

// Add Character type
code = code.replace(
  "import { NPC, DiscordChannelItem } from '../types';",
  "import { NPC, DiscordChannelItem, Character } from '../types';"
);

// Add props
code = code.replace(
  "export function NpcManager() {",
  "export function NpcManager({ characters = [] }: { characters?: Character[] }) {"
);

// Change titles
code = code.replace("Galeria de NPCs", "Biblioteca");
code = code.replace("Buscar NPC...", "Buscar...");

// Add filter state
const stateBlock = `  const [sendType, setSendType] = useState<'cover' | 'all'>('cover');`;
const newFilters = `  const [sendType, setSendType] = useState<'cover' | 'all'>('cover');
  const [filterType, setFilterType] = useState<'all' | 'npc' | 'character'>('all');`;

code = code.replace(stateBlock, newFilters);

// Update unified list logic
const filterLogic = `  const filteredNpcs = npcs.filter(n => n.name.toLowerCase().includes(search.toLowerCase()));`;
const newFilterLogic = `
  const allLibraryItems = [
    ...npcs.map(n => ({ ...n, _type: 'npc' })),
    ...characters.map(c => ({ 
      id: c.id, 
      name: c.nome, 
      images: [c.img_saudavel], 
      coverImageIndex: 0, 
      _type: 'character', 
      _character: c 
    }))
  ];

  const filteredItems = allLibraryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || filterType === item._type;
    return matchesSearch && matchesType;
  });
`;
code = code.replace(filterLogic, newFilterLogic);

// Replace filteredNpcs with filteredItems
code = code.replaceAll("filteredNpcs.length === 0", "filteredItems.length === 0");
code = code.replaceAll("filteredNpcs.map(npc => {", "filteredItems.map(npc => {");

// We need to handle the onClick for viewing
code = code.replaceAll(
  "onClick={() => setViewingNpc(npc)}",
  `onClick={() => {
                    if (npc._type === 'character') {
                      window.dispatchEvent(new CustomEvent('openCharacterSheet', { detail: npc.id }));
                    } else {
                      setViewingNpc(npc as NPC);
                    }
                  }}`
);

// We need to handle the header buttons for filters
const headerButtons = `<div className="flex items-center gap-3">`;
const newHeaderButtons = `<div className="flex items-center gap-3">
          <div className="flex bg-[#1e1f22] p-1 rounded-md">
            <button onClick={() => setFilterType('all')} className={\`px-3 py-1 text-[10px] font-bold uppercase transition rounded \${filterType === 'all' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}\`}>Todos</button>
            <button onClick={() => setFilterType('npc')} className={\`px-3 py-1 text-[10px] font-bold uppercase transition rounded \${filterType === 'npc' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}\`}>NPCs</button>
            <button onClick={() => setFilterType('character')} className={\`px-3 py-1 text-[10px] font-bold uppercase transition rounded \${filterType === 'character' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}\`}>Aventureiros</button>
          </div>`;
code = code.replace(headerButtons, newHeaderButtons);

// Add a badge to distinguish types in the UI
const nameHeaderGrid = `<h3 className="text-xs font-black text-white uppercase tracking-wider truncate px-1">{npc.name}</h3>`;
const newNameHeaderGrid = `<div className="flex items-center gap-2 px-1">
                          <span className={\`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold \${npc._type === 'character' ? 'bg-blue-500/20 text-blue-400' : 'bg-indigo-500/20 text-indigo-400'}\`}>{npc._type === 'character' ? 'PC' : 'NPC'}</span>
                          <h3 className="text-xs font-black text-white uppercase tracking-wider truncate">{npc.name}</h3>
                        </div>`;
code = code.replace(nameHeaderGrid, newNameHeaderGrid);

const nameHeaderList = `<h3 className="text-sm font-black text-white uppercase tracking-wider truncate">{npc.name}</h3>`;
const newNameHeaderList = `<div className="flex items-center gap-2">
                        <span className={\`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold \${npc._type === 'character' ? 'bg-blue-500/20 text-blue-400' : 'bg-indigo-500/20 text-indigo-400'}\`}>{npc._type === 'character' ? 'PC' : 'NPC'}</span>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider truncate">{npc.name}</h3>
                      </div>`;
code = code.replace(nameHeaderList, newNameHeaderList);

fs.writeFileSync('src/components/NpcManager.tsx', code);
