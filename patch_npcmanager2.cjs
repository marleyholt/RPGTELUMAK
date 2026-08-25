const fs = require('fs');
let code = fs.readFileSync('src/components/NpcManager.tsx', 'utf8');

const stateTarget = `  const [editingNpc, setEditingNpc] = useState<Partial<NPC> | null>(null);`;
const newStateTarget = `  const [editingNpc, setEditingNpc] = useState<Partial<NPC> | null>(null);
  const [viewingNpc, setViewingNpc] = useState<NPC | null>(null);`;
code = code.replace(stateTarget, newStateTarget);

// Add Viewing render block before Editing render block
const editingBlockTarget = `  if (editingNpc) {`;
const viewingBlock = `  if (viewingNpc) {
    const validImages = (viewingNpc.images || []).filter(Boolean);
    const coverImg = validImages.length > 0 ? (validImages[viewingNpc.coverImageIndex] || validImages[0]) : null;

    return (
      <div className="flex flex-col h-full bg-[#313338] animate-fade-in">
        <div className="h-12 border-b border-[#1f2023] px-4 flex items-center justify-between shrink-0 shadow-sm bg-[#2b2d31]">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-sky-400" />
            {viewingNpc.name}
          </h2>
          <div className="flex gap-2">
            <button onClick={() => setViewingNpc(null)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider rounded transition flex items-center gap-1 border border-white/10">
              <X className="w-3.5 h-3.5" /> Fechar
            </button>
            <button onClick={() => { setEditingNpc(viewingNpc); setViewingNpc(null); }} className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded transition flex items-center gap-1 shadow-lg shadow-indigo-500/20">
              <Edit2 className="w-3.5 h-3.5" /> Editar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-4">
          <div className="bg-[#2b2d31] border border-white/5 p-4 rounded-lg h-full flex flex-col md:flex-row gap-6 overflow-hidden">
            
            {/* Left side: Images */}
            <div className="w-full md:w-1/3 flex flex-col gap-4 overflow-hidden">
              {coverImg ? (
                <div className="relative aspect-[3/4] bg-[#1e1f22] rounded-lg overflow-hidden border border-white/5 shrink-0 shadow-lg group">
                  <img src={coverImg} alt={viewingNpc.name} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => handleDownload(coverImg, viewingNpc.name)}
                    className="absolute top-2 right-2 w-8 h-8 rounded bg-black/60 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-sky-500/80 transition opacity-0 group-hover:opacity-100 shadow-xl"
                    title="Baixar Foto"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="aspect-[3/4] bg-[#1e1f22] rounded-lg border border-white/5 flex flex-col items-center justify-center text-white/20 shrink-0">
                  <ImageIcon className="w-12 h-12 mb-2" />
                  <span className="text-xs font-bold uppercase tracking-wider">Sem Imagem</span>
                </div>
              )}
              
              {/* Camera Roll */}
              {validImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scroll shrink-0">
                  {validImages.map((img, idx) => (
                    <div key={idx} className={\`relative w-16 h-16 shrink-0 rounded overflow-hidden border-2 \${viewingNpc.coverImageIndex === idx ? 'border-indigo-500' : 'border-white/10 opacity-60'}\`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right side: Content */}
            <div className="w-full md:w-2/3 flex flex-col bg-[#1e1f22] border border-white/5 rounded-lg overflow-hidden h-full">
              <div className="px-4 py-2 border-b border-white/5 bg-[#232428]">
                <h3 className="text-xs font-black text-[#949ba4] uppercase tracking-wider">Anotações e Detalhes</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-6 custom-scroll">
                {viewingNpc.content ? (
                  <div 
                    className="prose prose-invert max-w-none prose-sm prose-p:leading-relaxed prose-headings:font-black prose-a:text-sky-400"
                    dangerouslySetInnerHTML={{ __html: viewingNpc.content }} 
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-2">
                    <FileText className="w-10 h-10" />
                    <span className="text-sm font-bold uppercase tracking-wider">Nenhuma anotação</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  if (editingNpc) {`;

code = code.replace(editingBlockTarget, viewingBlock);

// Update Grid clicking
const gridClickTarget = `                  onClick={() => setEditingNpc(npc)}`;
const newGridClickTarget = `                  onClick={() => setViewingNpc(npc)}`;
code = code.replace(gridClickTarget, newGridClickTarget);

const gridClickTarget2 = `                  onClick={() => setEditingNpc(npc)}`;
const newGridClickTarget2 = `                  onClick={() => setViewingNpc(npc)}`;
code = code.replace(gridClickTarget2, newGridClickTarget2);

fs.writeFileSync('src/components/NpcManager.tsx', code);
console.log('NpcManager patched for viewing mode');
