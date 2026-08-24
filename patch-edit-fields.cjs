const fs = require('fs');
let content = fs.readFileSync('src/components/CharacterSheet.tsx', 'utf8');

const regexEditFields = /(<label className="block text-\[10px\] text-white\/60 font-bold uppercase tracking-wider mb-2">\s*Ataques e Técnicas.*?<RichTextEditor value=\{eDefesa\} onChange=\{setEDefesa\} placeholder="Detalhes de defesa\.\.\." \/>\s*<\/div>)/s;

const newEditFields = `<div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">
                      Ataques e Técnicas
                    </label>
                    <RichTextEditor value={eAtaques} onChange={setEAtaques} placeholder="Digite os ataques..." />
                  </div>

                  <div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">
                      Defesa e Armaduras
                    </label>
                    <RichTextEditor value={eDefesa} onChange={setEDefesa} placeholder="Detalhes de defesa..." />
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
                  </div>`;

if (content.match(regexEditFields)) {
  content = content.replace(regexEditFields, newEditFields);
  fs.writeFileSync('src/components/CharacterSheet.tsx', content);
  console.log('Success rewriting edit fields');
} else {
  console.log('Failed to match edit fields');
}
