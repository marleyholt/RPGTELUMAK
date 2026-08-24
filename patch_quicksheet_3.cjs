const fs = require('fs');
let code = fs.readFileSync('src/components/QuickSheetPanel.tsx', 'utf8');

const oldCombate = `            {(character.ferramentas_combate > 0 || character.municao > 0) && (
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

const newCombate = `            {((character.ferramenta_fisico_max ?? 2) > 0 || 
               (character.ferramenta_fisico_sec_max ?? 3) > 0 || 
               (character.ferramenta_destreza_max ?? 0) > 0 || 
               (character.ferramenta_cognicao_max ?? 0) > 0 || 
               (character.ferramenta_carisma_max ?? 1) > 0) && (
              <div className="bg-[#1e1f22] border border-white/5 p-2 rounded space-y-1">
                <span className="block text-[10px] uppercase font-black text-[#949ba4] mb-1">Ferramentas de Combate</span>
                
                {(character.ferramenta_fisico_max ?? 2) > 0 && (
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-white/70">Físico (F):</span>
                    <span className="text-white font-bold">{character.ferramenta_fisico_atual ?? character.ferramenta_fisico_max ?? 2} / {character.ferramenta_fisico_max ?? 2}</span>
                  </div>
                )}
                {(character.ferramenta_fisico_sec_max ?? 3) > 0 && (
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-white/70">Físico Sec.:</span>
                    <span className="text-white font-bold">{character.ferramenta_fisico_sec_atual ?? character.ferramenta_fisico_sec_max ?? 3} / {character.ferramenta_fisico_sec_max ?? 3}</span>
                  </div>
                )}
                {(character.ferramenta_destreza_max ?? 0) > 0 && (
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-white/70">Destreza (D):</span>
                    <span className="text-white font-bold">{character.ferramenta_destreza_atual ?? character.ferramenta_destreza_max ?? 0} / {character.ferramenta_destreza_max ?? 0}</span>
                  </div>
                )}
                {(character.ferramenta_cognicao_max ?? 0) > 0 && (
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-white/70">Cognição (C):</span>
                    <span className="text-white font-bold">{character.ferramenta_cognicao_atual ?? character.ferramenta_cognicao_max ?? 0} / {character.ferramenta_cognicao_max ?? 0}</span>
                  </div>
                )}
                {(character.ferramenta_carisma_max ?? 1) > 0 && (
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-white/70">Carisma (S):</span>
                    <span className="text-white font-bold">{character.ferramenta_carisma_atual ?? character.ferramenta_carisma_max ?? 1} / {character.ferramenta_carisma_max ?? 1}</span>
                  </div>
                )}
              </div>
            )}`;

code = code.replace(oldCombate, newCombate);
fs.writeFileSync('src/components/QuickSheetPanel.tsx', code);
console.log('Patched QuickSheet tools');
