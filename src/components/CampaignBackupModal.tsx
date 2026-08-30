import React, { useState, useEffect } from 'react';
import { 
  X, Download, Upload, Shield, CheckCircle2, AlertTriangle, 
  Database, User, Users, MessageSquare, Flame, Star, Zap,
  Check, RefreshCw, Layers, ShieldCheck, Heart, Sparkles,
  Lock, Eye, ChevronRight, ChevronDown, CheckSquare, Square,
  FolderDown, HardDrive, Info, AlertOctagon, Loader2
} from 'lucide-react';
import { Character, NPC, DiscordChannelItem, DiscordNotebookMessage } from '../types';
import { 
  isOfflineModeActive, setOfflineModeActive, 
  generateCampaignBackup, downloadBackupFile, 
  syncCampaignToCloud, CampaignBackupFile,
  saveOfflineCharacters, saveOfflineNpcs, saveOfflineDiscordData,
  loadOfflineCharacters, loadOfflineNpcs, loadOfflineDiscordData
} from '../utils/offlineModeManager';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { trackRead } from '../utils/firebaseUsageTracker';

interface CampaignBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  userEmail?: string;
  isGM: boolean;
  onCharactersUpdated?: (updated: Character[]) => void;
}

export function CampaignBackupModal({
  isOpen,
  onClose,
  characters,
  userEmail,
  isGM,
  onCharactersUpdated
}: CampaignBackupModalProps) {
  const [activeTab, setActiveTab] = useState<'MODE' | 'EXPORT' | 'IMPORT'>('MODE');
  const [isOffline, setIsOffline] = useState(isOfflineModeActive());

  // Export State
  const [includeCharacters, setIncludeCharacters] = useState(true);
  const [includeNpcs, setIncludeNpcs] = useState(true);
  const [includeDiscord, setIncludeDiscord] = useState(true);
  
  const [availableNpcs, setAvailableNpcs] = useState<NPC[]>([]);
  const [availableChannels, setAvailableChannels] = useState<DiscordChannelItem[]>([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState<{ [id: string]: boolean }>({});
  const [loadingExportData, setLoadingExportData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Import State
  const [importedFile, setImportedFile] = useState<CampaignBackupFile | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [importModeChoice, setImportModeChoice] = useState<'OFFLINE' | 'CLOUD'>('OFFLINE');

  // Preview expansion
  const [expandedPreviewChar, setExpandedPreviewChar] = useState<string | null>(null);

  // Load NPCs and Discord Channels for Exporting when modal is opened
  useEffect(() => {
    if (!isOpen) return;
    setIsOffline(isOfflineModeActive());

    const fetchExportAssets = async () => {
      setLoadingExportData(true);
      try {
        // Fetch NPCs
        const npcsList: NPC[] = [];
        try {
          const npcsSnap = await getDocs(collection(db, 'npcs'));
          npcsSnap.forEach(d => npcsList.push({ id: d.id, ...d.data() } as NPC));
          trackRead('npcs', npcsSnap.size);
        } catch (e) {
          console.warn('Fallback offline NPCs:', e);
          const cached = loadOfflineNpcs();
          if (cached) npcsList.push(...cached);
        }
        setAvailableNpcs(npcsList);

        // Fetch Discord Channels
        const channelsList: DiscordChannelItem[] = [];
        try {
          const channelsSnap = await getDocs(collection(db, 'discord_channels'));
          channelsSnap.forEach(d => channelsList.push({ id: d.id, ...d.data() } as DiscordChannelItem));
          trackRead('discord_channels', channelsSnap.size);
        } catch (e) {
          console.warn('Fallback offline channels:', e);
          const cached = loadOfflineDiscordData();
          if (cached?.channels) channelsList.push(...cached.channels);
        }
        setAvailableChannels(channelsList);

        // By default, select all channels
        const initialSelection: { [id: string]: boolean } = {};
        channelsList.forEach(c => {
          initialSelection[c.id] = true;
        });
        setSelectedChannelIds(initialSelection);

      } catch (err) {
        console.error('Erro ao carregar dados para exportação:', err);
      } finally {
        setLoadingExportData(false);
      }
    };

    fetchExportAssets();
  }, [isOpen]);

  if (!isOpen) return null;

  // Toggle Offline Mode
  const handleToggleOfflineMode = (newState: boolean) => {
    setIsOffline(newState);
    setOfflineModeActive(newState);
    if (newState) {
      // Auto-cache current characters and npcs when going offline
      if (characters && characters.length > 0) {
        saveOfflineCharacters(characters);
      }
      if (availableNpcs && availableNpcs.length > 0) {
        saveOfflineNpcs(availableNpcs);
      }
    }
  };

  // Perform Export
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      // 1. Gather Selected Channels & Messages
      const selectedChannelsData: Array<{ channel: DiscordChannelItem; messages: DiscordNotebookMessage[] }> = [];

      if (includeDiscord) {
        const targetChannels = availableChannels.filter(c => selectedChannelIds[c.id]);
        
        for (const ch of targetChannels) {
          const msgsList: DiscordNotebookMessage[] = [];
          try {
            const msgsSnap = await getDocs(collection(db, 'discord_notebook_messages'));
            msgsSnap.forEach(d => {
              const data = d.data() as DiscordNotebookMessage;
              if (data.channelId === ch.id) {
                msgsList.push({ id: d.id, ...data });
              }
            });
            trackRead('discord_notebook_messages', msgsSnap.size);
          } catch (e) {
            console.warn(`Could not load messages for channel ${ch.name}`, e);
          }
          selectedChannelsData.push({
            channel: ch,
            messages: msgsList
          });
        }
      }

      // 2. Build full data package
      const backupData = generateCampaignBackup({
        characters: includeCharacters ? characters : [],
        npcs: includeNpcs ? availableNpcs : [],
        selectedChannels: selectedChannelsData,
        authorEmail: userEmail
      });

      // 3. Download JSON
      downloadBackupFile(backupData);
    } catch (e) {
      console.error('Falha ao exportar backup:', e);
      alert('Erro ao gerar arquivo de backup. Verifique a telemetria.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle File Input for Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError(null);
    setImportSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Validation
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Arquivo JSON inválido ou corrompido.');
        }

        // Support standard structure and legacy snapshots
        let normalizedBackup: CampaignBackupFile;
        if (parsed.tipo === 'TELUMAK_CAMPANHA_BACKUP' && parsed.dados) {
          normalizedBackup = parsed;
        } else if (parsed.characters || parsed.personagens) {
          // Legacy snapshot normalization
          normalizedBackup = {
            tipo: 'TELUMAK_CAMPANHA_BACKUP',
            versao: '2.0',
            data_geracao: parsed.timestamp || new Date().toISOString(),
            gerado_por: parsed.author || 'Importado',
            dados: {
              personagens: parsed.characters || parsed.personagens || [],
              npcs: parsed.npcs || [],
              canais_discord: (parsed.discord_channels || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                category: c.category,
                type: c.type,
                topic: c.topic,
                mensagens: []
              }))
            }
          };
        } else {
          throw new Error('O arquivo não contém uma estrutura de campanha Telumak reconhecida.');
        }

        setImportedFile(normalizedBackup);
      } catch (err: any) {
        console.error(err);
        setImportError(err.message || 'Erro ao processar o arquivo.');
        setImportedFile(null);
      }
    };
    reader.readAsText(file);
  };

  // Apply Import
  const handleApplyImport = async () => {
    if (!importedFile) return;

    setIsProcessingImport(true);
    setImportError(null);
    setImportSuccessMsg(null);

    try {
      const data = importedFile.dados;

      if (importModeChoice === 'OFFLINE') {
        // Apply locally with ZERO quota usage
        if (data.personagens && data.personagens.length > 0) {
          saveOfflineCharacters(data.personagens);
          if (onCharactersUpdated) {
            onCharactersUpdated(data.personagens);
          }
        }
        if (data.npcs && data.npcs.length > 0) {
          saveOfflineNpcs(data.npcs);
        }
        if (data.canais_discord && data.canais_discord.length > 0) {
          const channels: DiscordChannelItem[] = data.canais_discord.map(c => ({
            id: c.id,
            name: c.name,
            category: c.category || 'TEXTO',
            type: c.type || 'text',
            topic: c.topic
          }));
          const messages: DiscordNotebookMessage[] = data.canais_discord.flatMap(c => c.mensagens || []);
          saveOfflineDiscordData(channels, messages);
        }

        // Automatically switch to offline mode so user can inspect their loaded data
        setOfflineModeActive(true);
        setIsOffline(true);

        setImportSuccessMsg(
          `Campanha carregada com sucesso no Modo Preparação (Offline)! ${data.personagens?.length || 0} Fichas e ${data.npcs?.length || 0} NPCs prontos para uso sem gastar cota.`
        );
      } else {
        // Sync to Cloud (Firestore)
        const result = await syncCampaignToCloud(data);
        if (onCharactersUpdated && data.personagens) {
          onCharactersUpdated(data.personagens);
        }
        setImportSuccessMsg(
          `Campanha sincronizada na Nuvem: ${result.charactersCount} Fichas, ${result.npcsCount} NPCs e ${result.channelsCount} Canais atualizados no Firebase.`
        );
      }
    } catch (e: any) {
      console.error(e);
      setImportError(e.message || 'Erro ao aplicar os dados do backup.');
    } finally {
      setIsProcessingImport(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-[#0b0c0e] border border-blue-500/40 w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-white">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#121418] border-b border-blue-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500/10 text-sky-400 flex items-center justify-center border border-blue-500/30">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                  Central de Campanha & Modo Offline do Mestre
                </h2>
                {isOffline ? (
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 font-mono font-black uppercase flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    Modo Offline Ativo
                  </span>
                ) : (
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 font-mono font-black uppercase flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Nuvem Conectada
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/50">
                Planeje sessões com zero consumo de cota e exporte/importe backups completos (.json)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition"
            title="Fechar Janela"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 bg-[#08090b] border-b border-white/10 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('MODE')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition ${
              activeTab === 'MODE'
                ? 'border-amber-500 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <HardDrive className="h-4 w-4" />
            <span>1. Modo de Trabalho (Online / Offline)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EXPORT')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition ${
              activeTab === 'EXPORT'
                ? 'border-sky-500 text-sky-300 bg-sky-500/10'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Download className="h-4 w-4" />
            <span>2. Salvar Campanha (.JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('IMPORT')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition ${
              activeTab === 'IMPORT'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>3. Carregar Campanha (.JSON)</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto custom-scroll p-4 sm:p-6 space-y-5">
          
          {/* TAB 1: WORK MODE (ONLINE VS OFFLINE) */}
          {activeTab === 'MODE' && (
            <div className="space-y-4">
              
              <div className="p-4 bg-[#121418] border border-white/10 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Info className="h-4 w-4 text-sky-400" />
                  Como Funciona o Modo de Trabalho?
                </h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  Para evitar gastar a cota gratuita do Firebase enquanto você planeja fichas de jogadores, cria NPCs e revisa o diário de bordo sozinho, você pode alternar livremente entre os dois modos abaixo com 1 clique:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Mode Option: Offline Preparation */}
                <div className={`p-4 border transition ${
                  isOffline 
                    ? 'bg-amber-950/20 border-amber-500 ring-1 ring-amber-500/50' 
                    : 'bg-[#121418] border-white/10 opacity-70 hover:opacity-100'
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center">
                        <HardDrive className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-200">
                          Modo Preparação (Offline)
                        </h4>
                        <span className="text-[10px] text-amber-400/80 font-mono font-bold">
                          Zero Cota • Sem Requisições
                        </span>
                      </div>
                    </div>

                    {isOffline && (
                      <span className="px-2 py-0.5 bg-amber-500 text-black text-[9px] font-black uppercase">
                        Em Uso
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-white/60 leading-relaxed mb-4">
                    Ideal para o Mestre preparar a sessão sozinho. Desconecta os ouvintes do Firebase. Todas as alterações em fichas e NPCs são salvas diretamente no armazenamento local do seu navegador.
                  </p>

                  <button
                    type="button"
                    onClick={() => handleToggleOfflineMode(true)}
                    disabled={isOffline}
                    className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800/40 disabled:text-amber-200/50 text-white font-black uppercase text-xs tracking-wider transition flex items-center justify-center gap-2 shadow"
                  >
                    <Check className="h-4 w-4" />
                    <span>{isOffline ? 'Modo Offline Já Ativo' : 'Ativar Modo Preparação (Offline)'}</span>
                  </button>
                </div>

                {/* Mode Option: Online Live Table */}
                <div className={`p-4 border transition ${
                  !isOffline 
                    ? 'bg-emerald-950/20 border-emerald-500 ring-1 ring-emerald-500/50' 
                    : 'bg-[#121418] border-white/10 opacity-70 hover:opacity-100'
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-200">
                          Modo Mesa Ao Vivo (Nuvem)
                        </h4>
                        <span className="text-[10px] text-emerald-400/80 font-mono font-bold">
                          Firebase Firestore • Tempo Real
                        </span>
                      </div>
                    </div>

                    {!isOffline && (
                      <span className="px-2 py-0.5 bg-emerald-500 text-black text-[9px] font-black uppercase">
                        Em Uso
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-white/60 leading-relaxed mb-4">
                    Ideal para o momento da sessão com os jogadores. Sincroniza fichas, rolagens de dados e mensagens do Discord em tempo real entre todos os participantes conectados.
                  </p>

                  <button
                    type="button"
                    onClick={() => handleToggleOfflineMode(false)}
                    disabled={!isOffline}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/40 disabled:text-emerald-200/50 text-white font-black uppercase text-xs tracking-wider transition flex items-center justify-center gap-2 shadow"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>{!isOffline ? 'Modo Nuvem Já Ativo' : 'Ativar Modo Ao Vivo (Nuvem)'}</span>
                  </button>
                </div>

              </div>

              {/* Status Summary Banner */}
              <div className="p-3 bg-[#0a0c0e] border border-white/10 flex items-center justify-between text-xs font-mono text-white/60">
                <span>Fichas no Workspace: <strong>{characters.length}</strong></span>
                <span>NPCs Disponíveis: <strong>{availableNpcs.length}</strong></span>
                <span>Canais do Discord: <strong>{availableChannels.length}</strong></span>
              </div>
            </div>
          )}

          {/* TAB 2: EXPORT BACKUP JSON */}
          {activeTab === 'EXPORT' && (
            <div className="space-y-5">
              
              <div className="p-3 bg-[#121418] border border-sky-500/20 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-sky-200">
                    Selecione o que deseja incluir no arquivo .JSON
                  </h4>
                  <p className="text-[11px] text-white/50">
                    Gera um arquivo completo que você pode salvar no seu computador ou transferir para outro dispositivo.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-sky-400 bg-sky-950/40 border border-sky-500/30 px-2 py-1">
                  Padrão Telumak v2.0
                </span>
              </div>

              {/* Item 1: Character Sheets */}
              <div className="p-4 bg-[#121418] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeCharacters}
                      onChange={(e) => setIncludeCharacters(e.target.checked)}
                      className="w-4 h-4 accent-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-sky-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white">
                        1. Fichas de Personagens ({characters.length} fichas)
                      </span>
                    </div>
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    Base Completa + Versões + Atributos
                  </span>
                </div>

                {includeCharacters && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/5">
                    {characters.map((char) => (
                      <div 
                        key={char.id} 
                        className="p-2 bg-black/40 border border-white/5 flex items-center gap-3 text-xs"
                      >
                        <div className="w-9 h-9 bg-neutral-800 border border-white/10 overflow-hidden shrink-0">
                          {char.img_saudavel ? (
                            <img 
                              src={char.img_saudavel} 
                              alt={char.nome} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <User className="w-full h-full p-2 text-white/30" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-white truncate">{char.nome || 'Sem Nome'}</div>
                          <div className="text-[10px] text-white/50 flex items-center gap-2">
                            <span>Nv. {char.nivel || 1}</span>
                            <span>•</span>
                            <span className="text-rose-400 font-mono">{char.hp_atual}/{char.hp_max} PV</span>
                            <span>•</span>
                            <span className="text-sky-400 font-mono">{char.ether_atual}/{char.ether_max} Éter</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Item 2: NPCs */}
              <div className="p-4 bg-[#121418] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeNpcs}
                      onChange={(e) => setIncludeNpcs(e.target.checked)}
                      className="w-4 h-4 accent-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white">
                        2. Catálogo de NPCs & Monstros ({availableNpcs.length} NPCs)
                      </span>
                    </div>
                  </label>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">
                    Fichas do Mestre + Stats
                  </span>
                </div>
              </div>

              {/* Item 3: Discord Channels Selector */}
              <div className="p-4 bg-[#121418] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeDiscord}
                      onChange={(e) => setIncludeDiscord(e.target.checked)}
                      className="w-4 h-4 accent-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-indigo-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white">
                        3. Canais do Discord Notebook
                      </span>
                    </div>
                  </label>

                  {includeDiscord && (
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <button
                        type="button"
                        onClick={() => {
                          const all: { [id: string]: boolean } = {};
                          availableChannels.forEach(c => all[c.id] = true);
                          setSelectedChannelIds(all);
                        }}
                        className="text-sky-400 hover:underline"
                      >
                        Marcar Todos
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedChannelIds({})}
                        className="text-white/40 hover:underline"
                      >
                        Desmarcar Todos
                      </button>
                    </div>
                  )}
                </div>

                {includeDiscord && (
                  <div className="space-y-1.5 pt-2 border-t border-white/5 max-h-48 overflow-y-auto custom-scroll">
                    {availableChannels.length === 0 ? (
                      <p className="text-xs text-white/40 italic p-2">Nenhum canal do Discord cadastrado.</p>
                    ) : (
                      availableChannels.map((channel) => {
                        const isSelected = !!selectedChannelIds[channel.id];
                        return (
                          <label
                            key={channel.id}
                            className={`p-2 border flex items-center justify-between gap-2 cursor-pointer transition text-xs ${
                              isSelected
                                ? 'bg-indigo-950/20 border-indigo-500/40 text-white'
                                : 'bg-black/30 border-white/5 text-white/40 hover:text-white/70'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  setSelectedChannelIds(prev => ({
                                    ...prev,
                                    [channel.id]: e.target.checked
                                  }));
                                }}
                                className="w-3.5 h-3.5 accent-indigo-500"
                              />
                              <span className="font-mono font-bold truncate">#{channel.name}</span>
                            </div>

                            <span className="text-[10px] text-white/40 uppercase font-mono">
                              [{channel.category || 'GERAL'}]
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Download Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  disabled={isExporting || (!includeCharacters && !includeNpcs && !includeDiscord)}
                  className="w-full py-3 px-5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-black uppercase text-xs tracking-wider transition flex items-center justify-center gap-2 shadow-xl"
                >
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  <span>{isExporting ? 'Gerando Arquivo...' : 'Baixar Arquivo da Campanha (.JSON)'}</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: IMPORT BACKUP JSON */}
          {activeTab === 'IMPORT' && (
            <div className="space-y-5">
              
              <div className="p-3 bg-[#121418] border border-emerald-500/20">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-200">
                  Carregar Campanha a partir de um Arquivo (.JSON)
                </h4>
                <p className="text-[11px] text-white/50">
                  Suba o arquivo salvo anteriormente para restaurar personagens, NPCs e canais do Discord com validação à prova de falhas.
                </p>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-white/20 hover:border-emerald-500/60 p-6 text-center bg-black/40 transition">
                <input
                  type="file"
                  id="campaign-json-input"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label 
                  htmlFor="campaign-json-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2 text-white/70 hover:text-white"
                >
                  <FolderDown className="h-8 w-8 text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    {importFileName ? `Arquivo Selecionado: ${importFileName}` : 'Clique para Escolher o Arquivo .JSON da Campanha'}
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">
                    Formatos aceitos: Telumak v2.0 e Snapshots anteriores
                  </span>
                </label>
              </div>

              {/* Error Message */}
              {importError && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertOctagon className="h-4 w-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Success Message */}
              {importSuccessMsg && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{importSuccessMsg}</span>
                </div>
              )}

              {/* Verified File Summary Preview */}
              {importedFile && (
                <div className="p-4 bg-[#121418] border border-emerald-500/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-200">
                        Conteúdo do Arquivo Validado com Sucesso
                      </h4>
                    </div>
                    <span className="text-[10px] text-white/40 font-mono">
                      Data: {new Date(importedFile.data_geracao).toLocaleString()}
                    </span>
                  </div>

                  {/* Summary Badges */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-black/40 border border-white/10">
                      <div className="text-base font-black text-sky-400 font-mono">
                        {importedFile.dados.personagens?.length || 0}
                      </div>
                      <div className="text-[9px] uppercase font-bold text-white/60">Fichas de Jogadores</div>
                    </div>

                    <div className="p-2 bg-black/40 border border-white/10">
                      <div className="text-base font-black text-amber-400 font-mono">
                        {importedFile.dados.npcs?.length || 0}
                      </div>
                      <div className="text-[9px] uppercase font-bold text-white/60">Fichas de NPCs</div>
                    </div>

                    <div className="p-2 bg-black/40 border border-white/10">
                      <div className="text-base font-black text-indigo-400 font-mono">
                        {importedFile.dados.canais_discord?.length || 0}
                      </div>
                      <div className="text-[9px] uppercase font-bold text-white/60">Canais de Chat</div>
                    </div>
                  </div>

                  {/* Detailed Base Sheet Information (Fiel ao que é de verdade) */}
                  {importedFile.dados.personagens && importedFile.dados.personagens.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-white/60 tracking-wider">
                        Prévia Fiel das Fichas de Jogadores:
                      </span>
                      <div className="space-y-2 max-h-56 overflow-y-auto custom-scroll">
                        {importedFile.dados.personagens.map((char) => {
                          const isExpanded = expandedPreviewChar === char.id;
                          return (
                            <div 
                              key={char.id}
                              className="p-3 bg-black/60 border border-white/10 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 bg-neutral-800 border border-white/10 overflow-hidden shrink-0">
                                    {char.img_saudavel ? (
                                      <img src={char.img_saudavel} alt={char.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <User className="w-full h-full p-1.5 text-white/40" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-bold text-white text-xs">{char.nome}</div>
                                    <div className="text-[10px] text-white/50 font-mono">
                                      {char.cla || 'Sem Clã'} • {char.ocupacao || 'Sem Ocupação'} • Nv. {char.nivel || 1}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="text-right text-[10px] font-mono">
                                    <div className="text-rose-400 font-bold">{char.hp_atual}/{char.hp_max} PV</div>
                                    <div className="text-sky-400">{char.ether_atual}/{char.ether_max} Éter</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedPreviewChar(isExpanded ? null : char.id)}
                                    className="p-1 text-white/40 hover:text-white"
                                    title="Ver todos os atributos da ficha"
                                  >
                                    <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                </div>
                              </div>

                              {/* Expanded Full Base Sheet Details */}
                              {isExpanded && (
                                <div className="pt-2 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono bg-black/40 p-2">
                                  <div><span className="text-white/40">FÍSICO:</span> <strong className="text-white">{char.fisico || 10}</strong></div>
                                  <div><span className="text-white/40">DESTREZA:</span> <strong className="text-white">{char.destreza || 10}</strong></div>
                                  <div><span className="text-white/40">COGNIÇÃO:</span> <strong className="text-white">{char.cognicao || 10}</strong></div>
                                  <div><span className="text-white/40">CARISMA:</span> <strong className="text-white">{char.carisma || 10}</strong></div>
                                  <div><span className="text-white/40">DESTINO:</span> <strong className="text-amber-400">{char.destino_atual}/{char.destino_max || 5}</strong></div>
                                  <div><span className="text-white/40">RYO DOURADO:</span> <strong className="text-amber-300">{char.ryo_dourado ?? 20}</strong></div>
                                  <div><span className="text-white/40">DONO:</span> <span className="text-white/70 truncate">{char.email_dono || 'Sem e-mail'}</span></div>
                                  <div><span className="text-white/40">VERSÕES:</span> <span className="text-sky-300">{char.versao_ativa_id ? 'Modo Ativo' : 'Base'}</span></div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Destination Choice */}
                  <div className="pt-2 space-y-2">
                    <span className="text-[10px] font-black uppercase text-white/60 tracking-wider">
                      Onde deseja aplicar os dados importados?
                    </span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setImportModeChoice('OFFLINE')}
                        className={`p-3 border text-left transition ${
                          importModeChoice === 'OFFLINE'
                            ? 'bg-amber-950/30 border-amber-500 text-white'
                            : 'bg-black/40 border-white/10 text-white/50 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5 mb-1">
                          <HardDrive className="h-3.5 w-3.5" />
                          Modo Preparação (Offline)
                        </div>
                        <p className="text-[10px] text-white/60">
                          Carrega imediatamente no seu navegador sem gastar nenhuma cota do Firebase.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportModeChoice('CLOUD')}
                        className={`p-3 border text-left transition ${
                          importModeChoice === 'CLOUD'
                            ? 'bg-emerald-950/30 border-emerald-500 text-white'
                            : 'bg-black/40 border-white/10 text-white/50 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-black uppercase text-emerald-300 flex items-center gap-1.5 mb-1">
                          <RefreshCw className="h-3.5 w-3.5" />
                          Sincronizar na Nuvem (Firebase)
                        </div>
                        <p className="text-[10px] text-white/60">
                          Envia os dados para a nuvem para que todos os jogadores vejam ao vivo.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Apply Button */}
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={handleApplyImport}
                      disabled={isProcessingImport}
                      className="w-full py-3 px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black uppercase text-xs tracking-wider transition flex items-center justify-center gap-2 shadow-xl"
                    >
                      {isProcessingImport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span>
                        {isProcessingImport 
                          ? 'Aplicando Dados...' 
                          : importModeChoice === 'OFFLINE'
                            ? 'Aplicar no Modo Offline (Zero Cota)'
                            : 'Publicar e Sincronizar na Nuvem'
                        }
                      </span>
                    </button>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#121418] border-t border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/50 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Formato oficial de dados Telumak RPG. Seguro e sem perdas de atributos.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-black uppercase text-[10px] tracking-wider transition"
          >
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
}
