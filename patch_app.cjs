const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Rename 'npcs' to 'biblioteca' and 'arena' to 'mesa' in currentTab state
code = code.replace(
  "useState<'personagens' | 'arena' | 'discord' | 'npcs'>",
  "useState<'personagens' | 'mesa' | 'discord' | 'biblioteca'>"
);

// Fix initial state if it was referencing old names (it was 'personagens', so fine)

// Update external event listener for npc
code = code.replace(
  "setCurrentTab('npcs')",
  "setCurrentTab('biblioteca')"
);

// We need a global replace for setCurrentTab('npcs') -> setCurrentTab('biblioteca')
code = code.replaceAll("setCurrentTab('npcs')", "setCurrentTab('biblioteca')");
code = code.replaceAll("currentTab === 'npcs'", "currentTab === 'biblioteca'");

// We need a global replace for setCurrentTab('arena') -> setCurrentTab('mesa')
code = code.replaceAll("setCurrentTab('arena')", "setCurrentTab('mesa')");
code = code.replaceAll("currentTab === 'arena'", "currentTab === 'mesa'");

// Update the Arena Grid button block to MESA (GM ONLY)
const arenaBtnOld = `<button
              onClick={() => setCurrentTab('mesa')}
              className={\`flex items-center gap-1.5 px-5 py-2 text-xs font-black uppercase tracking-widest transition duration-150 \${
                currentTab === 'mesa' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
              }\`}
              title={!isPlayerActiveOnTable ? "Acesso restrito: Requer ficha ativa na mesa" : "Arena Tática em Tempo Real"}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Arena Grid</span>
              {!isPlayerActiveOnTable && (
                <Lock className="h-3 w-3 text-cyan-400 shrink-0" />
              )}
            </button>`;

const mesaBtnNew = `{isGM && (
            <button
              onClick={() => setCurrentTab('mesa')}
              className={\`flex items-center gap-1.5 px-5 py-2 text-xs font-black uppercase tracking-widest transition duration-150 \${
                currentTab === 'mesa' ? 'bg-red-600 text-white shadow' : 'text-white/40 hover:text-white hover:bg-white/5'
              }\`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Mesa</span>
            </button>
          )}`;

code = code.replace(arenaBtnOld, mesaBtnNew);

// Since I just string-replaced 'arena' -> 'mesa', let's make sure the regex or replace targets the exact old block
// Let me just read it again and construct the replace safely
fs.writeFileSync('src/App.tsx', code);
