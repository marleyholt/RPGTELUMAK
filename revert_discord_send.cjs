const fs = require('fs');
let code = fs.readFileSync('src/components/NpcManager.tsx', 'utf8');

// 1. Restore imports
const badImports = `import { Search, Plus, Trash2, Edit2, LayoutGrid, List as ListIcon, X, Check, Image as ImageIcon, Download, FileText, Send, Loader2, MessageSquareText } from 'lucide-react';
import { DiscordChannelItem } from '../types';`;
const goodImports = `import { Search, Plus, Trash2, Edit2, LayoutGrid, List as ListIcon, X, Check, Image as ImageIcon, Download, FileText } from 'lucide-react';`;
code = code.replace(badImports, goodImports);

// 2. Remove states and handleSendToDiscord
const stateBlock = `  const [viewingNpc, setViewingNpc] = useState<NPC | null>(null);
  
  // Discord Send Modal
  const [showDiscordModal, setShowDiscordModal] = useState(false);
  const [discordChannels, setDiscordChannels] = useState<DiscordChannelItem[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [sendingDiscord, setSendingDiscord] = useState(false);
  const [sendType, setSendType] = useState<'cover' | 'all'>('cover');

  useEffect(() => {
    const unsubNpcs = onSnapshot(collection(db, 'npcs'), (snap) => {
      const items: NPC[] = [];
      snap.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as NPC);
      });
      items.sort((a, b) => a.name.localeCompare(b.name));
      setNpcs(items);
    });
    
    const unsubChannels = onSnapshot(collection(db, 'discord_channels'), (snap) => {
      const channels: DiscordChannelItem[] = [];
      snap.forEach(doc => {
        channels.push({ id: doc.id, ...doc.data() } as DiscordChannelItem);
      });
      setDiscordChannels(channels);
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
        link.download = \`\${npcName}-foto-\${idx+1}.png\`;
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
        content: \`**\${viewingNpc.name}**\\n\${sendType === 'cover' ? '(Foto Principal)' : '(Galeria de Fotos)'}\`,
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
  };`;
  
const newStateBlock = `  const [viewingNpc, setViewingNpc] = useState<NPC | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'npcs'), (snap) => {
      const items: NPC[] = [];
      snap.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as NPC);
      });
      items.sort((a, b) => a.name.localeCompare(b.name));
      setNpcs(items);
    });
    return () => unsub();
  }, []);
  
  const handleDownloadAll = (validImages: string[], npcName: string) => {
    validImages.forEach((url, idx) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = url;
        link.download = \`\${npcName}-foto-\${idx+1}.png\`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, idx * 300);
    });
  };`;

code = code.replace(stateBlock, newStateBlock);

// 3. Remove the button
const buttonBlock = `                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => { setSendType('cover'); setShowDiscordModal(true); }}
                        className="w-full py-1.5 bg-[#5865F2]/20 hover:bg-[#5865F2]/40 text-white text-[10px] font-bold uppercase tracking-wider rounded border border-[#5865F2]/30 flex items-center justify-center gap-1.5 transition h-full"
                      >
                        <Send className="w-3 h-3 text-[#5865F2]" />
                        Enviar Discord
                      </button>
                    </div>`;
                    
const newButtonBlock = ``;
code = code.replace(buttonBlock, newButtonBlock);
code = code.replace(`grid-cols-2`, `grid-cols-1`); // Fix the grid columns if we removed a column

// 4. Remove Modal
const modalBlock = `          
          {/* Discord Send Modal */}
          {showDiscordModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
              <div className="bg-[#2b2d31] border border-white/10 rounded-xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 bg-[#1e1f22] flex items-center justify-between">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <MessageSquareText className="w-4 h-4 text-[#5865F2]" />
                    Enviar Fotos para o Discord
                  </h3>
                  <button onClick={() => setShowDiscordModal(false)} className="text-white/40 hover:text-white transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="p-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-[#949ba4] uppercase tracking-wider">O que deseja enviar?</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSendType('cover')}
                        className={\`flex-1 py-2 text-xs font-bold rounded border transition \${sendType === 'cover' ? 'bg-[#5865F2] text-white border-[#5865F2]' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}\`}
                      >
                        Apenas Capa
                      </button>
                      {(viewingNpc.images || []).filter(Boolean).length > 1 && (
                        <button
                          onClick={() => setSendType('all')}
                          className={\`flex-1 py-2 text-xs font-bold rounded border transition \${sendType === 'all' ? 'bg-[#5865F2] text-white border-[#5865F2]' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}\`}
                        >
                          Todas as Fotos
                        </button>
                      )}
                    </div>
                  </div>
                
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-[#949ba4] uppercase tracking-wider">Selecione o Canal (Conversa)</label>
                    <div className="relative">
                      <select
                        value={selectedChannel}
                        onChange={(e) => setSelectedChannel(e.target.value)}
                        className="w-full bg-[#1e1f22] text-sm text-white px-3 py-2.5 rounded-lg border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition appearance-none"
                      >
                        <option value="">Selecione um canal...</option>
                        {discordChannels.map(ch => (
                          <option key={ch.id} value={ch.id}>
                            {ch.type === 'voice' ? '🔊' : '#'} {ch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border-t border-white/5 bg-[#1e1f22] flex justify-end gap-2">
                  <button
                    onClick={() => setShowDiscordModal(false)}
                    className="px-4 py-2 text-xs font-bold text-white/60 hover:text-white transition"
                    disabled={sendingDiscord}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSendToDiscord}
                    disabled={!selectedChannel || sendingDiscord}
                    className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold uppercase tracking-wider rounded transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {sendingDiscord ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          )}`;
code = code.replace(modalBlock, '');

fs.writeFileSync('src/components/NpcManager.tsx', code);
console.log('Reverted Discord sending logic.');
