const fs = require('fs');
let code = fs.readFileSync('src/components/NpcManager.tsx', 'utf8');

// Update GRID view
const gridTarget = `                <div key={npc.id} className="bg-[#2b2d31] border border-white/5 rounded-lg overflow-hidden group hover:border-indigo-500/50 transition duration-300 flex flex-col h-full shadow-lg">`;
const newGridTarget = `                <div 
                  key={npc.id} 
                  onClick={() => setEditingNpc(npc)}
                  className="bg-[#2b2d31] border border-white/5 rounded-lg overflow-hidden group hover:border-indigo-500/50 transition duration-300 flex flex-col h-full shadow-lg cursor-pointer"
                >`;
code = code.replace(gridTarget, newGridTarget);

const gridButtonsTarget = `                      <button onClick={() => setEditingNpc(npc)} className="flex-1 py-1.5 bg-white/5 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded transition flex items-center justify-center gap-1 border border-transparent hover:border-indigo-500/30">
                        <Edit2 className="w-3 h-3" /> Editar
                      </button>
                      <button onClick={() => handleDelete(npc.id)} className="w-7 h-7 bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 rounded transition flex items-center justify-center border border-transparent hover:border-rose-500/30">
                        <Trash2 className="w-3 h-3" />
                      </button>`;
const newGridButtonsTarget = `                      <button onClick={(e) => { e.stopPropagation(); setEditingNpc(npc); }} className="flex-1 py-1.5 bg-white/5 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded transition flex items-center justify-center gap-1 border border-transparent hover:border-indigo-500/30">
                        <Edit2 className="w-3 h-3" /> Editar
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(npc.id); }} className="w-7 h-7 bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 rounded transition flex items-center justify-center border border-transparent hover:border-rose-500/30">
                        <Trash2 className="w-3 h-3" />
                      </button>`;
code = code.replace(gridButtonsTarget, newGridButtonsTarget);

// Update LIST view
const listTarget = `                <div key={npc.id} className="flex items-center gap-3 p-2 bg-[#2b2d31] border border-white/5 rounded-lg group hover:border-indigo-500/30 transition">`;
const newListTarget = `                <div 
                  key={npc.id} 
                  onClick={() => setEditingNpc(npc)}
                  className="flex items-center gap-3 p-2 bg-[#2b2d31] border border-white/5 rounded-lg group hover:border-indigo-500/30 transition cursor-pointer"
                >`;
code = code.replace(listTarget, newListTarget);

const listButtonsTarget = `                    {coverImg && (
                      <button 
                        onClick={() => handleDownload(coverImg, npc.name)}
                        className="w-8 h-8 rounded bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-sky-400 hover:bg-sky-500/10 hover:border-sky-500/30 transition"
                        title="Baixar Foto Capa"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => setEditingNpc(npc)}
                      className="w-8 h-8 rounded bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(npc.id)}
                      className="w-8 h-8 rounded bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>`;
const newListButtonsTarget = `                    {coverImg && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownload(coverImg, npc.name); }}
                        className="w-8 h-8 rounded bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-sky-400 hover:bg-sky-500/10 hover:border-sky-500/30 transition"
                        title="Baixar Foto Capa"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingNpc(npc); }}
                      className="w-8 h-8 rounded bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(npc.id); }}
                      className="w-8 h-8 rounded bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>`;
code = code.replace(listButtonsTarget, newListButtonsTarget);

fs.writeFileSync('src/components/NpcManager.tsx', code);
console.log('NpcManager patched');
