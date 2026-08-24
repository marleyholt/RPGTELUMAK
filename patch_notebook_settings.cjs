const fs = require('fs');
let code = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf8');

const settingsTarget = `              {/* Ficha Rápida config */}
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
              </div>`;

const newSettingsTarget = `              {/* Ficha Rápida config */}
              <div className="pt-2">
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#949ba4] mb-1">
                  Ocultar Abas da Ficha Rápida
                </label>
                <p className="text-[10px] text-[#949ba4] mb-3 leading-tight">
                  Por padrão, todas as abas são exibidas. Selecione abaixo as que você <strong>NÃO</strong> quer ver.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'indicadores', label: 'Indicadores' },
                    { id: 'ataque', label: 'Ataque' },
                    { id: 'defesa', label: 'Defesa' },
                    { id: 'dons', label: 'Dons' },
                    { id: 'equipamento', label: 'Equipamentos' }
                  ].map(sec => {
                    const isHidden = identityQuickSheet.includes(sec.id);
                    return (
                      <label key={sec.id} className={\`flex items-center gap-2 p-2 rounded border cursor-pointer transition \${isHidden ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-[#1e1f22] border-white/5 text-[#949ba4] hover:bg-[#2b2d31]'}\`}>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isHidden}
                          onChange={() => {
                            if (isHidden) {
                              setIdentityQuickSheet(prev => prev.filter(x => x !== sec.id));
                            } else {
                              setIdentityQuickSheet(prev => [...prev, sec.id]);
                            }
                          }}
                        />
                        <span className="text-[11px] font-bold truncate">{sec.label}</span>
                        {isHidden && <Check className="h-3 w-3 ml-auto text-rose-400 shrink-0" />}
                      </label>
                    );
                  })}
                </div>
              </div>`;
code = code.replace(settingsTarget, newSettingsTarget);

const initialQuickSheetTarget = `                setIdentityQuickSheet(currentUserProfile?.quickSheetSections || ['indicadores']);`;
const initialQuickSheetNewTarget = `                setIdentityQuickSheet(currentUserProfile?.quickSheetSections || []);`;

// We have two of these from the previous patch, let's just replace all instances globally.
code = code.replace(/setIdentityQuickSheet\(currentUserProfile\?\.quickSheetSections \|\| \['indicadores'\]\);/g, initialQuickSheetNewTarget);


const quickSheetPanelPropTarget = `          sections={identityQuickSheet.length > 0 ? identityQuickSheet : ['indicadores']}`;
const newQuickSheetPanelPropTarget = `          sections={identityQuickSheet || []}`;
code = code.replace(quickSheetPanelPropTarget, newQuickSheetPanelPropTarget);

fs.writeFileSync('src/components/DiscordNotebook.tsx', code);
console.log('Patched DiscordNotebook settings logic');
