const fs = require('fs');
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add 'npcs' to state
const stateTarget = `const [currentTab, setCurrentTab] = useState<'personagens' | 'arena' | 'discord'>('personagens');`;
const newStateTarget = `const [currentTab, setCurrentTab] = useState<'personagens' | 'arena' | 'discord' | 'npcs'>('personagens');`;
appCode = appCode.replace(stateTarget, newStateTarget);

// 2. Add NpcManager import
const importTarget = `import { AdminPanel } from './components/AdminPanel';`;
const newImportTarget = `import { AdminPanel } from './components/AdminPanel';
import { NpcManager } from './components/NpcManager';`;
appCode = appCode.replace(importTarget, newImportTarget);

// 3. Add NPCs button
const buttonsTarget = `              title={!isPlayerActiveOnTable ? "Acesso restrito: Requer ficha ativa na mesa" : "Arena Tática em Tempo Real"}
            >
              <Swords className="h-3.5 w-3.5" />
              Arena
              {!isPlayerActiveOnTable && (
                <Lock className="w-3 h-3 text-red-500 absolute -top-1 -right-1" />
              )}
            </button>

            <button
              onClick={() => setCurrentTab('discord')}`;
const newButtonsTarget = `              title={!isPlayerActiveOnTable ? "Acesso restrito: Requer ficha ativa na mesa" : "Arena Tática em Tempo Real"}
            >
              <Swords className="h-3.5 w-3.5" />
              Arena
              {!isPlayerActiveOnTable && (
                <Lock className="w-3 h-3 text-red-500 absolute -top-1 -right-1" />
              )}
            </button>
            
            {isGM && (
              <button
                onClick={() => setCurrentTab('npcs')}
                className={\`flex items-center gap-1.5 px-5 py-2 text-xs font-black uppercase tracking-widest transition duration-150 \${
                  currentTab === 'npcs' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
                }\`}
                title="Galeria de NPCs"
              >
                <Users className="h-3.5 w-3.5" />
                NPCs
              </button>
            )}

            <button
              onClick={() => setCurrentTab('discord')}`;
appCode = appCode.replace(buttonsTarget, newButtonsTarget);

// 4. Add rendering block
const renderTarget = `      {/* DISCORD TAB */}`;
const newRenderTarget = `      {/* NPCS TAB */}
      {currentTab === 'npcs' && isGM && (
        <div className="flex-1 overflow-hidden h-full pb-0 bg-[#313338]">
          <NpcManager />
        </div>
      )}
      
      {/* DISCORD TAB */}`;
appCode = appCode.replace(renderTarget, newRenderTarget);

// Ensure Users icon is imported from lucide-react
if (!appCode.includes('Users,')) {
    appCode = appCode.replace(/User,/, 'User, Users,');
}

fs.writeFileSync('src/App.tsx', appCode);
console.log('Patched App.tsx with NpcManager');
