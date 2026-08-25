const fs = require('fs');
let code = fs.readFileSync('src/components/GameTable.tsx', 'utf-8');

const toolsBlockOld = `{/* Ferramentas/Técnicas */}
                    <div className="flex items-center justify-between bg-black/20 rounded p-1.5">
                      <div className="flex items-center gap-1.5 w-1/3">
                        <Wrench className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-[9px] font-bold text-white/60 uppercase">Tools</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => isPC ? handleUpdateCharMarker(entity.id, 'tecnicas_atual', -1, tools) : handleUpdateNpcMarker(entity.id, 'ferramentas_atual', -1, tools)} className="w-5 h-5 bg-white/5 hover:bg-orange-500/20 text-white/50 hover:text-orange-400 rounded flex items-center justify-center transition"><Minus className="w-3 h-3" /></button>
                        <span className="text-xs font-mono font-bold w-12 text-center text-white">{tools}</span>
                        <button onClick={() => isPC ? handleUpdateCharMarker(entity.id, 'tecnicas_atual', 1, tools) : handleUpdateNpcMarker(entity.id, 'ferramentas_atual', 1, tools)} className="w-5 h-5 bg-white/5 hover:bg-green-500/20 text-white/50 hover:text-green-400 rounded flex items-center justify-center transition"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>`;

const toolsBlockNew = `                    {/* FERRAMENTAS DE COMBATE (PC ONLY OR GENERIC) */}
                    {isPC ? (
                      <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-white/5">
                        {[
                          { id: 'fisico', label: 'FIS', val: (entity as any).ferramenta_fisico_atual ?? 0, max: (entity as any).ferramenta_fisico_max ?? 0 },
                          { id: 'destreza', label: 'DES', val: (entity as any).ferramenta_destreza_atual ?? 0, max: (entity as any).ferramenta_destreza_max ?? 0 },
                          { id: 'cognicao', label: 'COG', val: (entity as any).ferramenta_cognicao_atual ?? 0, max: (entity as any).ferramenta_cognicao_max ?? 0 },
                          { id: 'carisma', label: 'CAR', val: (entity as any).ferramenta_carisma_atual ?? 0, max: (entity as any).ferramenta_carisma_max ?? 0 },
                        ].map(tool => (
                          <div key={tool.id} className="flex items-center justify-between bg-black/40 rounded p-1 border border-white/5">
                            <span className="text-[8px] font-bold text-sky-300 uppercase w-6">{tool.label}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleUpdateCharMarker(entity.id, \`ferramenta_\${tool.id}_atual\`, -1, tool.val)} className="w-4 h-4 bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 rounded flex items-center justify-center transition"><Minus className="w-2.5 h-2.5" /></button>
                              <span className="text-[9px] font-mono font-bold w-7 text-center text-white">{tool.val}</span>
                              <button onClick={() => handleUpdateCharMarker(entity.id, \`ferramenta_\${tool.id}_atual\`, 1, tool.val)} className="w-4 h-4 bg-white/5 hover:bg-green-500/20 text-white/50 hover:text-green-400 rounded flex items-center justify-center transition"><Plus className="w-2.5 h-2.5" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-black/20 rounded p-1.5">
                        <div className="flex items-center gap-1.5 w-1/3">
                          <Wrench className="w-3.5 h-3.5 text-orange-400" />
                          <span className="text-[9px] font-bold text-white/60 uppercase">Tools</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleUpdateNpcMarker(entity.id, 'ferramentas_atual', -1, tools)} className="w-5 h-5 bg-white/5 hover:bg-orange-500/20 text-white/50 hover:text-orange-400 rounded flex items-center justify-center transition"><Minus className="w-3 h-3" /></button>
                          <span className="text-xs font-mono font-bold w-12 text-center text-white">{tools}</span>
                          <button onClick={() => handleUpdateNpcMarker(entity.id, 'ferramentas_atual', 1, tools)} className="w-5 h-5 bg-white/5 hover:bg-green-500/20 text-white/50 hover:text-green-400 rounded flex items-center justify-center transition"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    )}`;

code = code.replace(toolsBlockOld, toolsBlockNew);

fs.writeFileSync('src/components/GameTable.tsx', code);
