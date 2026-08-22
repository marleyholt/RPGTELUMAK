import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Character, DiscordChannelConfig, DiscordNotebookMessage, UserProfile } from '../types';
import { 
  Send, Image as ImageIcon, Sparkles, Hash, User, Bold, Italic, Underline, 
  Strikethrough, EyeOff, Quote, Code, RefreshCw, Paperclip, X, AlertCircle,
  Dices, Server, Maximize2, Minimize2, Check, Crop, Pin, PinOff, Search,
  Copy, Trash2, ArrowDown, MessageSquareQuote, Bookmark
} from 'lucide-react';
import { processImageFile } from '../utils/imageUpload';
import { ImageCropModal } from './ImageCropModal';

interface DiscordNotebookProps {
  isGM: boolean;
  currentUserProfile: UserProfile | null;
  characters: Character[];
}

export function DiscordNotebook({ isGM, currentUserProfile, characters }: DiscordNotebookProps) {
  const [channelConfig, setChannelConfig] = useState<DiscordChannelConfig>({});
  const [selectedTargetKey, setSelectedTargetKey] = useState<string>(''); // For GM to pick which player
  const [activeChannelId, setActiveChannelId] = useState<string>('');
  const [messages, setMessages] = useState<DiscordNotebookMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<{ [key: string]: boolean }>({});
  const [showMentionRollModal, setShowMentionRollModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [pendingCropImage, setPendingCropImage] = useState<string | null>(null);
  const [isExpandedEditor, setIsExpandedEditor] = useState(false);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPinnedOnly, setFilterPinnedOnly] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isPinning, setIsPinning] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Load Discord Channel Config Mapping
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'discord_mapping'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as DiscordChannelConfig;
        setChannelConfig(data);
      }
    });
    return unsub;
  }, []);

  // 2. Determine active Channel ID
  useEffect(() => {
    if (!currentUserProfile) return;

    if (isGM) {
      if (selectedTargetKey) {
        const mapped = channelConfig.playerChannels?.[selectedTargetKey] || '';
        setActiveChannelId(mapped || channelConfig.defaultChannelId || '');
      } else {
        if (characters.length > 0) {
          const firstKey = characters[0].email_dono || characters[0].id;
          setSelectedTargetKey(firstKey);
          const mapped = channelConfig.playerChannels?.[firstKey] || '';
          setActiveChannelId(mapped || channelConfig.defaultChannelId || '');
        } else {
          setActiveChannelId(channelConfig.defaultChannelId || '');
        }
      }
    } else {
      const myEmail = currentUserProfile.email;
      const myChar = characters.find(c => c.email_dono === myEmail);
      const myKey = myEmail || myChar?.id || '';
      const mapped = (myKey && channelConfig.playerChannels?.[myKey]) || (myChar && channelConfig.playerChannels?.[myChar.id]) || channelConfig.defaultChannelId || '';
      setActiveChannelId(mapped);
    }
  }, [channelConfig, isGM, currentUserProfile, characters, selectedTargetKey]);

  // 3. Listen to messages for activeChannelId
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
      
      // Auto-scroll on initial load or if near bottom
      setTimeout(() => {
        if (!filterPinnedOnly && !searchQuery.trim()) {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }, (err) => {
      console.warn("Snapshot discord_notebook_messages:", err);
    });

    return unsub;
  }, [activeChannelId]);

  // Track scroll position to show "Scroll to Bottom" button
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
      // Pinned filter
      if (filterPinnedOnly && !msg.pinned) {
        return false;
      }
      // Search query filter
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

  // Toggle message pin status in Firestore
  const handleTogglePin = async (msg: DiscordNotebookMessage) => {
    if (!msg.id || isPinning === msg.id) return;
    setIsPinning(msg.id);

    try {
      const currentPinned = !!msg.pinned;
      const userName = currentUserProfile?.displayName || (isGM ? 'GM' : 'Jogador');

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
    const confirmDelete = window.confirm("Deseja realmente apagar esta anotação do Notebook?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'discord_notebook_messages', msg.id));
    } catch (err) {
      console.error("Erro ao apagar mensagem:", err);
      alert("Não foi possível apagar a mensagem.");
    }
  };

  // Copy message content to clipboard
  const handleCopyMessage = (msg: DiscordNotebookMessage) => {
    navigator.clipboard.writeText(msg.content || '');
    setCopiedMsgId(msg.id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Quote message into the active editor
  const handleQuoteMessage = (msg: DiscordNotebookMessage) => {
    const quoteText = `\n> **${msg.authorName}:** ${msg.content.replace(/\n/g, '\n> ')}\n\n`;
    setInputText(prev => prev + quoteText);
    textareaRef.current?.focus();
  };

  // Handle image upload from computer with Crop/Zoom modal
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

  // Formatting helpers
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

  // Mention a roll in the text
  const handleInsertRollMention = (rollText: string, author?: string) => {
    const textarea = textareaRef.current;
    const authorTag = author ? ` (${author})` : '';
    const mentionQuote = `\n> 🎲 **Rolagem Rollem${authorTag}:** ${rollText}\n`;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      setInputText(text.substring(0, start) + mentionQuote + text.substring(end));
      setTimeout(() => {
        textarea.focus();
      }, 50);
    } else {
      setInputText(prev => prev + mentionQuote);
    }
    setShowMentionRollModal(false);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !attachedImage) || !activeChannelId || isSending) return;

    setIsSending(true);
    const contentToSend = inputText.trim();
    const imageToSend = attachedImage;

    // Clear input immediately for snappy UX
    setInputText('');
    setAttachedImage(null);

    const senderName = isGM 
      ? `👑 MESTRE (${currentUserProfile?.displayName || 'GM'})` 
      : (characters.find(c => c.email_dono === currentUserProfile?.email)?.nome || currentUserProfile?.displayName || 'Jogador');

    try {
      // 1. Send to Backend API which relays to Discord channel
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
        console.warn("Backend /api/discord não disponível, salvando diretamente no Firestore:", networkErr);
      }

      // 2. If running on static host (e.g. GitHub Pages) where backend is not available, save directly to Firestore
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
      console.error("Erro ao salvar mensagem ao Discord Notebook:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Extract recent rolls from messages for the Mention Roll feature
  const recentRollMessages = messages.filter(m => {
    const c = m.content.toLowerCase();
    return c.includes('rollem') || c.includes('🎲') || c.includes('total:') || c.includes('d10') || c.includes('d20') || c.includes('resultado') || c.includes('crítico') || c.includes('>>');
  }).slice(-12).reverse();

  // Highlight search occurrences inside a string
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

  // Render Discord-formatted text safely
  const renderDiscordMarkdown = (text: string, msgId: string) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      // Headers
      if (line.startsWith('# ')) {
        return <h1 key={lineIdx} className="text-xl font-black text-white my-1 border-b border-white/10 pb-0.5">{parseInlineMarkdown(line.substring(2), msgId, lineIdx)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={lineIdx} className="text-lg font-bold text-white my-1">{parseInlineMarkdown(line.substring(3), msgId, lineIdx)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={lineIdx} className="text-base font-bold text-white/90 my-0.5">{parseInlineMarkdown(line.substring(4), msgId, lineIdx)}</h3>;
      }
      // Blockquote
      if (line.startsWith('> ')) {
        return (
          <div key={lineIdx} className="border-l-4 border-orange-500/80 bg-black/40 pl-3 py-1 my-1 text-orange-200 font-sans text-xs shadow-inner">
            {parseInlineMarkdown(line.substring(2), msgId, lineIdx)}
          </div>
        );
      }
      // List
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={lineIdx} className="flex items-start gap-2 ml-2 my-0.5">
            <span className="text-orange-500 font-bold">•</span>
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

  // Parse inline elements (bold, italic, underline, strikethrough, spoiler, inline code, mentions)
  const parseInlineMarkdown = (lineText: string, msgId: string, lineIdx: number): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = lineText;
    let keyCounter = 0;

    while (remaining.length > 0) {
      // Code block or inline code: `code`
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

      // Spoilers: ||spoiler||
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

      // Bold + Italic: ***text***
      const boldItalicMatch = remaining.match(/^\*\*\*([^*]+)\*\*\*/);
      if (boldItalicMatch) {
        parts.push(
          <strong key={`${msgId}-${lineIdx}-${keyCounter++}`} className="font-extrabold italic text-white">
            {highlightSearch(boldItalicMatch[1], `${msgId}-${lineIdx}-${keyCounter}`)}
          </strong>
        );
        remaining = remaining.substring(boldItalicMatch[0].length);
        continue;
      }

      // Bold: **text**
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

      // Underline: __text__
      const underlineMatch = remaining.match(/^__([^_]+)__/);
      if (underlineMatch) {
        parts.push(
          <span key={`${msgId}-${lineIdx}-${keyCounter++}`} className="underline decoration-orange-500 decoration-1 underline-offset-2">
            {highlightSearch(underlineMatch[1], `${msgId}-${lineIdx}-${keyCounter}`)}
          </span>
        );
        remaining = remaining.substring(underlineMatch[0].length);
        continue;
      }

      // Italic: *text* or _text_
      const italicMatch = remaining.match(/^(\*|_)([^*_]+)\1/);
      if (italicMatch) {
        parts.push(
          <em key={`${msgId}-${lineIdx}-${keyCounter++}`} className="italic text-white/90">
            {highlightSearch(italicMatch[2], `${msgId}-${lineIdx}-${keyCounter}`)}
          </em>
        );
        remaining = remaining.substring(italicMatch[0].length);
        continue;
      }

      // Strikethrough: ~~text~~
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

      // Mentions: @something or <@12345>
      const mentionMatch = remaining.match(/^(@[a-zA-Z0-9_]+|<@!?\d+>)/);
      if (mentionMatch) {
        parts.push(
          <span key={`${msgId}-${lineIdx}-${keyCounter++}`} className="bg-[#5865f2]/20 text-[#5865f2] hover:bg-[#5865f2]/30 px-1 py-0.5 rounded font-bold font-mono text-[11px] inline-block">
            {mentionMatch[1]}
          </span>
        );
        remaining = remaining.substring(mentionMatch[0].length);
        continue;
      }

      // Next plain character
      const nextChar = remaining[0];
      parts.push(highlightSearch(nextChar, `${msgId}-${lineIdx}-${keyCounter++}`));
      remaining = remaining.substring(1);
    }

    return parts;
  };

  const activeTargetName = isGM
    ? (characters.find(c => (c.email_dono === selectedTargetKey || c.id === selectedTargetKey))?.nome || 'Canal Geral')
    : (characters.find(c => c.email_dono === currentUserProfile?.email)?.nome || 'Meu Notebook');

  return (
    <div className="flex flex-col h-[80vh] bg-[#313338] border border-[#232428] shadow-2xl rounded-none overflow-hidden text-[#dbdee1] font-sans">
      
      {/* Discord Header Bar */}
      <div className="bg-[#2b2d31] border-b border-[#1f2023] px-4 py-3 shrink-0 shadow-md flex flex-col gap-2.5">
        
        {/* Top Row: Channel Info & GM Target Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#5865f2]/10 rounded border border-[#5865f2]/30 text-[#5865f2]">
              <Hash className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-1.5">
                  <span>NOTEBOOK DISCORD:</span>
                  <span className="text-orange-400 font-mono">{activeTargetName}</span>
                </h3>
                
                {channelConfig.guildName && (
                  <span className="bg-white/10 text-white/90 text-[10px] font-mono px-2 py-0.5 rounded border border-white/15 flex items-center gap-1">
                    <Server className="h-3 w-3 text-orange-400" />
                    <span>{channelConfig.guildName}</span>
                  </span>
                )}

                <span className="bg-[#5865f2] text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded font-mono">
                  LIVE DISCORD
                </span>
              </div>
              <p className="text-[10px] text-[#949ba4] font-mono flex items-center gap-2">
                <span>Canal ID: {activeChannelId || 'Não configurado'}</span>
                {activeChannelId && <span className="text-emerald-400 font-bold">• Sincronizado</span>}
                <span className="text-white/40">|</span>
                <span>{messages.length} anotações</span>
                {pinnedCount > 0 && (
                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                    • {pinnedCount} fixada{pinnedCount > 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* GM Player Channel Selector */}
          {isGM && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/70 font-bold uppercase tracking-wider hidden sm:inline">
                Ver Notebook de:
              </span>
              <select
                value={selectedTargetKey}
                onChange={(e) => setSelectedTargetKey(e.target.value)}
                className="bg-[#1e1f22] border border-[#3f4147] text-white text-xs font-bold px-3 py-1.5 rounded focus:outline-none focus:border-[#5865f2] uppercase tracking-wider w-60 sm:w-72 shadow-sm truncate"
              >
                {characters.map(c => {
                  const key = c.email_dono || c.id;
                  const hasChan = !!channelConfig.playerChannels?.[key];
                  return (
                    <option key={c.id} value={key} className="bg-[#2b2d31] text-white py-1">
                      {c.nome} {c.cla ? `[${c.cla}]` : ''} {hasChan ? '⚡ (Discord Vinculado)' : '(Sem Canal)'}
                    </option>
                  );
                })}
                {characters.length === 0 && (
                  <option value="">Canal Padrão da Mesa</option>
                )}
              </select>
            </div>
          )}
        </div>

        {/* Second Row: Search Bar & Pinned Filter Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar nas anotações, rolagens ou autor..."
              className="w-full bg-[#1e1f22] border border-[#3f4147] focus:border-[#5865f2] text-xs text-white placeholder-white/40 rounded-full pl-8 pr-7 py-1.5 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-white/40 hover:text-white transition"
                title="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            
            {/* Pinned Messages Filter Button */}
            <button
              type="button"
              onClick={() => setFilterPinnedOnly(!filterPinnedOnly)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition shadow-sm border ${
                filterPinnedOnly
                  ? 'bg-amber-500 text-black border-amber-400 font-black shadow-amber-500/20'
                  : 'bg-[#1e1f22] hover:bg-[#35373c] text-amber-400/90 border-amber-500/30 hover:border-amber-500/60'
              }`}
              title={filterPinnedOnly ? "Exibindo apenas mensagens fixadas (clique para ver todas)" : "Filtrar e exibir apenas mensagens fixadas"}
            >
              <Pin className={`h-3.5 w-3.5 ${filterPinnedOnly ? 'fill-current' : ''}`} />
              <span>Fixadas</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                filterPinnedOnly ? 'bg-black/30 text-white' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {pinnedCount}
              </span>
            </button>

            {/* Clear all active filters indicator */}
            {(searchQuery.trim() || filterPinnedOnly) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterPinnedOnly(false);
                }}
                className="text-[10px] text-white/50 hover:text-white underline font-mono px-1 py-0.5"
              >
                Limpar Filtros
              </button>
            )}

            {/* Active search match count */}
            {searchQuery.trim() && (
              <span className="text-[11px] text-orange-400 font-mono font-bold bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                {filteredMessages.length} resultado{filteredMessages.length === 1 ? '' : 's'}
              </span>
            )}

          </div>

        </div>

      </div>

      {/* Warning if no Channel ID is configured */}
      {!activeChannelId && (
        <div className="bg-[#f0b232]/10 border-b border-[#f0b232]/30 px-4 py-2 flex items-center gap-2 text-xs text-[#f0b232]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {isGM 
              ? 'Este jogador ainda não possui um ID de Canal do Discord vinculado. Abra a Janela de Configurações (⚙️) para vincular.'
              : 'O Mestre ainda não configurou seu Canal do Discord. Peça a ele para vincular seu canal no Painel de Configurações!'}
          </span>
        </div>
      )}

      {/* Messages Stream (Discord Mirror Layout) */}
      <div 
        ref={chatScrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll bg-[#313338] relative"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 opacity-60">
            <div className="w-14 h-14 rounded-full bg-[#2b2d31] border border-white/10 flex items-center justify-center text-[#5865f2]">
              <Hash className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-black text-white uppercase tracking-wider">Início do Notebook</p>
              <p className="text-xs text-[#949ba4] max-w-sm mt-1">
                Todas as anotações e mensagens enviadas aqui serão replicadas no Discord, e o que for enviado no Discord aparecerá aqui em tempo real com toda a formatação!
              </p>
            </div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-amber-400">
              {filterPinnedOnly ? <Pin className="h-6 w-6" /> : <Search className="h-6 w-6" />}
            </div>
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-wider">
                {filterPinnedOnly ? 'Nenhuma Anotação Fixada' : 'Nenhum Resultado Encontrado'}
              </p>
              <p className="text-xs text-[#949ba4] max-w-sm mt-1">
                {filterPinnedOnly 
                  ? 'Você pode fixar anotações importantes passando o mouse sobre qualquer mensagem e clicando no ícone de alfinete (📌).'
                  : `Não foram encontradas mensagens com o termo "${searchQuery}".`}
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilterPinnedOnly(false);
                  setSearchQuery('');
                }}
                className="mt-3 px-3 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold uppercase rounded transition"
              >
                Ver Todas as Anotações
              </button>
            </div>
          </div>
        ) : (
          filteredMessages.map((msg, idx) => {
            const isBot = msg.authorName.includes('[Discord]') || msg.authorName.includes('BOT') || msg.isFromDiscord;
            const avatarUrl = msg.authorAvatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
            const isPinned = !!msg.pinned;
            const isOwner = currentUserProfile?.email && msg.authorEmail === currentUserProfile.email;
            const canDelete = isGM || isOwner;
            
            // Format timestamp
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
                className={`group relative flex items-start gap-3.5 -mx-4 px-4 py-2 transition rounded-none ${
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
                  
                  {/* Pinned Badge if message is pinned */}
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
                        DISCORD
                      </span>
                    )}
                    <span className="text-[10px] text-[#949ba4] font-mono" title={fullDateStr}>
                      {timeStr}
                    </span>
                  </div>

                  {/* Message Content with Discord Markdown */}
                  <div className="text-[13px] text-[#dbdee1] mt-0.5 font-sans break-words select-text">
                    {renderDiscordMarkdown(msg.content, msg.id || `${idx}`)}
                  </div>

                  {/* Attachment Images */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.attachments.map((att, attIdx) => (
                        <div key={attIdx} className="max-w-md rounded-lg overflow-hidden border border-white/10 shadow-lg bg-black/40">
                          <img src={att} alt="Anexo do Discord" className="w-full h-auto max-h-96 object-contain" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Action Floating Bar (Hover on desktop / always available) */}
                <div className="absolute right-3 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#2b2d31] border border-[#3f4147] rounded shadow-md flex items-center p-0.5 z-10">
                  
                  {/* Pin / Unpin Button */}
                  <button
                    type="button"
                    onClick={() => handleTogglePin(msg)}
                    className={`p-1.5 rounded transition ${
                      isPinned 
                        ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30' 
                        : 'text-white/60 hover:text-amber-400 hover:bg-[#35373c]'
                    }`}
                    title={isPinned ? "Desafixar mensagem" : "Fixar mensagem no topo"}
                  >
                    {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>

                  {/* Quote Button */}
                  <button
                    type="button"
                    onClick={() => handleQuoteMessage(msg)}
                    className="p-1.5 text-white/60 hover:text-white hover:bg-[#35373c] rounded transition"
                    title="Citar esta anotação no editor"
                  >
                    <MessageSquareQuote className="h-3.5 w-3.5" />
                  </button>

                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={() => handleCopyMessage(msg)}
                    className="p-1.5 text-white/60 hover:text-white hover:bg-[#35373c] rounded transition"
                    title="Copiar texto da mensagem"
                  >
                    {copiedMsgId === msg.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>

                  {/* Delete Button (if authorized) */}
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
          })
        )}
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

      </div>

      {/* Input Formatting Toolbar & Resizable Box */}
      <div className="bg-[#383a40] border-t border-[#232428] p-3 space-y-2 shrink-0">
        
        {/* Formatting Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-1 text-[#b5bac1] border-b border-white/5 pb-2">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => insertFormatting('**')}
              className="p-1.5 hover:bg-[#404249] hover:text-white rounded transition"
              title="Negrito (**texto**)"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('*')}
              className="p-1.5 hover:bg-[#404249] hover:text-white rounded transition"
              title="Itálico (*texto*)"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('__')}
              className="p-1.5 hover:bg-[#404249] hover:text-white rounded transition"
              title="Sublinhado (__texto__)"
            >
              <Underline className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('~~')}
              className="p-1.5 hover:bg-[#404249] hover:text-white rounded transition"
              title="Riscado (~~texto~~)"
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('||')}
              className="p-1.5 hover:bg-[#404249] hover:text-white rounded transition"
              title="Spoiler (||texto||)"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('> ')}
              className="p-1.5 hover:bg-[#404249] hover:text-white rounded transition"
              title="Citação (> texto)"
            >
              <Quote className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('```\n', '\n```')}
              className="p-1.5 hover:bg-[#404249] hover:text-white rounded transition"
              title="Bloco de Código (```)"
            >
              <Code className="h-3.5 w-3.5" />
            </button>

            {/* MENCIONAR ROLAGEM BUTTON */}
            <button
              type="button"
              onClick={() => setShowMentionRollModal(true)}
              className="ml-1 px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 rounded text-[11px] font-black uppercase tracking-wider flex items-center gap-1 transition shadow-sm"
              title="Mencionar uma rolagem do Rollem ou do Chat"
            >
              <Dices className="h-3.5 w-3.5 text-orange-400" />
              <span>Mencionar Rolagem</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExpandedEditor(!isExpandedEditor)}
              className="p-1.5 hover:bg-[#404249] text-[#b5bac1] hover:text-white rounded transition"
              title={isExpandedEditor ? "Reduzir altura do editor" : "Expandir editor"}
            >
              {isExpandedEditor ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 text-[11px] font-bold text-[#b5bac1] hover:text-white bg-[#2b2d31] hover:bg-[#404249] px-2.5 py-1 rounded transition"
              title="Upload de foto / anexo para o Discord"
            >
              <Paperclip className="h-3.5 w-3.5 text-orange-400" />
              <span>Anexar Imagem</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAttachImage}
            />
          </div>
        </div>

        {/* Attached image preview with edit/crop button */}
        {attachedImage && (
          <div className="relative inline-block bg-black/60 p-1.5 border border-white/10 rounded">
            <img src={attachedImage} alt="Anexo" className="h-16 w-auto object-contain rounded" />
            <button
              type="button"
              onClick={() => {
                setPendingCropImage(attachedImage);
                setShowCropModal(true);
              }}
              className="absolute bottom-1 right-1 bg-black/80 hover:bg-orange-500 text-white rounded p-1 text-[9px] font-mono flex items-center gap-0.5 border border-white/20"
              title="Ajustar e focar imagem"
            >
              <Crop className="h-2.5 w-2.5" />
            </button>
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700 transition shadow"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Input Text Form - RESIZABLE and ADJUSTABLE */}
        <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={isExpandedEditor ? 6 : 3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Escrever anotação para #${activeTargetName} (Enter para enviar, Shift+Enter para nova linha)`}
              className={`w-full bg-[#2b2d31] border border-transparent focus:border-[#5865f2] rounded p-2.5 text-xs text-white placeholder-[#80848e] focus:outline-none resize-y min-h-[75px] max-h-[350px] font-sans ${
                isExpandedEditor ? 'h-36' : 'h-20'
              }`}
            />
            <div className="text-[8px] text-[#949ba4] font-mono px-1 flex justify-between">
              <span>Arraste o canto inferior direito para ajustar a altura</span>
              <span>Markdown e Spoilers suportados</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={(!inputText.trim() && !attachedImage) || isSending || !activeChannelId}
            className="px-5 py-3.5 bg-[#5865f2] hover:bg-[#4752c4] text-white font-black text-xs uppercase tracking-wider rounded transition flex items-center justify-center disabled:opacity-40 shadow shrink-0"
          >
            {isSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>

      </div>

      {/* MENTION ROLL MODAL */}
      {showMentionRollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
          <div className="bg-[#0c0c0c] border border-white/15 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-500">
                  <Dices className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Mencionar Rolagem no Notebook
                  </h3>
                  <p className="text-[9px] text-white/50 font-mono">
                    Selecione uma rolagem recente do Rollem ou gere uma menção rápida
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMentionRollModal(false)}
                className="p-1 text-white/40 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1 custom-scroll bg-[#080808]">
              
              {/* Quick Preset Syntax */}
              <div>
                <label className="block text-[10px] text-white/50 font-mono uppercase tracking-wider mb-2">
                  Atalhos de Rolagem Rápida:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    '1d20 + 5 ➔ [18]',
                    '4d10 + 12 ➔ [38] (Crítico)',
                    '2d6 + Físico ➔ [14]',
                    '1d100 ➔ [77] (Sucesso)',
                    'Rolagem de Defesa ➔ [15]',
                    'Rolagem de Dano ➔ [24 🔥]'
                  ].map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => handleInsertRollMention(preset)}
                      className="p-2 bg-black border border-white/10 hover:border-orange-500/50 hover:bg-orange-500/10 text-left text-xs text-white font-mono rounded transition flex flex-col justify-between"
                    >
                      <span className="text-[9px] text-orange-400 font-bold">Preset #{pIdx + 1}</span>
                      <span className="truncate">{preset}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Discord / Rollem Messages */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="block text-[10px] text-white/50 font-mono uppercase tracking-wider">
                  Rolagens Detectadas no Discord ({recentRollMessages.length}):
                </label>

                {recentRollMessages.length === 0 ? (
                  <p className="text-xs text-white/40 italic p-3 bg-black/40 border border-white/5 text-center">
                    Nenhuma mensagem com dados ou do Rollem detectada recentemente neste canal. Você pode usar os atalhos acima!
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {recentRollMessages.map((msg, rIdx) => (
                      <button
                        key={msg.id || rIdx}
                        type="button"
                        onClick={() => handleInsertRollMention(msg.content, msg.authorName)}
                        className="w-full p-2.5 bg-black border border-white/10 hover:border-orange-500 hover:bg-orange-500/5 text-left text-xs transition flex items-start gap-2.5 group"
                      >
                        <Dices className="h-4 w-4 text-orange-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between text-[10px] text-white/50 font-mono mb-0.5">
                            <span className="font-bold text-orange-400">{msg.authorName}</span>
                            <span>{msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString() : 'Recente'}</span>
                          </div>
                          <p className="text-white/90 font-mono text-xs truncate">
                            {msg.content}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div className="p-3 border-t border-white/10 bg-black flex justify-end">
              <button
                type="button"
                onClick={() => setShowMentionRollModal(false)}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Image Crop Modal for Attached Images */}
      {showCropModal && pendingCropImage && (
        <ImageCropModal
          isOpen={showCropModal}
          onClose={() => {
            setShowCropModal(false);
            setPendingCropImage(null);
          }}
          imageUrl={pendingCropImage}
          aspectRatio="free"
          title="Ajustar Imagem do Notebook"
          onSave={(croppedUrl) => {
            setAttachedImage(croppedUrl);
            setPendingCropImage(null);
            setShowCropModal(false);
          }}
        />
      )}

    </div>
  );
}
