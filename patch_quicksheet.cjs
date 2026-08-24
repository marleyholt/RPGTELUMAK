const fs = require('fs');
let code = fs.readFileSync('src/components/QuickSheetPanel.tsx', 'utf8');

const oldCombate = `            <div className="bg-[#1e1f22] border border-white/5 p-2 rounded space-y-1">
              <span className="block text-[10px] uppercase font-black text-[#949ba4] mb-1">Combate</span>
              {character.ferramentas_combate > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-white/70">Ferramentas de Combate:</span>
                  <span className="text-white font-bold">{character.ferramentas_combate}</span>
                </div>
              )}
              {character.municao > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-white/70">Munição:</span>
                  <span className="text-white font-bold">{character.municao}</span>
                </div>
              )}
              {character.ferramentas_combate === 0 && character.municao === 0 && (
                <span className="text-[10px] text-white/40 italic">Nenhum recurso de combate</span>
              )}
            </div>`;

const newCombate = `            {(character.ferramentas_combate > 0 || character.municao > 0) && (
              <div className="bg-[#1e1f22] border border-white/5 p-2 rounded space-y-1">
                <span className="block text-[10px] uppercase font-black text-[#949ba4] mb-1">Combate</span>
                {character.ferramentas_combate > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-white/70">Ferramentas de Combate:</span>
                    <span className="text-white font-bold">{character.ferramentas_combate}</span>
                  </div>
                )}
                {character.municao > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-white/70">Munição:</span>
                    <span className="text-white font-bold">{character.municao}</span>
                  </div>
                )}
              </div>
            )}`;

code = code.replace(oldCombate, newCombate);
fs.writeFileSync('src/components/QuickSheetPanel.tsx', code);
console.log('Patched Combate in QuickSheet');
