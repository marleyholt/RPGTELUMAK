import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { NPC, DiscordChannelItem, Character } from '../types';
import { Search, Plus, Trash2, Edit2, LayoutGrid, List as ListIcon, X, Check, Image as ImageIcon, Download, FileText, RotateCcw, Send, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import { ImageUploadField } from './ImageUploadField';
import { getApiUrl } from '../utils/apiConfig';
import { 
  isOfflineModeActive, 
  loadOfflineNpcs, 
  saveOfflineNpcs, 
  loadOfflineDiscordData 
} from '../utils/offlineModeManager';

export function NpcManager({ characters = [] }: { characters?: Character[] }) {
  const [npcs, setNpcs] = useState<NPC[]>(() => {
    const cached = loadOfflineNpcs();
    return cached && cached.length > 0 ? cached : [];
  });
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingNpc, setEditingNpc] = useState<Partial<NPC> | null>(null);
  const [viewingNpc, setViewingNpc] = useState<NPC | null>(null);
  const [viewingPhotoIndex, setViewingPhotoIndex] = useState<number>(0);
  
  // Discord Send Modal
  const [showDiscordModal, setShowDiscordModal] = useState(false);
  const [discordTargetItem, setDiscordTargetItem] = useState<{ id: string; name: string; images?: string[]; coverImageIndex?: number; _type?: string } | null>(null);
  const [selectedPhotoIndexForSend, setSelectedPhotoIndexForSend] = useState<number>(0);
  const [discordChannels, setDiscordChannels] = useState<DiscordChannelItem[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [sendingDiscord, setSendingDiscord] = useState(false);
  const [sendType, setSendType] = useState<'cover' | 'all'>('cover');
  const [filterType, setFilterType] = useState<'all' | 'npc' | 'character'>('all');
  const [isOffline, setIsOffline] = useState(isOfflineModeActive());

  useEffect(() => {
    const handleOfflineEvent = (e: Event) => {
      const custom = e as CustomEvent;
      setIsOffline(!!custom.detail);
      if (custom.detail) {
        const cachedNpcs = loadOfflineNpcs();
        if (cachedNpcs && cachedNpcs.length > 0) setNpcs(cachedNpcs);
      }
    };
    window.addEventListener('telumakOfflineModeChanged', handleOfflineEvent);
    return () => window.removeEventListener('telumakOfflineModeChanged', handleOfflineEvent);
  }, []);

  useEffect(() => {
    const handleOpenNpc = (e: any) => {
      const npcId = e.detail;
      const found = npcs.find(n => n.id === npcId);
      if (found) {
        setViewingNpc(found);
        setViewingPhotoIndex(found.coverImageIndex || 0);
      }
    };
    window.addEventListener('openNpcSheet', handleOpenNpc);
    return () => window.removeEventListener('openNpcSheet', handleOpenNpc);
  }, [npcs]);

  useEffect(() => {
    if (isOffline) {
      const cachedNpcs = loadOfflineNpcs();
      if (cachedNpcs && cachedNpcs.length > 0) setNpcs(cachedNpcs);
      const cachedDiscord = loadOfflineDiscordData();
      if (cachedDiscord?.channels) setDiscordChannels(cachedDiscord.channels);
      return;
    }

    const unsubNpcs = onSnapshot(collection(db, 'npcs'), (snap) => {
      const items: NPC[] = [];
      snap.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as NPC);
      });
      items.sort((a, b) => (a.name || (a as any).nome || "").localeCompare(b.name || (b as any).nome || ""));
      setNpcs(items);
      saveOfflineNpcs(items);
    }, (err) => {
      console.warn("NPC Snapshot erro:", err);
      const fallback = loadOfflineNpcs();
      if (fallback) setNpcs(fallback);
    });
    
    const unsubChannels = onSnapshot(collection(db, 'discord_channels'), (snap) => {
      const channels: DiscordChannelItem[] = [];
      snap.forEach(doc => {
        channels.push({ id: doc.id, ...doc.data() } as DiscordChannelItem);
      });
      setDiscordChannels(channels);
      if (channels.length > 0 && !selectedChannel) {
        setSelectedChannel(channels[0].id);
      }
    }, (err) => {
      console.warn("Discord Channels erro:", err);
    });
    
    return () => {
      unsubNpcs();
      unsubChannels();
    };
  }, [isOffline]);

  const handleDownloadAll = (validImages: string[], npcName: string) => {
    validImages.forEach((url, idx) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${npcName}-foto-${idx+1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, idx * 300);
    });
  };

  const handleOpenSendToDiscord = (
    item: { id: string; name: string; images?: string[]; coverImageIndex?: number; _type?: string },
    preferredPhotoIndex?: number
  ) => {
    setDiscordTargetItem(item);
    if (preferredPhotoIndex !== undefined) {
      setSelectedPhotoIndexForSend(preferredPhotoIndex);
    } else {
      setSelectedPhotoIndexForSend(item.coverImageIndex || 0);
    }
    setSendType('cover');
    if (discordChannels.length > 0 && !selectedChannel) {
      setSelectedChannel(discordChannels[0].id);
    }
    setShowDiscordModal(true);
  };

  const handleSetAsCover = async (npcId: string, photoIdx: number) => {
    try {
      const isChar = (viewingNpc as any)?._type === 'character';
      const collName = isChar ? 'characters' : 'npcs';
      await updateDoc(doc(db, collName, npcId), {
        coverImageIndex: photoIdx
      });
      setViewingNpc(prev => prev ? ({ ...prev, coverImageIndex: photoIdx }) : null);
    } catch (err) {
      console.error("Erro ao definir capa:", err);
      alert("Erro ao salvar foto como capa.");
    }
  };

  const handleSendToDiscord = async () => {
    const target = discordTargetItem || viewingNpc;
    if (!selectedChannel || !target) return;
    setSendingDiscord(true);
    
    try {
      const validImages = (target.images || []).filter(Boolean);
      const chosenPhoto = validImages[selectedPhotoIndexForSend] || validImages[target.coverImageIndex || 0] || validImages[0];
      const imagesToSend = sendType === 'cover' 
        ? (chosenPhoto ? [chosenPhoto] : []) 
        : validImages;
        
      if (imagesToSend.length === 0) {
        alert('Este item não possui imagens para enviar.');
        setSendingDiscord(false);
        return;
      }
      
      const targetChannelObj = discordChannels.find(c => c.id === selectedChannel);
      // Resolve canal correto (discordChannelId se existir, senão id do firestore)
      const effectiveChannelId = targetChannelObj?.discordChannelId || targetChannelObj?.id || selectedChannel;
      
      const payload: Record<string, any> = {
        channelId: effectiveChannelId,
        authorName: 'Mestre',
        authorAvatar: 'https://cdn-icons-png.flaticon.com/512/9055/9055160.png',
        authorEmail: 'gm@telumak.com',
        content: `**${target.name}**\n${sendType === 'cover' ? '(Foto)' : '(Galeria de Fotos)'}`,
        isFromDiscord: false,
        pinned: false,
        createdAt: serverTimestamp(),
        attachments: imagesToSend
      };
      
      const docRef = await addDoc(collection(db, 'discord_notebook_messages'), payload);

      // Também encaminhar para a API do Discord se o canal possuir discordChannelId ou for ID de canal do Discord
      const targetDiscordChannelId = targetChannelObj?.discordChannelId || (/^\d{17,20}$/.test(effectiveChannelId) ? effectiveChannelId : (/^\d{17,20}$/.test(selectedChannel) ? selectedChannel : null));
      if (targetDiscordChannelId) {
        fetch(getApiUrl('/api/discord/notebook/send'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: targetDiscordChannelId,
            remetente: 'Mestre',
            conteudo: `**${target.name}**\n${sendType === 'cover' ? '(Foto)' : '(Galeria de Fotos)'}`,
            attachments: imagesToSend
          })
        }).then(async (res) => {
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data.discordMessageId && docRef?.id) {
              updateDoc(doc(db, 'discord_notebook_messages', docRef.id), {
                discordMessageId: data.discordMessageId
              }).catch(() => {});
            }
          }
        }).catch(err => {
          console.warn("Falha ao despachar imagem da biblioteca para a API do Discord:", err);
        });
      }

      setShowDiscordModal(false);
      setDiscordTargetItem(null);
      alert('Imagem enviada para o canal com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao enviar para o canal.');
    } finally {
      setSendingDiscord(false);
    }
  };


  const allLibraryItems = [
    ...npcs.map(n => ({ ...n, _type: 'npc' })),
    ...characters.map(c => ({ 
      id: c.id, 
      name: c.nome, 
      images: [c.img_saudavel], 
      coverImageIndex: 0, 
      _type: 'character', 
      _character: c 
    }))
  ];

  const filteredItems = allLibraryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || filterType === item._type;
    return matchesSearch && matchesType;
  });


  const handleSave = async () => {
    if (!editingNpc?.name) return alert('O nome é obrigatório.');
    const data = {
      name: editingNpc.name,
      content: editingNpc.content || '',
      images: editingNpc.images || [],
      coverImageIndex: editingNpc.coverImageIndex || 0,
      hp_max: editingNpc.hp_max || 0,
      ether_max: editingNpc.ether_max || 0,
      poder_max: editingNpc.poder_max || 0,
      ferramenta_fisico_max: editingNpc.ferramenta_fisico_max || 0,
      ferramenta_destreza_max: editingNpc.ferramenta_destreza_max || 0,
      ferramenta_cognicao_max: editingNpc.ferramenta_cognicao_max || 0,
      ferramenta_carisma_max: editingNpc.ferramenta_carisma_max || 0,
      updatedAt: new Date().toISOString()
    };

    if (isOffline) {
      let updatedList: NPC[];
      if (editingNpc.id) {
        updatedList = npcs.map(n => n.id === editingNpc.id ? { ...n, ...data } as NPC : n);
      } else {
        const newNpc: NPC = {
          id: `offline_npc_${Date.now()}`,
          ...data,
          createdAt: new Date().toISOString()
        } as NPC;
        updatedList = [newNpc, ...npcs];
      }
      setNpcs(updatedList);
      saveOfflineNpcs(updatedList);
      setEditingNpc(null);
      return;
    }

    try {
      if (editingNpc.id) {
        await updateDoc(doc(db, 'npcs', editingNpc.id), {
          ...data,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'npcs'), {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setEditingNpc(null);
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar NPC.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este NPC?')) {
      if (isOffline) {
        const updatedList = npcs.filter(n => n.id !== id);
        setNpcs(updatedList);
        saveOfflineNpcs(updatedList);
        return;
      }
      await deleteDoc(doc(db, 'npcs', id));
    }
  };

  const [deletePromptChar, setDeletePromptChar] = useState<Character | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isConfirmingPermanentDelete, setIsConfirmingPermanentDelete] = useState(false);

  const handleArchiveAction = async (id: string, archiveStatus: boolean) => {
    await updateDoc(doc(db, 'characters', id), {
      arquivado: archiveStatus
    });
    setDeletePromptChar(null);
    setIsConfirmingPermanentDelete(false);
    setDeleteConfirmName('');
  };

  const handlePermanentDeleteChar = async (id: string) => {
    if (deleteConfirmName === deletePromptChar?.nome) {
      await deleteDoc(doc(db, 'characters', id));
      setDeletePromptChar(null);
      setIsConfirmingPermanentDelete(false);
      setDeleteConfirmName('');
    }
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `npc-${name}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (viewingNpc) {
    const validImages = (viewingNpc.images || []).filter(Boolean);
    const activePhoto = validImages.length > 0 ? (validImages[viewingPhotoIndex] || validImages[0]) : null;

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
            <button onClick={() => { 
              if ((viewingNpc as any)._type === 'character') {
                window.dispatchEvent(new CustomEvent('triggerEditCharacter', { detail: viewingNpc.id }));
              } else {
                setEditingNpc(viewingNpc); 
              }
              setViewingNpc(null); 
            }} className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded transition flex items-center gap-1 shadow-lg shadow-indigo-500/20">
              <Edit2 className="w-3.5 h-3.5" /> Editar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-4">
          <div className="bg-[#2b2d31] border border-white/5 p-4 rounded-lg h-full flex flex-col md:flex-row gap-6 overflow-hidden">
            
            {/* Left side: Images */}
            <div className="w-full md:w-1/3 flex flex-col gap-4 overflow-hidden">
              {activePhoto ? (
                <div className="flex flex-col gap-2 shrink-0">
                  <div className="relative aspect-[3/4] bg-[#1e1f22] rounded-lg overflow-hidden border border-white/5 shadow-lg group">
                    <img src={activePhoto} alt={viewingNpc.name} className="w-full h-full object-cover select-none" />
                    
                    {/* Gallery Navigation Controls */}
                    {validImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingPhotoIndex(prev => (prev > 0 ? prev - 1 : validImages.length - 1));
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition border border-white/20 shadow-lg z-10"
                          title="Foto anterior"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingPhotoIndex(prev => (prev < validImages.length - 1 ? prev + 1 : 0));
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition border border-white/20 shadow-lg z-10"
                          title="Próxima foto"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="absolute top-2 right-2 px-2.5 py-1 rounded bg-black/70 backdrop-blur-sm border border-white/20 text-[10px] font-mono font-bold text-white z-10 shadow">
                          {viewingPhotoIndex + 1} / {validImages.length}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Actions for Images */}
                  <div className="flex flex-col gap-1.5 mt-1">
                    <button 
                      onClick={() => handleOpenSendToDiscord(viewingNpc, viewingPhotoIndex)}
                      className="w-full py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-black uppercase tracking-wider rounded shadow transition flex items-center justify-center gap-1.5"
                      title="Enviar para Canal do Discord"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Enviar para Canal
                    </button>
                    
                    <div className="grid grid-cols-2 gap-1.5">
                      <button 
                        onClick={() => handleDownload(activePhoto, `${viewingNpc.name}-foto-${viewingPhotoIndex + 1}`)}
                        className="py-1.5 px-2 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider rounded border border-white/10 flex items-center justify-center gap-1 transition"
                        title="Baixar Foto Selecionada"
                      >
                        <Download className="w-3 h-3 text-sky-400" />
                        Baixar Foto
                      </button>
                      {validImages.length > 1 ? (
                        <button 
                          onClick={() => handleDownloadAll(validImages, viewingNpc.name)}
                          className="py-1.5 px-2 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider rounded border border-white/10 flex items-center justify-center gap-1 transition"
                          title="Baixar Todas as Fotos"
                        >
                          <Download className="w-3 h-3 text-emerald-400" />
                          Baixar Todas
                        </button>
                      ) : (
                        <div />
                      )}
                    </div>

                    {validImages.length > 1 && viewingPhotoIndex !== (viewingNpc.coverImageIndex || 0) && (
                      <button
                        onClick={() => handleSetAsCover(viewingNpc.id, viewingPhotoIndex)}
                        className="w-full py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded border border-indigo-500/30 flex items-center justify-center gap-1 transition"
                      >
                        <Star className="w-3 h-3 text-indigo-400" />
                        Definir Esta Foto como Capa
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="aspect-[3/4] bg-[#1e1f22] rounded-lg border border-white/5 flex flex-col items-center justify-center text-white/20 shrink-0">
                  <ImageIcon className="w-12 h-12 mb-2" />
                  <span className="text-xs font-bold uppercase tracking-wider">Sem Imagem</span>
                </div>
              )}
              
              {/* Camera Roll / Gallery Thumbnails */}
              {validImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scroll shrink-0">
                  {validImages.map((img, idx) => {
                    const isCurrent = viewingPhotoIndex === idx;
                    const isCover = (viewingNpc.coverImageIndex || 0) === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setViewingPhotoIndex(idx)}
                        className={`relative w-16 h-16 shrink-0 rounded overflow-hidden border-2 transition group ${
                          isCurrent 
                            ? 'border-sky-400 ring-2 ring-sky-400/50 opacity-100 scale-105 shadow-md' 
                            : 'border-white/10 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        {isCover && (
                          <span className="absolute bottom-0 inset-x-0 bg-indigo-600/90 text-white text-[8px] font-black uppercase text-center py-0.5">
                            Capa
                          </span>
                        )}
                      </button>
                    );
                  })}
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

  if (editingNpc) {
    const imgs = editingNpc.images || [];
    return (
      <div className="flex flex-col h-full bg-[#313338] animate-fade-in">
        <div className="h-12 border-b border-[#1f2023] px-4 flex items-center justify-between shrink-0 shadow-sm bg-[#2b2d31]">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-sky-400" />
            {editingNpc.id ? 'Editar NPC' : 'Novo NPC'}
          </h2>
          <div className="flex gap-2">
            <button onClick={() => setEditingNpc(null)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider rounded transition flex items-center gap-1 border border-white/10">
              <X className="w-3.5 h-3.5" /> Cancelar
            </button>
            <button onClick={handleSave} className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded transition flex items-center gap-1 shadow-lg shadow-indigo-500/20">
              <Check className="w-3.5 h-3.5" /> Salvar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scroll space-y-6">
          <div className="bg-[#2b2d31] border border-white/5 p-4 rounded-lg space-y-4">
            <div>
              <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">Nome do NPC</label>
              <input 
                type="text" 
                value={editingNpc.name || ''} 
                onChange={e => setEditingNpc({...editingNpc, name: e.target.value})}
                className="w-full bg-[#1e1f22] border border-white/10 text-white text-sm px-3 py-2 rounded focus:outline-none focus:border-indigo-500 transition"
                placeholder="Ex: Mercador viajante"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">Saúde (HP)</label>
                <input 
                  type="number" 
                  value={editingNpc.hp_max || ''} 
                  onChange={e => setEditingNpc({...editingNpc, hp_max: Number(e.target.value)})}
                  className="w-full bg-[#1e1f22] border border-white/10 text-white text-sm px-3 py-2 rounded focus:outline-none focus:border-rose-500 transition"
                  placeholder="Ex: 50"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">Energia (Éter)</label>
                <input 
                  type="number" 
                  value={editingNpc.ether_max || ''} 
                  onChange={e => setEditingNpc({...editingNpc, ether_max: Number(e.target.value)})}
                  className="w-full bg-[#1e1f22] border border-white/10 text-white text-sm px-3 py-2 rounded focus:outline-none focus:border-sky-500 transition"
                  placeholder="Ex: 20"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">Poder</label>
                <input 
                  type="number" 
                  value={editingNpc.poder_max || ''} 
                  onChange={e => setEditingNpc({...editingNpc, poder_max: Number(e.target.value)})}
                  className="w-full bg-[#1e1f22] border border-white/10 text-white text-sm px-3 py-2 rounded focus:outline-none focus:border-amber-500 transition"
                  placeholder="Ex: 5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">Ferramentas (FIS)</label>
                <input 
                  type="number" 
                  value={editingNpc.ferramenta_fisico_max || ''} 
                  onChange={e => setEditingNpc({...editingNpc, ferramenta_fisico_max: Number(e.target.value)})}
                  className="w-full bg-[#1e1f22] border border-white/10 text-white text-sm px-3 py-2 rounded focus:outline-none focus:border-emerald-500 transition"
                  placeholder="Ex: 2"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">Ferramentas (DES)</label>
                <input 
                  type="number" 
                  value={editingNpc.ferramenta_destreza_max || ''} 
                  onChange={e => setEditingNpc({...editingNpc, ferramenta_destreza_max: Number(e.target.value)})}
                  className="w-full bg-[#1e1f22] border border-white/10 text-white text-sm px-3 py-2 rounded focus:outline-none focus:border-emerald-500 transition"
                  placeholder="Ex: 2"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">Ferramentas (COG)</label>
                <input 
                  type="number" 
                  value={editingNpc.ferramenta_cognicao_max || ''} 
                  onChange={e => setEditingNpc({...editingNpc, ferramenta_cognicao_max: Number(e.target.value)})}
                  className="w-full bg-[#1e1f22] border border-white/10 text-white text-sm px-3 py-2 rounded focus:outline-none focus:border-emerald-500 transition"
                  placeholder="Ex: 2"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">Ferramentas (CAR)</label>
                <input 
                  type="number" 
                  value={editingNpc.ferramenta_carisma_max || ''} 
                  onChange={e => setEditingNpc({...editingNpc, ferramenta_carisma_max: Number(e.target.value)})}
                  className="w-full bg-[#1e1f22] border border-white/10 text-white text-sm px-3 py-2 rounded focus:outline-none focus:border-emerald-500 transition"
                  placeholder="Ex: 2"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">Imagens (Até 4)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map(index => (
                  <div key={index} className={`p-3 rounded border transition ${editingNpc.coverImageIndex === index ? 'bg-indigo-500/10 border-indigo-500/40' : 'bg-[#1e1f22] border-white/5'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase text-white/50 tracking-wider">Slot {index + 1}</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="radio" 
                          name="coverImage" 
                          checked={editingNpc.coverImageIndex === index}
                          onChange={() => setEditingNpc({...editingNpc, coverImageIndex: index})}
                          className="w-3 h-3 accent-indigo-500"
                        />
                        <span className="text-[10px] font-bold text-white/70 uppercase">Capa</span>
                      </label>
                    </div>
                    <ImageUploadField
                      label=""
                      value={imgs[index] || ''}
                      onChange={(url) => {
                        const newImgs = [...imgs];
                        newImgs[index] = url;
                        // cleanup empty elements at end
                        while(newImgs.length > 0 && !newImgs[newImgs.length-1]) {
                          newImgs.pop();
                        }
                        setEditingNpc({...editingNpc, images: newImgs});
                      }}
                      aspectRatio="free"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">Detalhes (Anotações, Status, etc)</label>
              <RichTextEditor 
                value={editingNpc.content || ''} 
                onChange={v => setEditingNpc({...editingNpc, content: v})} 
                placeholder="Escreva detalhes sobre este NPC..."
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#313338] animate-fade-in">
      <div className="h-14 border-b border-[#1f2023] px-4 flex items-center justify-between shrink-0 shadow-sm bg-[#2b2d31]">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-400" />
            Biblioteca
          </h2>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input 
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-56 bg-[#1e1f22] border border-[#1f2023] focus:border-indigo-500/50 text-white text-xs pl-8 pr-3 py-1.5 rounded-full outline-none transition placeholder:text-white/30"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-[#1e1f22] p-1 rounded-md">
            <button onClick={() => setFilterType('all')} className={`px-3 py-1 text-[10px] font-bold uppercase transition rounded ${filterType === 'all' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}`}>Todos</button>
            <button onClick={() => setFilterType('npc')} className={`px-3 py-1 text-[10px] font-bold uppercase transition rounded ${filterType === 'npc' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}`}>NPCs</button>
            <button onClick={() => setFilterType('character')} className={`px-3 py-1 text-[10px] font-bold uppercase transition rounded ${filterType === 'character' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}`}>Aventureiros</button>
          </div>
          <div className="flex bg-[#1e1f22] border border-white/5 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition ${viewMode === 'grid' ? 'bg-[#35373c] text-white shadow' : 'text-white/40 hover:text-white/80'}`}
              title="Visualização em Grade"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition ${viewMode === 'list' ? 'bg-[#35373c] text-white shadow' : 'text-white/40 hover:text-white/80'}`}
              title="Visualização em Lista"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
          </div>
          <button 
            onClick={() => setEditingNpc({ coverImageIndex: 0 })}
            className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded transition flex items-center gap-1 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-3.5 h-3.5" /> Novo NPC
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scroll">
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-white/20">
              <ImageIcon className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Nenhum NPC encontrado</h3>
            <p className="text-xs text-white/50 max-w-sm">
              Crie NPCs para organizar personagens não-jogadores com anotações e galerias de imagens.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredItems.map(npc => {
              const coverImg = (npc.images && npc.images.length > 0) ? (npc.images[npc.coverImageIndex] || npc.images[0]) : null;
              return (
                <div 
                  key={npc.id} 
                  onClick={() => {
                    if ((npc as any)._type === 'character') {
                      window.dispatchEvent(new CustomEvent('openCharacterSheet', { detail: npc.id }));
                    } else {
                      setViewingNpc(npc as NPC);
                    }
                  }}
                  className="bg-[#2b2d31] border border-white/5 rounded-lg overflow-hidden group hover:border-indigo-500/50 transition duration-300 flex flex-col h-full shadow-lg cursor-pointer"
                >
                  <div className="relative aspect-square bg-[#1e1f22] overflow-hidden">
                    {coverImg ? (
                      <img src={coverImg} alt={npc.name} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/10 group-hover:text-white/20 transition">
                        <ImageIcon className="w-12 h-12 mb-2" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Sem Imagem</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {coverImg && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDownload(coverImg, npc.name); }}
                          className="w-7 h-7 rounded bg-black/60 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-sky-500/80 transition"
                          title="Baixar Foto Capa"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1 line-clamp-1">
                      {npc.name}
                      {(npc as any)._character?.arquivado && <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold ml-2">ARQ</span>}
                    </h3>
                    <p className="text-[10px] text-white/40 mb-3 uppercase tracking-wider">
                      {(npc.images?.filter(Boolean).length || 0)} Fotos
                    </p>
                    <div className="mt-auto flex gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenSendToDiscord(npc);
                        }}
                        className="py-1.5 px-2 bg-[#5865f2]/10 hover:bg-[#5865f2]/20 text-[#5865f2] hover:text-white text-[10px] font-bold uppercase tracking-wider rounded transition flex items-center justify-center gap-1 border border-transparent hover:border-[#5865f2]/30"
                        title="Enviar para canal do Discord"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                      <button onClick={(e) => { 
                        e.stopPropagation(); 
                        if ((npc as any)._type === 'character') {
                          window.dispatchEvent(new CustomEvent('triggerEditCharacter', { detail: npc.id }));
                        } else {
                          setEditingNpc(npc); 
                        }
                      }} className="flex-1 py-1.5 bg-white/5 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded transition flex items-center justify-center gap-1 border border-transparent hover:border-indigo-500/30">
                        <Edit2 className="w-3 h-3" /> Editar
                      </button>
                      <button onClick={(e) => { 
                        e.stopPropagation(); 
                        if ((npc as any)._type === 'character') {
                          setDeletePromptChar((npc as any)._character);
                          setIsConfirmingPermanentDelete(false);
                          setDeleteConfirmName('');
                        } else {
                          handleDelete(npc.id);
                        }
                      }} className="w-7 h-7 bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 rounded transition flex items-center justify-center border border-transparent hover:border-rose-500/30">
                        { (npc as any)._type === 'character' && (npc as any)._character?.arquivado ? <RotateCcw className="w-3 h-3" /> : <Trash2 className="w-3 h-3" /> }
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map(npc => {
              const coverImg = (npc.images && npc.images.length > 0) ? (npc.images[npc.coverImageIndex] || npc.images[0]) : null;
              return (
                <div 
                  key={npc.id} 
                  onClick={() => {
                    if ((npc as any)._type === 'character') {
                      window.dispatchEvent(new CustomEvent('openCharacterSheet', { detail: npc.id }));
                    } else {
                      setViewingNpc(npc as NPC);
                    }
                  }}
                  className="flex items-center gap-3 p-2 bg-[#2b2d31] border border-white/5 rounded-lg group hover:border-indigo-500/30 transition cursor-pointer"
                >
                  <div className="w-12 h-12 rounded bg-[#1e1f22] overflow-hidden shrink-0">
                    {coverImg ? (
                      <img src={coverImg} alt={npc.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${(npc as any)._type === 'character' ? 'bg-blue-500/20 text-blue-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{(npc as any)._type === 'character' ? 'Player' : 'NPC'}</span>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider truncate">
                          {npc.name}
                          {(npc as any)._character?.arquivado && <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold ml-2">ARQUIVADO</span>}
                        </h3>
                      </div>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">{(npc.images?.filter(Boolean).length || 0)} Fotos Cadastradas</p>
                  </div>
                  <div className="flex gap-2 px-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleOpenSendToDiscord(npc); }}
                      className="w-8 h-8 rounded bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-[#5865f2] hover:bg-[#5865f2]/10 hover:border-[#5865f2]/30 transition"
                      title="Enviar para Canal do Discord"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    {coverImg && (
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
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if ((npc as any)._type === 'character') {
                          setDeletePromptChar((npc as any)._character);
                          setIsConfirmingPermanentDelete(false);
                          setDeleteConfirmName('');
                        } else {
                          handleDelete(npc.id);
                        }
                      }}
                      className="w-8 h-8 rounded bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition"
                    >
                      { (npc as any)._type === 'character' && (npc as any)._character?.arquivado ? <RotateCcw className="w-4 h-4" /> : <Trash2 className="w-4 h-4" /> }
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deletePromptChar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1e1f22] border border-rose-500/30 p-6 shadow-2xl rounded-lg max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-white">Gerenciar Ficha</h4>
              <button onClick={() => setDeletePromptChar(null)} className="text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
            </div>

            {!isConfirmingPermanentDelete ? (
              <div className="space-y-4">
                <p className="text-xs text-white/70">
                  O que você deseja fazer com a ficha de <strong className="text-white">{deletePromptChar.nome}</strong>?
                </p>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => handleArchiveAction(deletePromptChar.id, !deletePromptChar.arquivado)}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase rounded border border-white/10 transition flex items-center justify-center gap-2"
                  >
                    {deletePromptChar.arquivado ? <><RotateCcw className="w-3.5 h-3.5" /> Recuperar Ficha (Desarquivar)</> : 'Arquivar Ficha (Ocultar da Mesa)'}
                  </button>
                  <button 
                    onClick={() => setIsConfirmingPermanentDelete(true)}
                    className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold uppercase rounded border border-rose-500/30 transition flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Deletar Definitivamente
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in zoom-in-95">
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded">
                  <p className="text-xs text-rose-200 text-center font-bold uppercase">Atenção: Ação Irreversível</p>
                  <p className="text-[10px] text-rose-200/70 text-center mt-1">Isso excluirá a ficha do banco de dados permanentemente.</p>
                </div>
                <div>
                  <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">
                    Digite <span className="text-white select-all">{deletePromptChar.nome}</span> para confirmar
                  </label>
                  <input 
                    type="text" 
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 text-white text-sm px-3 py-2 rounded focus:outline-none focus:border-rose-500 transition"
                    placeholder={deletePromptChar.nome}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => { setIsConfirmingPermanentDelete(false); setDeleteConfirmName(''); }}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold uppercase rounded transition"
                  >
                    Voltar
                  </button>
                  <button 
                    disabled={deleteConfirmName !== deletePromptChar.nome}
                    onClick={() => handlePermanentDeleteChar(deletePromptChar.id)}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:hover:bg-rose-600 text-white text-xs font-black uppercase rounded shadow transition"
                  >
                    Deletar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Envio Direto para Canal do Discord */}
      {showDiscordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1e1f22] border border-[#5865f2]/30 p-6 shadow-2xl rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2 text-white">
                <Send className="w-5 h-5 text-[#5865f2]" />
                <h3 className="text-sm font-black uppercase tracking-wider">Enviar para Canal</h3>
              </div>
              <button 
                onClick={() => { setShowDiscordModal(false); setDiscordTargetItem(null); }} 
                className="text-white/40 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">
                  Item Selecionado
                </label>
                <div className="p-3 bg-black/40 rounded border border-white/5 flex items-center gap-3">
                  {(() => {
                    const target = discordTargetItem || viewingNpc;
                    const validImgs = (target?.images || []).filter(Boolean);
                    const imgUrl = validImgs[selectedPhotoIndexForSend] || validImgs[target?.coverImageIndex || 0] || validImgs[0] || null;
                    return (
                      <>
                        <div className="w-10 h-10 rounded bg-[#2b2d31] overflow-hidden shrink-0 border border-white/10">
                          {imgUrl ? (
                            <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 m-auto text-white/20" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{target?.name}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-wider">
                            {validImgs.length} Fotos disponíveis
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">
                  Escolha o Canal de Texto
                </label>
                {discordChannels.length === 0 ? (
                  <p className="text-xs text-amber-400 bg-amber-500/10 p-3 rounded border border-amber-500/20">
                    Nenhum canal do Discord encontrado. Crie um canal na aba Discord primeiro.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scroll pr-1">
                    {discordChannels.map(ch => {
                      const isSelected = selectedChannel === ch.id;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => setSelectedChannel(ch.id)}
                          className={`w-full flex items-center justify-between p-2.5 rounded text-left transition text-xs font-semibold ${
                            isSelected 
                              ? 'bg-[#5865f2] text-white shadow-md' 
                              : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/5'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="opacity-60 text-sm">#</span>
                            {ch.name}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">
                  Modo de Envio
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSendType('cover')}
                    className={`py-2 px-3 rounded text-xs font-bold transition uppercase tracking-wider ${
                      sendType === 'cover'
                        ? 'bg-white/20 text-white border border-white/40'
                        : 'bg-white/5 text-white/60 hover:text-white border border-white/5'
                    }`}
                  >
                    Foto Principal
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendType('all')}
                    className={`py-2 px-3 rounded text-xs font-bold transition uppercase tracking-wider ${
                      sendType === 'all'
                        ? 'bg-white/20 text-white border border-white/40'
                        : 'bg-white/5 text-white/60 hover:text-white border border-white/5'
                    }`}
                  >
                    Todas as Fotos
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/10">
                <button 
                  type="button"
                  onClick={() => { setShowDiscordModal(false); setDiscordTargetItem(null); }}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold uppercase rounded transition"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  disabled={sendingDiscord || !selectedChannel || discordChannels.length === 0}
                  onClick={handleSendToDiscord}
                  className="flex-1 py-2 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-xs font-black uppercase rounded shadow transition flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendingDiscord ? 'Enviando...' : 'Enviar Agora'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
