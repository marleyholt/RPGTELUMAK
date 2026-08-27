import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, 
  deleteDoc, serverTimestamp, doc, setDoc, getDocs, limitToLast 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Character, DiscordNotebookMessage, DiscordChannelItem, UserProfile } from '../types';
import { 
  Send, Hash, Bold, Italic, Underline, Strikethrough, EyeOff, Quote, Code, 
  RefreshCw, X, Dices, Pin, PinOff, Search, Copy, Trash2, ArrowDown, 
  MessageSquareQuote, Volume2, Mic, MicOff, Headphones, ChevronDown, 
  ChevronRight, Plus, Download, FileText, Lock, Edit2, Check, Radio, UserCheck, Shield,
  Smile, Terminal, AlertTriangle, CheckCircle2, Info, Bug, ShieldAlert, Cpu, ArrowUp,
  Bot, Sparkles, ExternalLink, Sliders, Users, Video, Menu, PanelLeftClose, Link2
} from 'lucide-react';
import { processImageFile } from '../utils/imageUpload';
import { ImageCropModal } from './ImageCropModal';
import { ImageUploadField } from './ImageUploadField';
import { DiscordBotGuideModal } from './DiscordBotGuideModal';
import { DiscordExportModal } from './DiscordExportModal';
import { useGoogleLogin } from '@react-oauth/google';
import { QuickSheetPanel } from './QuickSheetPanel';
import { NpcQuickSheet } from './NpcQuickSheet';
import { NpcQuickSelectorWindow } from './NpcQuickSelectorWindow';
import { PcSelectorWindow } from './PcSelectorWindow';
import { NPC } from '../types';
import { trackRead, trackWrite, trackDelete } from '../utils/firebaseUsageTracker';
import { parseAndRollDice, extractDiceRollsFromMessage } from '../utils/diceRoller';

// Discord Free tier message character limit
const DISCORD_FREE_MAX_CHARS = 2000;

interface DiscordNotebookProps {
  isGM: boolean;
  currentUserProfile: UserProfile | null;
  characters: Character[];
  onAddLog?: (type: 'info' | 'success' | 'warn' | 'error', title: string, details?: any) => void;
}

