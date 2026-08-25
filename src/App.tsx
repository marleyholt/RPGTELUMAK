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
  Plus, Trash2, LogOut, Heart, Shield, Swords, User as UserIcon, Send, EyeOff, Eye, LayoutGrid, Scroll, Flame, RefreshCw, Sparkles, BookOpen, UserPlus, Star, Sliders, Lock, HelpCircle, Settings, MessageSquareText, Bell, X, ShieldAlert, Users, FileText, History, Activity
} from 'lucide-react';

import { Character, CustomStatusType, ChatMessage, CharVersion, UserProfile } from './types';
import { handleFirestoreError, OperationType } from './utils/errors';
import { CharacterSheet } from './components/CharacterSheet';
import { GameTable } from './components/GameTable';
import { DiscordNotebook } from './components/DiscordNotebook';
import { GMConfigModal } from './components/GMConfigModal';
import { NpcManager } from './components/NpcManager';
import { PlayerConfigModal } from './components/PlayerConfigModal';
import { ImageUploadField } from './components/ImageUploadField';
import { AuditModal } from './components/AuditModal';
import { TelemetryModal } from './components/TelemetryModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PdfSheetImporterModal } from './components/PdfSheetImporterModal';
import { trackRead, trackWrite, trackDelete } from './utils/firebaseUsageTracker';
import { 
  logAudit, 
  logTelemetry, 
  subscribeToAuditLogs, 
  subscribeToTelemetryLogs, 
  AuditLogEntry, 
  TelemetryLogEntry 
} from './utils/auditTelemetry';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Firestore Sync State
  const [characters, setCharacters] = useState<Character[]>([]);
  const [statuses, setStatuses] = useState<CustomStatusType[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [versionsMap, setVersionsMap] = useState<{ [charId: string]: CharVersion[] }>({});

  // Global Separate Modals State: 1. Audit Trail (Actions) and 2. Telemetry (Errors & Quota)
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showTelemetryModal, setShowTelemetryModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLogEntry[]>([]);

  useEffect(() => {
    const unsubAudit = subscribeToAuditLogs((logs) => setAuditLogs(logs));
    const unsubTelemetry = subscribeToTelemetryLogs((logs) => setTelemetryLogs(logs));
    return () => {
      unsubAudit();
      unsubTelemetry();
    };
  }, []);

  const addGlobalLog = (type: 'info' | 'success' | 'warn' | 'error', title: string, details?: any) => {
    logTelemetry(type, title, details, 'AppGlobal');
  };

  // Global Error Listeners (with filter for Vite HMR sandbox reconnection)
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event.message || '';
      const file = event.filename || '';
      if (msg.includes('@vite') || file.includes('@vite')) return;

      logTelemetry('error', `Erro de Interface: ${msg || 'Erro desconhecido'}`, {
        arquivo: file,
        linha: event.lineno,
        coluna: event.colno,
        stack: event.error?.stack
      }, 'WindowError', event.error?.stack);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || String(event.reason || '');
      // Filter out harmless Vite HMR dev socket noise
      if (msg.includes('WebSocket closed without opened') || msg.includes('@vite')) return;

      logTelemetry('error', `Promise Rejeitada: ${msg || 'Erro assíncrono'}`, {
        motivo: event.reason,
        stack: event.reason?.stack
      }, 'UnhandledRejection', event.reason?.stack);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);


  // Navigation State
  const [currentTab, setCurrentTab] = useState<'personagens' | 'mesa' | 'discord' | 'biblioteca'>('personagens');
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

  // PDF Sheet Importer modal state
  const [showPdfImporterModal, setShowPdfImporterModal] = useState(false);
  const [pdfTargetChar, setPdfTargetChar] = useState<Character | null>(null);

  // System Logo Branding state
  const [systemLogo, setSystemLogo] = useState<string>('/telumak-logo.svg');

  // Real-time branding sync for system logo
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'branding'), (snap) => {
      trackRead('config', 1);
      if (snap.exists() && snap.data()?.logoUrl) {
        setSystemLogo(snap.data().logoUrl);
      } else {
        setSystemLogo('/telumak-logo.svg');
      }
    }, (err) => {
      console.warn("Branding sync warning:", err);
    });

    return () => unsub();
  }, []);

  // Update browser tab favicon dynamically whenever systemLogo updates
  useEffect(() => {
    if (systemLogo) {
      const iconLinks = document.querySelectorAll("link[rel*='icon']");
      if (iconLinks.length > 0) {
        iconLinks.forEach((el) => {
          (el as HTMLLinkElement).href = systemLogo;
        });
      } else {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = systemLogo;
        document.head.appendChild(link);
      }
    }
  }, [systemLogo]);

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
      logAudit('AUTENTICACAO', `Usuário realizou login (${authEmail.trim()})`, { email: authEmail.trim() });
    } catch (err: any) {
      logTelemetry('error', `Falha de autenticação (Login): ${err?.message}`, { code: err?.code }, 'Auth');
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
        logAudit('AUTENTICACAO', `Novo usuário registrado (${profile.displayName} - ${profile.role})`, { profile });
      }
    } catch (err: any) {
      logTelemetry('error', `Falha no cadastro: ${err?.message}`, { code: err?.code }, 'Auth');
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
      trackRead('characters', snap.docChanges().length || snap.size);
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
      trackRead('messages', snap.docChanges().length || snap.size);
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
      trackRead('statuses', snap.docChanges().length || snap.size);
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

  // Sync alternative Sheet Versions (Transformations) ONLY for the selected character to optimize traffic
  useEffect(() => {
    if (!selectedCharId) return;
    
    const verPath = `characters/${selectedCharId}/versions`;
    const unsub = onSnapshot(collection(db, 'characters', selectedCharId, 'versions'), (snap) => {
      trackRead('characters', snap.docChanges().length || snap.size);
      const list: CharVersion[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as CharVersion);
      });
      setVersionsMap(prev => ({ ...prev, [selectedCharId]: list }));
    }, (err) => {
      console.warn(`Could not sync versions for character ${selectedCharId}:`, err);
    });

    return () => unsub();
  }, [selectedCharId]);

  // Listen for external requests to open the character sheet (e.g. from Discord Ficha Rapida)
  useEffect(() => {
    const handleOpenCharSheet = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setCurrentTab('personagens');
        setSelectedCharId(customEvent.detail);
      }
    };
    window.addEventListener('openCharacterSheet', handleOpenCharSheet);
    return () => window.removeEventListener('openCharacterSheet', handleOpenCharSheet);
  }, []);

  // Listen for external requests to open the character sheet and edit
  useEffect(() => {
    const handleEditCharSheet = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setCurrentTab('personagens');
        setSelectedCharId(customEvent.detail);
        // Dispatch again after a tiny delay so CharacterSheet has time to mount
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('editCharacterSheet', { detail: customEvent.detail }));
        }, 100);
      }
    };
    window.addEventListener('triggerEditCharacter', handleEditCharSheet);
    return () => window.removeEventListener('triggerEditCharacter', handleEditCharSheet);
  }, []);

  // Listen for external requests to open an NPC sheet
  useEffect(() => {
    const handleOpenNpcSheet = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setCurrentTab('biblioteca');
      }
    };
    window.addEventListener('openNpcSheet', handleOpenNpcSheet);
    return () => window.removeEventListener('openNpcSheet', handleOpenNpcSheet);
  }, []);

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
      trackWrite('characters', 1);
      logAudit('PERSONAGEM', `Criou a ficha ${newCharNome.trim()} (${newCharCla.trim() || 'Sem clã'})`, {
        charId: id,
        nome: newCharNome.trim(),
        cla: newCharCla.trim(),
        nivel: newCharNivel,
        dono: newCharEmail.trim()
      });
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
    const nextStatus = !char.ativo_na_mesa;
    try {
      await updateDoc(doc(db, 'characters', char.id), {
        ativo_na_mesa: nextStatus
      });
      trackWrite('characters', 1);
      logAudit('COMBATE', `${nextStatus ? 'Escalou para a Mesa de Combate' : 'Removeu da Mesa de Combate'}: ${char.nome}`, {
        charId: char.id,
        ativoNaMesa: nextStatus
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
      trackWrite('messages', 1);
      logAudit('DISCORD', `Enviou mensagem no chat (${remetente} -> ${whisperTarget})`, {
        tipo: type,
        destinatario: whisperTarget
      });
      if (!directText) setChatMessageText('');
      
      // Envia para o Discord se for mensagem pública
      if (type === 'CHAT') {
        fetch(`${import.meta.env.VITE_API_URL || 'https://telumak-server.duckdns.org'}/api/discord/send`, {
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
      logAudit('SISTEMA', `Apagou todo o histórico de mensagens do chat`);
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
      logAudit('DISCORD', `${currentHiddenStatus ? 'Exibiu' : 'Ocultou'} mensagem do chat (ID: ${msgId})`);
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

  const handleApplyParsedPdfToQuickStats = (data: any) => {
    if (data.hp_max !== undefined) setEditHpMax(Number(data.hp_max));
    if (data.ether_max !== undefined) setEditEtherMax(Number(data.ether_max));
    if (data.destino_max !== undefined) setEditDestinoMax(Number(data.destino_max));
    if (data.fisico !== undefined) setEditFis(Number(data.fisico));
    if (data.destreza !== undefined) setEditDes(Number(data.destreza));
    if (data.cognicao !== undefined) setEditCog(Number(data.cognicao));
    if (data.carisma !== undefined) setEditCar(Number(data.carisma));
    if (data.primordio !== undefined) setEditPri(Number(data.primordio));
    if (data.ferramenta_fisico !== undefined) setEditToolFis(Number(data.ferramenta_fisico));
    if (data.ferramenta_destreza !== undefined) setEditToolDes(Number(data.ferramenta_destreza));
    if (data.ferramenta_cognicao !== undefined) setEditToolCog(Number(data.ferramenta_cognicao));
    if (data.ferramenta_carisma !== undefined) setEditToolCar(Number(data.ferramenta_carisma));
    logAudit('PERSONAGEM', `Aplicou atributos da ficha PDF (${data.nome || 'Ficha'})`, { data });
  };

  const handleSaveQuickStats = async () => {
    if (!editingStatsCharId) return;
    const path = `characters/${editingStatsCharId}`;
    const targetChar = characters.find(c => c.id === editingStatsCharId);
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
      logAudit('PERSONAGEM', `Ajustou atributos rápidos de ${targetChar?.nome || editingStatsCharId}`, {
        hp_max: editHpMax,
        ether_max: editEtherMax,
        destino_max: editDestinoMax,
        fis: editFis,
        des: editDes,
        cog: editCog,
        car: editCar,
        pri: editPri,
        emailDono: editEmailDono.trim()
      });
      setEditingStatsCharId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const isGM = userProfile?.role === 'GM';
  const activeCharacters = characters.filter(c => !c.arquivado);
  const myCharactersList = activeCharacters.filter(c => c.email_dono === currentUser?.email);
  const mestreMesaRoster = activeCharacters.filter(c => c.ativo_na_mesa);
  const isPlayerActiveOnTable = isGM || myCharactersList.some(c => c.ativo_na_mesa);
  const currentSelectedCharacter = activeCharacters.find(c => c.id === selectedCharId) || (myCharactersList.length > 0 ? myCharactersList[0] : (isGM && activeCharacters.length > 0 ? activeCharacters[0] : null));
  const activeCharVersionsList = currentSelectedCharacter ? versionsMap[currentSelectedCharacter.id] || [] : [];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono tracking-widest uppercase text-sky-400/70">Sintonizando Grimório...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0a0a0a] border border-blue-500/20 p-8 shadow-2xl relative">
          
          <div className="text-center mb-8 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full border-2 border-blue-500/40 p-1 bg-black/80 shadow-2xl mb-3 flex items-center justify-center">
              <img 
                src={systemLogo || "/telumak-logo.svg"} 
                alt="RPG Telumak" 
                className="w-full h-full object-contain rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black italic tracking-tighter uppercase text-white mb-1">
              RPG <span className="text-blue-500">TELUMAK</span>
            </h1>
            <p className="text-[10px] uppercase font-mono tracking-widest text-sky-400/60">Sistema Digital de Mesa e Fichas</p>
          </div>

          <div className="flex border-b border-white/10 mb-6">
            <button
              onClick={() => { setAuthTab('LOGIN'); setAuthError(''); }}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                authTab === 'LOGIN' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setAuthTab('REGISTER'); setAuthError(''); }}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                authTab === 'REGISTER' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white'
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
                <label className="block text-[9px] text-sky-300/60 font-black uppercase tracking-widest">E-mail do Jogador</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="seu-email@telumak.com"
                  className="w-full bg-[#050505] border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 rounded-none placeholder-white/10 animate-fade-in"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] text-sky-300/60 font-black uppercase tracking-widest">Senha de Conjuração</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="******"
                  className="w-full bg-[#050505] border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 rounded-none placeholder-white/10"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-widest py-3 transition-all duration-150 rounded-none"
              >
                Confirmar Entrada
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[9px] text-sky-300/60 font-black uppercase tracking-widest">Nome do Herói</label>
                  <input
                    type="text"
                    value={authDisplayName}
                    onChange={e => setAuthDisplayName(e.target.value)}
                    placeholder="Guerreiro"
                    className="w-full bg-[#050505] border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 rounded-none placeholder-white/10"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] text-sky-300/60 font-black uppercase tracking-widest flex items-center gap-1">Chave GM <HelpCircle className="h-2.5 w-2.5 text-sky-400" /></label>
                  <input
                    type="text"
                    value={gmSecretKey}
                    onChange={e => setGmSecretKey(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-[#050505] border border-white/10 px-3 py-2.5 text-xs text-sky-400 focus:outline-none focus:border-blue-500 rounded-none placeholder-white/10"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] text-sky-300/60 font-black uppercase tracking-widest">E-mail de Inscrição</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="seu-email@telumak.com"
                  className="w-full bg-[#050505] border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 rounded-none placeholder-white/10"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] text-sky-300/60 font-black uppercase tracking-widest">Senha (Min. 6 caracteres)</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="******"
                  className="w-full bg-[#050505] border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 rounded-none placeholder-white/10"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-widest py-3 transition-all duration-150 rounded-none"
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
            className="w-full bg-white text-black hover:bg-blue-600 hover:text-white font-black uppercase text-[10px] tracking-widest py-3 px-4 transition-colors duration-150 flex items-center justify-center gap-3 shadow active:scale-95 rounded-none"
          >
            <svg className="h-3.5 w-3.5 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3.6 4.5 1.6l2.4-2.4C17.3 1.5 14.9 1 12.24 1 6.137 1 1.24 5.9 1.24 12s4.897 11 11 11c5.93 0 10.518-4.14 10.518-10.5 0-.714-.07-1.41-.2-2.215H12.24z"/>
            </svg>
            Sincronizar com o Google
          </button>

          <p className="text-[8px] text-sky-400/30 font-black tracking-widest uppercase mt-6 text-center">TELUMAK RPG SYSTEM</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col justify-between text-white font-sans overflow-x-hidden">
      
      {/* GLOBAL NAVBAR */}
      <nav className="no-print bg-[#0a0a0a] border-b border-blue-500/20 p-4 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
          
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-blue-500/40 p-0.5 bg-black shrink-0 shadow-lg shadow-blue-500/10 flex items-center justify-center">
              <img 
                src={systemLogo || "/telumak-logo.svg"} 
                alt="RPG Telumak Logo" 
                className="w-full h-full object-contain rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-black tracking-tighter uppercase italic leading-none text-white flex items-center gap-1.5">
                <span>RPG</span> <span className="text-blue-500">TELUMAK</span>
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-sky-300/70 font-bold uppercase tracking-widest leading-none">
                  {isGM ? '👑 Escudo do Mestre' : '🛡️ Portal do Jogador'}
                </span>
                <span className="text-white/20 text-[10px]">•</span>
                <span className="text-[10px] font-mono text-sky-400 uppercase tracking-wider leading-none">{currentUser?.email}</span>
              </div>
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
                currentTab === 'personagens' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <Scroll className="h-3.5 w-3.5" />
              Fichas
            </button>

            {isGM && (
            <button
              onClick={() => setCurrentTab('mesa')}
              className={`flex items-center gap-1.5 px-5 py-2 text-xs font-black uppercase tracking-widest transition duration-150 ${
                currentTab === 'mesa' ? 'bg-red-600 text-white shadow' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Mesa</span>
            </button>
          )}

            {isGM && (
              <button
                onClick={() => setCurrentTab('biblioteca')}
                className={`flex items-center gap-1.5 px-5 py-2 text-xs font-black uppercase tracking-widest transition duration-150 ${
                  currentTab === 'biblioteca' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
                title="Galeria de NPCs"
              >
                <Users className="h-3.5 w-3.5" />
                NPCs
              </button>
            )}

            <button
              onClick={() => setCurrentTab('discord')}
              className={`flex items-center gap-1.5 px-5 py-2 text-xs font-black uppercase tracking-widest transition duration-150 ${
                currentTab === 'discord' ? 'bg-[#5865F2] text-white shadow' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageSquareText className="h-3.5 w-3.5" />
              Discord
            </button>
          </div>

          {/* GM / Player Config & User Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* 1. Audit Trail Window Button (Ações Realizadas) */}
            <button
              type="button"
              onClick={() => setShowAuditModal(true)}
              className="p-2 bg-[#151515] hover:bg-[#202020] border border-amber-500/30 text-amber-400 hover:text-amber-300 text-xs font-black uppercase tracking-wider transition shadow relative flex items-center justify-center"
              title="Janela de Auditoria & Registro de Ações (Armazenado)"
            >
              <History className="h-4 w-4" />
              {auditLogs.length > 0 && (
                <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-amber-500/90 text-black rounded-full text-[8px] flex items-center justify-center font-black">
                  {auditLogs.length > 99 ? '99+' : auditLogs.length}
                </span>
              )}
            </button>

            {/* 2. Telemetry & Error Monitor Window Button (Erros & Diagnósticos) */}
            <button
              type="button"
              onClick={() => setShowTelemetryModal(true)}
              className={`p-2 bg-[#151515] hover:bg-[#202020] border text-xs font-black uppercase tracking-wider transition shadow relative flex items-center justify-center ${
                telemetryLogs.filter(l => l.type === 'error').length > 0
                  ? 'border-rose-500 text-rose-400 animate-pulse'
                  : 'border-blue-500/30 text-sky-400 hover:text-white'
              }`}
              title="Janela de Telemetria & Monitor de Erros em Tempo Real"
            >
              <Activity className="h-4 w-4" />
              {telemetryLogs.filter(l => l.type === 'error').length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-600 text-white rounded-full text-[8px] flex items-center justify-center font-black">
                  {telemetryLogs.filter(l => l.type === 'error').length}
                </span>
              )}
            </button>

            {isGM ? (
              <button
                onClick={() => setShowGMConfig(true)}
                className="p-2 bg-[#151515] hover:bg-[#202020] text-sky-400 border border-blue-500/30 text-xs font-black uppercase tracking-wider transition shadow flex items-center justify-center"
                title="Configurações do Mestre (GM) & Criar Fichas"
              >
                <Settings className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowPlayerConfig(true)}
                className="p-2 bg-[#151515] hover:bg-[#202020] text-sky-400 border border-blue-500/30 text-xs font-black uppercase tracking-wider transition shadow flex items-center justify-center"
                title="Meu Perfil, Avatar e Segurança"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}

            <span className="text-[10px] bg-blue-500/15 font-bold tracking-widest text-sky-400 border border-blue-500/30 rounded px-2.5 py-1">
              {userProfile?.role || 'PLAYER'}
            </span>
            <button
              onClick={handleLogout}
              className="text-white/40 hover:text-sky-400 transition-colors"
              title="Encerrar Sessão"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>

        </div>
      </nav>

      {/* Main Tab Render inside ErrorBoundary for Real-Time Exception Telemetry */}
      <ErrorBoundary onOpenTelemetry={() => setShowTelemetryModal(true)}>
        
        {/* NPCS TAB */}
      {currentTab === 'biblioteca' && isGM && (
        <div className="flex-1 overflow-hidden h-full pb-0 bg-[#313338]">
          <NpcManager characters={characters} />
        </div>
      )}
      
      {/* DISCORD TAB */}
        {currentTab === 'discord' && (
          <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 no-print">
            <DiscordNotebook
              isGM={isGM}
              currentUserProfile={userProfile}
              characters={characters}
              onAddLog={addGlobalLog}
            />
          </div>
        )}

      {/* MESA DO MESTRE TAB */}
      {currentTab === 'mesa' && isGM && (
        <div className="flex-1 w-full h-[calc(100vh-64px)] overflow-hidden flex flex-col no-print">
          <GameTable
            characters={characters}
            onQuickEditChar={setupQuickStatsEditor}
            onOpenCharSheet={(id) => { setSelectedCharId(id); setCurrentTab('personagens'); }}
            onOpenNpcSheet={(id) => { window.dispatchEvent(new CustomEvent('openNpcSheet', { detail: id })); }}
          />
        </div>
      )}

      {/* CORE CHARACTERS PORTAL TAB AND FULL-WIDTH LAYOUT */}
      {currentTab === 'personagens' && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6 no-print">
          
          {/* GM COMPACT MESA & CHARACTERS TOOLBAR (GM ONLY) */}
          {isGM && (
            <div className="bg-[#0a0a0a] border border-white/10 p-3 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 text-sky-400">
                  <Swords className="h-4 w-4" />
                  <span className="text-xs font-black uppercase tracking-wider font-mono">
                    Mesa ({mestreMesaRoster.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPdfTargetChar(null);
                    setShowPdfImporterModal(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-sky-300 border border-blue-500/40 text-[11px] font-bold uppercase transition"
                  title="Importar Ficha Antiga via Arquivo PDF"
                >
                  <FileText className="h-3.5 w-3.5 text-blue-400" />
                  <span>Importar PDF</span>
                </button>
                <span className="text-[10px] text-sky-200/50 font-mono hidden sm:inline uppercase">
                  Selecione para abrir a ficha:
                </span>
              </div>

              {/* Characters Chips Horizontal Scroll */}
              <div className="flex items-center gap-2 overflow-x-auto custom-scroll w-full md:w-auto py-1">
                {activeCharacters.map(c => {
                  const isActiveOnBoard = c.ativo_na_mesa;
                  const isSelected = selectedCharId === c.id;

                  return (
                    <div
                      key={c.id}
                      className={`flex items-center gap-2 p-1.5 border transition-all shrink-0 ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                          : 'bg-black/60 border-white/10 hover:border-white/20 text-white/70'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedCharId(c.id)}
                        className="flex items-center gap-2 text-left"
                      >
                        <img
                          src={c.img_saudavel}
                          alt={c.nome}
                          className="w-7 h-7 object-cover border border-white/10 shrink-0"
                        />
                        <div className="min-w-0 pr-1">
                          <span className="text-xs font-extrabold uppercase truncate block max-w-[100px] leading-tight">
                            {c.nome}
                          </span>
                          <span className="text-[9px] text-sky-400 font-mono block">
                            Nv.{c.nivel} {c.email_dono ? `• ${c.email_dono.split('@')[0]}` : ''}
                          </span>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0 border-l border-white/10 pl-1.5">
                        <button
                          type="button"
                          onClick={() => setupQuickStatsEditor(c)}
                          className="p-1 hover:bg-white/10 text-white/50 hover:text-sky-400 transition"
                          title="Ajustar Atributos Rápidos"
                        >
                          <Sliders className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleCombatOnBoard(c)}
                          className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 border transition ${
                            isActiveOnBoard
                              ? 'bg-blue-600 text-white border-blue-500'
                              : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                          }`}
                          title={isActiveOnBoard ? 'Presente na Mesa de Combate' : 'Colocar na Mesa'}
                        >
                          {isActiveOnBoard ? 'Mesa' : '+'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PLAYER COMPACT SWITCHER (IF MULTIPLE CHARACTERS OWNED) */}
          {!isGM && myCharactersList.length > 1 && (
            <div className="bg-[#0a0a0a] border border-white/10 p-2.5 flex items-center gap-2 overflow-x-auto custom-scroll">
              <span className="text-[10px] text-sky-300/70 font-mono uppercase font-bold shrink-0">Minhas Fichas:</span>
              {myCharactersList.map(c => {
                const isSelected = selectedCharId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCharId(c.id)}
                    className={`flex items-center gap-2 px-3 py-1 border text-xs font-bold uppercase transition ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
                    }`}
                  >
                    <img src={c.img_saudavel} alt={c.nome} className="w-5 h-5 object-cover" />
                    <span>{c.nome} (Nv.{c.nivel})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* PLAYER ZERO CHARACTERS NOTICE */}
          {!isGM && myCharactersList.length === 0 && (
            <div className="p-6 border border-dashed border-blue-500/30 bg-black/60 text-center space-y-2">
              <BookOpen className="h-8 w-8 text-sky-400/60 mx-auto" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Nenhum personagem vinculado a esta conta
              </h3>
              <p className="text-xs text-sky-200/70 font-sans max-w-md mx-auto">
                Solicite ao Mestre (GM) para vincular sua ficha a este e-mail através da aba <strong>Config GM &gt; Fichas & Permissões</strong>.
              </p>
              <div className="inline-block bg-[#050505] border border-blue-500/20 px-3 py-1.5 text-xs text-sky-400 font-mono select-all mt-2">
                {currentUser.email}
              </div>
            </div>
          )}

          {/* MODAL: CREATE NEW CHARACTER FOR GM */}
          {showCreateCharForm && isGM && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <form onSubmit={handleCreateNewCharacter} className="bg-[#0c0c0c] border border-blue-500/40 p-6 space-y-4 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto custom-scroll">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-sky-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Criar Nova Ficha de Personagem</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowCreateCharForm(false)}
                    className="text-white/40 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-sky-200/70 font-bold uppercase mb-1">Nome do Personagem *</label>
                    <input
                      type="text"
                      placeholder="Ex: Kaelen das Sombras"
                      value={newCharNome}
                      onChange={e => setNewCharNome(e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-sky-200/70 font-bold uppercase mb-1">Email do Jogador Dono (Opcional)</label>
                    <input
                      type="email"
                      placeholder="jogador@email.com (Vazio = Sem Dono)"
                      value={newCharEmail}
                      onChange={e => setNewCharEmail(e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-sky-200/70 font-bold uppercase mb-1">Clã</label>
                      <input
                        type="text"
                        placeholder="Ex: Corvos Negros"
                        value={newCharCla}
                        onChange={e => setNewCharCla(e.target.value)}
                        className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-sky-200/70 font-bold uppercase mb-1">Ocupação</label>
                      <input
                        type="text"
                        placeholder="Ex: Arcanista"
                        value={newCharOcupacao}
                        onChange={e => setNewCharOcupacao(e.target.value)}
                        className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-sky-200/70 font-bold uppercase mb-1">Nível Inicial</label>
                    <input
                      type="number"
                      placeholder="1"
                      value={newCharNivel}
                      onChange={e => setNewCharNivel(Number(e.target.value))}
                      className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                      min="1"
                    />
                  </div>
                  
                  {/* Direct File Upload for Character Avatar */}
                  <ImageUploadField
                    label="Foto / Avatar do Personagem (Upload do Computador)"
                    value={newCharImg}
                    onChange={setNewCharImg}
                    helperText="Envie a foto do herói direto do seu dispositivo com suporte a ajuste/zoom"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowCreateCharForm(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider transition-colors shadow"
                  >
                    Criar Ficha
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MAIN FULL-WIDTH CHARACTER SHEET VIEW */}
          {currentSelectedCharacter ? (
            <CharacterSheet
              character={currentSelectedCharacter}
              isGM={isGM}
              isOwner={currentSelectedCharacter.email_dono === currentUser.email}
              statuses={statuses}
              versions={activeCharVersionsList}
              onCharacterArchived={() => {
                const remaining = activeCharacters.filter(c => c.id !== currentSelectedCharacter.id);
                setSelectedCharId(remaining.length > 0 ? remaining[0].id : null);
              }}
            />
          ) : (
            <div className="bg-[#080808] border border-white/10 p-10 text-center shadow-2xl flex flex-col items-center justify-center min-h-[300px]">
              <BookOpen className="h-12 w-12 text-white/20 mb-3" />
              <h3 className="text-2xl font-black uppercase tracking-tighter leading-none text-white italic">Grimório Vazio</h3>
              <p className="text-xs text-white/50 max-w-xs leading-relaxed mt-1">
                Selecione uma ficha de aventureiro na barra superior para analisar detalhes e exportar seu PDF.
              </p>
            </div>
          )}

        </div>
      )}
      </ErrorBoundary>

      {/* FLOATING 30-SECOND SHEET UPDATE NOTIFIER FOR PLAYERS */}
      {!isGM && hasSheetUpdateAlert && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <button
            onClick={handleAcknowledgeSheetUpdate}
            className="flex items-center gap-3 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-600 hover:to-sky-500 text-white font-black text-xs py-3 px-5 border-2 border-blue-400/40 shadow-2xl rounded-none transition-all uppercase tracking-wider group"
          >
            <div className="p-1 bg-white/20 rounded-full animate-pulse">
              <Bell className="h-4 w-4" />
            </div>
            <div className="text-left">
              <span className="block text-[11px] font-extrabold leading-tight">O Mestre atualizou sua ficha!</span>
              <span className="text-[9px] text-sky-100 font-mono tracking-widest uppercase">Clique aqui para ver as alterações</span>
            </div>
            <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300 ml-1" />
          </button>
        </div>
      )}

      {/* GM CONFIG MODAL (Discord & Settings & Character Creation) */}
      {isGM && (
        <GMConfigModal
          isOpen={showGMConfig}
          onClose={() => setShowGMConfig(false)}
          characters={characters}
          onOpenCreateCharModal={() => {
            setShowGMConfig(false);
            setShowCreateCharForm(true);
          }}
          onOpenImportPdfModal={() => {
            setShowGMConfig(false);
            setPdfTargetChar(null);
            setShowPdfImporterModal(true);
          }}
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

      {/* 1. AUDIT TRAIL MODAL (Ações e Histórico Armazenado) */}
      <AuditModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />

      {/* 2. TELEMETRY & ERROR MONITOR MODAL (Erros, Diagnóstico e Cota) */}
      <TelemetryModal
        isOpen={showTelemetryModal}
        onClose={() => setShowTelemetryModal(false)}
        currentUserProfile={userProfile}
        characters={characters}
        currentTab={currentTab}
      />

      {/* PDF SHEET IMPORTER MODAL */}
      <PdfSheetImporterModal
        isOpen={showPdfImporterModal}
        onClose={() => {
          setShowPdfImporterModal(false);
          setPdfTargetChar(null);
        }}
        targetCharacter={pdfTargetChar}
        onApplyToQuickStats={handleApplyParsedPdfToQuickStats}
        onSuccess={(charId) => {
          setSelectedCharId(charId);
        }}
      />

      {/* MODAL: QUICK STAT ADJUSTER FOR GM */}
          {editingStatsCharId && isGM && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-[#080808] border border-blue-500/40 p-6 space-y-4 shadow-2xl relative max-w-md w-full">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-sky-400 flex items-center gap-2">
                    <Sliders className="h-4 w-4" />
                    <span>Ajuste Rápido de Atributos (Mestre)</span>
                  </h4>
                  <button onClick={() => setEditingStatsCharId(null)} className="text-white/40 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* PDF IMPORT BUTTON DIRECTLY IN QUICK ADJUST MODAL */}
                <button
                  type="button"
                  onClick={() => {
                    const char = characters.find(c => c.id === editingStatsCharId);
                    setPdfTargetChar(char || null);
                    setShowPdfImporterModal(true);
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-900/60 via-indigo-950/80 to-blue-900/60 hover:from-blue-800/80 hover:to-indigo-900/90 border border-blue-500/50 rounded text-sky-200 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg group cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span>📄 Enviar / Importar PDF da Ficha Antiga</span>
                  <span className="text-[9px] bg-blue-500 text-white font-mono px-1.5 py-0.5 rounded font-normal">IA</span>
                </button>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] text-sky-300/70 font-black uppercase mb-1">HP Máx</label>
                    <input type="number" value={editHpMax} onChange={e => setEditHpMax(Number(e.target.value))} className="w-full bg-[#050505] text-white border border-white/10 px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-sky-300/70 font-black uppercase mb-1">Éter Máx</label>
                    <input type="number" value={editEtherMax} onChange={e => setEditEtherMax(Number(e.target.value))} className="w-full bg-[#050505] text-white border border-white/10 px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-sky-300/70 font-black uppercase mb-1">Destino Máx</label>
                    <input type="number" value={editDestinoMax} onChange={e => setEditDestinoMax(Number(e.target.value))} className="w-full bg-[#050505] text-white border border-white/10 px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500" />
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5 text-center">
                  <div>
                    <label className="block text-[9px] text-sky-300/60 font-black uppercase mb-1">FIS</label>
                    <input type="number" value={editFis} onChange={e => setEditFis(Number(e.target.value))} className="w-full text-center bg-[#050505] text-white border border-white/10 px-1 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-sky-300/60 font-black uppercase mb-1">DES</label>
                    <input type="number" value={editDes} onChange={e => setEditDes(Number(e.target.value))} className="w-full text-center bg-[#050505] text-white border border-white/10 px-1 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-sky-300/60 font-black uppercase mb-1">COG</label>
                    <input type="number" value={editCog} onChange={e => setEditCog(Number(e.target.value))} className="w-full text-center bg-[#050505] text-white border border-white/10 px-1 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-sky-300/60 font-black uppercase mb-1">CAR</label>
                    <input type="number" value={editCar} onChange={e => setEditCar(Number(e.target.value))} className="w-full text-center bg-[#050505] text-white border border-white/10 px-1 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-cyan-400 font-black uppercase mb-1">PRI</label>
                    <input type="number" value={editPri} onChange={e => setEditPri(Number(e.target.value))} className="w-full text-center bg-[#050505] text-cyan-400 border border-cyan-500/30 px-1 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] text-sky-300/70 font-black uppercase tracking-widest">E-mail do Jogador Dono</label>
                  <input 
                    type="text" 
                    value={editEmailDono} 
                    onChange={e => setEditEmailDono(e.target.value)} 
                    placeholder="email-do-jogador@telumak.com" 
                    className="w-full bg-[#050505] text-white border border-white/10 px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500" 
                  />
                </div>

                <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                  <button onClick={() => setEditingStatsCharId(null)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold uppercase tracking-wider">Cancelar</button>
                  <button onClick={handleSaveQuickStats} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest transition-colors shadow">Salvar</button>
                </div>
              </div>
            </div>
          )}

          

      {/* COMPACT FOOTER */}
      <footer className="bg-[#030303] py-6 text-center border-t border-white/10 text-[9px] font-black uppercase tracking-widest text-[#ffffff]/20 no-print">
        TELUMAK DIGITAL SYSTEM • LICENSED UNDER SYSTEM CORE CODES
      </footer>

    </div>
  );
}
