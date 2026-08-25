const fs = require('fs');

// 1. Update NpcSelectorWindow.tsx
let sel = fs.readFileSync('src/components/NpcSelectorWindow.tsx', 'utf-8');
if (!sel.includes('onCloneNpc')) {
  sel = sel.replace('onToggleNpc: (id: string) => void;', 'onToggleNpc: (id: string) => void;\n  onCloneNpc: (id: string) => void;');
  sel = sel.replace('onToggleNpc, onClose', 'onToggleNpc, onCloneNpc, onClose');
  
  const cloneBtnHtml = `
                <button
                  onClick={(e) => { e.stopPropagation(); onCloneNpc(npc.id); }}
                  className="px-2 py-1 bg-white/5 hover:bg-indigo-500/20 text-white/50 hover:text-indigo-400 rounded text-[10px] font-bold uppercase transition"
                  title="Criar uma cópia extra e adicionar à mesa"
                >
                  Clonar
                </button>`;
                
  const itemOld = `<span className={\`truncate \${isOpen ? 'font-bold' : ''}\`}>{npc.name}</span>
                {isOpen && <Check className="w-3.5 h-3.5" />}`;
                
  const itemNew = `<span className={\`truncate \${isOpen ? 'font-bold' : ''}\`}>{npc.name}</span>
                <div className="flex items-center gap-2">
                  ${cloneBtnHtml}
                  {isOpen && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </div>`;
                
  sel = sel.replace(itemOld, itemNew);
  fs.writeFileSync('src/components/NpcSelectorWindow.tsx', sel);
}

// 2. Update GameTable.tsx
let gt = fs.readFileSync('src/components/GameTable.tsx', 'utf-8');
const handleCloneHtml = `  const handleCloneNpc = async (id: string) => {
    const target = npcs.find(n => n.id === id);
    if (!target) return;
    try {
      const { id: _, ...npcData } = target;
      await addDoc(collection(db, 'npcs'), {
        ...npcData,
        name: \`\${npcData.name} (Cópia)\`,
        active_on_board: true,
        createdAt: new Date().toISOString()
      });
      setShowSelector(null);
    } catch (e) {
      console.error(e);
    }
  };`;

if (!gt.includes('handleCloneNpc')) {
  gt = gt.replace("const handleUpdateNpcMarker", handleCloneHtml + "\n\n  const handleUpdateNpcMarker");
}

const selCompOld = `<NpcSelectorWindow 
          npcs={npcs} 
          openNpcIds={activeNpcs.map(n => n.id)} 
          onToggleNpc={(id) => {
            const isAct = activeNpcs.some(n => n.id === id);
            handleToggleBoard(id, 'npc', isAct);
            setShowSelector(null);
          }}
          onClose={() => setShowSelector(null)}
        />`;
        
const selCompNew = `<NpcSelectorWindow 
          npcs={npcs} 
          openNpcIds={activeNpcs.map(n => n.id)} 
          onToggleNpc={(id) => {
            const isAct = activeNpcs.some(n => n.id === id);
            handleToggleBoard(id, 'npc', isAct);
            setShowSelector(null);
          }}
          onCloneNpc={handleCloneNpc}
          onClose={() => setShowSelector(null)}
        />`;

if (gt.includes(selCompOld)) {
  gt = gt.replace(selCompOld, selCompNew);
} else {
    // try a regex approach
    gt = gt.replace(/onToggleNpc=\{\(id\) => \{[\s\S]*?setShowSelector\(null\);\s*\}\}/, 
    "onToggleNpc={(id) => {\n            const isAct = activeNpcs.some(n => n.id === id);\n            handleToggleBoard(id, 'npc', isAct);\n            setShowSelector(null);\n          }}\n          onCloneNpc={handleCloneNpc}");
}

fs.writeFileSync('src/components/GameTable.tsx', gt);

