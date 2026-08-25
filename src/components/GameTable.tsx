import React, { useState } from 'react';
import { Character, NPC } from '../types';
import { Heart, Zap, Crosshair, Wrench, FileText, Settings, X, Plus, Shield, Swords, Minus, Users } from 'lucide-react';
import { updateDoc, doc, collection, onSnapshot, addDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { db } from '../firebase';
import RichTextEditor from './RichTextEditor';
import { NpcSelectorWindow } from './NpcSelectorWindow';

interface GameTableProps {
  characters: Character[];
  npcs: NPC[];
  onQuickEditChar: (char: Character) => void;
  onOpenCharSheet: (charId: string) => void;
  onOpenNpcSheet: (npcId: string) => void;
  onQuickEditNpc?: (npc: NPC) => void;
}

export function GameTable({ characters, onQuickEditChar, onOpenCharSheet, onOpenNpcSheet }: Omit<GameTableProps, 'npcs'>) {
  const [npcs, setNpcs] = useState<NPC[]>([]);
  
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'npcs'), (snap) => {
      const data: NPC[] = [];
      snap.forEach(d => {
        data.push({ id: d.id, ...d.data() } as NPC);
      });
      setNpcs(data);
    });
    return () => unsub();
  }, []);
  const [notepadContent, setNotepadContent] = useState('');
  const [showBlankCardModal, setShowBlankCardModal] = useState(false);
  const [blankCard, setBlankCard] = useState({ nome: '', hp: 10, ether: 0, destiny: 0, tools: 0 });

  const handleCreateBlankCard = async () => {
    if (!blankCard.nome.trim()) return;
    try {
      await addDoc(collection(db, 'npcs'), {
        name: blankCard.nome,
        hp_max: blankCard.hp,
        hp_atual: blankCard.hp,
        ether_max: blankCard.ether,
        ether_atual: blankCard.ether,
        poder_max: blankCard.destiny,
        poder_atual: blankCard.destiny,
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
  };
  const [showSelector, setShowSelector] = useState<'character' | 'npc' | null>(null);

  const activeCharacters = characters.filter(c => c.active_on_board);
  const activeNpcs = npcs.filter(n => n.active_on_board);
  const allActive = [...activeCharacters.map(c => ({...c, _type: 'character'})), ...activeNpcs.map(n => ({...n, _type: 'npc'}))];

  const handleUpdateCharMarker = async (charId: string, field: string, amount: number, current: number, max?: number) => {
    let newVal = current + amount;
    // Don't clamp strictly unless needed, let GM do what they want.
    try {
      await updateDoc(doc(db, 'characters', charId), { [field]: newVal });
    } catch (e) {
      console.error("Erro ao atualizar marcador:", e);
    }
  };

    const handleCloneNpc = async (id: string) => {
    const target = npcs.find(n => n.id === id);
    if (!target) return;
    try {
      const { id: _, ...npcData } = target;
      await addDoc(collection(db, 'npcs'), {
        ...npcData,
        name: `${npcData.name} (Cópia)`,
        active_on_board: true,
        createdAt: new Date().toISOString()
      });
      setShowSelector(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateNpcMarker = async (npcId: string, field: string, amount: number, current: number = 0) => {
    let newVal = current + amount;
    try {
      await updateDoc(doc(db, 'npcs', npcId), { [field]: newVal });
    } catch (e) {
      console.error("Erro ao atualizar marcador npc:", e);
    }
  };

  const handleToggleBoard = async (id: string, type: 'character' | 'npc', currentVal: boolean) => {
    const collectionName = type === 'character' ? 'characters' : 'npcs';
    try {
      await updateDoc(doc(db, collectionName, id), { active_on_board: !currentVal });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1f22] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#2b2d31] border-b border-[#1f2023] shrink-0">
        <h2 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
          <Swords className="w-5 h-5 text-red-500" />
          Mesa de Combate do Mestre
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setShowSelector('character')} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase rounded shadow">
            <Plus className="w-3.5 h-3.5" /> Adicionar Player
          </button>
          <button onClick={() => setShowSelector('npc')} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase rounded shadow">
            <Plus className="w-3.5 h-3.5" /> Adicionar NPC
          </button>
          <button onClick={() => setShowBlankCardModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-600 hover:bg-zinc-500 text-white text-xs font-bold uppercase rounded shadow">
            <FileText className="w-3.5 h-3.5" /> Criar Card
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scroll flex flex-col lg:flex-row gap-6">
        
        {/* Main Board - Cards */}
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {allActive.length === 0 && (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-white/10 rounded-lg">
                <Users className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 uppercase font-black tracking-widest text-sm">A Mesa está Vazia</p>
                <p className="text-white/20 text-xs mt-1">Adicione aventureiros ou NPCs usando os botões acima.</p>
              </div>
            )}

            {allActive.map(entity => {
              const isPC = entity._type === 'character';
              
              // Common values
              const name = isPC ? (entity as any).nome : (entity as any).name;
              const img = isPC ? (entity as any).img_saudavel : ((entity as any).images?.[(entity as any).coverImageIndex || 0]);
              
              // Markers PC
              const hp = isPC ? (entity as any).hp_atual : ((entity as any).hp_atual || 0);
              const hpMax = isPC ? (entity as any).hp_max : ((entity as any).hp_max || 0);
              
              const ether = isPC ? (entity as any).ether_atual : ((entity as any).ether_atual || 0);
              const etherMax = isPC ? (entity as any).ether_max : ((entity as any).ether_max || 0);
              
              const destiny = isPC ? (entity as any).destino_atual : ((entity as any).poder_atual || 0);
              const destinyMax = isPC ? (entity as any).destino_max : ((entity as any).poder_max || 0);
              
              const tools = isPC ? (entity as any).tecnicas_atual : ((entity as any).ferramentas_atual || 0);

              return (
                <div key={entity.id} className={`bg-[#2b2d31] rounded-lg border flex flex-col shadow-lg overflow-hidden transition ${isPC ? 'border-blue-500/20' : 'border-indigo-500/20'}`}>
                  {/* Card Header */}
                  <div className="flex items-center gap-3 p-3 bg-black/20 border-b border-white/5 relative">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-black/50 shrink-0 border border-white/10">
                      {img ? <img src={img} alt={name} className="w-full h-full object-cover" /> : <Users className="w-5 h-5 m-auto mt-2 text-white/20" />}
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${isPC ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white'}`}>{isPC ? 'Player' : 'NPC'}</span>
                        <h3 className="text-xs font-black text-white uppercase tracking-wider truncate">{name}</h3>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleToggleBoard(entity.id, entity._type as any, true)}
                      className="absolute top-2 right-2 p-1 text-white/20 hover:text-red-400 hover:bg-white/5 rounded transition"
                      title="Remover da Mesa"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Card Body - Markers */}
                  <div className="p-3 space-y-2">
                    {/* Saúde */}
                    <div className="flex items-center justify-between bg-black/20 rounded p-1.5">
                      <div className="flex items-center gap-1.5 w-1/3">
                        <Heart className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-[9px] font-bold text-white/60 uppercase">Saúde</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => isPC ? handleUpdateCharMarker(entity.id, 'hp_atual', -1, hp) : handleUpdateNpcMarker(entity.id, 'hp_atual', -1, hp)} className="w-5 h-5 bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 rounded flex items-center justify-center transition"><Minus className="w-3 h-3" /></button>
                        <span className="text-xs font-mono font-bold w-12 text-center text-white">{hp}{isPC ? ` / ${hpMax}` : ''}</span>
                        <button onClick={() => isPC ? handleUpdateCharMarker(entity.id, 'hp_atual', 1, hp) : handleUpdateNpcMarker(entity.id, 'hp_atual', 1, hp)} className="w-5 h-5 bg-white/5 hover:bg-green-500/20 text-white/50 hover:text-green-400 rounded flex items-center justify-center transition"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>

                    {/* Energia */}
                    <div className="flex items-center justify-between bg-black/20 rounded p-1.5">
                      <div className="flex items-center gap-1.5 w-1/3">
                        <Zap className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="text-[9px] font-bold text-white/60 uppercase">Energia</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => isPC ? handleUpdateCharMarker(entity.id, 'ether_atual', -1, ether) : handleUpdateNpcMarker(entity.id, 'ether_atual', -1, ether)} className="w-5 h-5 bg-white/5 hover:bg-yellow-500/20 text-white/50 hover:text-yellow-400 rounded flex items-center justify-center transition"><Minus className="w-3 h-3" /></button>
                        <span className="text-xs font-mono font-bold w-12 text-center text-white">{ether}{isPC ? ` / ${etherMax}` : ''}</span>
                        <button onClick={() => isPC ? handleUpdateCharMarker(entity.id, 'ether_atual', 1, ether) : handleUpdateNpcMarker(entity.id, 'ether_atual', 1, ether)} className="w-5 h-5 bg-white/5 hover:bg-green-500/20 text-white/50 hover:text-green-400 rounded flex items-center justify-center transition"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>

                    {/* Poder/Destino */}
                    <div className="flex items-center justify-between bg-black/20 rounded p-1.5">
                      <div className="flex items-center gap-1.5 w-1/3">
                        <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                        <span className="text-[9px] font-bold text-white/60 uppercase">Poder</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => isPC ? handleUpdateCharMarker(entity.id, 'destino_atual', -1, destiny) : handleUpdateNpcMarker(entity.id, 'poder_atual', -1, destiny)} className="w-5 h-5 bg-white/5 hover:bg-sky-500/20 text-white/50 hover:text-sky-400 rounded flex items-center justify-center transition"><Minus className="w-3 h-3" /></button>
                        <span className="text-xs font-mono font-bold w-12 text-center text-white">{destiny}{isPC ? ` / ${destinyMax}` : ''}</span>
                        <button onClick={() => isPC ? handleUpdateCharMarker(entity.id, 'destino_atual', 1, destiny) : handleUpdateNpcMarker(entity.id, 'poder_atual', 1, destiny)} className="w-5 h-5 bg-white/5 hover:bg-green-500/20 text-white/50 hover:text-green-400 rounded flex items-center justify-center transition"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>

                                        {/* FERRAMENTAS DE COMBATE (PC ONLY OR GENERIC) */}
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
                              <button onClick={() => handleUpdateCharMarker(entity.id, `ferramenta_${tool.id}_atual`, -1, tool.val)} className="w-4 h-4 bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 rounded flex items-center justify-center transition"><Minus className="w-2.5 h-2.5" /></button>
                              <span className="text-[9px] font-mono font-bold w-7 text-center text-white">{tool.val}</span>
                              <button onClick={() => handleUpdateCharMarker(entity.id, `ferramenta_${tool.id}_atual`, 1, tool.val)} className="w-4 h-4 bg-white/5 hover:bg-green-500/20 text-white/50 hover:text-green-400 rounded flex items-center justify-center transition"><Plus className="w-2.5 h-2.5" /></button>
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
                    )}
                  </div>

                  {/* Card Footer - Actions */}
                  <div className="flex items-center justify-between p-2 bg-black/40 border-t border-white/5 mt-auto">
                    <button 
                      onClick={() => isPC ? onOpenCharSheet(entity.id) : onOpenNpcSheet(entity.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[9px] font-bold text-white/60 hover:text-white hover:bg-white/5 rounded transition uppercase tracking-wider"
                    >
                      <FileText className="w-3.5 h-3.5" /> Ficha
                    </button>
                    {isPC && (
                      <button 
                        onClick={() => onQuickEditChar(entity as any)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[9px] font-bold text-white/60 hover:text-white hover:bg-white/5 rounded transition uppercase tracking-wider"
                      >
                        <Settings className="w-3.5 h-3.5" /> Ajustes
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notepad Sidebar */}
        <div className="w-full lg:w-96 flex flex-col bg-[#2b2d31] border border-[#1f2023] rounded-lg shrink-0 shadow-lg" style={{ resize: 'horizontal', overflow: 'auto', minWidth: '300px', maxWidth: '60vw' }}>
          <div className="p-3 bg-black/20 border-b border-white/5 flex items-center justify-between sticky top-0 z-10">
            <h3 className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Bloco de Notas (Sessão)
            </h3>
          </div>
          <div className="flex-1 p-2 bg-black/20 overflow-y-auto">
            <div className="min-h-[500px] h-full bg-[#1e1f22] rounded flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <RichTextEditor 
                  value={notepadContent} 
                  onChange={setNotepadContent} 
                  placeholder="Anotações da sessão, pontos de vida de monstros genéricos, status..." 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selectors */}
      {showSelector === 'character' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#2b2d31] w-full max-w-md rounded-lg shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Selecionar Jogador</h3>
              <button onClick={() => setShowSelector(null)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {characters.map(c => (
                <div key={c.id} className="flex justify-between items-center p-2 hover:bg-white/5 rounded transition">
                  <span className="text-xs font-bold text-white uppercase">{c.nome}</span>
                  <button 
                    onClick={() => { handleToggleBoard(c.id, 'character', !!c.active_on_board); setShowSelector(null); }}
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition ${c.active_on_board ? 'bg-red-500/20 text-red-400' : 'bg-blue-600 text-white'}`}
                  >
                    {c.active_on_board ? 'Remover' : 'Adicionar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showBlankCardModal && (
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
      )}

      {showSelector === 'npc' && (
        <NpcSelectorWindow 
          npcs={npcs} 
          openNpcIds={activeNpcs.map(n => n.id)} 
          onToggleNpc={(id) => {
            const isAct = activeNpcs.some(n => n.id === id);
            handleToggleBoard(id, 'npc', isAct);
            setShowSelector(null);
          }}
          onCloneNpc={handleCloneNpc}
          onClose={() => setShowSelector(null)}
        />
      )}
    </div>
  );
}