export function DiscordNotebook({ isGM, currentUserProfile, characters, onAddLog }: DiscordNotebookProps) {
  // Channels stored in Firestore (real channels created by GM)
  const [dbChannels, setDbChannels] = useState<DiscordChannelItem[]>([]);
  const [activeChannel, setActiveChannel] = useState<DiscordChannelItem | null>(null);
  
  // Messages and Input
  const [messages, setMessages] = useState<DiscordNotebookMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<{ [key: string]: boolean }>({});
  
  // Modals & Popovers
  const [showMentionRollModal, setShowMentionRollModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [pendingCropImage, setPendingCropImage] = useState<string | null>(null);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [channelToEdit, setChannelToEdit] = useState<DiscordChannelItem | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Identity Modal state (Custom Name & #tag for GM & Players)
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [identityName, setIdentityName] = useState('');
  const [identityTag, setIdentityTag] = useState('');
  const [identityAvatar, setIdentityAvatar] = useState('');
  const [identityQuickSheet, setIdentityQuickSheet] = useState<string[]>([]);
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);
  
  const [showQuickSheet, setShowQuickSheet] = useState(false);
  const [allNpcs, setAllNpcs] = useState<NPC[]>([]);
  const [openNpcIds, setOpenNpcIds] = useState<string[]>([]);
  const [showNpcMenu, setShowNpcMenu] = useState(false);
  const [openPcIds, setOpenPcIds] = useState<string[]>([]);
  const [showPcMenu, setShowPcMenu] = useState(false);

  // Google Meet Integration
  const [meetSession, setMeetSession] = useState<{ url?: string; createdAt?: any } | null>(null);
  const [isCreatingMeet, setIsCreatingMeet] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'meet_session', 'current'), (docSnap) => {
      if (docSnap.exists()) {
        setMeetSession(docSnap.data() as any);
      } else {
        setMeetSession(null);
      }
    });
    return () => unsub();
  }, []);

  const handleMeetLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsCreatingMeet(true);
      try {
        const response = await fetch('https://meet.googleapis.com/v2/spaces', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenResponse.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });
        const space = await response.json();
        if (!response.ok) {
          console.error('Google Meet API Erro Detalhado:', space);
          if (space.error && space.error.message.includes('API has not been used')) {
             onAddLog('error', 'API do Google Meet não está ativada no Cloud Console!');
          } else {
             onAddLog('error', 'API Meet Erro: ' + (space.error?.message || 'Desconhecido'));
          }
          throw new Error('Meet Error');
        }
        if (space.meetingUri) {
          await setDoc(doc(db, 'meet_session', 'current'), {
            url: space.meetingUri,
            createdAt: serverTimestamp()
          });
          onAddLog('success', 'Sala do Google Meet criada e aberta na mesa!');
        } else {
          throw new Error('Failed to create meet space');
        }
      } catch (err) {
        console.error(err);
        onAddLog('error', 'Erro ao criar a sala do Google Meet: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setIsCreatingMeet(false);
      }
    },
    onError: () => {
      onAddLog('error', 'Login do Google cancelado ou falhou.');
    },
    scope: 'https://www.googleapis.com/auth/meetings.space.created',
  });

  const handleCloseMeet = async () => {
    try {
      await deleteDoc(doc(db, 'meet_session', 'current'));
      onAddLog('info', 'Mesa do Google Meet encerrada.');
    } catch (err) {
      console.error(err);
    }
  };

  // Auto-detection state for Discord channel
  const [isDetectingChannel, setIsDetectingChannel] = useState(false);
  const [detectChannelStatus, setDetectChannelStatus] = useState<{
    success: boolean;
    message: string;
    name?: string;
    category?: string;
    type?: 'text' | 'voice';
    guildName?: string;
  } | null>(null);

  // Channel Creation / Edit Form State (Single centralized configuration per channel)
  const [formChannelName, setFormChannelName] = useState('');
  const [formCategory, setFormCategory] = useState('ANOTAÇÕES');
  const [formType, setFormType] = useState<'text' | 'voice'>('text');
  const [formTopic, setFormTopic] = useState('');
  const [formDiscordId, setFormDiscordId] = useState('');
  const [formAccessType, setFormAccessType] = useState<'public' | 'character' | 'custom'>('public');
  const [formTargetCharId, setFormTargetCharId] = useState<string>('');
  const [formAllowedEmails, setFormAllowedEmails] = useState<string[]>([]);

  const logEvent = (type: 'info' | 'success' | 'warn' | 'error', title: string, details?: any) => {
    if (onAddLog) {
      onAddLog(type, title, details);
    }
  };

  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<{ [key: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPinnedOnly, setFilterPinnedOnly] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [copiedLinkMsgId, setCopiedLinkMsgId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [targetJumpMsgId, setTargetJumpMsgId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isPinning, setIsPinning] = useState<string | null>(null);
  const [messageLimit, setMessageLimit] = useState(50);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<DiscordNotebookMessage | null>(null);
  const [editContentText, setEditContentText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load NPCs for GM
  useEffect(() => {
    if (!isGM) return;
    const unsub = onSnapshot(collection(db, 'npcs'), (snap) => {
      const items: NPC[] = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() } as NPC));
      items.sort((a, b) => (a.name || (a as any).nome || "").localeCompare(b.name || (b as any).nome || ""));
      setAllNpcs(items);
    });
    return () => unsub();
  }, [isGM]);

  // 1. Load Real-Time Channels directly from Firestore (NO fake default channels)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'discord_channels'), (snap) => {
      trackRead('discord_channels', snap.docChanges().length || snap.size);
      const items: DiscordChannelItem[] = [];
      snap.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as DiscordChannelItem);
      });
      items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      setDbChannels(items);
    }, (err) => {
      console.warn("Snapshot discord_channels:", err);
      setDbChannels([]);
    });

    return unsub;
  }, []);

  // 2. Compute Visible Channels (GM sees ALL channels; players see public + permitted channels)
  const visibleChannels = useMemo(() => {
    if (isGM) {
      // GM sees ALL configured channels
      return dbChannels;
    }

    // Filter for Player based on exact login email
    const playerEmail = currentUserProfile?.email?.toLowerCase().trim();

    return dbChannels.filter(ch => {
      // 1. Public channels: visible to everyone
      if (!ch.isPrivate) return true;
      
      // If channel is private and user is not logged in with an email, deny
      if (!playerEmail) return false;

      // 2. If user's email is explicitly listed in allowedEmails
      if (Array.isArray(ch.allowedEmails) && ch.allowedEmails.some(e => typeof e === 'string' && e.toLowerCase().trim() === playerEmail)) {
        return true;
      }
      
      // 3. If channel is linked directly to a specific character (charKey)
      if (ch.charKey) {
        const targetChar = characters.find(c => c.id === ch.charKey);
        if (targetChar && targetChar.email_dono && targetChar.email_dono.toLowerCase().trim() === playerEmail) {
          return true;
        }
      }

      return false;
    });
  }, [dbChannels, characters, isGM, currentUserProfile]);

  // 3. Group Channels by Category
  const groupedCategories = useMemo(() => {
    const map = new Map<string, DiscordChannelItem[]>();
    
    visibleChannels.forEach(ch => {
      const cat = (ch.category || 'GERAL').trim();
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(ch);
    });

    return Array.from(map.entries()).map(([category, items]) => ({
      category,
      items
    }));
  }, [visibleChannels]);

  // 4. Select Default Active Channel
  useEffect(() => {
    if (visibleChannels.length > 0) {
      const currentStillExists = activeChannel && visibleChannels.some(c => c.id === activeChannel.id);
      if (!currentStillExists) {
        const firstText = visibleChannels.find(c => c.type === 'text');
        setActiveChannel(firstText || visibleChannels[0]);
      }
    } else {
      setActiveChannel(null);
    }
  }, [visibleChannels, activeChannel]);

  // 5. Compute Active Channel ID for Messages Query & Discord Send
  const activeChannelId = useMemo(() => {
    if (!activeChannel) return '';
    return activeChannel.discordChannelId || activeChannel.id;
  }, [activeChannel]);

  // 6. Listen to messages for active channel with smart limitToLast pagination
  useEffect(() => {
    if (!activeChannelId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'discord_notebook_messages'),
      where('channelId', '==', activeChannelId),
      orderBy('createdAt', 'asc'),
      limitToLast(messageLimit)
    );

    const unsub = onSnapshot(q, (snap) => {
      trackRead('discord_notebook_messages', snap.docChanges().length || snap.size);
      const msgs: DiscordNotebookMessage[] = [];
      snap.forEach(d => {
        msgs.push({ id: d.id, ...d.data() } as DiscordNotebookMessage);
      });
      setMessages(msgs);
      setHasMoreMessages(snap.size >= messageLimit);
      
      setTimeout(() => {
        if (targetJumpMsgId) {
          scrollToSpecificMessage(targetJumpMsgId);
        } else if (!filterPinnedOnly && !searchQuery.trim()) {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }, (err) => {
      console.warn("Snapshot discord_notebook_messages:", err);
    });

    return unsub;
  }, [activeChannelId, messageLimit, filterPinnedOnly, searchQuery]);

  const myActiveCharacter = characters?.find(c => c.email_dono === currentUserProfile?.email && c.ativo_na_mesa && !c.arquivado);

  // Scroll tracking
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isScrolledUp = target.scrollHeight - target.scrollTop - target.clientHeight > 150;
    setShowScrollBottom(isScrolledUp);
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Filter messages based on search query and pinned toggle
  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      if (filterPinnedOnly && !msg.pinned) return false;
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase().trim();
        const contentMatch = (msg.content || '').toLowerCase().includes(queryLower);
        const authorMatch = (msg.authorName || '').toLowerCase().includes(queryLower);
        if (!contentMatch && !authorMatch) return false;
      }
      return true;
    });
  }, [messages, filterPinnedOnly, searchQuery]);

  const pinnedCount = useMemo(() => {
    return messages.filter(m => m.pinned).length;
  }, [messages]);

  // Toggle Pin
  const handleTogglePin = async (msg: DiscordNotebookMessage) => {
    if (!msg.id || isPinning === msg.id) return;
    setIsPinning(msg.id);

    try {
      const currentPinned = !!msg.pinned;
      const userName = currentUserProfile?.displayName || (isGM ? 'Alex AP (Mestre)' : 'Jogador');

      await updateDoc(doc(db, 'discord_notebook_messages', msg.id), {
        pinned: !currentPinned,
        pinnedBy: !currentPinned ? userName : null,
        pinnedAt: !currentPinned ? serverTimestamp() : null
      });
      trackWrite('discord_notebook_messages', 1);
    } catch (err) {
      console.error("Erro ao fixar/desafixar mensagem:", err);
    } finally {
      setIsPinning(null);
    }
  };

  // Start editing message
  const handleStartEditMessage = (msg: DiscordNotebookMessage) => {
    setEditingMessage(msg);
    setEditContentText(msg.content || '');
  };

  const handleCancelEditMessage = () => {
    setEditingMessage(null);
    setEditContentText('');
  };

  const handleSaveEditMessage = async (msg: DiscordNotebookMessage) => {
    if (!msg.id) return;
    const newContent = editContentText.trim();
    if (!newContent) {
      alert("A mensagem não pode ficar vazia. Caso deseje removê-la, clique no ícone de lixeira.");
      return;
    }

    if (newContent.length > DISCORD_FREE_MAX_CHARS) {
      alert(`Sua mensagem ultrapassou o limite do Discord (${newContent.length}/${DISCORD_FREE_MAX_CHARS} caracteres).`);
      return;
    }

    setIsSavingEdit(true);
    try {
      await updateDoc(doc(db, 'discord_notebook_messages', msg.id), {
        content: newContent,
        editedAt: serverTimestamp()
      });
      trackWrite('discord_notebook_messages', 1);

      // Sincronizar edição com a API do Discord se disponível
      const discordTargetId = activeChannel?.discordChannelId || (/^\d{17,20}$/.test(activeChannelId) ? activeChannelId : null);
      if (discordTargetId) {
        fetch(`${import.meta.env.VITE_API_URL || 'https://telumak-server.duckdns.org'}/api/discord/notebook/edit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: discordTargetId,
            messageId: msg.id,
            discordMessageId: (msg as any).discordMessageId || undefined,
            conteudo: newContent,
            remetente: msg.authorName || effectiveDiscordName
          })
        }).catch(err => {
          console.warn("Falha na sincronização de edição com o Discord oficial:", err);
        });
      }

      setEditingMessage(null);
      setEditContentText('');
      logEvent('info', `Mensagem editada com sucesso! (#${activeChannel?.name || 'canal'})`);
    } catch (err: any) {
      console.error("Erro ao salvar edição da mensagem:", err);
      alert(`Erro ao editar mensagem: ${err?.message || err}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msg: DiscordNotebookMessage) => {
    if (!msg.id) return;
    const confirmDelete = window.confirm("Deseja realmente apagar esta anotação?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'discord_notebook_messages', msg.id));
      trackDelete('discord_notebook_messages', 1);
    } catch (err) {
      console.error("Erro ao apagar mensagem:", err);
      alert("Não foi possível apagar a mensagem.");
    }
  };

  // Copy message text
  const handleCopyMessage = (msg: DiscordNotebookMessage) => {
    navigator.clipboard.writeText(msg.content || '');
    setCopiedMsgId(msg.id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Copy message permanent link (Discord style)
  const handleCopyMessageLink = (msg: DiscordNotebookMessage) => {
    if (!activeChannel) return;
    const channelKey = activeChannel.discordChannelId || activeChannel.id;
    const link = `https://telumak.rpg/channels/${channelKey}/${msg.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLinkMsgId(msg.id);
    setTimeout(() => setCopiedLinkMsgId(null), 2000);
    logEvent('info', `Link da mensagem copiado! (#${activeChannel.name})`);
  };

  // Scroll to a specific message and flash highlight
  const scrollToSpecificMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Jump to message (from message link embed/click)
  const handleJumpToMessage = (targetChannelId: string, targetMessageId: string) => {
    setIsSidebarOpen(false);
    
    // Find target channel by id or discordChannelId
    const targetChannel = dbChannels.find(
      c => c.id === targetChannelId || c.discordChannelId === targetChannelId
    );

    if (targetChannel && (!activeChannel || activeChannel.id !== targetChannel.id)) {
      setActiveChannel(targetChannel);
    }

    setTargetJumpMsgId(targetMessageId);
    setHighlightedMessageId(targetMessageId);

    // Smoothly scroll to target
    setTimeout(() => {
      scrollToSpecificMessage(targetMessageId);
    }, 250);
    setTimeout(() => {
      scrollToSpecificMessage(targetMessageId);
    }, 600);

    // Remove highlight after 3.5 seconds
    setTimeout(() => {
      setHighlightedMessageId(prev => (prev === targetMessageId ? null : prev));
      setTargetJumpMsgId(prev => (prev === targetMessageId ? null : prev));
    }, 3500);
  };

  // Quote message
  const handleQuoteMessage = (msg: DiscordNotebookMessage) => {
    const quoteText = `\n> **${msg.authorName}:** ${msg.content.replace(/\n/g, '\n> ')}\n\n`;
    setInputText(prev => prev + quoteText);
    textareaRef.current?.focus();
  };

  // Image Upload
  const handleAttachImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const file = e.target.files[0];
        const dataUrl = await processImageFile(file, 1200, 1200, 0.85);
        setPendingCropImage(dataUrl);
        setShowCropModal(true);
      } catch (err) {
        alert('Erro ao carregar imagem.');
      }
    }
  };

  // Effective Discord Identity for User (GM / Player)
  const effectiveDiscordName = useMemo(() => {
    if (currentUserProfile?.discordDisplayName?.trim()) {
      return currentUserProfile.discordDisplayName.trim();
    }
    if (isGM) return 'Alex AP (Mestre)';
    const senderChar = characters.find(c => c.email_dono === currentUserProfile?.email);
    return senderChar?.nome || currentUserProfile?.displayName || 'Jogador';
  }, [currentUserProfile, isGM, characters]);

  const effectiveDiscordTag = useMemo(() => {
    if (currentUserProfile?.discordTag?.trim()) {
      const tag = currentUserProfile.discordTag.trim();
      return tag.startsWith('#') ? tag : `#${tag}`;
    }
    return isGM ? '#mestre' : (currentUserProfile?.email ? `#${currentUserProfile.email.split('@')[0]}` : '#0001');
  }, [currentUserProfile, isGM]);

  const effectiveDiscordAvatar = useMemo(() => {
    if (currentUserProfile?.discordAvatar?.trim()) {
      return currentUserProfile.discordAvatar.trim();
    }
    const senderChar = characters.find(c => c.email_dono === currentUserProfile?.email);
    return senderChar?.img_saudavel || currentUserProfile?.photoURL || 'https://cdn.discordapp.com/embed/avatars/0.png';
  }, [currentUserProfile, characters]);

  // Save Identity Modal changes to Firestore
  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserProfile?.uid) {
      alert('Usuário não autenticado.');
      return;
    }

    setIsSavingIdentity(true);
    try {
      const formattedTag = identityTag.trim().startsWith('#') 
        ? identityTag.trim() 
        : (identityTag.trim() ? `#${identityTag.trim()}` : '#0001');

      await updateDoc(doc(db, 'users', currentUserProfile.uid), {
        discordDisplayName: identityName.trim() || effectiveDiscordName,
        discordTag: formattedTag,
        discordAvatar: identityAvatar.trim() || null,
        displayName: identityName.trim() || currentUserProfile.displayName,
        quickSheetSections: identityQuickSheet
      });
      trackWrite('users', 1);

      setShowIdentityModal(false);
      logEvent('success', 'Identidade do Discord atualizada com sucesso!');
    } catch (err: any) {
      console.error("Erro ao salvar identidade:", err);
      alert(`Erro ao salvar perfil: ${err?.message || err}`);
    } finally {
      setIsSavingIdentity(false);
    }
  };

  // Markdown formatters
  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end) || 'texto';
    const replacement = `${prefix}${selectedText}${suffix}`;

    setInputText(text.substring(0, start) + replacement + text.substring(end));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 50);
  };

  // Send message with integrated Telumak RPG / Rollem dice roller
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !attachedImage) || !activeChannelId || isSending) return;

    // Check if input exceeded max characters limit
    if (inputText.length > DISCORD_FREE_MAX_CHARS) {
      alert(`Sua mensagem ultrapassou o limite do Discord (${inputText.length}/${DISCORD_FREE_MAX_CHARS} caracteres). Por favor, divida o texto.`);
      return;
    }

    setIsSending(true);
    const contentToSend = inputText.trim();
    const imageToSend = attachedImage;

    setInputText('');
    setAttachedImage(null);

    const senderName = effectiveDiscordName;
    const senderAvatar = effectiveDiscordAvatar;

    // Check if the input is a dice roll expression (e.g. 4+2d10!9 or /r 1d20+5 or !r 3d6)
    const diceCheck = extractDiceRollsFromMessage(contentToSend);
    let finalContent = contentToSend;

    if (diceCheck.isRoll && diceCheck.results.length > 0) {
      const rollsStrArray = diceCheck.results.map(roll => {
        if (roll.isMathOnly) {
          const commentSuffix = roll.comment ? ` ${roll.comment}` : '';
          return `🧮 **Cálculo:** \`${roll.formattedFormula}\`\n` +
                 `> 🏆 **Resultado = ${roll.total}${commentSuffix}**`;
        }
        const sortedRolls = [...roll.rolls].sort((a, b) => b - a);
        const formattedRollArray = sortedRolls.map(r => {
          const isCrit = (roll.explodeThreshold !== null && r >= roll.explodeThreshold) || (roll.explodeThreshold === null && roll.faces > 1 && r === roll.faces);
          return isCrit ? `**${r}**` : `${r}`;
        });
        const rollsDisplay = formattedRollArray.join(', ');
        
        let explodeInfo = '';
        if (roll.explodeThreshold !== null) {
          explodeInfo = ` (Críticos >= ${roll.explodeThreshold}${roll.explodedRollsCount > 0 ? ` • +${roll.explodedRollsCount} dado(s) extra` : ''})`;
        }

        const forSuffix = roll.comment ? ` ${roll.comment.trim()}` : '';
        return `🎲 **Rolagem:** \`${roll.formattedFormula}\`${explodeInfo}\n` +
          `> **Dados Rolados:** [ ${rollsDisplay} ]\n` +
          `> **Cálculo:** ${roll.formattedDetails}\n` +
          `> 🏆 **Resultado Total = ${roll.total}**${forSuffix}`;
      });
      
      finalContent = rollsStrArray.join('\n\n');
      
      const firstRoll = diceCheck.results[0];
      logEvent('info', `Rolagem de dados executada: ${firstRoll.formattedFormula} = ${firstRoll.total} ${diceCheck.results.length > 1 ? '(e outras)' : ''}`, {
        autor: senderName,
        formula: firstRoll.formattedFormula,
        dados: firstRoll.rolls,
        total: firstRoll.total,
        totalRolagens: diceCheck.results.length
      });
    } else {
      logEvent('info', `Enviando mensagem para canal #${activeChannel?.name || activeChannelId}`, {
        canal: activeChannel?.name,
        canalId: activeChannelId,
        discordChannelId: activeChannel?.discordChannelId || 'Nenhum',
        autor: senderName,
        temImagem: !!imageToSend
      });
    }

    try {
      // Build safe payload with NO undefined values (Firestore rejects undefined)
      const messagePayload: Record<string, any> = {
        channelId: activeChannelId,
        authorName: senderName,
        authorAvatar: senderAvatar,
        authorEmail: currentUserProfile?.email || '',
        content: finalContent,
        isFromDiscord: false,
        pinned: false,
        createdAt: serverTimestamp()
      };

      if (imageToSend) {
        messagePayload.attachments = [imageToSend];
      }

      const docRef = await addDoc(collection(db, 'discord_notebook_messages'), messagePayload);
      trackWrite('discord_notebook_messages', 1);
      logEvent('success', `Mensagem gravada no Firestore com sucesso!`, {
        docId: docRef.id,
        canal: activeChannel?.name,
        conteudo: finalContent.substring(0, 50)
      });

      // Se o canal estiver vinculado a um ID do Discord oficial, despacha para o bot enviar no Discord
      const discordTargetId = activeChannel?.discordChannelId || (/^\d{17,20}$/.test(activeChannelId) ? activeChannelId : null);
      if (discordTargetId) {
        fetch(`${import.meta.env.VITE_API_URL || 'https://telumak-server.duckdns.org'}/api/discord/notebook/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: discordTargetId,
            remetente: senderName,
            conteudo: finalContent,
            attachment: imageToSend || undefined
          })
        }).then(async (res) => {
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data.success) {
              if (data.discordMessageId && docRef?.id) {
                updateDoc(doc(db, 'discord_notebook_messages', docRef.id), {
                  discordMessageId: data.discordMessageId
                }).catch(() => {});
              }
              logEvent('success', `Mensagem sincronizada e enviada para o canal do Discord (#${discordTargetId})`);
            } else if (data.botOffline) {
              logEvent('info', `Mensagem salva localmente. O bot do Discord está offline.`);
            }
          }
        }).catch(err => {
          console.warn("Falha ao despachar mensagem para a API do Discord:", err);
        });
      }
    } catch (err: any) {
      console.error("Erro ao salvar mensagem:", err);
      logEvent('error', `Falha ao gravar mensagem no Firestore: ${err?.message || err}`, {
        code: err?.code,
        message: err?.message,
        stack: err?.stack
      });
      alert(`Erro ao enviar mensagem: ${err?.message || err}`);
    } finally {
      setIsSending(false);
    }
  };

  // Insert emoji directly at cursor
  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setInputText(prev => prev + emoji);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const nextText = text.substring(0, start) + emoji + text.substring(end);
    setInputText(nextText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 20);
  };

  // Auto-detect and validate Discord Channel ID
  const handleDetectDiscordChannel = async (idToDetect?: string) => {
    const targetId = (idToDetect !== undefined ? idToDetect : formDiscordId).trim();
    if (!targetId) {
      setDetectChannelStatus({
        success: false,
        message: 'Digite ou cole o ID numérico do canal do Discord (17-20 dígitos).'
      });
      return;
    }

    setIsDetectingChannel(true);
    setDetectChannelStatus(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://telumak-server.duckdns.org'}/api/discord/channel-info?channelId=${encodeURIComponent(targetId)}`);
      
      if (res.status === 405 || !res.headers.get('content-type')?.includes('application/json')) {
        setDetectChannelStatus({
          success: false,
          message: 'ℹ️ Modo Local / Firestore: Você pode criar e nomear o canal livremente preenchendo os campos abaixo. (Para sincronização direta com o Discord oficial, o servidor Node.js precisa estar com o DISCORD_BOT_TOKEN ativo).'
        });
        return;
      }

      const data = await res.json();

      if (data.online && data.found) {
        setDetectChannelStatus({
          success: true,
          message: `✓ Canal Detectado: "#${data.name}" no servidor "${data.guildName || 'Discord'}"`,
          name: data.name,
          category: data.category,
          type: data.type,
          guildName: data.guildName
        });

        // Autopreenchimento inteligente
        if (!formChannelName || formChannelName === 'novo-canal' || !channelToEdit) {
          setFormChannelName(data.name);
        }
        if (data.category && (!formCategory || formCategory === 'ANOTAÇÕES' || !channelToEdit)) {
          setFormCategory(data.category);
        }
        if (data.type) {
          setFormType(data.type);
        }
        if (data.topic && !formTopic) {
          setFormTopic(data.topic);
        }
      } else if (data.online && !data.found) {
        setDetectChannelStatus({
          success: false,
          message: `ℹ️ ${data.message || 'Canal não encontrado no Discord ou o bot não tem acesso a ele. Você pode preencher o nome e categoria abaixo manualmente.'}`
        });
      } else {
        setDetectChannelStatus({
          success: false,
          message: `ℹ️ Bot do Discord não conectado (DISCORD_BOT_TOKEN não configurado nos Secrets). Não se preocupe: você pode criar o canal preenchendo o Nome e Categoria abaixo normalmente!`
        });
      }
    } catch (err: any) {
      setDetectChannelStatus({
        success: false,
        message: `ℹ️ Não foi possível autodetectar via API do Discord. Preencha o nome do canal abaixo para criar localmente.`
      });
    } finally {
      setIsDetectingChannel(false);
    }
  };

  // GM: Open Modal to Add Channel
  const handleOpenAddChannel = (categoryPreset?: string) => {
    setChannelToEdit(null);
    setFormChannelName('');
    setFormCategory(categoryPreset || 'ANOTAÇÕES');
    setFormType('text');
    setFormTopic('');
    setFormDiscordId('');
    setFormAccessType('public');
    setFormTargetCharId('');
    setFormAllowedEmails([]);
    setDetectChannelStatus(null);
    setShowChannelModal(true);
  };

  // GM: Open Modal to Edit Channel
  const handleOpenEditChannel = (ch: DiscordChannelItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setChannelToEdit(ch);
    setFormChannelName(ch.name);
    setFormCategory(ch.category || 'ANOTAÇÕES');
    setFormType(ch.type || 'text');
    setFormTopic(ch.topic || '');
    setFormDiscordId(ch.discordChannelId || '');
    setDetectChannelStatus(null);
    
    if (ch.charKey) {
      setFormAccessType('character');
      setFormTargetCharId(ch.charKey);
    } else if (ch.isPrivate) {
      setFormAccessType('custom');
      setFormAllowedEmails(ch.allowedEmails || []);
    } else {
      setFormAccessType('public');
      setFormAllowedEmails([]);
    }
    
    setShowChannelModal(true);
  };

  // GM: Save New or Edited Channel (All in one place)
  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formChannelName.trim() || !formCategory.trim()) {
      alert("Por favor, preencha o nome do canal e a categoria.");
      return;
    }

    const cleanName = formChannelName.trim();
    const channelDocId = channelToEdit ? channelToEdit.id : (cleanName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36));

    let isPrivate = false;
    let allowedEmails: string[] = [];
    let charKey: string | null = null;

    if (formAccessType === 'character') {
      isPrivate = true;
      charKey = formTargetCharId || null;
      const targetChar = characters.find(c => c.id === formTargetCharId);
      if (targetChar?.email_dono) {
        allowedEmails = [targetChar.email_dono.toLowerCase().trim()];
      }
    } else if (formAccessType === 'custom') {
      isPrivate = true;
      allowedEmails = formAllowedEmails.map(e => e.toLowerCase().trim()).filter(Boolean);
      charKey = null;
    } else {
      isPrivate = false;
      allowedEmails = [];
      charKey = null;
    }

    const channelPayload: Record<string, any> = {
      name: cleanName,
      category: formCategory.trim(),
      type: formType,
      topic: formTopic.trim() || '',
      isPrivate: isPrivate,
      allowedEmails: allowedEmails || [],
      charKey: charKey,
      discordChannelId: formDiscordId.trim() || '',
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'discord_channels', channelDocId), channelPayload, { merge: true });
      trackWrite('discord_channels', 1);
      setShowChannelModal(false);
    } catch (err: any) {
      console.error("Erro ao salvar canal:", err);
      alert(`Erro ao salvar canal no Firestore: ${err?.message || err}`);
    }
  };

  // GM: Delete Channel
  const handleDeleteChannel = async (ch: DiscordChannelItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmDelete = window.confirm(`Deseja realmente remover o canal "#${ch.name}"?`);
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'discord_channels', ch.id));
      trackDelete('discord_channels', 1);
      if (activeChannel?.id === ch.id) {
        setActiveChannel(null);
      }
    } catch (err) {
      console.error("Erro ao remover canal:", err);
      alert("Erro ao remover canal.");
    }
  };

  // Render Markdown
  const renderDiscordMarkdown = (text: string, msgId: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      if (line.startsWith('# ')) {
        return <h1 key={lineIdx} className="text-lg font-black text-white my-1 border-b border-white/10 pb-0.5">{parseInlineMarkdown(line.substring(2), msgId, lineIdx)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={lineIdx} className="text-base font-bold text-white my-1">{parseInlineMarkdown(line.substring(3), msgId, lineIdx)}</h2>;
      }
      if (line.startsWith('> ')) {
        return (
          <div key={lineIdx} className="border-l-4 border-[#4e5058] bg-[#2b2d31]/60 pl-3 py-1 my-1 text-[#dbdee1] font-sans text-xs">
            {parseInlineMarkdown(line.substring(2), msgId, lineIdx)}
          </div>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={lineIdx} className="flex items-start gap-2 ml-2 my-0.5">
            <span className="text-[#949ba4] font-bold">•</span>
            <span>{parseInlineMarkdown(line.substring(2), msgId, lineIdx)}</span>
          </div>
        );
      }
      return (
        <p key={lineIdx} className="min-h-[1.2em] leading-relaxed">
          {parseInlineMarkdown(line, msgId, lineIdx)}
        </p>
      );
    });
  };

  const highlightSearch = (text: string, keyPrefix: string): React.ReactNode => {
    if (!searchQuery.trim()) return text;
    const term = searchQuery.trim();
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    if (parts.length <= 1) return text;
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={`${keyPrefix}-hl-${i}`} className="bg-amber-400/30 text-amber-200 font-bold px-0.5 rounded border-b border-amber-400">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const parseInlineMarkdown = (lineText: string, msgId: string, lineIdx: number): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = lineText;
    let keyCounter = 0;

    while (remaining.length > 0) {
      // 1. Detect Discord / RPG Telumak Message Jump Links
      const msgLinkMatch = remaining.match(/^(?:https?:\/\/(?:[a-zA-Z0-9.-]+\.)?telumak\.rpg\/channels\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)|https?:\/\/(?:www\.)?discord\.com\/channels\/[a-zA-Z0-9_-]+\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)|https?:\/\/[^\s]+[#/]channel\/([a-zA-Z0-9_-]+)\/message\/([a-zA-Z0-9_-]+)|https?:\/\/[^\s]+#channel=([a-zA-Z0-9_-]+)&message=([a-zA-Z0-9_-]+))/i);
      if (msgLinkMatch) {
        const targetChId = msgLinkMatch[1] || msgLinkMatch[3] || msgLinkMatch[5] || msgLinkMatch[7];
        const targetMsgId = msgLinkMatch[2] || msgLinkMatch[4] || msgLinkMatch[6] || msgLinkMatch[8];
        const targetChannel = dbChannels.find(c => c.id === targetChId || c.discordChannelId === targetChId);
        const channelLabel = targetChannel ? targetChannel.name : 'canal';

        parts.push(
          <button
            type="button"
            key={`${msgId}-${lineIdx}-${keyCounter++}`}
            onClick={(e) => {
              e.stopPropagation();
              handleJumpToMessage(targetChId, targetMsgId);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 my-1 rounded-md bg-[#2b2d31] hover:bg-[#383a40] border border-[#3f4147] hover:border-[#5865f2] text-xs transition cursor-pointer text-[#dbdee1] group/msglink shadow-sm align-middle font-medium select-none"
            title={`Ir para mensagem no canal #${channelLabel}`}
          >
            <Link2 className="h-3.5 w-3.5 text-[#5865f2] group-hover/msglink:text-[#7289da] transition shrink-0" />
            <span className="text-[#5865f2] group-hover/msglink:text-white font-bold">#{channelLabel}</span>
            <span className="text-[#80848e] text-[10px]">•</span>
            <span className="text-white/80 group-hover/msglink:text-white text-[11px] flex items-center gap-1">
              Ir para a mensagem
              <ExternalLink className="h-3 w-3 text-[#949ba4] group-hover/msglink:text-white transition" />
            </span>
          </button>
        );
        remaining = remaining.substring(msgLinkMatch[0].length);
        continue;
      }

      const urlMatch = remaining.match(/^(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        parts.push(
          <a
            key={`${msgId}-${lineIdx}-${keyCounter++}`}
            href={urlMatch[1]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00a8fc] hover:underline cursor-pointer break-all"
          >
            {urlMatch[1]}
          </a>
        );
        remaining = remaining.substring(urlMatch[0].length);
        continue;
      }

      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        parts.push(
          <code key={`${msgId}-${lineIdx}-${keyCounter++}`} className="bg-[#1e1f22] text-[#e0e1e5] px-1.5 py-0.5 rounded font-mono text-[11px] border border-white/5">
            {highlightSearch(codeMatch[1], `${msgId}-${lineIdx}-${keyCounter}`)}
          </code>
        );
        remaining = remaining.substring(codeMatch[0].length);
        continue;
      }

      const spoilerMatch = remaining.match(/^\|\|([^|]+)\|\|/);
      if (spoilerMatch) {
        const spoilerKey = `${msgId}-${lineIdx}-${keyCounter++}`;
        const isRevealed = revealedSpoilers[spoilerKey];
        parts.push(
          <span
            key={spoilerKey}
            onClick={() => setRevealedSpoilers(prev => ({ ...prev, [spoilerKey]: !prev[spoilerKey] }))}
            className={`cursor-pointer transition-all px-1.5 py-0.5 rounded text-xs select-none ${
              isRevealed 
                ? 'bg-white/10 text-white border border-white/20' 
                : 'bg-[#202225] text-transparent hover:bg-[#2b2d31] rounded'
            }`}
            title={isRevealed ? 'Clique para ocultar spoiler' : 'Clique para revelar spoiler'}
          >
            {spoilerMatch[1]}
          </span>
        );
        remaining = remaining.substring(spoilerMatch[0].length);
        continue;
      }

      // Underline Combinations (__***, __**, __*, ___, __)
      const uBoldItalicMatch = remaining.match(/^__\*\*\*([^*_]+)\*\*\*__/);
      if (uBoldItalicMatch) {
        parts.push(
          <u key={`${msgId}-${lineIdx}-${keyCounter++}`} className="underline underline-offset-2">
            <strong className="font-black text-white">
              <em className="italic">
                {highlightSearch(uBoldItalicMatch[1], `${msgId}-${lineIdx}-${keyCounter}`)}
              </em>
            </strong>
          </u>
        );
        remaining = remaining.substring(uBoldItalicMatch[0].length);
        continue;
      }

      const uBoldMatch = remaining.match(/^__\*\*([^*_]+)\*\*__/);
      if (uBoldMatch) {
        parts.push(
          <u key={`${msgId}-${lineIdx}-${keyCounter++}`} className="underline underline-offset-2">
            <strong className="font-black text-white">
              {highlightSearch(uBoldMatch[1], `${msgId}-${lineIdx}-${keyCounter}`)}
            </strong>
          </u>
        );
        remaining = remaining.substring(uBoldMatch[0].length);
        continue;
      }

      const uItalicMatch = remaining.match(/^__\*([^*_]+)\*__/) || remaining.match(/^___([^_]+)___/);
      if (uItalicMatch) {
        parts.push(
          <u key={`${msgId}-${lineIdx}-${keyCounter++}`} className="underline underline-offset-2">
            <em className="italic">
              {highlightSearch(uItalicMatch[1], `${msgId}-${lineIdx}-${keyCounter}`)}
            </em>
          </u>
        );
        remaining = remaining.substring(uItalicMatch[0].length);
        continue;
      }

      const underlineMatch = remaining.match(/^__([^_]+)__/);
      if (underlineMatch) {
        parts.push(
          <u key={`${msgId}-${lineIdx}-${keyCounter++}`} className="underline underline-offset-2">
            {highlightSearch(underlineMatch[1], `${msgId}-${lineIdx}-${keyCounter}`)}
          </u>
        );
        remaining = remaining.substring(underlineMatch[0].length);
        continue;
      }

      // Bold & Italic (***text***)
      const boldItalicMatch = remaining.match(/^\*\*\*([^*]+)\*\*\*/);
      if (boldItalicMatch) {
        parts.push(
          <strong key={`${msgId}-${lineIdx}-${keyCounter++}`} className="font-black text-white">
            <em className="italic">
              {highlightSearch(boldItalicMatch[1], `${msgId}-${lineIdx}-${keyCounter}`)}
            </em>
          </strong>
        );
        remaining = remaining.substring(boldItalicMatch[0].length);
        continue;
      }

      // Bold (**text**)
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
      if (boldMatch) {
        parts.push(
          <strong key={`${msgId}-${lineIdx}-${keyCounter++}`} className="font-black text-white">
            {highlightSearch(boldMatch[1], `${msgId}-${lineIdx}-${keyCounter}`)}
          </strong>
        );
        remaining = remaining.substring(boldMatch[0].length);
        continue;
      }

      // Italic (*text* or _text_)
      const italicAsteriskMatch = remaining.match(/^\*([^*\n]+)\*/);
      if (italicAsteriskMatch) {
        parts.push(
          <em key={`${msgId}-${lineIdx}-${keyCounter++}`} className="italic text-[#e0e1e5]">
            {highlightSearch(italicAsteriskMatch[1], `${msgId}-${lineIdx}-${keyCounter}`)}
          </em>
        );
        remaining = remaining.substring(italicAsteriskMatch[0].length);
        continue;
      }

      const italicUnderscoreMatch = remaining.match(/^_([^_\n]+)_/);
      if (italicUnderscoreMatch) {
        parts.push(
          <em key={`${msgId}-${lineIdx}-${keyCounter++}`} className="italic text-[#e0e1e5]">
            {highlightSearch(italicUnderscoreMatch[1], `${msgId}-${lineIdx}-${keyCounter}`)}
          </em>
        );
        remaining = remaining.substring(italicUnderscoreMatch[0].length);
        continue;
      }

      // Strikethrough (~~text~~ or ~text~)
      const strikeDoubleMatch = remaining.match(/^~~([^~]+)~~/);
      if (strikeDoubleMatch) {
        parts.push(
          <del key={`${msgId}-${lineIdx}-${keyCounter++}`} className="line-through text-white/50">
            {highlightSearch(strikeDoubleMatch[1], `${msgId}-${lineIdx}-${keyCounter}`)}
          </del>
        );
        remaining = remaining.substring(strikeDoubleMatch[0].length);
        continue;
      }

      const strikeSingleMatch = remaining.match(/^~([^~\n]+)~/);
      if (strikeSingleMatch) {
        parts.push(
          <del key={`${msgId}-${lineIdx}-${keyCounter++}`} className="line-through text-white/50">
            {highlightSearch(strikeSingleMatch[1], `${msgId}-${lineIdx}-${keyCounter}`)}
          </del>
        );
        remaining = remaining.substring(strikeSingleMatch[0].length);
        continue;
      }

      // Match plain text up to next special markdown syntax token
      const plainMatch = remaining.match(/^[^*~`|>h\n_]+/i);
      if (plainMatch) {
        parts.push(highlightSearch(plainMatch[0], `${msgId}-${lineIdx}-${keyCounter++}`));
        remaining = remaining.substring(plainMatch[0].length);
        continue;
      }

      // If single special character or individual symbol
      const nextChar = Array.from(remaining)[0] || remaining[0];
      parts.push(highlightSearch(nextChar, `${msgId}-${lineIdx}-${keyCounter++}`));
      remaining = remaining.substring(nextChar.length);
    }

    return parts;
  };

  const toggleCategory = (catName: string) => {
    setCollapsedCategories(prev => ({ ...prev, [catName]: !prev[catName] }));
  };

  return (
    <div className="flex h-[84vh] max-h-[940px] w-full bg-[#313338] border border-[#232428] shadow-2xl rounded-lg overflow-hidden text-[#dbdee1] font-sans select-none relative">
      
      {/* Mobile Backdrop when Sidebar is Open */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-30 md:hidden animate-fade-in"
        />
      )}

      {/* 1. CHANNELS SIDEBAR */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-40 md:z-10
        w-72 md:w-64 bg-[#2b2d31] flex flex-col shrink-0 border-r border-[#1f2023]
        transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:flex'}
        ${!isSidebarOpen ? 'hidden md:flex' : 'flex shadow-2xl'}
      `}>
        
        {/* Header */}
        <div className="h-12 border-b border-[#1f2023] px-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="font-black text-xs text-white tracking-tight truncate">
              DISCORD & NOTEBOOK
            </span>
          </div>

          <div className="flex items-center gap-1">
            {isGM && (
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="p-1 text-[#949ba4] hover:text-[#5865f2] hover:bg-[#35373c] rounded transition flex items-center gap-1 text-[10px] font-bold"
                title="Abrir Tutorial / Guia do Bot do Discord"
              >
                <Bot className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tutorial</span>
              </button>
            )}

            {/* Mobile close sidebar button */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 text-[#949ba4] hover:text-white hover:bg-[#35373c] rounded transition md:hidden"
              title="Recolher Menu de Canais"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* GM Action: Add Channel */}
        {isGM && (
          <div className="p-2 bg-[#232428] border-b border-[#1f2023] flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenAddChannel()}
              className="flex-1 py-1.5 px-3 bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold rounded flex items-center justify-center gap-1.5 transition shadow"
            >
              <Plus className="h-4 w-4" />
              <span>Criar Canal</span>
            </button>
          </div>
        )}

        {/* Channels List (Grouped by Category) */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 custom-scroll">
          {groupedCategories.length === 0 ? (
            <div className="py-8 text-center px-4 space-y-2">
              <p className="text-xs text-[#949ba4]">
                Nenhum canal configurado.
              </p>
              {isGM && (
                <button
                  type="button"
                  onClick={() => handleOpenAddChannel()}
                  className="text-xs text-[#5865f2] hover:underline font-bold"
                >
                  + Criar o primeiro canal
                </button>
              )}
            </div>
          ) : (
            groupedCategories.map(({ category, items }, catIdx) => {
              const isCollapsed = collapsedCategories[category];
              return (
                <div key={catIdx} className="space-y-0.5">
                  
                  {/* Category Header */}
                  <div className="flex items-center justify-between px-1 py-1 text-[11px] font-black tracking-wider text-[#949ba4] hover:text-white cursor-pointer group">
                    <div 
                      onClick={() => toggleCategory(category)}
                      className="flex items-center gap-1 uppercase truncate flex-1"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-3 w-3 shrink-0" />
                      ) : (
                        <ChevronDown className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">{category}</span>
                    </div>

                    {/* GM Quick Add to Category */}
                    {isGM && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAddChannel(category);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-[#949ba4] hover:text-white transition"
                        title={`Adicionar canal em ${category}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Channels in Category */}
                  {!isCollapsed && (
                    <div className="space-y-0.5 pl-1">
                      {items.map((channel) => {
                        const isActive = activeChannel?.id === channel.id;
                        const isVoice = channel.type === 'voice';

                        return (
                          <div
                            key={channel.id}
                            onClick={() => {
                              setActiveChannel(channel);
                              setIsSidebarOpen(false);
                            }}
                            className={`w-full px-2 py-1.5 rounded flex items-center justify-between group transition cursor-pointer text-xs ${
                              isActive 
                                ? 'bg-[#404249] text-white font-bold' 
                                : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              {isVoice ? (
                                <Volume2 className="h-4 w-4 text-[#949ba4] shrink-0" />
                              ) : (
                                <Hash className="h-4 w-4 text-[#949ba4] shrink-0" />
                              )}
                              
                              <span className="truncate">{channel.name}</span>

                              {/* Lock badge if private */}
                              {channel.isPrivate && (
                                <Lock className="h-3 w-3 text-amber-400 shrink-0" />
                              )}
                            </div>

                            {/* GM Channel Controls: Edit & Delete */}
                            {isGM && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1">
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenEditChannel(channel, e)}
                                  className="p-1 hover:text-sky-400 rounded transition"
                                  title="Editar canal e conexão do Discord"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteChannel(channel, e)}
                                  className="p-1 hover:text-rose-400 rounded transition"
                                  title="Remover canal"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        {/* Bottom User Controls Widget */}
        <div className="h-14 bg-[#232428] px-2.5 flex items-center justify-between shrink-0 border-t border-[#1f2023]">
          <button
            type="button"
            onClick={() => {
              setIdentityName(effectiveDiscordName);
              setIdentityTag(effectiveDiscordTag);
              setIdentityAvatar(currentUserProfile?.discordAvatar || currentUserProfile?.photoURL || '');
                              setIdentityQuickSheet(currentUserProfile?.quickSheetSections || []);
              setShowIdentityModal(true);
            }}
            className="flex items-center gap-2 overflow-hidden hover:bg-[#35373c]/70 p-1.5 rounded transition text-left group flex-1 min-w-0"
            title="Editar seu Nome de Exibição, #tag e Avatar no Discord"
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-[#1e1f22] overflow-hidden border border-white/10 flex items-center justify-center font-bold text-white text-xs">
                {effectiveDiscordAvatar ? (
                  <img src={effectiveDiscordAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{effectiveDiscordName?.[0] || (isGM ? 'GM' : 'U')}</span>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#23a55a] rounded-full border-2 border-[#232428]" />
            </div>
            <div className="overflow-hidden min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="text-xs font-bold text-white truncate leading-tight group-hover:text-[#5865f2] transition">
                  {effectiveDiscordName}
                </p>
                <Edit2 className="h-2.5 w-2.5 text-white/30 group-hover:text-[#5865f2] shrink-0 opacity-0 group-hover:opacity-100 transition" />
              </div>
              <p className="text-[10px] text-[#949ba4] font-mono truncate leading-tight">
                {effectiveDiscordTag}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-0.5 text-[#b5bac1] shrink-0 relative">
            {isGM && (
              <>
                <button
                  type="button"
                  onClick={() => setShowPcMenu(!showPcMenu)}
                  className={`p-1.5 rounded transition ${showPcMenu ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-[#35373c] hover:text-white'}`}
                  title="Janela de Seleção de Jogadores"
                >
                  <Users className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowNpcMenu(!showNpcMenu)}
                  className={`p-1.5 rounded transition ${showNpcMenu ? 'bg-sky-500/20 text-sky-400' : 'hover:bg-[#35373c] hover:text-white'}`}
                  title="Janela de Seleção de NPCs"
                >
                  <Bot className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {myActiveCharacter && (
            <button
              type="button"
              onClick={() => setShowQuickSheet(!showQuickSheet)}
              className={`p-1.5 rounded transition ${showQuickSheet ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-[#35373c] hover:text-white'}`}
              title="Ficha Rápida (Pocket)"
            >
              <FileText className="h-3.5 w-3.5" />
            </button>
          )}
            <button
              type="button"
              onClick={() => {
                setIdentityName(effectiveDiscordName);
                setIdentityTag(effectiveDiscordTag);
                setIdentityAvatar(currentUserProfile?.discordAvatar || currentUserProfile?.photoURL || '');
                                setIdentityQuickSheet(currentUserProfile?.quickSheetSections || []);
                setShowIdentityModal(true);
              }}
              className="p-1.5 rounded hover:bg-[#35373c] hover:text-white transition"
              title="Configurar Perfil e Identidade no Discord"
            >
              <Sliders className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* 2. MAIN CENTER AREA: MESSAGES STREAM & RICH INPUT */}
      <div className="flex-1 flex flex-col bg-[#313338] min-w-0 relative">
        
        {/* Top Channel Header */}
        <div className="h-12 border-b border-[#1f2023] px-3 sm:px-4 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile Sidebar Toggle Button */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="p-1.5 -ml-1 text-[#b5bac1] hover:text-white hover:bg-[#35373c] rounded transition flex items-center gap-1 md:hidden"
              title={isSidebarOpen ? "Recolher canais" : "Abrir menu de canais"}
            >
              <Menu className="h-5 w-5" />
            </button>

            {activeChannel?.type === 'voice' ? (
              <Volume2 className="h-5 w-5 text-[#80848e] shrink-0" />
            ) : (
              <Hash className="h-5 w-5 text-[#80848e] shrink-0" />
            )}
            <h3 className="font-black text-sm text-white truncate">
              {activeChannel?.name || 'Selecione um canal'}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-[#b5bac1]">
                        {/* Google Meet Button */}
            {isGM ? (
              meetSession?.url ? (
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={meetSession.url}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-bold transition border border-emerald-500/30"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Entrar na Mesa</span>
                  </a>
                  <button
                    onClick={handleCloseMeet}
                    className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition border border-transparent hover:border-red-500/30"
                    title="Fechar Mesa (Remover link)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleMeetLogin()}
                  disabled={isCreatingMeet}
                  className="bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-bold transition border border-sky-500/30 disabled:opacity-50 shrink-0"
                  title="Criar sala do Google Meet para a mesa"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isCreatingMeet ? 'Criando...' : 'Abrir Mesa no Meet'}</span>
                </button>
              )
            ) : (
              (myActiveCharacter?.ativo_na_mesa && meetSession?.url) && (
                <a
                  href={meetSession.url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-bold transition border border-emerald-500/30 animate-pulse shrink-0"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Entrar na Mesa</span>
                </a>
              )
            )}
            
            <div className="w-px h-6 bg-[#4e5058] mx-1 hidden sm:block"></div>

            {/* Export Messages Button */}
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="text-[#b5bac1] hover:text-[#dbdee1] p-1 rounded hover:bg-[#3f4147] transition-colors flex items-center"
              title="Exportar Mensagens"
            >
              <Download className="h-5 w-5" />
            </button>
            
            {/* Pinned Messages Filter Toggle */}
            <button
              type="button"
              onClick={() => setFilterPinnedOnly(!filterPinnedOnly)}
              className={`p-1.5 rounded transition flex items-center gap-1 text-xs font-bold ${
                filterPinnedOnly 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                  : 'hover:bg-[#35373c] hover:text-white'
              }`}
              title="Filtrar apenas mensagens fixadas"
            >
              <Pin className={`h-4 w-4 ${filterPinnedOnly ? 'fill-current' : ''}`} />
              {pinnedCount > 0 && <span>{pinnedCount}</span>}
            </button>

            {/* Search Box */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar no canal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-32 sm:w-48 bg-[#1e1f22] text-xs text-white placeholder-[#80848e] pl-7 pr-6 py-1 rounded focus:outline-none focus:ring-1 focus:ring-[#5865f2] transition-all"
              />
              <Search className="h-3.5 w-3.5 text-[#80848e] absolute left-2 top-2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-white/50 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages Stream Container */}
        <div 
          ref={chatScrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scroll relative"
        >
          {activeChannel ? (
            <>
              {/* Channel Start Welcome Header */}
              <div className="pt-4 pb-2 space-y-1">
                <div className="w-14 h-14 rounded-full bg-[#2b2d31] flex items-center justify-center text-white mb-2">
                  {activeChannel.type === 'voice' ? (
                    <Volume2 className="h-8 w-8 text-white" />
                  ) : (
                    <Hash className="h-8 w-8 text-white" />
                  )}
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  Bem-vindo ao #{activeChannel.name}!
                </h2>
                <p className="text-xs text-[#949ba4]">
                  {activeChannel.topic || `Este é o início do canal #${activeChannel.name}. Anotações sincronizadas em tempo real.`}
                </p>
              </div>

              {/* Load Earlier Messages Button */}
              {hasMoreMessages && (
                <div className="text-center py-2">
                  <button
                    type="button"
                    onClick={() => setMessageLimit(prev => prev + 50)}
                    className="px-4 py-1.5 bg-[#2b2d31] hover:bg-[#35373c] text-sky-400 hover:text-white border border-blue-500/20 text-xs font-bold transition flex items-center gap-1.5 mx-auto rounded"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                    <span>Carregar mensagens anteriores (+50)</span>
                  </button>
                </div>
              )}

              {/* Dynamic Real-Time Messages from Firestore */}
              {filteredMessages.length === 0 && (
                <div className="py-12 text-center text-xs text-[#949ba4] italic">
                  Nenhuma anotação neste canal ainda. Envie a primeira mensagem abaixo!
                </div>
              )}

              {filteredMessages.map((msg, idx) => {
                const isBot = msg.authorName.includes('[Discord]') || msg.authorName.includes('BOT') || msg.isFromDiscord;
                const avatarUrl = msg.authorAvatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
                const isPinned = !!msg.pinned;
                const isHighlighted = highlightedMessageId === msg.id;
                const isOwner = currentUserProfile?.email && msg.authorEmail === currentUserProfile.email;
                const canDelete = isGM || isOwner;
                
                let timeStr = 'Agora';
                let fullDateStr = '';
                if (msg.createdAt) {
                  const d = msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
                  if (!isNaN(d.getTime())) {
                    timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    fullDateStr = d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
                  }
                }

                return (
                  <div 
                    key={msg.id || idx}
                    id={`msg-${msg.id}`}
                    className={`group relative flex items-start gap-3.5 -mx-4 px-4 py-2 transition-all duration-300 rounded ${
                      isHighlighted
                        ? 'bg-[#5865f2]/25 ring-2 ring-[#5865f2] border-l-4 border-[#5865f2] shadow-md'
                        : isPinned 
                          ? 'bg-amber-500/[0.06] border-l-4 border-amber-500 hover:bg-amber-500/[0.09]' 
                          : 'hover:bg-[#2e3035] border-l-4 border-transparent'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#1e1f22] overflow-hidden shrink-0 mt-0.5 shadow border border-white/5">
                      <img src={avatarUrl} alt={msg.authorName} className="w-full h-full object-cover" />
                    </div>

                    {/* Message Body */}
                    <div className="flex-1 min-w-0">
                      
                      {isPinned && (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold mb-1">
                          <Pin className="h-3 w-3 fill-current" />
                          <span>Mensagem Fixada {msg.pinnedBy ? `por ${msg.pinnedBy}` : ''}</span>
                        </div>
                      )}

                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-[13px] text-white hover:underline cursor-pointer">
                          {highlightSearch(msg.authorName, `author-${msg.id}`)}
                        </span>
                        {isBot && (
                          <span className="bg-[#5865f2] text-white text-[9px] font-black uppercase px-1 py-0.2 rounded font-mono">
                            APP
                          </span>
                        )}
                        <span className="text-[10px] text-[#949ba4] font-mono" title={fullDateStr}>
                          {timeStr}
                        </span>
                      </div>

                      {/* Message Content or Edit Form */}
                      {editingMessage?.id === msg.id ? (
                        <div className="mt-2 space-y-2 bg-[#2b2d31] p-3 rounded border border-[#5865f2]/40">
                          <textarea
                            value={editContentText}
                            onChange={(e) => setEditContentText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveEditMessage(msg);
                              } else if (e.key === 'Escape') {
                                handleCancelEditMessage();
                              }
                            }}
                            rows={3}
                            className="w-full bg-[#1e1f22] text-white text-[13px] p-2 rounded border border-white/10 focus:outline-none focus:border-[#5865f2] resize-none font-sans leading-relaxed custom-scroll"
                            placeholder="Editar anotação..."
                            autoFocus
                          />
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[#949ba4]">
                              pressione <strong className="text-white">Enter</strong> para salvar • <strong className="text-white">Esc</strong> para cancelar
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleCancelEditMessage}
                                className="px-2.5 py-1 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded transition font-medium"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                disabled={isSavingEdit || !editContentText.trim()}
                                onClick={() => handleSaveEditMessage(msg)}
                                className="px-3 py-1 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white rounded transition font-bold flex items-center gap-1 shadow-sm"
                              >
                                {isSavingEdit ? 'Salvando...' : 'Salvar'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[13px] text-[#dbdee1] mt-0.5 font-sans break-words select-text leading-relaxed">
                          {renderDiscordMarkdown(msg.content, msg.id || `${idx}`)}
                          {(msg as any).editedAt && (
                            <span className="text-[10px] text-[#949ba4] font-normal ml-1 select-none">
                              (editado)
                            </span>
                          )}
                        </div>
                      )}

                      {/* Attachment Images */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {msg.attachments.map((att, attIdx) => (
                            <div key={attIdx} className="max-w-md rounded-lg overflow-hidden border border-white/10 shadow-lg bg-black/40">
                              <img src={att} alt="Anexo" className="w-full h-auto max-h-96 object-contain" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Action Floating Bar */}
                    <div className="absolute right-3 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#2b2d31] border border-[#3f4147] rounded shadow-md flex items-center p-0.5 z-10">
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleStartEditMessage(msg)}
                          className="p-1.5 text-white/60 hover:text-white hover:bg-[#35373c] rounded transition"
                          title="Editar anotação"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleTogglePin(msg)}
                        className={`p-1.5 rounded transition ${
                          isPinned 
                            ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30' 
                            : 'text-white/60 hover:text-amber-400 hover:bg-[#35373c]'
                        }`}
                        title={isPinned ? "Desafixar mensagem" : "Fixar mensagem"}
                      >
                        {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyMessageLink(msg)}
                        className="p-1.5 text-white/60 hover:text-[#5865f2] hover:bg-[#35373c] rounded transition"
                        title="Copiar link da mensagem"
                      >
                        {copiedLinkMsgId === msg.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Link2 className="h-3.5 w-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuoteMessage(msg)}
                        className="p-1.5 text-white/60 hover:text-white hover:bg-[#35373c] rounded transition"
                        title="Citar anotação"
                      >
                        <MessageSquareQuote className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg)}
                        className="p-1.5 text-white/60 hover:text-white hover:bg-[#35373c] rounded transition"
                        title="Copiar texto"
                      >
                        {copiedMsgId === msg.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg)}
                          className="p-1.5 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                          title="Apagar anotação"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}

              <div ref={chatEndRef} />

              {/* Scroll to Bottom Floating Button */}
              {showScrollBottom && (
                <button
                  type="button"
                  onClick={scrollToBottom}
                  className="sticky bottom-2 left-1/2 -translate-x-1/2 bg-[#5865f2] hover:bg-[#4752c4] text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-1.5 transition-all z-20 border border-white/20"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  <span>Mais Recentes</span>
                </button>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <Hash className="h-12 w-12 text-[#949ba4]/40" />
              <h3 className="text-base font-bold text-white">Nenhum canal selecionado</h3>
              <p className="text-xs text-[#949ba4] max-w-sm">
                {isGM 
                  ? "Crie ou selecione um canal na barra lateral para começar a registrar anotações."
                  : "Aguarde o Mestre liberar o acesso a canais para o seu personagem."}
              </p>
              {isGM && (
                <button
                  type="button"
                  onClick={() => handleOpenAddChannel()}
                  className="py-2 px-4 bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold rounded shadow transition"
                >
                  + Criar Canal Agora
                </button>
              )}
            </div>
          )}

        </div>

        {/* Formatting Toolbar Above Input Box */}
        {activeChannel && (
          <div className="bg-[#313338] px-4 pt-1 flex items-center justify-between text-[#b5bac1]">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => insertFormatting('**')}
                className="p-1 hover:bg-[#35373c] hover:text-white rounded transition text-[11px] font-bold"
                title="Negrito (**texto**)"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('*')}
                className="p-1 hover:bg-[#35373c] hover:text-white rounded transition"
                title="Itálico (*texto*)"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('__')}
                className="p-1 hover:bg-[#35373c] hover:text-white rounded transition"
                title="Sublinhado (__texto__)"
              >
                <Underline className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('~~')}
                className="p-1 hover:bg-[#35373c] hover:text-white rounded transition"
                title="Riscado (~~texto~~)"
              >
                <Strikethrough className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('||')}
                className="p-1 hover:bg-[#35373c] hover:text-white rounded transition"
                title="Spoiler (||texto||)"
              >
                <EyeOff className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('> ')}
                className="p-1 hover:bg-[#35373c] hover:text-white rounded transition"
                title="Citação (> texto)"
              >
                <Quote className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('`')}
                className="p-1 hover:bg-[#35373c] hover:text-white rounded transition"
                title="Código inline (`código`)"
              >
                <Code className="h-3.5 w-3.5" />
              </button>

              {/* Emoji Picker Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-1 rounded transition text-[11px] font-bold flex items-center gap-1 ${
                    showEmojiPicker ? 'bg-[#5865f2] text-white' : 'hover:bg-[#35373c] hover:text-white text-amber-400'
                  }`}
                  title="Inserir Emoji no Texto"
                >
                  <Smile className="h-3.5 w-3.5" />
                </button>

                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 bg-[#2b2d31] border border-[#1f2023] rounded-lg shadow-2xl p-3 z-30 space-y-2">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <span className="text-[10px] font-black uppercase text-[#949ba4] tracking-wider">
                        Inserir Emojis
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(false)}
                        className="text-[#949ba4] hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>

                    {/* RPG & Fantasia */}
                    <div>
                      <span className="text-[9px] font-bold text-[#949ba4] uppercase block mb-1">RPG & Fantasia</span>
                      <div className="grid grid-cols-8 gap-1 text-base">
                        {['🎲', '⚔️', '🛡️', '📜', '🏹', '🗡️', '🧙', '👑', '✨', '🩸', '💀', '🔥', '🍺', '💰', '🗺️', '👁️'].map((em, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => insertEmoji(em)}
                            className="p-1 hover:bg-white/10 rounded transition text-center hover:scale-125"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Símbolos & Ações */}
                    <div>
                      <span className="text-[9px] font-bold text-[#949ba4] uppercase block mb-1">Símbolos & Ações</span>
                      <div className="grid grid-cols-8 gap-1 text-base">
                        {['🎯', '🧪', '🗝️', '🐺', '🐲', '💎', '⏳', '🕯️', '⚠️', '💬', '❓', '❗', '⚡', '💥', '🩸', '🔒'].map((em, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => insertEmoji(em)}
                            className="p-1 hover:bg-white/10 rounded transition text-center hover:scale-125"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Expressões */}
                    <div>
                      <span className="text-[9px] font-bold text-[#949ba4] uppercase block mb-1">Expressões</span>
                      <div className="grid grid-cols-8 gap-1 text-base">
                        {['😊', '😂', '😎', '🤔', '😱', '🤫', '🤝', '👍', '👎', '❤️', '🔥', '👏', '💯', '🚩', '👀', '🎉'].map((em, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => insertEmoji(em)}
                            className="p-1 hover:bg-white/10 rounded transition text-center hover:scale-125"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMentionRollModal(true)}
                className="p-1 text-sky-400 hover:bg-[#35373c] rounded transition flex items-center gap-1 text-[11px] font-bold"
                title="Mencionar Rolagem"
              >
                <Dices className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mencionar Rolagem</span>
              </button>
            </div>
          </div>
        )}

        {/* Input Bar */}
        {activeChannel && (
          <div className="p-4 pt-1 bg-[#313338] shrink-0">
            
            {/* Pending image preview */}
            {attachedImage && (
              <div className="mb-2 bg-[#2b2d31] p-2 rounded-lg border border-white/10 flex items-center justify-between max-w-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <img src={attachedImage} alt="Preview" className="w-12 h-12 object-cover rounded" />
                  <span className="text-xs text-white truncate font-bold">Imagem Anexada</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className="p-1 text-white/50 hover:text-rose-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="bg-[#383a40] rounded-lg p-3 flex flex-col gap-2 focus-within:ring-1 focus-within:ring-[#5865f2] transition shadow-inner">
              
              {/* Textarea container with flexible vertical resize */}
              <div className="flex items-start gap-2">
                {/* Attachment Plus button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAttachImage}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-[#4e5058] hover:bg-[#6d6f78] text-white rounded-full transition shrink-0 mt-0.5"
                  title="Anexar Imagem"
                >
                  <Plus className="h-4 w-4" />
                </button>

                {/* Resizable Textarea */}
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Conversar em #${activeChannel.name}... (ou digite uma rolagem como 4+2d10!9)`}
                  rows={3}
                  className="flex-1 bg-transparent text-white text-xs placeholder-[#80848e] focus:outline-none resize-y min-h-[56px] max-h-96 py-1 px-1 custom-scroll leading-relaxed"
                />
              </div>

              {/* Input Bottom Utility Bar: Character counter & Action buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[#b5bac1]">
                
                {/* Discord Character Limit Indicator */}
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition ${
                    inputText.length > DISCORD_FREE_MAX_CHARS 
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-black animate-pulse' 
                      : inputText.length > DISCORD_FREE_MAX_CHARS * 0.9
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'text-[#949ba4]'
                  }`}>
                    {inputText.length} / {DISCORD_FREE_MAX_CHARS}
                  </span>
                  
                  {inputText.length > DISCORD_FREE_MAX_CHARS && (
                    <span className="text-[10px] text-rose-400 font-bold hidden sm:inline">
                      Limite gratuito excedido!
                    </span>
                  )}
                </div>

                {/* Send button */}
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !attachedImage) || isSending || inputText.length > DISCORD_FREE_MAX_CHARS}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      (inputText.trim() || attachedImage) && !isSending && inputText.length <= DISCORD_FREE_MAX_CHARS
                        ? 'bg-[#5865f2] hover:bg-[#4752c4] text-white shadow' 
                        : 'bg-white/5 text-white/20 cursor-not-allowed'
                    }`}
                    title="Enviar mensagem (Enter)"
                  >
                    {isSending ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Enviar</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

            </form>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL: CRIAR / CONFIGURAR CANAL (CENTRALIZADO PARA O GM) */}
      {/* ========================================================================= */}
      {showChannelModal && isGM && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#313338] border border-[#232428] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in text-[#dbdee1]">
            
            <div className="px-6 py-4 bg-[#2b2d31] border-b border-[#1f2023] flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Hash className="h-5 w-5 text-[#5865f2]" />
                {channelToEdit ? 'Configurar Canal' : 'Criar Novo Canal'}
              </h3>
              <button
                type="button"
                onClick={() => setShowChannelModal(false)}
                className="text-[#949ba4] hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChannel} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto custom-scroll">
              
              {/* 1. Conexão e Detecção com o Discord (ID do Canal) */}
              <div className="bg-[#232428] p-3.5 rounded-lg border border-[#5865f2]/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#5865f2] animate-pulse" />
                    <label className="text-[11px] font-black uppercase tracking-wider text-white">
                      ID do Canal no Discord (Auto-detecção & Sincronização)
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGuideModal(true)}
                    className="text-[10px] text-[#5865f2] hover:underline font-bold flex items-center gap-1"
                  >
                    <Bot className="h-3 w-3" />
                    Como pegar o ID?
                  </button>
                </div>
                
                <p className="text-[10px] text-[#949ba4] leading-relaxed">
                  Insira o ID numérico do canal do seu Discord para autodetectar o nome, categoria e validar se o bot tem acesso.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formDiscordId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormDiscordId(val);
                      // Auto-trigger when pasting a 17-20 digit discord snowflake ID
                      const trimmed = val.trim();
                      if (/^\d{17,20}$/.test(trimmed) && trimmed !== formDiscordId) {
                        handleDetectDiscordChannel(trimmed);
                      }
                    }}
                    placeholder="ex: 1455643268833607823"
                    className="flex-1 bg-[#1e1f22] text-white px-3 py-2 rounded border border-white/10 font-mono text-xs focus:outline-none focus:border-[#5865f2]"
                  />
                  <button
                    type="button"
                    disabled={isDetectingChannel || !formDiscordId.trim()}
                    onClick={() => handleDetectDiscordChannel()}
                    className="px-3 py-2 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-40 text-white font-bold rounded flex items-center gap-1.5 transition text-xs shrink-0 shadow"
                    title="Detectar nome do canal e validar status no Discord"
                  >
                    {isDetectingChannel ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Search className="h-3.5 w-3.5" />
                    )}
                    <span>{isDetectingChannel ? 'Detectando...' : 'Detectar'}</span>
                  </button>
                </div>

                {/* Detection Status Result Card */}
                {detectChannelStatus && (
                  <div className={`p-3 rounded border text-[11px] flex items-start gap-2.5 animate-in fade-in ${
                    detectChannelStatus.success 
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                      : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  }`}>
                    {detectChannelStatus.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    )}
                    <div className="leading-snug space-y-1">
                      <p className="font-medium font-sans">{detectChannelStatus.message}</p>
                      {detectChannelStatus.guildName && (
                        <p className="text-[10px] opacity-80 font-sans">
                          Nome detectado e preenchido automaticamente nos campos abaixo.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Nome do Canal & Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#949ba4] mb-1">
                    Nome do Canal *
                  </label>
                  <input
                    type="text"
                    required
                    value={formChannelName}
                    onChange={(e) => setFormChannelName(e.target.value)}
                    placeholder="ex: avisos, 📜-lore, ⚔️-combates, diario-leon"
                    className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded border border-white/10 focus:outline-none focus:border-[#5865f2]"
                  />
                  <p className="text-[10px] text-[#949ba4] mt-0.5">Permite emojis diretamente no nome (ex: 🎲 rolagens, ⚔️ geral)</p>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#949ba4] mb-1">
                    Categoria *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="ex: GERAL, ANOTAÇÕES, CRIME"
                    className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded border border-white/10 focus:outline-none focus:border-[#5865f2]"
                  />
                </div>
              </div>

              {/* 3. Tipo de Canal */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#949ba4] mb-1">
                  Tipo de Canal
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as 'text' | 'voice')}
                  className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded border border-white/10 focus:outline-none focus:border-[#5865f2]"
                >
                  <option value="text"># Canal de Texto</option>
                  <option value="voice">🔊 Canal de Voz</option>
                </select>
              </div>

              {/* 4. Tópico / Descrição */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#949ba4] mb-1">
                  Tópico / Descrição
                </label>
                <input
                  type="text"
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  placeholder="Descrição exibida no topo do canal para os jogadores"
                  className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded border border-white/10 focus:outline-none focus:border-[#5865f2]"
                />
              </div>

              {/* 5. Controle de Acesso / Permissões do Canal */}
              <div className="bg-[#232428] p-3.5 rounded-lg border border-white/10 space-y-3">
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#949ba4]">
                  Quem pode ver este canal?
                </label>

                <div className="space-y-2">
                  {/* Opção 1: Público */}
                  <label className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                    formAccessType === 'public' 
                      ? 'bg-[#5865f2]/10 border-[#5865f2] text-white' 
                      : 'bg-[#1e1f22] border-white/5 text-[#949ba4] hover:bg-[#2b2d31]'
                  }`}>
                    <input
                      type="radio"
                      name="accessType"
                      checked={formAccessType === 'public'}
                      onChange={() => setFormAccessType('public')}
                      className="accent-[#5865f2]"
                    />
                    <div>
                      <p className="font-bold text-xs">Público (Todos os Jogadores)</p>
                      <p className="text-[10px] opacity-75">Todos os membros da campanha podem ver e escrever neste canal.</p>
                    </div>
                  </label>

                  {/* Opção 2: Canal de um Personagem Específico */}
                  <label className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                    formAccessType === 'character' 
                      ? 'bg-[#5865f2]/10 border-[#5865f2] text-white' 
                      : 'bg-[#1e1f22] border-white/5 text-[#949ba4] hover:bg-[#2b2d31]'
                  }`}>
                    <input
                      type="radio"
                      name="accessType"
                      checked={formAccessType === 'character'}
                      onChange={() => setFormAccessType('character')}
                      className="accent-[#5865f2]"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-xs">Notebook de Personagem Específico</p>
                      <p className="text-[10px] opacity-75">Apenas o jogador dono do personagem e o GM terão acesso.</p>
                    </div>
                  </label>

                  {formAccessType === 'character' && (
                    <div className="pl-6 pt-1">
                      <select
                        value={formTargetCharId}
                        onChange={(e) => setFormTargetCharId(e.target.value)}
                        className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded border border-[#5865f2] font-bold text-xs"
                      >
                        <option value="">-- Selecione o Personagem --</option>
                        {characters.map((char) => (
                          <option key={char.id} value={char.id}>
                            {char.nome} {char.email_dono ? `(${char.email_dono})` : '(Sem jogador vinculado)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Opção 3: Permissões Personalizadas por Email */}
                  <label className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                    formAccessType === 'custom' 
                      ? 'bg-[#5865f2]/10 border-[#5865f2] text-white' 
                      : 'bg-[#1e1f22] border-white/5 text-[#949ba4] hover:bg-[#2b2d31]'
                  }`}>
                    <input
                      type="radio"
                      name="accessType"
                      checked={formAccessType === 'custom'}
                      onChange={() => setFormAccessType('custom')}
                      className="accent-[#5865f2]"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-xs">Canal Privado Personalizado</p>
                      <p className="text-[10px] opacity-75">Escolha múltiplos jogadores manualmente por e-mail.</p>
                    </div>
                  </label>

                  {formAccessType === 'custom' && (
                    <div className="pl-6 pt-1 space-y-1.5 max-h-32 overflow-y-auto custom-scroll">
                      {characters.map((char) => {
                        const email = char.email_dono || '';
                        if (!email) return null;
                        const isChecked = formAllowedEmails.includes(email);

                        return (
                          <label key={char.id} className="flex items-center gap-2 p-1.5 rounded bg-[#1e1f22] hover:bg-[#2e3035] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormAllowedEmails(prev => [...prev, email]);
                                } else {
                                  setFormAllowedEmails(prev => prev.filter(em => em !== email));
                                }
                              }}
                              className="w-3.5 h-3.5 accent-[#5865f2] rounded"
                            />
                            <span className="text-white font-bold">{char.nome}</span>
                            <span className="text-[10px] text-[#949ba4]">({email})</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-3 flex items-center justify-between border-t border-[#1f2023]">
                {channelToEdit && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteChannel(channelToEdit, e)}
                    className="px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded flex items-center gap-1 transition text-xs font-bold"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Excluir Canal</span>
                  </button>
                )}
                
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowChannelModal(false)}
                    className="px-4 py-2 rounded hover:underline text-[#949ba4] hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold rounded shadow transition"
                  >
                    {channelToEdit ? 'Salvar Configurações' : 'Criar Canal'}
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Mention Existing Message / Quick Dice Roller Modal */}
      {showMentionRollModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#313338] border border-[#232428] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl text-[#dbdee1] animate-fade-in">
            <div className="px-6 py-4 bg-[#2b2d31] border-b border-[#1f2023] flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Dices className="h-4 w-4 text-[#5865f2]" />
                Rolador de Dados & Menções (Rollem)
              </h3>
              <button
                type="button"
                onClick={() => setShowMentionRollModal(false)}
                className="text-[#949ba4] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Formula explanation */}
              <div className="p-3 bg-[#1e1f22] border border-white/5 rounded-lg space-y-1.5">
                <span className="text-[11px] font-black text-white block uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  Sintaxe de Rolagem Telumak: `a + xdy!z`
                </span>
                <p className="text-[#949ba4] text-[11px] leading-relaxed">
                  Digite qualquer fórmula no chat para rolar dados em tempo real. Críticos com <code className="text-amber-300 font-bold">!z</code> explodem e rolam mais dados sucessivamente!
                </p>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] text-[#dbdee1] pt-1">
                  <div><strong className="text-sky-400">a:</strong> Modificador (+/- fixo)</div>
                  <div><strong className="text-sky-400">x:</strong> Quantidade de dados</div>
                  <div><strong className="text-sky-400">y:</strong> Faces do dado (ex: d10)</div>
                  <div><strong className="text-amber-400">!z:</strong> Explosão no crítico (ex: !9)</div>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-[#949ba4] tracking-wider block mb-2">
                  Atalhos Rápidos de Rolagem (Clique para inserir ou rolar)
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { formula: '4+2d10!9', label: 'Exemplo Telumak (Crítico >= 9)' },
                    { formula: '2d10!10', label: 'Teste Padrão d10 (Crítico 10)' },
                    { formula: '1d20!20+5', label: 'Ataque d20 com Explosão' },
                    { formula: '3d6', label: 'Atributo 3d6 Clássico' },
                    { formula: '4d10!8+2', label: 'Golpe Crítico Letal (!8)' },
                    { formula: '1d100', label: 'Teste Percentual (d100)' }
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInputText(item.formula);
                        setShowMentionRollModal(false);
                        textareaRef.current?.focus();
                      }}
                      className="p-2.5 bg-[#2b2d31] hover:bg-[#35373c] hover:border-[#5865f2] text-white rounded text-left border border-white/5 transition group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sky-400 group-hover:text-white text-xs">{item.formula}</span>
                        <Dices className="h-3 w-3 text-sky-400 opacity-50 group-hover:opacity-100" />
                      </div>
                      <span className="text-[10px] text-[#949ba4] block mt-0.5">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mensagens recentes para citação rápida */}
              {messages.length > 0 && (
                <div className="pt-2 border-t border-white/5">
                  <span className="text-[10px] font-black uppercase text-[#949ba4] tracking-wider block mb-2">
                    Citar Mensagem Existente do Canal
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 custom-scroll">
                    {messages.slice(-5).reverse().map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          handleQuoteMessage(m);
                          setShowMentionRollModal(false);
                        }}
                        className="w-full p-2 bg-[#2b2d31] hover:bg-[#35373c] rounded text-left border border-white/5 transition flex items-start gap-2"
                      >
                        <MessageSquareQuote className="h-3.5 w-3.5 text-[#5865f2] shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-[11px] truncate">{m.authorName}</span>
                            <span className="text-[9px] text-[#949ba4]">{m.createdAt ? 'Enviada' : ''}</span>
                          </div>
                          <p className="text-[10px] text-[#949ba4] truncate">{m.content}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Crop Modal */}
      {showCropModal && pendingCropImage && (
        <ImageCropModal
          isOpen={showCropModal}
          imageUrl={pendingCropImage}
          onSave={(croppedUrl) => {
            setAttachedImage(croppedUrl);
            setShowCropModal(false);
            setPendingCropImage(null);
          }}
          onClose={() => {
            setShowCropModal(false);
            setPendingCropImage(null);
          }}
        />
      )}

      {/* Discord Identity Customization Modal (GM & Player Name & #tag) */}
      {showIdentityModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#313338] border border-[#232428] rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in text-[#dbdee1]">
            
            <div className="px-6 py-4 bg-[#2b2d31] border-b border-[#1f2023] flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-[#5865f2]" />
                Personalizar Perfil no Discord
              </h3>
              <button
                type="button"
                onClick={() => setShowIdentityModal(false)}
                className="text-[#949ba4] hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIdentity} className="p-6 space-y-4 text-xs">
              <p className="text-[11px] text-[#949ba4] leading-relaxed">
                Configure como seu nome, tag discriminador (<code className="text-sky-400 font-mono">#tag</code>) e avatar aparecerão nas mensagens e na barra de canais do Discord.
              </p>

              {/* Live Preview Card */}
              <div className="bg-[#232428] p-3.5 rounded-lg border border-white/10 space-y-2">
                <span className="text-[10px] uppercase font-black tracking-wider text-[#949ba4] block">
                  Pré-visualização em Tempo Real
                </span>
                <div className="flex items-center gap-3 bg-[#2b2d31] p-2.5 rounded border border-white/5">
                  <div className="w-10 h-10 rounded-full bg-[#1e1f22] overflow-hidden border border-[#5865f2]/40 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {identityAvatar ? (
                      <img src={identityAvatar} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span>{identityName?.[0]?.toUpperCase() || (isGM ? 'GM' : 'U')}</span>
                    )}
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-sm truncate">
                        {identityName || (isGM ? 'Alex AP (Mestre)' : 'Jogador')}
                      </span>
                      <span className="text-[10px] font-mono text-[#5865f2] bg-[#5865f2]/10 px-1.5 py-0.5 rounded font-bold border border-[#5865f2]/30">
                        {identityTag.startsWith('#') ? identityTag : (identityTag ? `#${identityTag}` : '#0001')}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#949ba4] truncate mt-0.5">
                      {isGM ? '👑 Mestre da Sessão' : '⚔️ Jogador de Telumak RPG'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Nome de Exibição */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#949ba4] mb-1.5">
                  Nome de Exibição no Discord *
                </label>
                <input
                  type="text"
                  value={identityName}
                  onChange={(e) => setIdentityName(e.target.value)}
                  placeholder={isGM ? "ex: Alex AP, Mestre Supremo" : "ex: Gabriel, Kaelen, Arthur"}
                  required
                  className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded border border-white/10 text-xs focus:outline-none focus:border-[#5865f2]"
                />
              </div>

              {/* Tag Discriminador (#) */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#949ba4] mb-1.5">
                  Tag Discriminador Personalizada (#) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-[#949ba4] font-mono font-bold">#</span>
                  <input
                    type="text"
                    value={identityTag.replace(/^#/, '')}
                    onChange={(e) => setIdentityTag(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    placeholder={isGM ? "mestre" : "0001"}
                    maxLength={16}
                    required
                    className="w-full bg-[#1e1f22] text-white pl-7 pr-3 py-2 rounded border border-white/10 font-mono text-xs focus:outline-none focus:border-[#5865f2]"
                  />
                </div>
                <span className="text-[10px] text-[#949ba4] block mt-1">
                  Exemplos: <code className="text-[#5865f2]">mestre</code>, <code className="text-[#5865f2]">0001</code>, <code className="text-[#5865f2]">gm</code>, <code className="text-[#5865f2]">boss</code>
                </span>
              </div>

              {/* Foto / Avatar com Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#949ba4]">
                    Avatar do Discord (Upload / Recorte)
                  </label>
                  {(() => {
                    const senderChar = characters.find(c => c.email_dono === currentUserProfile?.email);
                    if (senderChar?.img_saudavel) {
                      return (
                        <button
                          type="button"
                          onClick={() => setIdentityAvatar(senderChar.img_saudavel)}
                          className="text-[10px] text-sky-400 hover:text-sky-300 underline font-mono flex items-center gap-1"
                        >
                          Usar Foto da Ficha ({senderChar.nome})
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
                
                <ImageUploadField
                  label=""
                  value={identityAvatar}
                  onChange={(val) => setIdentityAvatar(val)}
                  maxWidth={400}
                  maxHeight={400}
                  aspectRatio="square"
                  helperText="Envie um arquivo PNG, JPG ou WEBP. Você pode arrastar, enviar e recortar a imagem perfeitamente."
                />
              </div>
              
              {/* Ficha Rápida config */}
              <div className="pt-2">
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#949ba4] mb-1">
                  Ocultar Abas da Ficha Rápida
                </label>
                <p className="text-[10px] text-[#949ba4] mb-3 leading-tight">
                  Por padrão, todas as abas são exibidas. Selecione abaixo as que você <strong>NÃO</strong> quer ver.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'indicadores', label: 'Indicadores' },
                    { id: 'ataque', label: 'Ataque' },
                    { id: 'defesa', label: 'Defesa' },
                    { id: 'dons', label: 'Dons' },
                    { id: 'equipamento', label: 'Equipamentos' }
                  ].map(sec => {
                    const isHidden = identityQuickSheet.includes(sec.id);
                    return (
                      <label key={sec.id} className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition ${isHidden ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-[#1e1f22] border-white/5 text-[#949ba4] hover:bg-[#2b2d31]'}`}>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isHidden}
                          onChange={() => {
                            if (isHidden) {
                              setIdentityQuickSheet(prev => prev.filter(x => x !== sec.id));
                            } else {
                              setIdentityQuickSheet(prev => [...prev, sec.id]);
                            }
                          }}
                        />
                        <span className="text-[11px] font-bold truncate">{sec.label}</span>
                        {isHidden && <Check className="h-3 w-3 ml-auto text-rose-400 shrink-0" />}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1f2023]">
                <button
                  type="button"
                  onClick={() => setShowIdentityModal(false)}
                  className="px-4 py-2 bg-transparent hover:underline text-[#dbdee1] text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingIdentity || !identityName.trim()}
                  className="px-5 py-2 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-xs font-bold rounded shadow transition flex items-center gap-1.5"
                >
                  {isSavingIdentity ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>Salvar Identidade</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Discord Bot Setup Tutorial Guide Modal */}
      <DiscordBotGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />


      {/* EXPORT MODAL */}
      <DiscordExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        channels={visibleChannels}
        isGM={isGM}
      />

      {/* QUICK SHEET PANEL */}
      {showQuickSheet && myActiveCharacter && (
        <QuickSheetPanel
          character={myActiveCharacter}
          sections={identityQuickSheet || []}
          onClose={() => setShowQuickSheet(false)}
          onOpenFull={() => {
            setShowQuickSheet(false);
            const event = new CustomEvent('openCharacterSheet', { detail: myActiveCharacter.id });
            window.dispatchEvent(event);
          }}
        />
      )}

      {showPcMenu && isGM && (
        <PcSelectorWindow
          characters={characters}
          openPcIds={openPcIds}
          onTogglePc={(id) => {
            if (openPcIds.includes(id)) {
              setOpenPcIds(prev => prev.filter(x => x !== id));
            } else {
              setOpenPcIds(prev => [...prev, id]);
            }
          }}
          onClose={() => setShowPcMenu(false)}
        />
      )}

      {showNpcMenu && isGM && (
        <NpcQuickSelectorWindow
          npcs={allNpcs}
          openNpcIds={openNpcIds}
          onToggleNpc={(id) => {
            if (openNpcIds.includes(id)) {
              setOpenNpcIds(prev => prev.filter(x => x !== id));
            } else {
              setOpenNpcIds(prev => [...prev, id]);
            }
          }}
          onClose={() => setShowNpcMenu(false)}
        />
      )}

      {isGM && openPcIds.map((id, index) => {
        const char = characters.find(c => c.id === id);
        if (!char) return null;
        return (
          <QuickSheetPanel
            key={id}
            character={char}
            sections={[]} // You could customize this if you want
            onClose={() => setOpenPcIds(prev => prev.filter(x => x !== id))}
            onOpenFull={() => {
              setOpenPcIds(prev => prev.filter(x => x !== id));
              const event = new CustomEvent('openCharacterSheet', { detail: char.id });
              window.dispatchEvent(event);
            }}
            initialPos={{ x: window.innerWidth - 300 - (index * 20), y: 100 + (index * 20) }}
            startMinimized={true}
          />
        );
      })}

      {isGM && openNpcIds.map((id, index) => {
        const npc = allNpcs.find(n => n.id === id);
        if (!npc) return null;
        return (
          <NpcQuickSheet
            key={id}
            npc={npc}
            onClose={() => setOpenNpcIds(prev => prev.filter(x => x !== id))}
            onOpenFull={() => {
              setOpenNpcIds(prev => prev.filter(x => x !== id));
              const event = new CustomEvent('openNpcSheet', { detail: id });
              window.dispatchEvent(event);
            }}
            initialPos={{ x: window.innerWidth - 300 - (index * 20), y: 100 + (index * 20) }}
          />
        );
      })}
    </div>
  );
}
