const fs = require('fs');
let content = fs.readFileSync('src/components/CharacterSheet.tsx', 'utf8');

const target = `                  7. Conteúdo e Habilidades (Suporta formatação HTML &lt;strong&gt;, &lt;b&gt;, etc.)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">
                      Ataques e Técnicas
                    </label>
                    <textarea
                      rows={4}
                      value={eAtaques}
                      onChange={(e) => setEAtaques(e.target.value)}
                      className="w-full bg-black border border-white/10 p-3 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">
                      Dons e Habilidades Mágicas
                    </label>
                    <textarea
                      rows={4}
                      value={eDons}
                      onChange={(e) => setEDons(e.target.value)}
                      className="w-full bg-black border border-white/10 p-3 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">
                      Equipamento e Itens
                    </label>
                    <textarea
                      rows={4}
                      value={eEquipamentos}
                      onChange={(e) => setEEquipamentos(e.target.value)}
                      className="w-full bg-black border border-white/10 p-3 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">
                      Defesa e Armaduras
                    </label>
                    <textarea
                      rows={4}
                      value={eDefesa}
                      onChange={(e) => setEDefesa(e.target.value)}
                      className="w-full bg-black border border-white/10 p-3 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>`;

const replacement = `                  7. Conteúdo e Habilidades (Formatação Rica e Colunas)
                </span>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">
                      Ataques e Técnicas
                    </label>
                    <RichTextEditor value={eAtaques} onChange={setEAtaques} placeholder="Digite os ataques..." />
                  </div>

                  <div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">
                      Dons e Habilidades Mágicas
                    </label>
                    <RichTextEditor value={eDons} onChange={setEDons} placeholder="Digite os dons e habilidades..." />
                  </div>

                  <div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">
                      Equipamento e Itens
                    </label>
                    <RichTextEditor value={eEquipamentos} onChange={setEEquipamentos} placeholder="Lista de equipamentos..." />
                  </div>

                  <div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">
                      Defesa e Armaduras
                    </label>
                    <RichTextEditor value={eDefesa} onChange={setEDefesa} placeholder="Detalhes de defesa..." />
                  </div>
                </div>`;

if(content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/CharacterSheet.tsx', content);
  console.log('Success');
} else {
  console.log('Target not found');
}
