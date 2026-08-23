import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, 
  deleteDoc, serverTimestamp, doc, setDoc, getDocs 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Character, DiscordNotebookMessage, DiscordChannelItem, UserProfile } from '../types';
import { 
  Send, Hash, Bold, Italic, Underline, Strikethrough, EyeOff, Quote, Code, 
  RefreshCw, X, Dices, Pin, PinOff, Search, Copy, Trash2, ArrowDown, 
  MessageSquareQuote, Volume2, Mic, MicOff, Headphones, ChevronDown, 
  ChevronRight, Plus, Download, FileText, Lock, Edit2, Check, Radio, UserCheck, Shield,
  Smile
} from 'lucide-react';
import { processImageFile } from '../utils/imageUpload';
import { ImageCropModal } from './ImageCropModal';

interface DiscordNotebookProps {
  isGM: boolean;
  currentUserProfile: UserProfile | null;
  characters: Character[];
}

export function DiscordNotebook({ isGM, currentUserProfile, characters }: DiscordNotebookProps) {
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

  // Channel Creation / Edit Form State (Single centralized configuration per channel)
  const [formChannelName, setFormChannelName] = useState('');
  const [formCategory, setFormCategory] = useState('ANOTAÇÕES');
  const [formType, setFormType] = useState<'text' | 'voice'>('text');
  const [formTopic, setFormTopic] = useState('');
  const [formDiscordId, setFormDiscordId] = useState('');
  const [formAccessType, setFormAccessType] = useState<'public' | 'character' | 'custom'>('public');
  const [formTargetCharId, setFormTargetCharId] = useState<string>('');
  const [formAllowedEmails, setFormAllowedEmails] = useState<string[]>([]);

  // UI States
  const [collapsedCategories, setCollapsedCategories] = useState<{ [key: string]: boolean }>({});
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isHeadsetDeafened, setIsHeadsetDeafened] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPinnedOnly, setFilterPinnedOnly] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isPinning, setIsPinning] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Load Real-Time Channels directly from Firestore (NO fake default channels)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'discord_channels'), (snap) => {
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

    // Filter for Player
    const playerEmail = currentUserProfile?.email?.toLowerCase().trim();
    return dbChannels.filter(ch => {
      // Public channels
      if (!ch.isPrivate) return true;
      
      // If player's email is allowed
      if (playerEmail && ch.allowedEmails?.some(e => e.toLowerCase().trim() === playerEmail)) {
        return true;
      }
      
      // If linked directly to player's character
      if (ch.charKey && playerEmail) {
        const isOwner = characters.some(c => 
          (c.id === ch.charKey || c.email_dono?.toLowerCase().trim() === playerEmail) && 
          c.email_dono?.toLowerCase().trim() === playerEmail
        );
        if (isOwner) return true;
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

  // 6. Listen to messages for active channel
  useEffect(() => {
    if (!activeChannelId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'discord_notebook_messages'),
      where('channelId', '==', activeChannelId),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs: DiscordNotebookMessage[] = [];
      snap.forEach(d => {
        msgs.push({ id: d.id, ...d.data() } as DiscordNotebookMessage);
      });
      setMessages(msgs);
      
      setTimeout(() => {
        if (!filterPinnedOnly && !searchQuery.trim()) {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }, (err) => {
      console.warn("Snapshot discord_notebook_messages:", err);
    });

    return unsub;
  }, [activeChannelId, filterPinnedOnly, searchQuery]);

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
    } catch (err) {
      console.error("Erro ao fixar/desafixar mensagem:", err);
    } finally {
      setIsPinning(null);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msg: DiscordNotebookMessage) => {
    if (!msg.id) return;
    const confirmDelete = window.confirm("Deseja realmente apagar esta anotação?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'discord_notebook_messages', msg.id));
    } catch (err) {
      console.error("Erro ao apagar mensagem:", err);
      alert("Não foi possível apagar a mensagem.");
    }
  };

  // Copy message
  const handleCopyMessage = (msg: DiscordNotebookMessage) => {
    navigator.clipboard.writeText(msg.content || '');
    setCopiedMsgId(msg.id);
    setTimeout(() => setCopiedMsgId(null), 2000);
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

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !attachedImage) || !activeChannelId || isSending) return;

    setIsSending(true);
    const contentToSend = inputText.trim();
    const imageToSend = attachedImage;

    setInputText('');
    setAttachedImage(null);

    const senderName = isGM 
      ? `Alex AP` 
      : (characters.find(c => c.email_dono === currentUserProfile?.email)?.nome || currentUserProfile?.displayName || 'Jogador');

    try {
      let sentToBackend = false;
      try {
        const res = await fetch('/api/discord/notebook/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: activeChannelId,
            remetente: senderName,
            conteudo: contentToSend,
            attachment: imageToSend || undefined
          })
        });

        if (res.ok) {
          sentToBackend = true;
        }
      } catch (networkErr) {
        console.warn("Backend API offline, gravando no Firestore:", networkErr);
      }

      if (!sentToBackend && activeChannelId) {
        await addDoc(collection(db, 'discord_notebook_messages'), {
          channelId: activeChannelId,
          authorName: senderName,
          authorEmail: currentUserProfile?.email || null,
          content: contentToSend,
          attachments: imageToSend ? [imageToSend] : undefined,
          isFromDiscord: false,
          pinned: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Erro ao salvar mensagem:", err);
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
    let charKey: string | undefined = undefined;

    if (formAccessType === 'character') {
      isPrivate = true;
      charKey = formTargetCharId;
      const targetChar = characters.find(c => c.id === formTargetCharId);
      if (targetChar?.email_dono) {
        allowedEmails = [targetChar.email_dono];
      }
    } else if (formAccessType === 'custom') {
      isPrivate = true;
      allowedEmails = formAllowedEmails;
    } else {
      isPrivate = false;
      allowedEmails = [];
    }

    const channelPayload: Partial<DiscordChannelItem> = {
      name: cleanName,
      category: formCategory.trim(),
      type: formType,
      topic: formTopic.trim() || undefined,
      isPrivate: isPrivate,
      allowedEmails: allowedEmails,
      charKey: charKey || undefined,
      discordChannelId: formDiscordId.trim() || undefined,
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'discord_channels', channelDocId), channelPayload, { merge: true });
      setShowChannelModal(false);
    } catch (err) {
      console.error("Erro ao salvar canal:", err);
      alert("Erro ao salvar canal no Firestore.");
    }
  };

  // GM: Delete Channel
  const handleDeleteChannel = async (ch: DiscordChannelItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmDelete = window.confirm(`Deseja realmente remover o canal "#${ch.name}"?`);
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'discord_channels', ch.id));
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

      const strikeMatch = remaining.match(/^~~([^~]+)~~/);
      if (strikeMatch) {
        parts.push(
          <del key={`${msgId}-${lineIdx}-${keyCounter++}`} className="line-through text-white/50">
            {highlightSearch(strikeMatch[1], `${msgId}-${lineIdx}-${keyCounter}`)}
          </del>
        );
        remaining = remaining.substring(strikeMatch[0].length);
        continue;
      }

      // Match plain text up to next special markdown syntax token
      const plainMatch = remaining.match(/^[^*~`|>h\n]+/i);
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
    <div className="flex h-[84vh] max-h-[940px] w-full bg-[#313338] border border-[#232428] shadow-2xl rounded-lg overflow-hidden text-[#dbdee1] font-sans select-none">
      
      {/* 1. CHANNELS SIDEBAR */}
      <div className="w-64 bg-[#2b2d31] flex flex-col shrink-0 border-r border-[#1f2023] z-10">
        
        {/* Header */}
        <div className="h-12 border-b border-[#1f2023] px-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="font-black text-sm text-white tracking-tight truncate">
              NOTEBOOK & DISCORD
            </span>
          </div>
        </div>

        {/* GM Action: Add Channel */}
        {isGM && (
          <div className="p-2 bg-[#232428] border-b border-[#1f2023]">
            <button
              type="button"
              onClick={() => handleOpenAddChannel()}
              className="w-full py-1.5 px-3 bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold rounded flex items-center justify-center gap-1.5 transition shadow"
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
                            onClick={() => setActiveChannel(channel)}
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
                                <Lock className="h-3 w-3 text-amber-400 shrink-0" title="Canal Privado" />
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
        <div className="h-14 bg-[#232428] px-3 flex items-center justify-between shrink-0 border-t border-[#1f2023]">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-[#1e1f22] overflow-hidden border border-white/10 flex items-center justify-center font-bold text-white text-xs">
                {currentUserProfile?.photoURL ? (
                  <img src={currentUserProfile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{currentUserProfile?.displayName?.[0] || (isGM ? 'GM' : 'U')}</span>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#23a55a] rounded-full border-2 border-[#232428]" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate leading-tight">
                {isGM ? 'Alex AP (Mestre)' : (currentUserProfile?.displayName || 'Jogador')}
              </p>
              <p className="text-[10px] text-[#949ba4] font-mono truncate leading-tight">
                {isGM ? '#mestre' : (currentUserProfile?.email?.split('@')[0] || '#online')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 text-[#b5bac1]">
            <button
              type="button"
              onClick={() => setIsMicMuted(!isMicMuted)}
              className={`p-1.5 rounded hover:bg-[#35373c] transition ${isMicMuted ? 'text-rose-400' : 'hover:text-white'}`}
              title={isMicMuted ? "Desmutar Microfone" : "Mutar Microfone"}
            >
              {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setIsHeadsetDeafened(!isHeadsetDeafened)}
              className={`p-1.5 rounded hover:bg-[#35373c] transition ${isHeadsetDeafened ? 'text-rose-400' : 'hover:text-white'}`}
              title={isHeadsetDeafened ? "Desativar Áudio" : "Ensurdecer"}
            >
              <Headphones className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>

      {/* 2. MAIN CENTER AREA: MESSAGES STREAM & RICH INPUT */}
      <div className="flex-1 flex flex-col bg-[#313338] min-w-0 relative">
        
        {/* Top Channel Header */}
        <div className="h-12 border-b border-[#1f2023] px-4 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            {activeChannel?.type === 'voice' ? (
              <Volume2 className="h-5 w-5 text-[#80848e] shrink-0" />
            ) : (
              <Hash className="h-5 w-5 text-[#80848e] shrink-0" />
            )}
            <h3 className="font-black text-sm text-white truncate">
              {activeChannel?.name || 'Selecione um canal'}
            </h3>
            {activeChannel?.isPrivate && (
              <span className="bg-amber-500/20 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" />
                Privado
              </span>
            )}
            {activeChannel?.discordChannelId && (
              <span className="bg-[#5865f2]/20 text-[#5865f2] text-[9px] font-bold px-1.5 py-0.5 rounded font-mono hidden sm:inline-block">
                Discord ID: {activeChannel.discordChannelId}
              </span>
            )}
            <div className="h-4 w-[1px] bg-[#4e5058] mx-2 hidden md:block" />
            <p className="text-xs text-[#949ba4] truncate hidden md:block max-w-md">
              {activeChannel?.topic || (activeChannel ? `Canal #${activeChannel.name}` : 'Nenhum canal ativo')}
            </p>
          </div>

          <div className="flex items-center gap-2 text-[#b5bac1]">
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
                    className={`group relative flex items-start gap-3.5 -mx-4 px-4 py-2 transition rounded ${
                      isPinned 
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

                      {/* Message Content with Discord Markdown */}
                      <div className="text-[13px] text-[#dbdee1] mt-0.5 font-sans break-words select-text leading-relaxed">
                        {renderDiscordMarkdown(msg.content, msg.id || `${idx}`)}
                      </div>

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

            <form onSubmit={handleSendMessage} className="bg-[#383a40] rounded-lg px-4 py-2.5 flex items-end gap-2 focus-within:ring-1 focus-within:ring-[#5865f2] transition">
              
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
                className="p-1.5 bg-[#4e5058] hover:bg-[#6d6f78] text-white rounded-full transition shrink-0 mb-0.5"
                title="Anexar Imagem"
              >
                <Plus className="h-4 w-4" />
              </button>

              {/* Textarea */}
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
                placeholder={`Conversar em #${activeChannel.name}...`}
                rows={1}
                className="flex-1 bg-transparent text-white text-xs placeholder-[#80848e] focus:outline-none resize-none max-h-32 min-h-[22px] py-1 custom-scroll"
              />

              {/* Send button */}
              <div className="flex items-center gap-1.5 shrink-0 text-[#b5bac1]">
                <button
                  type="submit"
                  disabled={(!inputText.trim() && !attachedImage) || isSending}
                  className={`p-1.5 rounded-full transition ${
                    (inputText.trim() || attachedImage) && !isSending 
                      ? 'bg-[#5865f2] hover:bg-[#4752c4] text-white shadow' 
                      : 'text-white/20 cursor-not-allowed'
                  }`}
                  title="Enviar mensagem (Enter)"
                >
                  {isSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
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
              
              {/* 1. Nome do Canal & Categoria */}
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

              {/* 2. Tipo de Canal */}
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

              {/* 3. Tópico / Descrição */}
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

              {/* 4. Conexão com o Discord (ID do Canal) */}
              <div className="bg-[#232428] p-3.5 rounded-lg border border-[#5865f2]/30 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#5865f2] animate-pulse" />
                  <label className="text-[11px] font-black uppercase tracking-wider text-white">
                    ID do Canal no Discord (Sincronização)
                  </label>
                </div>
                <p className="text-[10px] text-[#949ba4] leading-relaxed">
                  Copie o ID do canal no seu servidor do Discord (clique com o botão direito no canal do Discord &gt; <em>Copiar ID do canal</em>). 
                  Todas as mensagens enviadas aqui serão postadas nele pelo bot!
                </p>
                <input
                  type="text"
                  value={formDiscordId}
                  onChange={(e) => setFormDiscordId(e.target.value)}
                  placeholder="ex: 123456789012345678"
                  className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded border border-white/10 font-mono text-xs focus:outline-none focus:border-[#5865f2]"
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

      {/* Mention Roll Modal */}
      {showMentionRollModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#313338] border border-[#232428] rounded-xl w-full max-w-md overflow-hidden shadow-2xl text-[#dbdee1]">
            <div className="px-6 py-4 bg-[#2b2d31] border-b border-[#1f2023] flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Dices className="h-4 w-4 text-[#5865f2]" />
                Mencionar Rolagem de Dados
              </h3>
              <button
                type="button"
                onClick={() => setShowMentionRollModal(false)}
                className="text-[#949ba4] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-[#949ba4]">
                Escolha um atalho rápido de rolagem para citar no seu texto:
              </p>

              <div className="grid grid-cols-2 gap-2">
                {[
                  '1d20 + 5 (Ataque Físico)',
                  '2d10 + 3 (Conhecimento)',
                  '1d100 (Teste de Sorte)',
                  '4d6 (Dano Elemental)',
                  '1d20 (Iniciativa)',
                  '3d8 (Cura / Recuperação)'
                ].map((formula, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const quote = `\n> 🎲 **Rolagem Rollem:** ${formula}\n`;
                      setInputText(prev => prev + quote);
                      setShowMentionRollModal(false);
                    }}
                    className="p-2.5 bg-[#2b2d31] hover:bg-[#35373c] text-white rounded text-left border border-white/5 transition"
                  >
                    <span className="font-bold block text-[#5865f2]">{formula.split(' ')[0]}</span>
                    <span className="text-[10px] text-[#949ba4]">{formula.substring(formula.indexOf(' ') + 1)}</span>
                  </button>
                ))}
              </div>
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

    </div>
  );
}
