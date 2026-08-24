const fs = require('fs');
let code = fs.readFileSync('src/components/QuickSheetPanel.tsx', 'utf8');

const defaultSectionsTarget = `  const defaultSections = sections.length > 0 ? sections : ['indicadores'];`;
const newDefaultSectionsTarget = `  const allSections = ['indicadores', 'ataque', 'defesa', 'dons', 'equipamento'];
  const defaultSections = allSections.filter(sec => !sections.includes(sec));`;
code = code.replace(defaultSectionsTarget, newDefaultSectionsTarget);

const indicatorsTarget = `            <div className="grid grid-cols-2 gap-2">
              <div className="bg-red-950/30 border border-red-500/20 p-2 rounded">
                <span className="block text-[10px] uppercase font-black text-red-400">HP</span>
                <span className="block text-sm font-black text-white">{character.hp_atual} / {character.hp_max}</span>
              </div>
              <div className="bg-blue-950/30 border border-blue-500/20 p-2 rounded">
                <span className="block text-[10px] uppercase font-black text-blue-400">Ether</span>
                <span className="block text-sm font-black text-white">{character.ether_atual} / {character.ether_max}</span>
              </div>
              {(character.destino_max ?? 0) > 0 && (
                <div className="bg-amber-950/30 border border-amber-500/20 p-2 rounded col-span-2">
                  <span className="block text-[10px] uppercase font-black text-amber-400">Destino</span>
                  <span className="block text-sm font-black text-white">{character.destino_atual ?? character.destino_max} / {character.destino_max}</span>
                </div>
              )}
            </div>
            
            {((character.alcance_max && character.alcance_max !== "0") || (character.movimento_max && character.movimento_max !== "0") || (character.fortitude_max && character.fortitude_max !== "0") || (character.tecnicas_max && character.tecnicas_max !== "0")) && (
              <div className="bg-[#1e1f22] border border-white/5 p-2 rounded space-y-1">
                <span className="block text-[10px] uppercase font-black text-[#949ba4] mb-1">Estatísticas</span>
                
                {character.alcance_max && character.alcance_max !== "0" && (
                  <div className="flex justify-between text-xs items-center gap-2">
                    <span className="text-white/70">Alcance:</span>
                    <span className="text-white font-bold text-right truncate">{character.alcance_max}</span>
                  </div>
                )}
                {character.movimento_max && character.movimento_max !== "0" && (
                  <div className="flex justify-between text-xs items-center gap-2">
                    <span className="text-white/70">Movimento:</span>
                    <span className="text-white font-bold text-right truncate">{character.movimento_max}</span>
                  </div>
                )}
                {character.fortitude_max && character.fortitude_max !== "0" && (
                  <div className="flex justify-between text-xs items-center gap-2">
                    <span className="text-white/70">Fortitude:</span>
                    <span className="text-white font-bold text-right truncate">{character.fortitude_max}</span>
                  </div>
                )}
                {character.tecnicas_max && character.tecnicas_max !== "0" && (
                  <div className="flex justify-between text-xs items-center gap-2">
                    <span className="text-white/70">Técnicas:</span>
                    <span className="text-white font-bold text-right truncate">{character.tecnicas_max}</span>
                  </div>
                )}
              </div>
            )}`;

const newIndicatorsTarget = `            {((character.hp_max ?? 0) > 0 || (character.ether_max ?? 0) > 0 || (character.destino_max ?? 0) > 0) && (
              <div className="grid grid-cols-2 gap-2">
                {(character.hp_max ?? 0) > 0 && (
                  <div className="bg-red-950/30 border border-red-500/20 p-2 rounded">
                    <span className="block text-[10px] uppercase font-black text-red-400">HP</span>
                    <span className="block text-sm font-black text-white">{character.hp_atual} / {character.hp_max}</span>
                  </div>
                )}
                {(character.ether_max ?? 0) > 0 && (
                  <div className="bg-blue-950/30 border border-blue-500/20 p-2 rounded">
                    <span className="block text-[10px] uppercase font-black text-blue-400">Ether</span>
                    <span className="block text-sm font-black text-white">{character.ether_atual} / {character.ether_max}</span>
                  </div>
                )}
                {(character.destino_max ?? 0) > 0 && (
                  <div className="bg-amber-950/30 border border-amber-500/20 p-2 rounded col-span-2">
                    <span className="block text-[10px] uppercase font-black text-amber-400">Destino</span>
                    <span className="block text-sm font-black text-white">{character.destino_atual ?? character.destino_max} / {character.destino_max}</span>
                  </div>
                )}
              </div>
            )}
            
            {(character.primordio ?? 0) > 0 && (
              <div className="bg-[#1e1f22] border border-white/5 p-2 rounded flex items-center justify-between">
                <span className="block text-[10px] uppercase font-black text-[#949ba4]">Primórdio</span>
                <div className="flex gap-1 flex-wrap">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={\`h-2 w-2 rounded-full \${i < character.primordio ? 'bg-amber-400' : 'bg-white/10'}\`} />
                  ))}
                </div>
              </div>
            )}
            
            {((character.alcance_max && character.alcance_max !== "0") || (character.movimento_max && character.movimento_max !== "0") || (character.fortitude_max && character.fortitude_max !== "0") || (character.tecnicas_max && character.tecnicas_max !== "0")) && (
              <div className="bg-[#1e1f22] border border-white/5 p-2 rounded space-y-1">
                <span className="block text-[10px] uppercase font-black text-[#949ba4] mb-1">Estatísticas</span>
                
                {character.alcance_max && character.alcance_max !== "0" && (
                  <div className="flex justify-between text-xs items-center gap-2">
                    <span className="text-white/70">Alcance:</span>
                    <span className="text-white font-bold text-right truncate">{character.alcance_max}</span>
                  </div>
                )}
                {character.movimento_max && character.movimento_max !== "0" && (
                  <div className="flex justify-between text-xs items-center gap-2">
                    <span className="text-white/70">Movimento:</span>
                    <span className="text-white font-bold text-right truncate">{character.movimento_max}</span>
                  </div>
                )}
                {character.fortitude_max && character.fortitude_max !== "0" && (
                  <div className="flex justify-between text-xs items-center gap-2">
                    <span className="text-white/70">Fortitude:</span>
                    <span className="text-white font-bold text-right truncate">{character.fortitude_max}</span>
                  </div>
                )}
                {character.tecnicas_max && character.tecnicas_max !== "0" && (
                  <div className="flex justify-between text-xs items-center gap-2">
                    <span className="text-white/70">Técnicas:</span>
                    <span className="text-white font-bold text-right truncate">{character.tecnicas_max}</span>
                  </div>
                )}
              </div>
            )}`;

code = code.replace(indicatorsTarget, newIndicatorsTarget);

fs.writeFileSync('src/components/QuickSheetPanel.tsx', code);
console.log('Patched QuickSheetPanel 2');
