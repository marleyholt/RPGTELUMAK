const fs = require('fs');
let code = fs.readFileSync('src/components/GameTable.tsx', 'utf-8');

// add addDoc to imports
if (!code.includes('addDoc')) {
  code = code.replace("updateDoc, doc, collection, onSnapshot", "updateDoc, doc, collection, onSnapshot, addDoc");
}

// add states
const statesBlock = `  const [showBlankCardModal, setShowBlankCardModal] = useState(false);
  const [blankCard, setBlankCard] = useState({ nome: '', hp: 10, ether: 0, destiny: 0, tools: 0 });

  const handleCreateBlankCard = async () => {
    if (!blankCard.nome.trim()) return;
    try {
      await addDoc(collection(db, 'npcs'), {
        nome: blankCard.nome,
        hp_max: blankCard.hp,
        hp_atual: blankCard.hp,
        ether_max: blankCard.ether,
        ether_atual: blankCard.ether,
        destino_max: blankCard.destiny,
        destino_atual: blankCard.destiny,
        ferramentas_max: blankCard.tools,
        ferramentas_atual: blankCard.tools,
        active_on_board: true,
        createdAt: new Date().toISOString()
      });
      setShowBlankCardModal(false);
      setBlankCard({ nome: '', hp: 10, ether: 0, destiny: 0, tools: 0 });
    } catch (e) {
      console.error(e);
    }
  };`;

if (!code.includes('showBlankCardModal')) {
  code = code.replace("const [notepadContent, setNotepadContent] = useState('');", "const [notepadContent, setNotepadContent] = useState('');\n" + statesBlock);
}

// add button in Header
const headerBlock = `<button onClick={() => setShowSelector('npc')} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase rounded shadow">
            <Plus className="w-3.5 h-3.5" /> Adicionar NPC
          </button>`;

const newHeaderBlock = `<button onClick={() => setShowSelector('npc')} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase rounded shadow">
            <Plus className="w-3.5 h-3.5" /> Adicionar NPC
          </button>
          <button onClick={() => setShowBlankCardModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-600 hover:bg-zinc-500 text-white text-xs font-bold uppercase rounded shadow">
            <FileText className="w-3.5 h-3.5" /> Criar Card
          </button>`;

if (code.includes(headerBlock) && !code.includes('Criar Card')) {
  code = code.replace(headerBlock, newHeaderBlock);
}

// add Modal HTML
const modalHTML = `{showBlankCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1e1f22] border border-[#2b2d31] p-6 space-y-4 shadow-2xl rounded-lg max-w-sm w-full">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h4 className="text-sm font-black uppercase tracking-widest text-white">Criar Card Genérico</h4>
              <button onClick={() => setShowBlankCardModal(false)} className="text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-white/50 uppercase font-bold mb-1">Nome / Identificação</label>
                <input type="text" value={blankCard.nome} onChange={e => setBlankCard({...blankCard, nome: e.target.value})} className="w-full bg-black/50 text-white border border-white/10 px-3 py-2 text-xs font-bold rounded focus:outline-none focus:border-indigo-500" placeholder="Ex: Torre Leste, Goblin 1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-green-400 uppercase font-bold mb-1">HP Máx</label>
                  <input type="number" value={blankCard.hp} onChange={e => setBlankCard({...blankCard, hp: Number(e.target.value)})} className="w-full bg-black/50 text-white border border-white/10 px-3 py-2 text-xs font-mono rounded" />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-400 uppercase font-bold mb-1">Éter Máx</label>
                  <input type="number" value={blankCard.ether} onChange={e => setBlankCard({...blankCard, ether: Number(e.target.value)})} className="w-full bg-black/50 text-white border border-white/10 px-3 py-2 text-xs font-mono rounded" />
                </div>
                <div>
                  <label className="block text-[10px] text-orange-400 uppercase font-bold mb-1">Tools Máx</label>
                  <input type="number" value={blankCard.tools} onChange={e => setBlankCard({...blankCard, tools: Number(e.target.value)})} className="w-full bg-black/50 text-white border border-white/10 px-3 py-2 text-xs font-mono rounded" />
                </div>
                <div>
                  <label className="block text-[10px] text-purple-400 uppercase font-bold mb-1">Destino Máx</label>
                  <input type="number" value={blankCard.destiny} onChange={e => setBlankCard({...blankCard, destiny: Number(e.target.value)})} className="w-full bg-black/50 text-white border border-white/10 px-3 py-2 text-xs font-mono rounded" />
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button onClick={() => setShowBlankCardModal(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold uppercase rounded">Cancelar</button>
              <button onClick={handleCreateBlankCard} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase rounded shadow">Criar Card</button>
            </div>
          </div>
        </div>
      )}`;

if (!code.includes('showBlankCardModal &&')) {
  code = code.replace("{showSelector === 'npc' && (", modalHTML + "\n\n      {showSelector === 'npc' && (");
}

fs.writeFileSync('src/components/GameTable.tsx', code);
