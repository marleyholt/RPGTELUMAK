const fs = require('fs');
let code = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf8');

const modalPart = `                <ImageUploadField
                  label=""
                  value={identityAvatar}
                  onChange={(val) => setIdentityAvatar(val)}
                  maxWidth={400}
                  maxHeight={400}
                  aspectRatio="square"
                  helperText="Envie um arquivo PNG, JPG ou WEBP. Você pode arrastar, enviar e recortar a imagem perfeitamente."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1f2023]">`;

const newModalPart = `                <ImageUploadField
                  label=""
                  value={identityAvatar}
                  onChange={(val) => setIdentityAvatar(val)}
                  maxWidth={400}
                  maxHeight={400}
                  aspectRatio="square"
                  helperText="Envie um arquivo PNG, JPG ou WEBP. Você pode arrastar, enviar e recortar a imagem perfeitamente."
                />
              </div>
              
              {/* Ficha Rápida config */}
              <div className="pt-2">
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#949ba4] mb-2">
                  Abas da Ficha Rápida (Máx 3)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'indicadores', label: 'Indicadores & Primórdio' },
                    { id: 'ataque', label: 'Ataque' },
                    { id: 'defesa', label: 'Defesa' },
                    { id: 'dons', label: 'Dons' },
                    { id: 'equipamento', label: 'Equipamentos' }
                  ].map(sec => {
                    const isSelected = identityQuickSheet.includes(sec.id);
                    return (
                      <label key={sec.id} className={\`flex items-center gap-2 p-2 rounded border cursor-pointer transition \${isSelected ? 'bg-indigo-500/10 border-indigo-500/30 text-white' : 'bg-[#1e1f22] border-white/5 text-[#949ba4] hover:bg-[#2b2d31]'}\`}>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setIdentityQuickSheet(prev => prev.filter(x => x !== sec.id));
                            } else {
                              if (identityQuickSheet.length < 3) {
                                setIdentityQuickSheet(prev => [...prev, sec.id]);
                              }
                            }
                          }}
                        />
                        <span className="text-[11px] font-bold">{sec.label}</span>
                        {isSelected && <Check className="h-3 w-3 ml-auto text-indigo-400" />}
                      </label>
                    );
                  })}
                </div>
                {identityQuickSheet.length >= 3 && <p className="text-[10px] text-amber-400/80 mt-1">Límite de 3 abas atingido.</p>}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1f2023]">`;

code = code.replace(modalPart, newModalPart);
fs.writeFileSync('src/components/DiscordNotebook.tsx', code);
console.log('Patched modal Ficha Rapida');
