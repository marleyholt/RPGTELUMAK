const fs = require('fs');
let content = fs.readFileSync('src/components/CharacterSheet.tsx', 'utf8');

const regexTabs = /(<div className="flex border-b border-white\/10 bg-\[\#080808\] overflow-x-auto custom-scroll">.*?)(?=\{\/\* Tab contents \*\/)/s;
const match = content.match(regexTabs);

if (match) {
  const newTabs = `<div className="flex border-b border-white/10 bg-[#080808] overflow-x-auto custom-scroll">
              <button
                onClick={() => setActiveTab('ataques')}
                className={\`px-5 py-3.5 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border-b-2 shrink-0 \${
                  activeTab === 'ataques'
                    ? 'border-blue-500 text-sky-400 bg-white/[0.03]'
                    : 'border-transparent text-white/40 hover:text-white'
                }\`}
              >
                <Swords className="h-3.5 w-3.5" />
                Ataques
              </button>

              <button
                onClick={() => setActiveTab('defesa')}
                className={\`px-5 py-3.5 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border-b-2 shrink-0 \${
                  activeTab === 'defesa'
                    ? 'border-blue-500 text-sky-400 bg-white/[0.03]'
                    : 'border-transparent text-white/40 hover:text-white'
                }\`}
              >
                <Shield className="h-3.5 w-3.5" />
                Defesa
              </button>

              <button
                onClick={() => setActiveTab('dons')}
                className={\`px-5 py-3.5 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border-b-2 shrink-0 \${
                  activeTab === 'dons'
                    ? 'border-blue-500 text-sky-400 bg-white/[0.03]'
                    : 'border-transparent text-white/40 hover:text-white'
                }\`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Dons
              </button>

              <button
                onClick={() => setActiveTab('equip')}
                className={\`px-5 py-3.5 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border-b-2 shrink-0 \${
                  activeTab === 'equip'
                    ? 'border-blue-500 text-sky-400 bg-white/[0.03]'
                    : 'border-transparent text-white/40 hover:text-white'
                }\`}
              >
                <Package className="h-3.5 w-3.5" />
                Equipamento
              </button>

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
            </div>

            `;
  content = content.replace(regexTabs, newTabs);
  fs.writeFileSync('src/components/CharacterSheet.tsx', content);
  console.log('Success rewriting tabs');
} else {
  console.log('Failed to match tabs');
}
