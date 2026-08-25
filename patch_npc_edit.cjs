const fs = require('fs');
let code = fs.readFileSync('src/components/NpcManager.tsx', 'utf-8');

// The edit button in Grid View
const editBtnGridOld = `<button onClick={(e) => { e.stopPropagation(); setEditingNpc(npc); }} className="flex-1 py-1.5 bg-white/5 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded transition flex items-center justify-center gap-1 border border-transparent hover:border-indigo-500/30">
                        <Edit2 className="w-3 h-3" /> Editar
                      </button>`;
const editBtnGridNew = `<button onClick={(e) => { 
                        e.stopPropagation(); 
                        if (npc._type === 'character') {
                          window.dispatchEvent(new CustomEvent('triggerEditCharacter', { detail: npc.id }));
                        } else {
                          setEditingNpc(npc); 
                        }
                      }} className="flex-1 py-1.5 bg-white/5 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded transition flex items-center justify-center gap-1 border border-transparent hover:border-indigo-500/30">
                        <Edit2 className="w-3 h-3" /> Editar
                      </button>`;
code = code.replace(editBtnGridOld, editBtnGridNew);

// The edit button in List View
const editBtnListOld = `<button onClick={(e) => { e.stopPropagation(); setEditingNpc(npc); }} className="px-3 py-1.5 bg-white/5 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded transition flex items-center gap-1 border border-transparent hover:border-indigo-500/30">
                        <Edit2 className="w-3 h-3" /> Editar
                      </button>`;
const editBtnListNew = `<button onClick={(e) => { 
                        e.stopPropagation(); 
                        if (npc._type === 'character') {
                          window.dispatchEvent(new CustomEvent('triggerEditCharacter', { detail: npc.id }));
                        } else {
                          setEditingNpc(npc); 
                        }
                      }} className="px-3 py-1.5 bg-white/5 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded transition flex items-center gap-1 border border-transparent hover:border-indigo-500/30">
                        <Edit2 className="w-3 h-3" /> Editar
                      </button>`;
code = code.replace(editBtnListOld, editBtnListNew);

// The edit button in Viewing NPC modal (just in case they opened the modal and clicked Edit)
const editBtnViewOld = `<button onClick={() => { setEditingNpc(viewingNpc); setViewingNpc(null); }} className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded transition flex items-center gap-1 shadow-lg shadow-indigo-500/20">
              <Edit2 className="w-3.5 h-3.5" /> Editar
            </button>`;
const editBtnViewNew = `<button onClick={() => { 
              if (viewingNpc._type === 'character') {
                window.dispatchEvent(new CustomEvent('triggerEditCharacter', { detail: viewingNpc.id }));
              } else {
                setEditingNpc(viewingNpc); 
              }
              setViewingNpc(null); 
            }} className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded transition flex items-center gap-1 shadow-lg shadow-indigo-500/20">
              <Edit2 className="w-3.5 h-3.5" /> Editar
            </button>`;
code = code.replace(editBtnViewOld, editBtnViewNew);

fs.writeFileSync('src/components/NpcManager.tsx', code);
