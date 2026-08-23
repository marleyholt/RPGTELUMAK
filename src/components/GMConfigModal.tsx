import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Character, DiscordChannelConfig, UserProfile } from '../types';
import { 
  Sliders, X, MessageSquare, Hash, User, Shield, Check, RefreshCw, 
  Sparkles, HelpCircle, Server, Bot, Search, UserCheck, UserX, 
  Link as LinkIcon, Unlink, Crown, ShieldAlert, Users, Scroll, Plus
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/errors';
import { DiscordBotGuideModal } from './DiscordBotGuideModal';

interface GMConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  onOpenCreateCharModal?: () => void;
}

export function GMConfigModal({ isOpen, onClose, characters, onOpenCreateCharModal }: GMConfigModalProps) {
  const [activeTab, setActiveTab] = useState<'discord' | 'geral'>('discord');
  const [defaultChannelId, setDefaultChannelId] = useState('');
  const [guildId, setGuildId] = useState('');
  const [guildName, setGuildName] = useState('');
  const [playerChannels, setPlayerChannels] = useState<{ [charOrEmail: string]: string }>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [botTestStatus, setBotTestStatus] = useState<string | null>(null);
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [isFetchingGuild, setIsFetchingGuild] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Accounts and Permissions State
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [accountSearch, setAccountSearch] = useState('');
  const [accountActionMessage, setAccountActionMessage] = useState<string | null>(null);
  const [charLinkSelection, setCharLinkSelection] = useState<{ [uid: string]: string }>({});

  useEffect(() => {
    if (!isOpen) return;

    const loadConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'config', 'discord_mapping'));
        if (snap.exists()) {
          const data = snap.data() as DiscordChannelConfig;
          if (data.defaultChannelId) setDefaultChannelId(data.defaultChannelId);
          if (data.guildId) setGuildId(data.guildId);
          if (data.guildName) setGuildName(data.guildName);
          if (data.playerChannels) setPlayerChannels(data.playerChannels);
        }
      } catch (err) {
        console.error('Erro ao carregar configurações do Discord:', err);
      }
    };

    loadConfig();

    // Subscribe to all registered users
    setLoadingUsers(true);
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as UserProfile;
        users.push({
          uid: docSnap.id,
          email: data.email || '',
          displayName: data.displayName || 'Usuário Sem Nome',
          photoURL: data.photoURL || null,
          role: data.role || 'PLAYER'
        });
      });
      setUsersList(users);
      setLoadingUsers(false);
    }, (err) => {
      console.warn("Erro ao buscar usuários:", err);
      setLoadingUsers(false);
    });

    return () => unsubUsers();
  }, [isOpen]);

  const fetchGuildInfo = async (targetGuildId?: string, targetChanId?: string) => {
    setIsFetchingGuild(true);
    try {
      const gId = targetGuildId || guildId;
      const cId = targetChanId || defaultChannelId;
      const res = await fetch(`/api/discord/server-info?guildId=${encodeURIComponent(gId)}&channelId=${encodeURIComponent(cId)}`);
      
      if (!res.ok || res.status === 405) {
        setBotTestStatus(`⚠️ Backend Node.js offline ou executando em hospedagem estática (GitHub Pages). O bot roda via server.ts.`);
        return;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return;
      }

      const data = await res.json();
      if (data.online && data.guildName) {
        setGuildName(data.guildName);
        if (data.guildId && !guildId) setGuildId(data.guildId);
        setBotTestStatus(`✓ Servidor Discord Conectado: "${data.guildName}"`);
      } else if (!data.online) {
        setBotTestStatus(`⚠️ ${data.message || 'Bot offline. Verifique o token no backend.'}`);
      }
    } catch (e: any) {
      console.warn("Erro ao buscar servidor Discord:", e);
    } finally {
      setIsFetchingGuild(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await setDoc(doc(db, 'config', 'discord_mapping'), {
        defaultChannelId: defaultChannelId.trim(),
        guildId: guildId.trim(),
        guildName: guildName.trim(),
        playerChannels: playerChannels,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'config/discord_mapping');
    } finally {
      setSaving(false);
    }
  };

  const handlePlayerChannelChange = (key: string, value: string) => {
    setPlayerChannels(prev => ({
      ...prev,
      [key]: value.trim()
    }));
  };

  const testChannelId = async (chanId: string) => {
    if (!chanId) {
      alert('Informe o ID do canal para testar.');
      return;
    }
    setIsTestingBot(true);
    setBotTestStatus(null);
    try {
      const res = await fetch('/api/discord/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remetente: 'MESTRE (Teste)',
          conteudo: '🔮 **[Sincronização Telumak RPG]** Conexão com o Discord estabelecida com sucesso!',
          channelId: chanId
        })
      });

      if (res.status === 405 || !res.headers.get('content-type')?.includes('application/json')) {
        setBotTestStatus('⚠️ Erro 405 (Servidor estático como GitHub Pages detectado): O Bot do Discord necessita do backend Node.js (server.ts) ativo com o DISCORD_BOT_TOKEN configurado no ambiente.');
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setBotTestStatus('✓ Mensagem de teste enviada com sucesso ao Discord!');
        fetchGuildInfo(undefined, chanId);
      } else {
        setBotTestStatus(`⚠️ Erro: ${data.error || 'Não foi possível enviar ao canal. Verifique o DISCORD_BOT_TOKEN e permissões do bot no canal.'}`);
      }
    } catch (e: any) {
      setBotTestStatus(`❌ Falha de conexão com o backend: ${e.message}`);
    } finally {
      setIsTestingBot(false);
    }
  };

  // User Accounts & Role Management Actions
  const handleToggleUserRole = async (u: UserProfile) => {
    const newRole: 'GM' | 'PLAYER' = u.role === 'GM' ? 'PLAYER' : 'GM';
    try {
      await updateDoc(doc(db, 'users', u.uid), {
        role: newRole
      });
      setAccountActionMessage(`✓ Permissão de "${u.displayName || u.email}" alterada para ${newRole}!`);
      setTimeout(() => setAccountActionMessage(null), 3500);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${u.uid}`);
    }
  };

  const handleLinkCharToUser = async (userEmail: string, charId: string) => {
    if (!charId) return;
    try {
      await updateDoc(doc(db, 'characters', charId), {
        email_dono: userEmail
      });
      setAccountActionMessage(`✓ Ficha vinculada com sucesso à conta ${userEmail}!`);
      setTimeout(() => setAccountActionMessage(null), 3500);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `characters/${charId}`);
    }
  };

  const handleUnlinkChar = async (charId: string) => {
    try {
      await updateDoc(doc(db, 'characters', charId), {
        email_dono: ''
      });
      setAccountActionMessage(`✓ Ficha desvinculada!`);
      setTimeout(() => setAccountActionMessage(null), 3500);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `characters/${charId}`);
    }
  };

  const filteredUsers = usersList.filter(u => {
    const q = accountSearch.toLowerCase();
    return (
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-[#0c0c0c] border border-white/15 w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-black">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/30">
              <Sliders className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-white">
                Painel de Configurações do Mestre (GM)
              </h2>
              <p className="text-[10px] text-sky-200/50 font-mono">
                Gerenciamento de contas, permissões, vínculos de fichas e integração com o Discord
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 bg-black/50 justify-between items-center pr-4">
          <div className="flex">
            <button
              onClick={() => setActiveTab('geral')}
              className={`px-5 py-3 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border-b-2 ${
                activeTab === 'geral'
                  ? 'border-blue-500 text-sky-400 bg-white/[0.02]'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Fichas, Contas & Permissões
            </button>
            <button
              onClick={() => setActiveTab('discord')}
              className={`px-5 py-3 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border-b-2 ${
                activeTab === 'discord'
                  ? 'border-blue-500 text-sky-400 bg-white/[0.02]'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Integração Discord & Notebook
            </button>
          </div>

          {activeTab === 'discord' && (
            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="px-3 py-1.5 bg-[#5865f2]/20 hover:bg-[#5865f2]/30 text-[#5865f2] border border-[#5865f2]/40 rounded text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5"
            >
              <Bot className="h-3.5 w-3.5" />
              <span>Guia / Tutorial do Bot</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scroll">
          
          {/* TAB 1: ACCOUNTS, CHARACTERS LINKING & PERMISSIONS */}
          {activeTab === 'geral' && (
            <div className="space-y-6">

              {/* Status Alert Message */}
              {accountActionMessage && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{accountActionMessage}</span>
                </div>
              )}

              {/* Top Summary Bar & Character Creation */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-black/60 border border-white/10 p-3 flex items-center gap-3">
                  <div className="p-2 bg-white/5 border border-white/10 text-sky-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 uppercase font-mono block">Total de Contas</span>
                    <span className="text-lg font-black text-white font-mono">{usersList.length}</span>
                  </div>
                </div>

                <div className="bg-black/60 border border-white/10 p-3 flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 border border-blue-500/30 text-sky-400">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 uppercase font-mono block">Mestres (GMs)</span>
                    <span className="text-lg font-black text-sky-400 font-mono">
                      {usersList.filter(u => u.role === 'GM').length}
                    </span>
                  </div>
                </div>

                <div className="bg-black/60 border border-white/10 p-3 flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <Scroll className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 uppercase font-mono block">Fichas Criadas</span>
                    <span className="text-lg font-black text-cyan-400 font-mono">{characters.length}</span>
                  </div>
                </div>

                {onOpenCreateCharModal && (
                  <button
                    type="button"
                    onClick={onOpenCreateCharModal}
                    className="bg-blue-600 hover:bg-blue-500 text-white p-3 flex flex-col items-center justify-center gap-1 transition shadow-lg text-center group"
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider">
                      <Plus className="h-4 w-4 transition-transform group-hover:scale-125" />
                      <span>Nova Ficha</span>
                    </div>
                    <span className="text-[9px] text-white/80 font-mono">Criar Personagem</span>
                  </button>
                )}
              </div>

              {/* Accounts Search & List */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                      <Shield className="h-4 w-4 text-sky-400" />
                      Contas Criadas & Vínculos de Fichas
                    </h3>
                    <p className="text-[10px] text-white/50 font-mono mt-0.5">
                      Defina quem é Mestre ou Jogador e vincule personagens às contas dos jogadores
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="h-3.5 w-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por nome, email..."
                      value={accountSearch}
                      onChange={e => setAccountSearch(e.target.value)}
                      className="w-full bg-black border border-white/10 pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {loadingUsers ? (
                  <div className="p-8 text-center text-white/40 flex items-center justify-center gap-2 font-mono text-xs">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                    Carregando contas cadastradas...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-6 border border-white/10 bg-black/40 text-center text-white/40 italic text-xs font-mono">
                    Nenhuma conta encontrada com o termo "{accountSearch}".
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredUsers.map(u => {
                      const userChars = characters.filter(c => c.email_dono && c.email_dono.trim().toLowerCase() === u.email.trim().toLowerCase());
                      const isUserGM = u.role === 'GM';
                      const selectedChar = charLinkSelection[u.uid] || '';

                      return (
                        <div
                          key={u.uid}
                          className="bg-[#080808] border border-white/10 hover:border-white/20 p-4 transition-all space-y-3"
                        >
                          {/* User Header Info & Role Toggle */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 bg-black border border-white/15 overflow-hidden shrink-0">
                                <img
                                  src={u.photoURL || 'https://via.placeholder.com/60?text=User'}
                                  alt={u.displayName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-xs text-white uppercase tracking-tight truncate">
                                    {u.displayName || 'Sem Nome'}
                                  </span>
                                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 border ${
                                    isUserGM 
                                      ? 'bg-blue-500/20 text-sky-400 border-blue-500/40' 
                                      : 'bg-white/5 text-white/50 border-white/10'
                                  }`}>
                                    {isUserGM ? 'MESTRE (GM)' : 'JOGADOR'}
                                  </span>
                                </div>
                                <p className="text-[10px] text-white/40 font-mono truncate mt-0.5 select-all">
                                  {u.email}
                                </p>
                              </div>
                            </div>

                            {/* Role Switcher Button */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleToggleUserRole(u)}
                                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
                                  isUserGM
                                    ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500'
                                    : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/15 hover:border-white/30'
                                }`}
                                title={isUserGM ? 'Rebaixar para Jogador comum' : 'Promover a Mestre (GM)'}
                              >
                                {isUserGM ? <Crown className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                                <span>{isUserGM ? 'Tornar Jogador' : 'Tornar GM'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Linked Characters and Link Action */}
                          <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            
                            {/* Linked Characters Chips */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] text-white/40 uppercase font-mono font-bold">Fichas Vinculadas:</span>
                              {userChars.length === 0 ? (
                                <span className="text-[10px] text-white/30 italic font-mono">Nenhuma ficha vinculada</span>
                              ) : (
                                userChars.map(c => (
                                  <div
                                    key={c.id}
                                    className="bg-black border border-blue-500/30 px-2.5 py-1 flex items-center gap-2 group"
                                  >
                                    <img src={c.img_saudavel} alt={c.nome} className="w-4 h-4 object-cover" />
                                    <span className="text-[10px] font-bold text-white uppercase">{c.nome}</span>
                                    <span className="text-[9px] text-sky-400 font-mono">Nv.{c.nivel}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleUnlinkChar(c.id)}
                                      className="text-white/30 hover:text-rose-400 transition"
                                      title={`Desvincular ficha ${c.nome} desta conta`}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Dropdown to Link New Character */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <select
                                value={selectedChar}
                                onChange={(e) => setCharLinkSelection(prev => ({ ...prev, [u.uid]: e.target.value }))}
                                className="bg-black border border-white/10 px-2.5 py-1 text-[10px] text-white font-mono focus:outline-none focus:border-blue-500"
                              >
                                <option value="">+ Vincular Ficha...</option>
                                {characters.map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.nome} (Nv.{c.nivel}) {c.email_dono ? `[Atual: ${c.email_dono}]` : '[Sem Dono]'}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                disabled={!selectedChar}
                                onClick={() => {
                                  if (selectedChar) {
                                    handleLinkCharToUser(u.email, selectedChar);
                                    setCharLinkSelection(prev => ({ ...prev, [u.uid]: '' }));
                                  }
                                }}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1"
                              >
                                <LinkIcon className="h-2.5 w-2.5" />
                                <span>Vincular</span>
                              </button>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Character-centric Quick Overview */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Scroll className="h-4 w-4 text-sky-400" />
                  Visão Geral de Todas as Fichas & Donos:
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {characters.map(c => (
                    <div key={c.id} className="bg-black border border-white/10 p-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={c.img_saudavel} alt={c.nome} className="w-7 h-7 object-cover border border-white/10 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white uppercase truncate">{c.nome}</p>
                          <p className="text-[9px] text-white/40 font-mono truncate">
                            {c.email_dono ? `Dono: ${c.email_dono}` : 'Sem dono atribuído'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {c.email_dono && (
                          <button
                            type="button"
                            onClick={() => handleUnlinkChar(c.id)}
                            className="p-1 bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 border border-white/10 text-[9px] font-mono uppercase"
                            title="Desvincular dono"
                          >
                            <Unlink className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: DISCORD INTEGRATION */}
          {activeTab === 'discord' && (
            <div className="space-y-6">
              
              {/* Tutorial Banner */}
              <div className="bg-[#141414] border border-blue-500/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    <span>Sessão NOTEBOOK do Discord:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGuideModal(true)}
                    className="text-[10px] text-sky-400 hover:underline font-bold font-mono"
                  >
                    Ver passo a passo de configuração ➜
                  </button>
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed font-sans">
                  Você pode configurar um <strong>Canal do Discord exclusivo para cada jogador</strong> (ou um canal padrão da mesa). 
                  Tudo o que for digitado na aba <strong>NOTEBOOK</strong> será enviado em tempo real para o canal com formatação do Discord (spoilers, negrito, anexos, citações de rolagens), e qualquer mensagem ou rolagem do <strong>Rollem</strong> enviada no Discord aparecerá instantaneamente no portal!
                </p>
              </div>

              {/* ID do Servidor Discord (Guild) */}
              <div className="bg-black/60 border border-white/10 p-4 space-y-3">
                <label className="block text-[11px] text-white/70 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-sky-400" />
                  ID do Servidor Discord (Guild ID) & Nome:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={guildId}
                    onChange={(e) => setGuildId(e.target.value)}
                    placeholder="ID do Servidor (Ex: 123456789012345678)"
                    className="flex-1 bg-[#050505] border border-white/10 px-3.5 py-2 text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <input
                    type="text"
                    value={guildName}
                    onChange={(e) => setGuildName(e.target.value)}
                    placeholder="Nome do Servidor (Detectado ou Digite)"
                    className="flex-1 bg-[#050505] border border-white/10 px-3.5 py-2 text-sky-400 font-bold text-xs focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => fetchGuildInfo()}
                    disabled={isFetchingGuild}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    {isFetchingGuild ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Detectar'}
                  </button>
                </div>
                <p className="text-[9px] text-white/40 font-mono">
                  O nome do servidor será exibido no cabeçalho do Notebook. Para copiar o ID do Servidor, clique com botão direito no ícone do servidor no Discord e escolha "Copiar ID do servidor".
                </p>
              </div>

              {/* Canal Padrão da Campanha */}
              <div>
                <label className="block text-[11px] text-white/70 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-sky-400" />
                  ID do Canal Padrão da Campanha (Geral / Chat)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={defaultChannelId}
                    onChange={(e) => setDefaultChannelId(e.target.value)}
                    placeholder="Ex: 1234567890123456789"
                    className="flex-1 bg-[#050505] border border-white/10 px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => testChannelId(defaultChannelId)}
                    disabled={isTestingBot || !defaultChannelId}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider border border-white/10 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isTestingBot ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Testar'}
                  </button>
                </div>
                <p className="text-[9px] text-white/40 font-mono mt-1">
                  Obtenha o ID no Discord clicando com botão direito no canal e selecionando "Copiar ID do canal" (Modo Desenvolvedor ativado).
                </p>
              </div>

              {/* Canais Individuais por Personagem / Jogador */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-sky-400" />
                  Canais do Discord por Jogador (Notebook Privado):
                </h4>
                
                {characters.length === 0 ? (
                  <p className="text-xs text-white/40 italic py-2">
                    Nenhum personagem cadastrado ainda. Crie personagens na aba principal para vincular canais.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {characters.map(c => {
                      const key = c.email_dono || c.id;
                      const chanVal = playerChannels[key] || playerChannels[c.id] || '';
                      
                      return (
                        <div key={c.id} className="bg-[#080808] border border-white/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex items-center gap-3">
                            <div className="w-8 h-8 bg-black border border-white/15 overflow-hidden shrink-0">
                              <img src={c.img_saudavel || 'https://via.placeholder.com/60'} alt={c.nome} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-white uppercase tracking-tight truncate">{c.nome}</p>
                              <p className="text-[10px] text-white/40 font-mono truncate">{c.email_dono || 'Sem e-mail vinculado'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-56">
                              <input
                                type="text"
                                value={chanVal}
                                onChange={(e) => handlePlayerChannelChange(key, e.target.value)}
                                placeholder="ID do Canal no Discord"
                                className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => testChannelId(chanVal)}
                              disabled={isTestingBot || !chanVal}
                              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white font-bold text-[10px] uppercase tracking-wider border border-white/10 transition shrink-0 disabled:opacity-40"
                              title="Enviar mensagem de teste para este canal"
                            >
                              Testar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {botTestStatus && (
                <div className={`p-3 text-xs font-mono border ${
                  botTestStatus.startsWith('✓')
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                }`}>
                  {botTestStatus}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black flex items-center justify-between">
          <div>
            {saveSuccess && (
              <span className="text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                Configurações salvas com sucesso!
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold text-xs uppercase tracking-wider transition"
            >
              Fechar
            </button>
            {activeTab === 'discord' && (
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest transition flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Tutorial Guide Modal */}
      {showGuideModal && (
        <DiscordBotGuideModal
          isOpen={showGuideModal}
          onClose={() => setShowGuideModal(false)}
        />
      )}
    </div>
  );
}


