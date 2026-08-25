const fs = require('fs');
let code = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf8');

const importTarget = `import { NpcQuickSheet } from './NpcQuickSheet';`;
const newImportTarget = `import { NpcQuickSheet } from './NpcQuickSheet';
import { NpcSelectorWindow } from './NpcSelectorWindow';`;
code = code.replace(importTarget, newImportTarget);

const buttonsTarget = `          <div className="flex items-center gap-0.5 text-[#b5bac1] shrink-0 relative">
            {isGM && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNpcMenu(!showNpcMenu)}
                  className={\`p-1.5 rounded transition \${showNpcMenu ? 'bg-sky-500/20 text-sky-400' : 'hover:bg-[#35373c] hover:text-white'}\`}
                  title="Fichas de NPCs (Pocket)"
                >
                  <Bot className="h-3.5 w-3.5" />
                </button>
                {showNpcMenu && (
                  <div className="absolute top-full right-0 mt-1 w-48 bg-[#2b2d31] border border-[#1f2023] rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase text-[#949ba4] border-b border-white/5 bg-[#1e1f22]">
                      Fichas de NPCs
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scroll">
                      {allNpcs.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-white/40 italic">Nenhum NPC cadastrado.</div>
                      ) : (
                        allNpcs.map(npc => {
                          const isOpen = openNpcIds.includes(npc.id);
                          return (
                            <button
                              key={npc.id}
                              onClick={() => {
                                if (isOpen) {
                                  setOpenNpcIds(prev => prev.filter(id => id !== npc.id));
                                } else {
                                  setOpenNpcIds(prev => [...prev, npc.id]);
                                }
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 flex items-center justify-between"
                            >
                              <span className={\`truncate \${isOpen ? 'text-sky-400 font-bold' : 'text-white/70'}\`}>{npc.name}</span>
                              {isOpen && <Check className="w-3.5 h-3.5 text-sky-400" />}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}`;

const newButtonsTarget = `          <div className="flex items-center gap-0.5 text-[#b5bac1] shrink-0 relative">
            {isGM && (
              <button
                type="button"
                onClick={() => setShowNpcMenu(!showNpcMenu)}
                className={\`p-1.5 rounded transition \${showNpcMenu ? 'bg-sky-500/20 text-sky-400' : 'hover:bg-[#35373c] hover:text-white'}\`}
                title="Janela de Seleção de NPCs"
              >
                <Bot className="h-3.5 w-3.5" />
              </button>
            )}`;

code = code.replace(buttonsTarget, newButtonsTarget);

const quickSheetTarget = `      {showQuickSheet && myActiveCharacter && (
        <QuickSheetPanel 
          character={myActiveCharacter} 
          sections={identityQuickSheet || []}
          onClose={() => setShowQuickSheet(false)}
          onOpenFull={() => {}}
        />
      )}

      {isGM && openNpcIds.map((id, index) => {
        const npc = allNpcs.find(n => n.id === id);
        if (!npc) return null;
        return (
          <NpcQuickSheet
            key={id}
            npc={npc}
            onClose={() => setOpenNpcIds(prev => prev.filter(x => x !== id))}
            initialPos={{ x: 100 + (index * 30), y: 100 + (index * 30) }}
          />
        );
      })}`;

const newQuickSheetTarget = `      {showQuickSheet && myActiveCharacter && (
        <QuickSheetPanel 
          character={myActiveCharacter} 
          sections={identityQuickSheet || []}
          onClose={() => setShowQuickSheet(false)}
          onOpenFull={() => {}}
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
      )}

      {isGM && openNpcIds.map((id, index) => {
        const npc = allNpcs.find(n => n.id === id);
        if (!npc) return null;
        return (
          <NpcQuickSheet
            key={id}
            npc={npc}
            onClose={() => setOpenNpcIds(prev => prev.filter(x => x !== id))}
            initialPos={{ x: window.innerWidth - 300 - (index * 20), y: 100 + (index * 20) }}
          />
        );
      })}`;

code = code.replace(quickSheetTarget, newQuickSheetTarget);

fs.writeFileSync('src/components/DiscordNotebook.tsx', code);
console.log('DiscordNotebook patched with selector window');
