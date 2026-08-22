import React, { useState, useEffect, useRef } from 'react';
import { 
  db, 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile 
} from './firebase';
import { 
  collection, doc, setDoc, getDoc, onSnapshot, addDoc, serverTimestamp, query, orderBy, limit, deleteDoc, updateDoc
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  Plus, Trash2, LogOut, Heart, Shield, Swords, User as UserIcon, Send, EyeOff, Eye, LayoutGrid, Scroll, Flame, RefreshCw, Sparkles, BookOpen, UserPlus, Star, Sliders, Lock, HelpCircle, Settings, MessageSquareText, Bell
} from 'lucide-react';

import { Character, CustomStatusType, ChatMessage, CharVersion, UserProfile } from './types';
import { handleFirestoreError, OperationType } from './utils/errors';
import { DiceTray } from './components/DiceTray';
import { CharacterSheet } from './components/CharacterSheet';
import { BattleMap } from './components/BattleMap';
import { DiscordNotebook } from './components/DiscordNotebook';
import { GMConfigModal } from './components/GMConfigModal';
import { PlayerConfigModal } from './components/PlayerConfigModal';
import { ImageUploadField } from './components/ImageUploadField';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Firestore Sync State
  const [characters, setCharacters] = useState<Character[]>([]);
  const [statuses, setStatuses] = useState<CustomStatusType[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [versionsMap, setVersionsMap] = useState<{ [charId: string]: CharVersion[] }>({});

  // Navigation State
  const [currentTab, setCurrentTab] = useState<'personagens' | 'arena' | 'notebook'>('personagens');
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);

  // GM & Player Config Modal State
  const [showGMConfig, setShowGMConfig] = useState(false);
  const [showPlayerConfig, setShowPlayerConfig] = useState(false);

  // 30s Polling / Sheet Update Detection for Players
  const [hasSheetUpdateAlert, setHasSheetUpdateAlert] = useState(false);
  const [lastAckedCharSnapshot, setLastAckedCharSnapshot] = useState<string>('');
  const lastCheckTimeRef = useRef<number>(Date.now());

  // Email/Password Authentication state variables
  const [authTab, setAuthTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [gmSecretKey, setGmSecretKey] = useState('');
  const [authError, setAuthError] = useState('');

  // Chat panel states
  const [chatMessageText, setChatMessageText] = useState('');
  const [whisperTarget, setWhisperTarget] = useState<'TODOS' | 'GM' | string>('TODOS');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Character creation modal/form state (GM and Players)
  const [showCreateCharForm, setShowCreateCharForm] = useState(false);
  const [newCharNome, setNewCharNome] = useState('');
  const [newCharEmail, setNewCharEmail] = useState('');
  const [newCharCla, setNewCharCla] = useState('');
  const [newCharOcupacao, setNewCharOcupacao] = useState('');
  const [newCharNivel, setNewCharNivel] = useState(1);
  const [newCharImg, setNewCharImg] = useState('');

  // Combat status variables for editing (Quick stat adjustments form)
  const [editingStatsCharId, setEditingStatsCharId] = useState<string | null>(null);
  const [editHpMax, setEditHpMax] = useState(100);
  const [editEtherMax, setEditEtherMax] = useState(50);
  const [editDestinoMax, setEditDestinoMax] = useState(5);
  const [editFis, setEditFis] = useState(10);
  const [editDes, setEditDes] = useState(10);
  const [editCog, setEditCog] = useState(10);
  const [editCar, setEditCar] = useState(10);
  const [editPri, setEditPri] = useState(1);
  const [editToolFis, setEditToolFis] = useState(0);
  const [editToolDes, setEditToolDes] = useState(0);
  const [editToolCog, setEditToolCog] = useState(0);
  const [editToolCar, setEditToolCar] = useState(0);
  const [editEmailDono, setEditEmailDono] = useState('');

  // Auth monitoring listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Ensure standard profile exists
        const userRef = doc(db, 'users', user.uid);
        const userPath = `users/${user.uid}`;
        try {
          const userSnap = await getDoc(userRef);
          let profile: UserProfile;

          if (!userSnap.exists()) {
            profile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'Gamer',
              photoURL: user.photoURL || null,
              role: (user.email === 'leaog.8@gmail.com') ? 'GM' : 'PLAYER'
            };
            await setDoc(userRef, profile);
          } else {
            profile = userSnap.data() as UserProfile;
            if (user.email === 'leaog.8@gmail.com' && profile.role !== 'GM') {
              profile.role = 'GM';
              await setDoc(userRef, { ...profile, role: 'GM' }, { merge: true });
            }
          }
          setUserProfile(profile);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, userPath);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setAuthLoading(false);
    });

    return unsub;
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Preencha seu e-mail e sua senha de conjuração.');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
    } catch (err: any) {
      setAuthError(translateAuthError(err?.code || err?.message || 'Erro desconhecido'));
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authEmail.trim() || !authPassword.trim() || !authDisplayName.trim()) {
      setAuthError('Todos os campos obrigatórios precisam estar preenchidos!');
      return;
    }
    try {
      const userCred = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
      if (userCred.user) {
        await updateProfile(userCred.user, {
          displayName: authDisplayName.trim()
        });

        const isSecretGM = gmSecretKey.trim().toUpperCase() === 'TELUMAK_GM';
        const userRef = doc(db, 'users', userCred.user.uid);
        const profile: UserProfile = {
          uid: userCred.user.uid,
          email: userCred.user.email || '',
          displayName: authDisplayName.trim(),
          photoURL: null,
          role: (isSecretGM || userCred.user.email === 'leaog.8@gmail.com') ? 'GM' : 'PLAYER'
        };
        await setDoc(userRef, profile);
        setUserProfile(profile);
      }
    } catch (err: any) {
      setAuthError(translateAuthError(err?.code || err?.message || 'Erro desconhecido'));
    }
  };

  const translateAuthError = (code: string) => {
    switch (code) {
      case 'auth/invalid-email': return 'E-mail inválido ou mal formatado.';
      case 'auth/wrong-password': return 'Senha incorreta.';
      case 'auth/user-not-found': return 'Nenhum jogador encontrado com este e-mail.';
      case 'auth/email-already-in-use': return 'Este e-mail já está em uso por outro grimório.';
      case 'auth/weak-password': return 'A senha deve conter no mínimo 6 caracteres.';
      case 'auth/invalid-credential': return 'Par de login e senha incorretos.';
      default: return 'Falha na autenticação: ' + code;
    }
  };

  // Sync core Firestore arrays in real-time
  useEffect(() => {
    if (!currentUser) return;

    // 1. Sync Characters
    const charsPath = 'characters';
    const unsubChars = onSnapshot(collection(db, charsPath), (snap) => {
      const list: Character[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Character);
      });
      setCharacters(list);

      // Select default character if Player has only one
      const myChars = list.filter(c => c.email_dono === currentUser.email);
      if (userProfile?.role === 'PLAYER' && myChars.length > 0 && !selectedCharId) {
        setSelectedCharId(myChars[0].id);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, charsPath);
    });

    // 2. Sync Chat Messages
    const msgsPath = 'messages';
    const qMsgs = query(collection(db, msgsPath), orderBy('createdAt', 'asc'), limit(50));
    const unsubMsgs = onSnapshot(qMsgs, (snap) => {
      const list: ChatMessage[] = [];
      snap.forEach(d => {
        const item = d.data();
        list.push({ id: d.id, ...item } as ChatMessage);
      });
      setMessages(list);
      
      // Auto-scroll chat window to bottom
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, msgsPath);
    });

    // 3. Sync Custom Status Types
    const statusPath = 'statuses';
    const unsubStatus = onSnapshot(collection(db, statusPath), (snap) => {
      const list: CustomStatusType[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as CustomStatusType);
      });
      setStatuses(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, statusPath);
    });

    return () => {
      unsubChars();
      unsubMsgs();
      unsubStatus();
    };
  }, [currentUser, userProfile?.role]);

  // Sync alternative Sheet Versions (Transformations) for all selected characters
  useEffect(() => {
    if (characters.length === 0) return;
    
    const unsubs = characters.map(c => {
      const verPath = `characters/${c.id}/versions`;
      return onSnapshot(collection(db, 'characters', c.id, 'versions'), (snap) => {
        const list: CharVersion[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as CharVersion);
        });
        setVersionsMap(prev => ({ ...prev, [c.id]: list }));
      }, (err) => {
        console.warn(`Could not sync versions for character ${c.id}:`, err);
      });
    });

    return () => unsubs.forEach(fn => fn());
  }, [characters]);

  // 30s Polling Check for Player Character Sheet Changes
  useEffect(() => {
    if (userProfile?.role === 'GM' || !currentUser) return;

    const myChar = characters.find(c => c.email_dono === currentUser.email);
    if (!myChar) return;

    const currentCharString = JSON.stringify({
      hp_atual: myChar.hp_atual,
      hp_max: myChar.hp_max,
      ether_atual: myChar.ether_atual,
      ether_max: myChar.ether_max,
      destino_atual: myChar.destino_atual,
      destino_max: myChar.destino_max,
      fisico: myChar.fisico,
      destreza: myChar.destreza,
      cognicao: myChar.cognicao,
      carisma: myChar.carisma,
      primordio: myChar.primordio,
      nivel: myChar.nivel,
      status_ativos: myChar.status_ativos,
      html_ataques: myChar.html_ataques,
      html_dons: myChar.html_dons,
      html_equipamentos: myChar.html_equipamentos,
      html_defesa: myChar.html_defesa,
    });

    // Initialize initial snapshot
    if (!lastAckedCharSnapshot) {
      setLastAckedCharSnapshot(currentCharString);
      return;
    }

    // Check if changed
    if (currentCharString !== lastAckedCharSnapshot) {
      setHasSheetUpdateAlert(true);
    }

    // Set 30s interval for active polling alert
    const interval = setInterval(() => {
      if (currentCharString !== lastAckedCharSnapshot) {
        setHasSheetUpdateAlert(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [characters, currentUser, userProfile?.role, lastAckedCharSnapshot]);

  const handleAcknowledgeSheetUpdate = () => {
    const myChar = characters.find(c => c.email_dono === currentUser?.email);
    if (myChar) {
      const currentCharString = JSON.stringify({
        hp_atual: myChar.hp_atual,
        hp_max: myChar.hp_max,
        ether_atual: myChar.ether_atual,
        ether_max: myChar.ether_max,
        destino_atual: myChar.destino_atual,
        destino_max: myChar.destino_max,
        fisico: myChar.fisico,
        destreza: myChar.destreza,
        cognicao: myChar.cognicao,
        carisma: myChar.carisma,
        primordio: myChar.primordio,
        nivel: myChar.nivel,
        status_ativos: myChar.status_ativos,
        html_ataques: myChar.html_ataques,
        html_dons: myChar.html_dons,
        html_equipamentos: myChar.html_equipamentos,
        html_defesa: myChar.html_defesa,
      });
      setLastAckedCharSnapshot(currentCharString);
      setSelectedCharId(myChar.id);
    }
    setCurrentTab('personagens');
    setHasSheetUpdateAlert(false);
  };

  // User Actions
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      alert('Erro ao entrar com o Google: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleLogout = async () => {
    if (confirm('Deseja realmente sair da sessão RPG?')) {
      await signOut(auth);
      setSelectedCharId(null);
    }
  };

  const handleCreateNewCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharNome.trim()) return;

    // Create unique ID for sheet
    const id = `char_${Date.now()}`;
    const emailDono = newCharEmail.trim() || currentUser?.email || '';

    const newChar: Character = {
      id,
      email_dono: emailDono.toLowerCase(),
      nome: newCharNome.trim(),
      cla: newCharCla.trim() || 'Desconhecido',
      ocupacao: newCharOcupacao.trim() || 'Nenhuma',
      nivel: Number(newCharNivel),
      hp_atual: 100,
      hp_max: 100,
      ether_atual: 50,
      ether_max: 50,
      destino_atual: 5,
      destino_max: 5,
      
      fisico: 10,
      destreza: 10,
      cognicao: 10,
      carisma: 10,
      primordio: 1,

      ferramenta_fisico: 0,
      ferramenta_destreza: 0,
      ferramenta_cognicao: 0,
      ferramenta_carisma: 0,

      img_saudavel: newCharImg.trim() || 'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?auto=format&fit=crop&w=300&q=80',
      img_ferido: '',
      img_muito_ferido: '',
      
      html_ataques: '<b>Ataque Desarmado</b>: FIS + Ferramenta Físico. Causa 1d6 de dano.',
      html_dons: '<b>Poder Primordial</b>: use Éter para amplificar seu primórdio por 1 rodada.',
      html_equipamentos: 'Colete de Couro leve (+2 Defesa). Mochila de viagem.',
      html_defesa: '<b>Desespero de Esquiva</b>: role DES para anular dano físico recebido.',
      
      status_ativos: [],
      ativo_na_mesa: false
    };

    const docPath = `characters/${id}`;
    try {
      await setDoc(doc(db, 'characters', id), newChar);
      setNewCharNome('');
      setNewCharEmail('');
      setNewCharCla('');
      setNewCharOcupacao('');
      setNewCharNivel(1);
      setNewCharImg('');
      setShowCreateCharForm(false);
      setSelectedCharId(id);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  };

  const handleToggleCombatOnBoard = async (char: Character) => {
    const docPath = `characters/${char.id}`;
    try {
      await updateDoc(doc(db, 'characters', char.id), {
        ativo_na_mesa: !char.ativo_na_mesa
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  };

  const handleSendChatMessage = async (e?: React.FormEvent, directText?: string) => {
    if (e) e.preventDefault();
    const finalMsg = directText || chatMessageText.trim();
    if (!finalMsg) return;

    // Resolve speaker name based on current character or role
    let remetente = userProfile?.displayName || 'Jogador';
    if (userProfile?.role === 'GM') {
      remetente = 'MESTRE GM 🛡️';
    } else {
      const activeChar = characters.find(c => c.id === selectedCharId);
      if (activeChar) remetente = activeChar.nome;
    }

    const type: ChatMessage['tipo'] = finalMsg.includes('dice-roll-block') ? 'ROLL' : whisperTarget === 'TODOS' ? 'CHAT' : 'WHISPER';

    const newMessage = {
      remetente,
      remetente_email: currentUser?.email || '',
      destinatario: whisperTarget,
      tipo: type,
      conteudo: finalMsg,
      createdAt: serverTimestamp()
    };

    const path = 'messages';
    try {
      await addDoc(collection(db, 'messages'), newMessage);
      if (!directText) setChatMessageText('');
      
      // Envia para o Discord se for mensagem pública
      if (type === 'CHAT') {
        fetch('/api/discord/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            remetente: newMessage.remetente,
            conteudo: newMessage.conteudo
          })
        }).catch(err => console.error("Erro ao notificar Discord:", err));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDeleteAllChat = async () => {
    if (!confirm('Esta ação apagará todo o registro histórico de conversas do chat RPG. Deseja prosseguir?')) return;
    const path = 'messages';
    try {
      for (const msg of messages) {
        await deleteDoc(doc(db, 'messages', msg.id));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleToggleHideMessage = async (msgId: string, currentHiddenStatus: boolean) => {
    const docPath = `messages/${msgId}`;
    try {
      await updateDoc(doc(db, 'messages', msgId), {
        ocultada: !currentHiddenStatus
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  };

  // Open Quick stat adjuster for GM
  const setupQuickStatsEditor = (char: Character) => {
    setEditingStatsCharId(char.id);
    setEditHpMax(char.hp_max);
    setEditEtherMax(char.ether_max);
    setEditDestinoMax(char.destino_max);
    setEditFis(char.fisico);
    setEditDes(char.destreza);
    setEditCog(char.cognicao);
    setEditCar(char.carisma);
    setEditPri(char.primordio);
    setEditToolFis(char.ferramenta_fisico || 0);
    setEditToolDes(char.ferramenta_destreza || 0);
    setEditToolCog(char.ferramenta_cognicao || 0);
    setEditToolCar(char.ferramenta_carisma || 0);
    setEditEmailDono(char.email_dono || '');
  };

  const handleSaveQuickStats = async () => {
    if (!editingStatsCharId) return;
    const path = `characters/${editingStatsCharId}`;
    try {
      await updateDoc(doc(db, 'characters', editingStatsCharId), {
        hp_max: editHpMax,
        ether_max: editEtherMax,
        destino_max: editDestinoMax,
        fisico: editFis,
        destreza: editDes,
        cognicao: editCog,
        carisma: editCar,
        primordio: editPri,
        ferramenta_fisico: editToolFis,
        ferramenta_destreza: editToolDes,
        ferramenta_cognicao: editToolCog,
        ferramenta_carisma: editToolCar,
        email_dono: editEmailDono.trim().toLowerCase()
      });
      setEditingStatsCharId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const isGM = userProfile?.role === 'GM';
  const myCharactersList = characters.filter(c => c.email_dono === currentUser?.email);
  const mestreMesaRoster = characters.filter(c => c.ativo_na_mesa);
  const currentSelectedCharacter = characters.find(c => c.id === selectedCharId) || (myCharactersList.length > 0 ? myCharactersList[0] : null);
  const activeCharVersionsList = currentSelectedCharacter ? versionsMap[currentSelectedCharacter.id] || [] : [];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono tracking-widest uppercase text-white/50">Sintonizando Grimório...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0a0a0a] border border-white/10 p-8 shadow-2xl relative">
          
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black italic tracking-tighter uppercase text-white mb-1">
              TELUMAK <span className="text-orange-500">RPG</span>
            </h1>
            <p className="text-[10px] uppercase font-mono tracking-widest text-white/40">Sistema Digital de Mesa e Fichas</p>
          </div>

          <div className="flex border-b border-white/10 mb-6">
            <button
              onClick={() => { setAuthTab('LOGIN'); setAuthError(''); }}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                authTab === 'LOGIN' ? 'bg-orange-500 text-white' : 'text-white/40 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setAuthTab('REGISTER'); setAuthError(''); }}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                authTab === 'REGISTER' ? 'bg-orange-500 text-white' : 'text-white/40 hover:text-white'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {authError && (
            <div className="mb-4 bg-rose-950/20 border border-rose-500/30 text-rose-400 p-2 text-[11px] font-semibold text-center uppercase tracking-wider leading-relaxed">
              ⚠️ {authError}
            </div>
          )}

          {authTab === 'LOGIN' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[9px] text-white/40 font-black uppercase tracking-widest">E-mail do Jogador</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="seu-email@telumak.com"
                  className="w-full bg-[#050505] border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 rounded-none placeholder-white/10 animate-fade-in"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] text-white/40 font-black uppercase tracking-widest">Senha de Conjuração</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="******"
                  className="w-full bg-[#050505] border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 rounded-none placeholder-white/10"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-[10px] tracking-widest py-3 transition-all duration-150 rounded-none"
              >
                Confirmar Entrada
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[9px] text-white/40 font-black uppercase tracking-widest">Nome do Herói</label>
                  <input
                    type="text"
                    value={authDisplayName}
                    onChange={e => setAuthDisplayName(e.target.value)}
                    placeholder="Guerreiro"
                    className="w-full bg-[#050505] border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 rounded-none placeholder-white/10"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] text-white/40 font-black uppercase tracking-widest flex items-center gap-1">Chave GM <HelpCircle className="h-2.5 w-2.5 text-orange-400" title="Insira 'TELUMAK_GM' para se registrar como Mestre de jogo instantaneamente." /></label>
                  <input
                    type="text"
                    value={gmSecretKey}
                    onChange={e => setGmSecretKey(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-[#050505] border border-white/10 px-3 py-2.5 text-xs text-orange-400 focus:outline-none focus:border-orange-500 rounded-none placeholder-white/10"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] text-white/40 font-black uppercase tracking-widest">E-mail de Inscrição</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="seu-email@telumak.com"
                  className="w-full bg-[#050505] border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 rounded-none placeholder-white/10"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] text-white/40 font-black uppercase tracking-widest">Senha (Min. 6 caracteres)</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="******"
                  className="w-full bg-[#050505] border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 rounded-none placeholder-white/10"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-[10px] tracking-widest py-3 transition-all duration-150 rounded-none"
              >
                Completar Cadastro
              </button>
            </form>
          )}

          <div className="flex items-center gap-3 my-5">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-[8px] text-white/30 font-black uppercase tracking-[0.2em]">Ou</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          <button
            onClick={handleLogin}
            type="button"
            className="w-full bg-white text-black hover:bg-orange-500 hover:text-white font-black uppercase text-[10px] tracking-widest py-3 px-4 transition-colors duration-150 flex items-center justify-center gap-3 shadow active:scale-95 rounded-none"
          >
            <svg className="h-3.5 w-3.5 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3.6 4.5 1.6l2.4-2.4C17.3 1.5 14.9 1 12.24 1 6.137 1 1.24 5.9 1.24 12s4.897 11 11 11c5.93 0 10.518-4.14 10.518-10.5 0-.714-.07-1.41-.2-2.215H12.24z"/>
            </svg>
            Sincronizar com o Google
          </button>

          <p className="text-[8px] text-white/20 font-black tracking-widest uppercase mt-6 text-center">TELUMAK RPG SYSTEM</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col justify-between text-white font-sans overflow-x-hidden">
      
      {/* GLOBAL NAVBAR */}
      <nav className="no-print bg-[#0a0a0a] border-b border-white/10 p-4 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
          
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black tracking-tighter uppercase italic leading-none text-white">
              TELUMAK <span className="text-orange-500">RPG</span>
            </span>
            <div className="h-6 w-px bg-white/10 hidden sm:block"></div>
            <div className="text-center sm:text-left">
              <span className="text-[10px] block text-white/40 font-bold uppercase tracking-widest leading-none">
                {isGM ? '👑 Escudo do Mestre' : '🛡️ Portal do Jogador'}
              </span>
              <p className="text-[10px] font-mono text-orange-500 mt-1 uppercase tracking-wider">{currentUser?.email}</p>
            </div>
          </div>

          {/* Quick Navigation Tabs Switches */}
          <div className="flex gap-1 select-none bg-black border border-white/10 p-1">
            <button
              onClick={() => {
                setCurrentTab('personagens');
                setShowCreateCharForm(false);
              }}
              className={`flex items-center gap-1.5 px-5 py-2 text-xs font-black uppercase tracking-widest transition duration-150 ${
                currentTab === 'personagens' ? 'bg-orange-500 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <Scroll className="h-3.5 w-3.5" />
              Fichas
            </button>

            <button
              onClick={() => setCurrentTab('arena')}
              className={`flex items-center gap-1.5 px-5 py-2 text-xs font-black uppercase tracking-widest transition duration-150 ${
                currentTab === 'arena' ? 'bg-orange-500 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Arena Grid
            </button>

            <button
              onClick={() => setCurrentTab('notebook')}
              className={`flex items-center gap-1.5 px-5 py-2 text-xs font-black uppercase tracking-widest transition duration-150 ${
                currentTab === 'notebook' ? 'bg-orange-500 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageSquareText className="h-3.5 w-3.5" />
              Notebook
            </button>
          </div>

          {/* GM / Player Config & User Actions */}
          <div className="flex items-center gap-3">
            {isGM ? (
              <button
                onClick={() => setShowGMConfig(true)}
                className="flex items-center gap-1.5 bg-[#151515] hover:bg-[#202020] text-orange-400 border border-orange-500/30 px-3 py-1.5 text-xs font-black uppercase tracking-wider transition shadow"
                title="Configurações de Canais do Discord e Mesa"
              >
                <Settings className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Config GM</span>
              </button>
            ) : (
              <button
                onClick={() => setShowPlayerConfig(true)}
                className="flex items-center gap-1.5 bg-[#151515] hover:bg-[#202020] text-orange-400 border border-orange-500/30 px-3 py-1.5 text-xs font-black uppercase tracking-wider transition shadow"
                title="Meu Perfil, Avatar e Segurança"
              >
                <Settings className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Meu Perfil</span>
              </button>
            )}

            <span className="text-[10px] bg-orange-500/10 font-bold tracking-widest text-orange-500 border border-orange-500/20 rounded px-2.5 py-1">
              {userProfile?.role || 'PLAYER'}
            </span>
            <button
              onClick={handleLogout}
              className="text-white/40 hover:text-orange-500 transition-colors"
              title="Encerrar Sessão"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>

        </div>
      </nav>

      {/* DISCORD NOTEBOOK TAB */}
      {currentTab === 'notebook' && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 no-print">
          <DiscordNotebook
            isGM={isGM}
            currentUserProfile={userProfile}
            characters={characters}
          />
        </div>
      )}

      {/* TACTICAL BATTLE MAP TAB */}
      {currentTab === 'arena' && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 no-print">
          <BattleMap
            isGM={isGM}
            currentUserEmail={currentUser.email || ''}
            characters={characters}
          />
        </div>
      )}

      {/* CORE CHARACTERS PORTAL TAB AND SIDEBARS */}
      {currentTab === 'personagens' && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
          
          {/* LEFT SIDEBAR: ACTIVE SESSION COMBAT PANEL AND CHARACTERS GUIDE */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick mesa additions */}
            <div className="bg-[#080808] border border-white/10 rounded-none p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex flex-col">
                  <h3 className="text-3xl font-black uppercase tracking-tighter leading-none text-white italic">
                    Mesa
                  </h3>
                  <p className="text-[10px] uppercase tracking-widest text-orange-500 mt-1 font-bold">Combate ({mestreMesaRoster.length})</p>
                </div>
                {isGM && (
                  <button
                    onClick={() => setShowCreateCharForm(!showCreateCharForm)}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest transition-colors duration-150"
                  >
                    + Criar Novo
                  </button>
                )}
              </div>

              {/* Spawn Form Overlay inside widget */}
              {showCreateCharForm && (
                <form onSubmit={handleCreateNewCharacter} className="bg-black border border-orange-500/30 p-4 space-y-3 animate-in fade-in">
                  <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest italic">Modelar Nova Alma RPG</p>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Nome do Personagem"
                      value={newCharNome}
                      onChange={e => setNewCharNome(e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500 font-sans"
                      required
                    />
                    {isGM && (
                      <input
                        type="email"
                        placeholder="Email Dono (Vazio = GM)"
                        value={newCharEmail}
                        onChange={e => setNewCharEmail(e.target.value)}
                        className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-orange-500"
                      />
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Clã"
                        value={newCharCla}
                        onChange={e => setNewCharCla(e.target.value)}
                        className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500 font-sans"
                      />
                      <input
                        type="text"
                        placeholder="Ocupação"
                        value={newCharOcupacao}
                        onChange={e => setNewCharOcupacao(e.target.value)}
                        className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500 font-sans"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Nível"
                        value={newCharNivel}
                        onChange={e => setNewCharNivel(Number(e.target.value))}
                        className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-orange-500"
                        min="1"
                      />
                    </div>
                    
                    {/* Direct File Upload for Character Avatar */}
                    <ImageUploadField
                      label="Foto do Personagem (Upload do Computador)"
                      value={newCharImg}
                      onChange={setNewCharImg}
                      helperText="Envie a foto do herói direto do seu dispositivo"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCreateCharForm(false)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                    >
                      Concluir
                    </button>
                  </div>
                </form>
              )}

              {/* Characters Guide List inside sidebar */}
              <div className="space-y-4 max-h-[380px] overflow-y-auto custom-scroll pr-1">
                
                {/* Renders player's own characters first */}
                {!isGM && myCharactersList.length > 0 && (
                  <div className="space-y-2">
                    <span className="block text-[9px] text-[#ffffff]/30 font-black uppercase tracking-widest mb-2">Minhas Fichas</span>
                    {myCharactersList.map(c => {
                      const isActiveOnBoard = c.ativo_na_mesa;
                      const isSelected = selectedCharId === c.id;
                      return (
                        <div
                          key={c.id}
                          className={`p-3 border text-left transition duration-150 flex items-center justify-between ${
                            isSelected 
                              ? 'bg-white/10 border-orange-500/60 shadow-lg' 
                              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                          }`}
                        >
                          <button
                            onClick={() => setSelectedCharId(c.id)}
                            className="flex items-center gap-2.5 flex-1 text-left select-none min-w-0"
                          >
                            <img src={c.img_saudavel} alt={c.nome} className="w-8 h-8 rounded-none object-cover border border-white/10 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-extrabold text-xs text-white truncate block uppercase tracking-tight">{c.nome}</span>
                              <span className="text-[9px] text-orange-500 font-mono tracking-widest uppercase block">Nível {c.nivel}</span>
                            </div>
                          </button>
                          
                          <button
                            onClick={() => handleToggleCombatOnBoard(c)}
                            className={`text-[9px] font-black uppercase tracking-widest py-1.5 px-3 border transition-all shrink-0 ${
                              isActiveOnBoard
                                ? 'bg-orange-500/10 border-orange-500/40 text-orange-400'
                                : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {isActiveOnBoard ? 'Mesa' : 'Conectar'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Renders GM full controls or spectator view */}
                {isGM ? (
                  <div className="space-y-2">
                    <span className="block text-[9px] text-white/30 font-black uppercase tracking-widest mb-2">Heróis & Guildas Registrados</span>
                    {characters.map(c => {
                      const isActiveOnBoard = c.ativo_na_mesa;
                      const isSelected = selectedCharId === c.id;
                      return (
                        <div
                          key={c.id}
                          className={`p-3 border transition duration-150 flex items-center justify-between gap-1.5 ${
                            isSelected 
                              ? 'bg-white/10 border-orange-500/40' 
                              : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <button
                            style={{ width: '60%' }}
                            onClick={() => setSelectedCharId(c.id)}
                            className="flex items-center gap-2.5 text-left min-w-0"
                          >
                            <img src={c.img_saudavel} alt={c.nome} className="w-8 h-8 rounded-none object-cover border border-white/10 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-extrabold text-xs text-white truncate block uppercase tracking-tight">{c.nome}</span>
                              <span className="text-[9px] text-[#ffffff]/40 truncate block font-mono">{c.email_dono}</span>
                            </div>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setupQuickStatsEditor(c)}
                              className="p-1.5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                              title="Ajustar Stats do Jogador"
                            >
                              <Sliders className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => handleToggleCombatOnBoard(c)}
                              className={`text-[9px] font-black uppercase tracking-widest py-1.5 px-3 border transition-colors ${
                                isActiveOnBoard
                                    ? 'bg-orange-500 text-white border-orange-500'
                                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/15'
                              }`}
                            >
                              {isActiveOnBoard ? 'Mesa' : '+ Mesa'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  myCharactersList.length === 0 && (
                    <div className="p-5 border border-dashed border-white/10 text-center text-white/40 italic text-xs leading-relaxed bg-black/30">
                      Nenhum herói sintonizado a esta conta.<br />
                      <span className="text-[10px] text-orange-400 font-extrabold uppercase tracking-widest block mt-1.5">Apresente seu E-mail ao Mestre:</span>
                      <span className="text-[9px] text-white/60 font-mono select-all block bg-[#050505] border border-white/5 py-1.5 px-2 mt-2 tracking-wide font-normal">{currentUser.email}</span>
                    </div>
                  )
                )}

                {characters.length === 0 && (
                  <p className="text-xs text-white/40 italic py-4 text-center">Nenhum aventureiro em Telumak.</p>
                )}

              </div>
            </div>

            {/* QUICK STAT ADJUSTER SHEET MODAL FOR GM */}
            {editingStatsCharId && isGM && (
              <div className="bg-[#080808] border border-orange-500/40 p-6 space-y-4 shadow-2xl relative">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <h4 className="text-sm font-black uppercase tracking-widest text-orange-500 italic">Atributos do Mestre</h4>
                  <button onClick={() => setEditingStatsCharId(null)} className="text-white/40 hover:text-white transition-all text-xs font-black uppercase tracking-wider">Fechar</button>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] text-[#ffffff]/50 font-black uppercase tracking-widest mb-1">Hp Max</label>
                    <input type="number" value={editHpMax} onChange={e => setEditHpMax(Number(e.target.value))} className="w-full bg-[#050505] text-white border border-white/10 px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[#ffffff]/50 font-black uppercase tracking-widest mb-1">Éter Max</label>
                    <input type="number" value={editEtherMax} onChange={e => setEditEtherMax(Number(e.target.value))} className="w-full bg-[#050505] text-white border border-white/10 px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[#ffffff]/50 font-black uppercase tracking-widest mb-1">Dest Max</label>
                    <input type="number" value={editDestinoMax} onChange={e => setEditDestinoMax(Number(e.target.value))} className="w-full bg-[#050505] text-white border border-white/10 px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-orange-500" />
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5 text-center">
                  <div>
                    <label className="block text-[9px] text-[#ffffff]/40 font-black uppercase mb-1">FIS</label>
                    <input type="number" value={editFis} onChange={e => setEditFis(Number(e.target.value))} className="w-full text-center bg-[#050505] text-white border border-white/10 px-1 py-1.5 text-xs font-mono focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[#ffffff]/40 font-black uppercase mb-1">DES</label>
                    <input type="number" value={editDes} onChange={e => setEditDes(Number(e.target.value))} className="w-full text-center bg-[#050505] text-white border border-white/10 px-1 py-1.5 text-xs font-mono focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[#ffffff]/40 font-black uppercase mb-1">COG</label>
                    <input type="number" value={editCog} onChange={e => setEditCog(Number(e.target.value))} className="w-full text-center bg-[#050505] text-white border border-white/10 px-1 py-1.5 text-xs font-mono focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[#ffffff]/40 font-black uppercase mb-1">CAR</label>
                    <input type="number" value={editCar} onChange={e => setEditCar(Number(e.target.value))} className="w-full text-center bg-[#050505] text-white border border-white/10 px-1 py-1.5 text-xs font-mono focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-orange-500 font-black uppercase mb-1">PRI</label>
                    <input type="number" value={editPri} onChange={e => setEditPri(Number(e.target.value))} className="w-full text-center bg-[#050505] text-orange-500 border border-orange-500/20 px-1 py-1.5 text-xs font-mono focus:outline-none focus:border-orange-500" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] text-[#ffffff]/50 font-black uppercase tracking-widest">E-mail do Jogador Dono (Acesso)</label>
                  <input 
                    type="text" 
                    value={editEmailDono} 
                    onChange={e => setEditEmailDono(e.target.value)} 
                    placeholder="email-do-jogador@telumak.com" 
                    className="w-full bg-[#050505] text-white border border-white/10 px-3 py-1.5 text-xs focus:outline-none focus:border-orange-500 rounded-none placeholder-white/10" 
                  />
                  <p className="text-[8px] text-white/30 font-semibold leading-normal">
                    Associe esta ficha ao e-mail do respectivo jogador para torná-la visível apenas a ele na mesa.
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                  <button onClick={() => setEditingStatsCharId(null)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold uppercase tracking-wider">Sair</button>
                  <button onClick={handleSaveQuickStats} className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest transition-colors duration-150 shadow-md">Salvar</button>
                </div>
              </div>
            )}

          </div>

          {/* CENTRE PANEL: DETAILS AND HERO SHEET EXPORTER */}
          <div className="lg:col-span-8 space-y-6">
            
            {currentSelectedCharacter ? (
              <CharacterSheet
                character={currentSelectedCharacter}
                isGM={isGM}
                isOwner={currentSelectedCharacter.email_dono === currentUser.email}
                statuses={statuses}
                versions={activeCharVersionsList}
              />
            ) : (
              <div className="bg-[#080808] border border-white/10 p-10 text-center shadow-2xl flex flex-col items-center justify-center min-h-[300px]">
                <BookOpen className="h-12 w-12 text-white/20 mb-3" />
                <h3 className="text-2xl font-black uppercase tracking-tighter leading-none text-white italic">Grimório Vazio</h3>
                <p className="text-xs text-white/50 max-w-xs leading-relaxed mt-1">
                  Selecione uma ficha de aventureiro na barra lateral para analisar detalhes e exportar seu PDF.
                </p>
              </div>
            )}

            {/* TACTICAL GAME CHAT PLATFORM WITH DICE ROLLS */}
            <div className="bg-[#0a0a0a] border border-white/10 shadow-2xl flex flex-col h-[540px]">
              
              {/* Chat Title panel */}
              <div className="bg-black/90 p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-none bg-orange-500 animate-bounce"></span>
                  <span className="text-sm font-black uppercase tracking-tighter text-white italic">Game Chat <span className="text-orange-500 font-mono">_LOG</span></span>
                </div>
                {isGM && (
                  <button
                    onClick={handleDeleteAllChat}
                    className="text-[10px] font-black uppercase tracking-widest text-[#ffffff]/35 hover:text-red-500 transition-colors"
                    title="Limpar Histórico"
                  >
                    Excluir Log
                  </button>
                )}
              </div>

              {/* Message Registry */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scroll bg-black/40">
                {messages.map(msg => {
                  const isRoll = msg.tipo === 'ROLL';
                  const isWhisper = msg.tipo === 'WHISPER';
                  
                  // Filter out private whispers
                  if (isWhisper && !isGM && msg.remetente_email !== currentUser.email && msg.destinatario !== currentUser.email) {
                    return null;
                  }

                  // Filter out messages hidden by GM
                  if (msg.ocultada && !isGM && msg.remetente_email !== currentUser.email) {
                    return null;
                  }

                  let wrapperClass = "p-3 border text-left ";
                  if (msg.remetente_email === currentUser.email) {
                    wrapperClass += "bg-[#161616] border-white/10 text-white ml-auto border-r-4 border-r-orange-500 max-w-[85%]";
                  } else if (msg.remetente === 'MESTRE GM 🛡️') {
                    wrapperClass += "bg-[#111111] border-orange-500/20 text-orange-200 border-l-4 border-l-orange-500 max-w-[85%]";
                  } else {
                    wrapperClass += "bg-[#0b0b0b] border-white/10 text-white/90 border-l-4 border-l-white/40 max-w-[85%]";
                  }

                  if (isRoll) {
                    wrapperClass += " shadow-lg ring-1 ring-orange-500/20 bg-black";
                  } else if (isWhisper) {
                    wrapperClass += " border-dashed border-red-500/30 bg-red-950/10 text-red-400";
                  }

                  return (
                    <div key={msg.id} className={`flex flex-col ${msg.remetente_email === currentUser.email ? 'items-end' : 'items-start animate-fade-in'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-mono leading-none tracking-widest uppercase font-extrabold text-orange-500">
                          {msg.remetente}
                        </span>
                        {isGM && (
                          <button
                            onClick={() => handleToggleHideMessage(msg.id, !!msg.ocultada)}
                            className="hover:text-orange-500 transition-colors focus:outline-none shrink-0"
                            title={msg.ocultada ? "Tornar Mensagem Visível a Todos" : "Ocultar dos Demais Jogadores"}
                          >
                            {msg.ocultada ? (
                              <EyeOff className="h-3 w-3 text-rose-500 stroke-[2.5]" />
                            ) : (
                              <Eye className="h-3 w-3 text-white/30 hover:text-orange-500" />
                            )}
                          </button>
                        )}
                        {msg.ocultada && (
                          <span className="text-[7px] text-rose-400 font-black uppercase tracking-widest bg-rose-950/20 border border-rose-500/20 px-1 py-0.5 leading-none">
                            Ocultada
                          </span>
                        )}
                        {isWhisper && (
                          <span className="text-[8px] bg-red-950 text-red-400 border border-red-900/40 px-1.5 font-bold uppercase py-0.2">Sussurro</span>
                        )}
                        <span className="text-[8px] text-[#ffffff]/30 font-mono">
                          {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString() : 'Agora'}
                        </span>
                      </div>

                      <div 
                        className={`${wrapperClass} leading-relaxed text-xs`}
                        dangerouslySetInnerHTML={{ __html: msg.conteudo }}
                      />
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* Dice Panel Selector inside Chat */}
              <div className="border-t border-white/10 p-3 bg-white/5">
                <DiceTray onSendRoll={(html) => handleSendChatMessage(undefined, html)} />
              </div>

              {/* Word inputs message form */}
              <form onSubmit={handleSendChatMessage} className="bg-black p-3 border-t border-white/10 flex gap-2">
                
                {/* Whisper target select */}
                <select
                  value={whisperTarget}
                  onChange={e => setWhisperTarget(e.target.value)}
                  className="bg-[#050505] text-white/70 border border-white/10 px-3 py-2 text-[10px] font-mono uppercase tracking-widest focus:outline-none focus:border-orange-500"
                >
                  <option value="TODOS">TODOS</option>
                  <option value="GM">GM (🛡️ Mestre)</option>
                  {characters.filter(c => c.email_dono !== currentUser.email).map(c => (
                    <option key={c.id} value={c.email_dono}>{c.nome} (Sussurro)</option>
                  ))}
                </select>

                <input
                  type="text"
                  value={chatMessageText}
                  onChange={e => setChatMessageText(e.target.value)}
                  placeholder="Envie uma mensagem..."
                  className="flex-1 bg-[#050505] text-white border border-white/10 px-4 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-sans"
                />

                <button
                  type="submit"
                  disabled={!chatMessageText.trim()}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest px-6 py-2.5 transition-colors disabled:opacity-40"
                >
                  Enviar
                </button>
              </form>

            </div>

          </div>

        </div>
      )}

      {/* FLOATING 30-SECOND SHEET UPDATE NOTIFIER FOR PLAYERS */}
      {!isGM && hasSheetUpdateAlert && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <button
            onClick={handleAcknowledgeSheetUpdate}
            className="flex items-center gap-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs py-3 px-5 border-2 border-white/30 shadow-2xl rounded-none transition-all uppercase tracking-wider group"
          >
            <div className="p-1 bg-white/20 rounded-full animate-pulse">
              <Bell className="h-4 w-4" />
            </div>
            <div className="text-left">
              <span className="block text-[11px] font-extrabold leading-tight">O Mestre atualizou sua ficha!</span>
              <span className="text-[9px] text-white/80 font-mono tracking-widest uppercase">Clique aqui para ver as alterações</span>
            </div>
            <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300 ml-1" />
          </button>
        </div>
      )}

      {/* GM CONFIG MODAL (Discord & Settings) */}
      {isGM && (
        <GMConfigModal
          isOpen={showGMConfig}
          onClose={() => setShowGMConfig(false)}
          characters={characters}
        />
      )}

      {/* PLAYER CONFIG MODAL (Profile, Avatar, Password) */}
      {!isGM && userProfile && (
        <PlayerConfigModal
          isOpen={showPlayerConfig}
          onClose={() => setShowPlayerConfig(false)}
          userProfile={userProfile}
          onProfileUpdated={(updated) => setUserProfile(updated)}
          characters={characters}
          onLogout={handleLogout}
        />
      )}

      {/* COMPACT FOOTER */}
      <footer className="bg-[#030303] py-6 text-center border-t border-white/10 text-[9px] font-black uppercase tracking-widest text-[#ffffff]/20 no-print">
        TELUMAK DIGITAL SYSTEM • LICENSED UNDER SYSTEM CORE CODES
      </footer>

    </div>
  );
}
