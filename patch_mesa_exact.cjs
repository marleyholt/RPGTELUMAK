const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /\{\/\* TACTICAL BATTLE MAP TAB \*\/\}(.|\n)*?\{\/\* CORE CHARACTERS PORTAL TAB AND FULL-WIDTH LAYOUT \*\/\}/m;

const newTableBlock = `{/* MESA DO MESTRE TAB */}
      {currentTab === 'mesa' && isGM && (
        <div className="flex-1 w-full h-[calc(100vh-64px)] overflow-hidden flex flex-col no-print">
          <GameTable
            characters={characters}
            onQuickEditChar={setupQuickStatsEditor}
            onOpenCharSheet={(id) => { setSelectedCharId(id); setCurrentTab('personagens'); }}
            onOpenNpcSheet={(id) => { window.dispatchEvent(new CustomEvent('openNpcSheet', { detail: id })); }}
          />
        </div>
      )}

      {/* CORE CHARACTERS PORTAL TAB AND FULL-WIDTH LAYOUT */}`;

code = code.replace(regex, newTableBlock);

fs.writeFileSync('src/App.tsx', code);
