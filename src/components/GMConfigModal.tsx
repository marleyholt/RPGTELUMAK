import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Character, DiscordChannelConfig } from '../types';
import { Sliders, X, MessageSquare, Hash, User, Shield, Check, RefreshCw, Sparkles, HelpCircle, Server, Bot } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/errors';
import { DiscordBotGuideModal } from './DiscordBotGuideModal';

interface GMConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
}

export function GMConfigModal({ isOpen, onClose, characters }: GMConfigModalProps) {
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
  }, [isOpen]);

  const fetchGuildInfo = async (targetGuildId?: string, targetChanId?: string) => {
    setIsFetchingGuild(true);
    try {
      const gId = targetGuildId || guildId;
      const cId = targetChanId || defaultChannelId;
      const res = await fetch(`/api/discord/server-info?guildId=${encodeURIComponent(gId)}&channelId=${encodeURIComponent(cId)}`);
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
      const data = await res.json();
      if (res.ok && data.success) {
        setBotTestStatus('✓ Mensagem de teste enviada com sucesso ao Discord!');
        fetchGuildInfo(undefined, chanId);
      } else {
        setBotTestStatus(`⚠️ Erro: ${data.error || 'Não foi possível enviar ao canal.'}`);
      }
    } catch (e: any) {
      setBotTestStatus(`❌ Falha de rede: ${e.message}`);
    } finally {
      setIsTestingBot(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-[#0c0c0c] border border-white/15 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-black">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 border border-orange-500/30">
              <Sliders className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-white">
                Painel de Configurações do Mestre (GM)
              </h2>
              <p className="text-[10px] text-white/50 font-mono">
                Gerencie canais do Discord, espelhamento do Notebook e parâmetros do sistema
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
              onClick={() => setActiveTab('discord')}
              className={`px-5 py-3 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border-b-2 ${
                activeTab === 'discord'
                  ? 'border-orange-500 text-orange-500 bg-white/[0.02]'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Integração Discord & Notebook
            </button>
            <button
              onClick={() => setActiveTab('geral')}
              className={`px-5 py-3 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border-b-2 ${
                activeTab === 'geral'
                  ? 'border-orange-500 text-orange-500 bg-white/[0.02]'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              Fichas & Permissões
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="px-3 py-1.5 bg-[#5865f2]/20 hover:bg-[#5865f2]/30 text-[#5865f2] border border-[#5865f2]/40 rounded text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5"
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Guia / Tutorial do Bot</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scroll">
          {activeTab === 'discord' && (
            <div className="space-y-6">
              
              {/* Tutorial Banner */}
              <div className="bg-[#141414] border border-orange-500/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-orange-400 font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    <span>Sessão NOTEBOOK do Discord:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGuideModal(true)}
                    className="text-[10px] text-[#5865f2] hover:underline font-bold font-mono"
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
                  <Server className="h-3.5 w-3.5 text-orange-500" />
                  ID do Servidor Discord (Guild ID) & Nome:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={guildId}
                    onChange={(e) => setGuildId(e.target.value)}
                    placeholder="ID do Servidor (Ex: 123456789012345678)"
                    className="flex-1 bg-[#050505] border border-white/10 px-3.5 py-2 text-white text-xs focus:outline-none focus:border-orange-500 font-mono"
                  />
                  <input
                    type="text"
                    value={guildName}
                    onChange={(e) => setGuildName(e.target.value)}
                    placeholder="Nome do Servidor (Detectado ou Digite)"
                    className="flex-1 bg-[#050505] border border-white/10 px-3.5 py-2 text-orange-400 font-bold text-xs focus:outline-none focus:border-orange-500"
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
                  <Hash className="h-3.5 w-3.5 text-orange-500" />
                  ID do Canal Padrão da Campanha (Geral / Chat)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={defaultChannelId}
                    onChange={(e) => setDefaultChannelId(e.target.value)}
                    placeholder="Ex: 1234567890123456789"
                    className="flex-1 bg-[#050505] border border-white/10 px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-orange-500 font-mono"
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
                  <User className="h-3.5 w-3.5 text-orange-500" />
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
                                className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-orange-500"
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

          {activeTab === 'geral' && (
            <div className="space-y-4">
              <div className="bg-[#141414] border border-white/10 p-4 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-orange-500">
                  Regras de Permissão da Mesa:
                </h4>
                <ul className="text-xs text-white/70 space-y-2 font-sans list-disc list-inside">
                  <li><strong>Apenas o Mestre (GM)</strong> tem permissão para alterar valores da ficha (atributos, HP, magia, modificadores, textos e transformações).</li>
                  <li><strong>Os Jogadores</strong> têm acesso exclusivamente de visualização à sua própria ficha e à arena.</li>
                  <li><strong>Painel de Jogador:</strong> Os jogadores têm um painel próprio ("Meu Perfil") onde alteram nome de exibição, senha, método de login e avatar.</li>
                  <li><strong>Alerta de Sincronização:</strong> O aplicativo verifica a cada 30 segundos se o Mestre alterou a ficha do jogador, exibindo um botão flutuante para atualização imediata na tela dele.</li>
                  <li><strong>Arena Tática:</strong> Apenas o Mestre pode mover peões, definir o tamanho em SQM (1x1, 2x2, etc.), spawnar tokens e trocar o mapa de fundo.</li>
                </ul>
              </div>
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
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest transition flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
            </button>
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

