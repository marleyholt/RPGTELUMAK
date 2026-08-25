const fs = require('fs');
let code = fs.readFileSync('src/components/SheetVersions.tsx', 'utf-8');

// Add import
if (!code.includes("import RichTextEditor")) {
  code = code.replace(
    "import { ImageUploadField } from './ImageUploadField';",
    "import { ImageUploadField } from './ImageUploadField';\nimport RichTextEditor from './RichTextEditor';"
  );
}

// Replace the Alternate Rich Text blocks
const oldHtmlBlocks = `              {/* Alternate Rich Text blocks */}
              <div className="space-y-3">
                <span className="block text-[10px] text-sky-400 uppercase font-black tracking-widest italic">Planilhas de Ataques e Dons da Forma (Texto/Tags HTML)</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] text-white/40 mb-1 uppercase font-bold">Habilidades & Ataques Diferenciados</label>
                    <textarea value={vHtmlAtaques} onChange={e => setVHtmlAtaques(e.target.value)} placeholder="Técnicas especiais liberadas..." className="w-full h-24 bg-[#0a0a0a] border border-white/10 rounded-none p-3 text-[11px] text-white focus:outline-none focus:border-blue-500 font-mono" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-white/40 mb-1 uppercase font-bold">Dons & Poderes Ativos na Transformação</label>
                    <textarea value={vHtmlDons} onChange={e => setVHtmlDons(e.target.value)} placeholder="Dons exclusivos modificados..." className="w-full h-24 bg-[#0a0a0a] border border-white/10 rounded-none p-3 text-[11px] text-white focus:outline-none focus:border-blue-500 font-mono" />
                  </div>
                </div>
              </div>`;

const newHtmlBlocks = `              {/* Alternate Rich Text blocks */}
              <div className="space-y-4">
                <span className="block text-[10px] text-sky-400 uppercase font-black tracking-widest italic">Planilhas de Combate e Habilidades da Forma</span>
                
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">Habilidades & Ataques Diferenciados</label>
                    <RichTextEditor value={vHtmlAtaques} onChange={setVHtmlAtaques} placeholder="Técnicas especiais liberadas..." />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">Defesa e Armaduras na Transformação</label>
                    <RichTextEditor value={vHtmlDefesa} onChange={setVHtmlDefesa} placeholder="Detalhes de defesa modificados..." />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">Dons & Poderes Ativos na Transformação</label>
                    <RichTextEditor value={vHtmlDons} onChange={setVHtmlDons} placeholder="Dons exclusivos modificados..." />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">Equipamentos e Itens (Específicos da Forma)</label>
                    <RichTextEditor value={vHtmlEquipamentos} onChange={setVHtmlEquipamentos} placeholder="Lista de equipamentos..." />
                  </div>
                </div>
              </div>`;

code = code.replace(oldHtmlBlocks, newHtmlBlocks);

fs.writeFileSync('src/components/SheetVersions.tsx', code);
