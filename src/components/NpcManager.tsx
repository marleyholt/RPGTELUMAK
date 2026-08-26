import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { NPC, DiscordChannelItem, Character } from '../types';
import { Search, Plus, Trash2, Edit2, LayoutGrid, List as ListIcon, X, Check, Image as ImageIcon, Download, FileText } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import { ImageUploadField } from './ImageUploadField';

export function NpcManager({ characters = [] }: { characters?: Character[] }) {
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingNpc, setEditingNpc] = useState<Partial<NPC> | null>(null);
  const [viewingNpc, setViewingNpc] = useState<NPC | null>(null);
  
  // Discord Send Modal
  const [showDiscordModal, setShowDiscordModal] = useState(false);
  const [discordChannels, setDiscordChannels] = useState<DiscordChannelItem[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [sendingDiscord, setSendingDiscord] = useState(false);
  const [sendType, setSendType] = useState<'cover' | 'all'>('cover');
  const [filterType, setFilterType] = useState<'all' | 'npc' | 'character'>('all');

  useEffect(() => {
    const handleOpenNpc = (e) => {
      const npcId = e.detail;
      const found = npcs.find(n => n.id === npcId);
      if (found) {
        setViewingNpc(found);
      }
    };
    window.addEventListener('openNpcSheet', handleOpenNpc);
    return () => window.removeEventListener('openNpcSheet', handleOpenNpc);
  }, [npcs]);

  useEffect(() => {
    const unsubNpcs = onSnapshot(collection(db, 'npcs'), (snap) => {
      const items: NPC[] = [];
      snap.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as NPC);
      });
      items.sort((a, b) => (a.name || (a as any).nome || "").localeCompare(b.name || (b as any).nome || ""));
      setNpcs(items);
    }, (err) => {
      console.warn("NPC Snapshot erro:", err);
      setNpcs([]);
    });
    
    const unsubChannels = onSnapshot(collection(db, 'discord_channels'), (snap) => {
      const channels: DiscordChannelItem[] = [];
      snap.forEach(doc => {
        channels.push({ id: doc.id, ...doc.data() } as DiscordChannelItem);
      });
      setDiscordChannels(channels);
    }, (err) => {
      console.warn("Discord Channels erro:", err);
      setDiscordChannels([]);
    });
    
    return () => {
      unsubNpcs();
      unsubChannels();
    };
  }, []);
  
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
  
  const handleSendToDiscord = async () => {
    if (!selectedChannel || !viewingNpc) return;
    setSendingDiscord(true);
    
    try {
      const validImages = (viewingNpc.images || []).filter(Boolean);
      const imagesToSend = sendType === 'cover' 
        ? (validImages.length > 0 ? [validImages[viewingNpc.coverImageIndex] || validImages[0]] : []) 
        : validImages;
        
      if (imagesToSend.length === 0) {
        alert('Este NPC não possui imagens para enviar.');
        setSendingDiscord(false);
        return;
      }
      
      const payload: Record<string, any> = {
        channelId: selectedChannel,
        authorName: 'Mestre',
        authorAvatar: 'https://cdn-icons-png.flaticon.com/512/9055/9055160.png',
        authorEmail: 'gm@telumak.com',
        content: `**${viewingNpc.name}**
${sendType === 'cover' ? '(Foto Principal)' : '(Galeria de Fotos)'}`,
        isFromDiscord: false,
        pinned: false,
        createdAt: serverTimestamp(),
        attachments: imagesToSend
      };
      
      await addDoc(collection(db, 'discord_notebook_messages'), payload);
      setShowDiscordModal(false);
      alert('Imagens enviadas para o Discord com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao enviar para o Discord.');
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
      updatedAt: serverTimestamp()
    };
    try {
      if (editingNpc.id) {
        await updateDoc(doc(db, 'npcs', editingNpc.id), data);
      } else {
        await addDoc(collection(db, 'npcs'), {
          ...data,
          createdAt: serverTimestamp()
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
      await deleteDoc(doc(db, 'npcs', id));
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
              {coverImg ? (
                <div className="flex flex-col gap-2 shrink-0">
                  <div className="relative aspect-[3/4] bg-[#1e1f22] rounded-lg overflow-hidden border border-white/5 shadow-lg group">
                    <img src={coverImg} alt={viewingNpc.name} className="w-full h-full object-cover" />
                  </div>
                  
                  {/* Actions for Images */}
                  <div className="grid grid-cols-1 gap-2 mt-1">
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => handleDownload(coverImg, viewingNpc.name)}
                        className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider rounded border border-white/10 flex items-center justify-center gap-1.5 transition"
                        title="Baixar Foto Principal"
                      >
                        <Download className="w-3 h-3 text-sky-400" />
                        Baixar Capa
                      </button>
                      {validImages.length > 1 && (
                        <button 
                          onClick={() => handleDownloadAll(validImages, viewingNpc.name)}
                          className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider rounded border border-white/10 flex items-center justify-center gap-1.5 transition"
                          title="Baixar Todas as Fotos"
                        >
                          <Download className="w-3 h-3 text-emerald-400" />
                          Baixar Todas
                        </button>
                      )}
                    </div>
                    

                  </div>
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
                    <div key={idx} className={`relative w-16 h-16 shrink-0 rounded overflow-hidden border-2 ${viewingNpc.coverImageIndex === idx ? 'border-indigo-500' : 'border-white/10 opacity-60'}`}>
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
                    <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1 line-clamp-1">{npc.name}</h3>
                    <p className="text-[10px] text-white/40 mb-3 uppercase tracking-wider">
                      {(npc.images?.filter(Boolean).length || 0)} Fotos
                    </p>
                    <div className="mt-auto flex gap-1">
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
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(npc.id); }} className="w-7 h-7 bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 rounded transition flex items-center justify-center border border-transparent hover:border-rose-500/30">
                        <Trash2 className="w-3 h-3" />
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
                        <h3 className="text-sm font-black text-white uppercase tracking-wider truncate">{npc.name}</h3>
                      </div>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">{(npc.images?.filter(Boolean).length || 0)} Fotos Cadastradas</p>
                  </div>
                  <div className="flex gap-2 px-2">
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
                      onClick={(e) => { e.stopPropagation(); handleDelete(npc.id); }}
                      className="w-8 h-8 rounded bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
