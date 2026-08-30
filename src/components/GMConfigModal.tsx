import React, { useState, useEffect } from 'react';
import { doc, updateDoc, setDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../firebase';
import { Character, UserProfile } from '../types';
import { 
  Sliders, X, Shield, Check, RefreshCw, 
  Search, Link as LinkIcon, Unlink, Crown, Users, Scroll, Plus, FileText,
  Image as ImageIcon, User, Save, Edit2
} from 'lucide-react';
import { ImageUploadField } from './ImageUploadField';
import { CampaignBackupModal } from './CampaignBackupModal';
import { handleFirestoreError, OperationType } from '../utils/errors';

interface GMConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  currentUserProfile?: UserProfile | null;
  onProfileUpdated?: (updated: UserProfile) => void;
  onOpenCreateCharModal?: () => void;
  onOpenImportPdfModal?: () => void;
  onOpenCampaignBackupModal?: () => void;
}

export function GMConfigModal({ 
  isOpen, 
  onClose, 
  characters, 
  currentUserProfile,
  onProfileUpdated,
  onOpenCreateCharModal, 
  onOpenImportPdfModal,
  onOpenCampaignBackupModal
}: GMConfigModalProps) {
  // Accounts and Permissions State
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [accountSearch, setAccountSearch] = useState('');
  const [accountActionMessage, setAccountActionMessage] = useState<string | null>(null);
  const [charLinkSelection, setCharLinkSelection] = useState<{ [uid: string]: string }>({});

  // System Logo Branding State
  const [systemLogo, setSystemLogo] = useState<string>('/telumak-logo.svg');
  const [isSavingLogo, setIsSavingLogo] = useState(false);

  // GM Profile State
  const [gmDisplayName, setGmDisplayName] = useState('');
  const [gmAvatarUrl, setGmAvatarUrl] = useState('');
  const [isSavingGmProfile, setIsSavingGmProfile] = useState(false);
  const [gmProfileSuccess, setGmProfileSuccess] = useState(false);
  const [gmProfileError, setGmProfileError] = useState('');

  useEffect(() => {
    if (currentUserProfile) {
      setGmDisplayName(currentUserProfile.displayName || currentUserProfile.discordDisplayName || '');
      setGmAvatarUrl(currentUserProfile.photoURL || currentUserProfile.discordAvatar || '');
    }
  }, [currentUserProfile, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // Subscribe to branding config
    const unsubLogo = onSnapshot(doc(db, 'config', 'branding'), (snap) => {
      if (snap.exists() && snap.data()?.logoUrl) {
        setSystemLogo(snap.data().logoUrl);
      } else {
        setSystemLogo('/telumak-logo.svg');
      }
    }, (err) => {
      console.warn("Erro ao buscar branding:", err);
    });

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

    return () => {
      unsubLogo();
      unsubUsers();
    };
  }, [isOpen]);

  const handleSaveLogo = async (newLogoUrl: string) => {
    if (!newLogoUrl) return;
    setIsSavingLogo(true);
    try {
      await setDoc(doc(db, 'config', 'branding'), {
        logoUrl: newLogoUrl,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setAccountActionMessage('✓ Logo do RPG Telumak atualizado com sucesso em todo o sistema!');
      setTimeout(() => setAccountActionMessage(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'config/branding');
    } finally {
      setIsSavingLogo(false);
    }
  };

  const handleResetLogo = async () => {
    const confirmReset = window.confirm("Deseja restaurar o logo padrão oficial do RPG Telumak?");
    if (!confirmReset) return;
    setIsSavingLogo(true);
    try {
      await setDoc(doc(db, 'config', 'branding'), {
        logoUrl: '/telumak-logo.svg',
        updatedAt: serverTimestamp()
      }, { merge: true });
      setAccountActionMessage('✓ Logo padrão oficial restaurado com sucesso!');
      setTimeout(() => setAccountActionMessage(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'config/branding');
    } finally {
      setIsSavingLogo(false);
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

  const handleSaveGmProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserProfile?.uid) return;

    setIsSavingGmProfile(true);
    setGmProfileError('');
    setGmProfileSuccess(false);

    try {
      const cleanName = gmDisplayName.trim() || 'Mestre (GM)';
      const cleanAvatar = gmAvatarUrl.trim() || null;

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: cleanName,
          photoURL: cleanAvatar
        });
      }

      const userRef = doc(db, 'users', currentUserProfile.uid);
      const updateData = {
        displayName: cleanName,
        photoURL: cleanAvatar,
        discordDisplayName: cleanName,
        discordAvatar: cleanAvatar
      };
      await updateDoc(userRef, updateData);

      if (onProfileUpdated) {
        onProfileUpdated({
          ...currentUserProfile,
          ...updateData
        });
      }

      setGmProfileSuccess(true);
      setTimeout(() => setGmProfileSuccess(false), 3500);
    } catch (err: any) {
      console.error('Erro ao salvar perfil do Mestre:', err);
      setGmProfileError(err.message || 'Falha ao salvar perfil.');
    } finally {
      setIsSavingGmProfile(false);
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
              <h2 className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
                <span>Painel de Configurações do Mestre (GM)</span>
                <span className="bg-blue-600/20 text-sky-400 border border-blue-500/30 text-[9px] px-2 py-0.5 font-mono">
                  CONTAS & FICHAS
                </span>
              </h2>
              <p className="text-[10px] text-sky-200/50 font-mono">
                Gerenciamento de permissões de usuários, atribuição de fichas e controle da mesa
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scroll">
          
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

              {onOpenImportPdfModal && (
                <button
                  type="button"
                  onClick={onOpenImportPdfModal}
                  className="bg-sky-900/60 hover:bg-sky-800/80 border border-sky-500/40 text-white p-3 flex flex-col items-center justify-center gap-1 transition shadow-lg text-center group"
                >
                  <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider text-sky-200">
                    <FileText className="h-4 w-4 text-sky-400 transition-transform group-hover:scale-125" />
                    <span>Importar PDF</span>
                  </div>
                  <span className="text-[9px] text-sky-300/80 font-mono">Ficha Sankötei Antiga</span>
                </button>
              )}
            </div>

            {/* Campaign Backup & Offline Management */}
            <div className="bg-[#080808] border border-blue-500/30 p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-sky-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Central de Campanha, Backup & Modo Offline
                  </h3>
                </div>
                <span className="text-[9px] text-sky-400 bg-sky-950/40 border border-sky-500/30 px-2 py-0.5 font-mono">
                  Zero Cota
                </span>
              </div>
              
              <p className="text-[10px] text-white/50 font-mono leading-relaxed">
                Exporte e importe backups completos em <strong>.JSON</strong> (Fichas de Jogadores com todos os atributos base, Catálogo de NPCs e Canais do Discord) ou ative o <strong>Modo Preparação (Offline)</strong> para trabalhar sem consumir o limite do Firebase.
              </p>

              {onOpenCampaignBackupModal && (
                <button
                  type="button"
                  onClick={onOpenCampaignBackupModal}
                  className="w-full sm:w-auto py-2.5 px-4 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/40 text-sky-300 text-[11px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2 shadow"
                >
                  <Shield className="h-3.5 w-3.5" />
                  Abrir Central de Campanha & Backups (.JSON)
                </button>
              )}
            </div>

            {/* GM Personal Profile & Display Name / Avatar */}
            {currentUserProfile && (
              <form onSubmit={handleSaveGmProfile} className="bg-[#080808] border border-blue-500/30 p-4 space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-sky-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      Meu Perfil de Mestre (Nickname & Avatar)
                    </h3>
                  </div>
                  <span className="text-[9px] text-sky-400 bg-sky-950/40 border border-sky-500/30 px-2 py-0.5 font-mono">
                    Sincronizado
                  </span>
                </div>

                {gmProfileSuccess && (
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>✓ Nickname e Avatar do Mestre atualizados com sucesso em todas as telas e no Discord!</span>
                  </div>
                )}

                {gmProfileError && (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
                    <X className="h-4 w-4 text-rose-400 shrink-0" />
                    <span>{gmProfileError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase text-white/70">
                      Nome de Exibição (Nick do Mestre)
                    </label>
                    <input
                      type="text"
                      value={gmDisplayName}
                      onChange={(e) => setGmDisplayName(e.target.value)}
                      placeholder="Ex: Mestre João, GM Alex..."
                      className="w-full bg-black border border-white/20 p-2.5 text-white text-xs focus:border-sky-400 focus:outline-none font-mono"
                    />
                    <p className="text-[9px] text-white/40 font-mono">
                      Este nome será refletido nas mensagens do Discord, no ícone inferior e na lista de membros.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <ImageUploadField
                      label="Avatar do Mestre (URL ou Upload)"
                      value={gmAvatarUrl}
                      onChange={(url) => setGmAvatarUrl(url)}
                      helperText="Cole a URL ou suba uma imagem quadrada"
                      aspectRatio="square"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSavingGmProfile}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition flex items-center gap-2 shadow"
                  >
                    {isSavingGmProfile ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        <span>Salvar Nick & Avatar</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="bg-[#080808] border border-blue-500/30 p-4 space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-sky-400" />
                    Identidade Visual & Logo do RPG TELUMAK
                  </h3>
                  <p className="text-[10px] text-white/50 font-mono mt-0.5">
                    Altere o logo oficial exibido na barra superior do navegador (favicon), na lateral do nome RPG TELUMAK e na tela de login.
                  </p>
                </div>

                {systemLogo && systemLogo !== '/telumak-logo.svg' && (
                  <button
                    type="button"
                    disabled={isSavingLogo}
                    onClick={handleResetLogo}
                    className="text-[10px] font-mono text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 transition"
                    title="Restaurar arquivo padrão telumak-logo.svg"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Restaurar Logo Padrão</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <ImageUploadField
                  label="Upload / Substituição do Logo (PNG, SVG, JPG, WEBP)"
                  value={systemLogo || '/telumak-logo.svg'}
                  onChange={handleSaveLogo}
                  maxWidth={512}
                  maxHeight={512}
                  aspectRatio="square"
                  helperText="Envie uma imagem com fundo transparente ou escuro. Ao enviar, o logo atualiza em tempo real para todos os jogadores, na barra do navegador e na barra de navegação."
                />

                {/* Live Preview Card */}
                <div className="bg-black/60 border border-white/10 p-3.5 flex flex-col items-center justify-center text-center space-y-2.5">
                  <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
                    Pré-visualização no Cabeçalho & Barra Superior
                  </span>
                  <div className="flex items-center gap-3 bg-[#0a0a0a] border border-blue-500/30 px-4 py-2.5 rounded shadow-lg">
                    <div className="w-10 h-10 rounded-full border border-blue-500/40 p-0.5 bg-black shrink-0 flex items-center justify-center overflow-hidden shadow-lg shadow-blue-500/10">
                      <img
                        src={systemLogo || '/telumak-logo.svg'}
                        alt="Logo Preview"
                        className="w-full h-full object-contain rounded-full"
                      />
                    </div>
                    <div className="text-left">
                      <span className="text-base font-black tracking-tighter uppercase italic text-white flex items-center gap-1 leading-none">
                        <span>RPG</span> <span className="text-blue-500">TELUMAK</span>
                      </span>
                      <span className="text-[8px] text-sky-400 font-mono tracking-widest mt-1 block">
                        👑 ESCUDO DO MESTRE • SISTEMA DIGITAL
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] text-emerald-400/80 font-mono">
                    ✓ Sincronização automática no Firestore & Favicon
                  </span>
                </div>
              </div>
            </div>

            {/* Accounts Search & List */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Shield className="h-4 w-4 text-sky-400" />
                    Contas Cadastradas & Vínculos de Fichas
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

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest transition shadow-lg"
          >
            Concluir
          </button>
        </div>

      </div>
    </div>
  );
}
