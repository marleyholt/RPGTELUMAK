const fs = require('fs');
let code = fs.readFileSync('src/components/CharacterSheet.tsx', 'utf-8');

code = code.replace(
  `              <button
                onClick={() => setActiveTab('versoes')}
                className={\`px-5 py-3.5 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border-b-2 shrink-0 \${
                  activeTab === 'versoes'
                    ? 'border-blue-500 text-sky-400 bg-white/[0.03]'
                    : 'border-transparent text-white/40 hover:text-white'
                }\`}
              >
                <History className="h-3.5 w-3.5" />
                Versões Salvas
              </button>`,
  `              {isGM && (
                <button
                  onClick={() => setActiveTab('versoes')}
                  className={\`px-5 py-3.5 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border-b-2 shrink-0 \${
                    activeTab === 'versoes'
                      ? 'border-blue-500 text-sky-400 bg-white/[0.03]'
                      : 'border-transparent text-white/40 hover:text-white'
                  }\`}
                >
                  <History className="h-3.5 w-3.5" />
                  Versões Salvas
                </button>
              )}`
);

fs.writeFileSync('src/components/CharacterSheet.tsx', code);
