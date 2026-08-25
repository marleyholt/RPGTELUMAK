const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Add import GameTable
code = code.replace(
  "import { BattleMap } from './components/BattleMap';",
  "import { GameTable } from './components/GameTable';"
);

// Replace BattleMap block
const oldTableBlock = `{currentTab === 'mesa' && (
        <div className="flex-1 w-full h-[calc(100vh-64px)] p-2 sm:p-3 overflow-hidden flex flex-col no-print">
          {isPlayerActiveOnTable ? (
            <BattleMap
              isGM={isGM}
              currentUserEmail={currentUser.email || ''}
              characters={activeCharacters}
            />
          ) : (
            <div className="bg-[#080808] border border-white/10 p-8 text-center shadow-2xl flex flex-col items-center justify-center h-full">
              
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 mb-5 shadow-lg">
                <ShieldAlert className="h-8 w-8" />
              </div>

              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mb-2">
                Acesso Restrito ao Grid Tático
              </h2>
              
              <p className="text-xs sm:text-sm text-sky-200/70 leading-relaxed max-w-lg mb-6 font-sans">
                A visualização e interação com a Arena Tática em tempo real é exclusiva para fichas que foram escaladas na <strong className="text-white">Mesa de Combate</strong> pelo Mestre (GM).
              </p>

              {/* Player Status Info Box */}
              <div className="w-full bg-[#101010] border border-white/10 p-4 rounded-none text-left mb-6 space-y-2">
                <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                  <span className="text-white/50 font-mono">Usuário:</span>
                  <span className="text-sky-400 font-mono font-bold">{currentUser?.email}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                  <span className="text-white/50 font-mono">Status na Mesa:</span>
                  <span className="text-cyan-400 font-mono font-bold flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Fora da Mesa de Combate
                  </span>
                </div>
                <div className="text-xs pt-1">
                  <span className="text-white/50 font-mono block mb-1">Suas Fichas ({myCharactersList.length}):</span>
                  {myCharactersList.length === 0 ? (
                    <span className="text-white/40 italic text-[11px]">Nenhuma ficha cadastrada neste email.</span>
                  ) : (
                    <div className="space-y-1">
                      {myCharactersList.map(c => (
                        <div key={c.id} className="flex items-center justify-between bg-black/50 px-2.5 py-1.5 border border-white/5">
                          <span className="text-white font-bold uppercase text-[11px]">{c.nome}</span>
                          <span className="text-[10px] font-mono uppercase text-white/40">Inativo na Mesa</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentTab('personagens')}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider transition shadow"
                >
                  Ir para Minhas Fichas
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTab('discord')}
                  className="px-6 py-2.5 bg-[#1a1a1a] hover:bg-[#252525] text-white/80 hover:text-white text-xs font-bold uppercase tracking-wider transition border border-white/10"
                >
                  Abrir Notebook Discord
                </button>
              </div>

              <p className="text-[10px] text-sky-400/50 font-mono mt-6">
                💡 Assim que o Mestre marcar sua ficha com "+ Mesa" no painel, o Grid Tático será desbloqueado automaticamente.
              </p>
            </div>
          )}
        </div>
      )}`;

const newTableBlock = `{currentTab === 'mesa' && isGM && (
        <div className="flex-1 w-full h-[calc(100vh-64px)] overflow-hidden flex flex-col no-print">
          <GameTable
            characters={characters}
            onQuickEditChar={setupQuickStatsEditor}
            onOpenCharSheet={(id) => { setSelectedCharId(id); setCurrentTab('personagens'); }}
            onOpenNpcSheet={(id) => { window.dispatchEvent(new CustomEvent('openNpcSheet', { detail: id })); }}
          />
        </div>
      )}`;

code = code.replace(oldTableBlock, newTableBlock);

fs.writeFileSync('src/App.tsx', code);
