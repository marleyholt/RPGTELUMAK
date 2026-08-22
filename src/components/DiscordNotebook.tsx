import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Character, DiscordChannelConfig, DiscordNotebookMessage, UserProfile } from '../types';
import { 
  Send, Image as ImageIcon, Sparkles, Hash, User, Bold, Italic, Underline, 
  Strikethrough, EyeOff, Quote, Code, RefreshCw, Paperclip, X, AlertCircle,
  Dices, Server, Maximize2, Minimize2, Check, Crop
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
  
  const chatEndRef = useRef<HTMLDivElement>(null);
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
      // If GM hasn't chosen a player, default to first player or campaign default
      if (selectedTargetKey) {
        const mapped = channelConfig.playerChannels?.[selectedTargetKey] || '';
        setActiveChannelId(mapped || channelConfig.defaultChannelId || '');
      } else {
        // Default to first character or defaultChannelId
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
      // Player: find their mapped channel
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
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (err) => {
      console.warn("Snapshot discord_notebook_messages:", err);
    });

    return unsub;
  }, [activeChannelId]);

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
          content: contentToSend,
          attachments: imageToSend ? [imageToSend] : undefined,
          isFromDiscord: false,
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

  // Render Discord-formatted text safely
  const renderDiscordMarkdown = (text: string, msgId: string) => {
    if (!text) return null;

    // Helper to process line-by-line and block formats
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
    // Regex tokens
    const parts: React.ReactNode[] = [];
    let remaining = lineText;
    let keyCounter = 0;

    while (remaining.length > 0) {
      // Code block or inline code: `code`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        parts.push(
          <code key={`${msgId}-${lineIdx}-${keyCounter++}`} className="bg-[#1e1f22] text-[#e0e1e5] px-1.5 py-0.5 rounded font-mono text-[11px] border border-white/5">
            {codeMatch[1]}
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
        parts.push(<strong key={`${msgId}-${lineIdx}-${keyCounter++}`} className="font-extrabold italic text-white">{boldItalicMatch[1]}</strong>);
        remaining = remaining.substring(boldItalicMatch[0].length);
        continue;
      }

      // Bold: **text**
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
      if (boldMatch) {
        parts.push(<strong key={`${msgId}-${lineIdx}-${keyCounter++}`} className="font-black text-white">{boldMatch[1]}</strong>);
        remaining = remaining.substring(boldMatch[0].length);
        continue;
      }

      // Underline: __text__
      const underlineMatch = remaining.match(/^__([^_]+)__/);
      if (underlineMatch) {
        parts.push(<span key={`${msgId}-${lineIdx}-${keyCounter++}`} className="underline decoration-orange-500 decoration-1 underline-offset-2">{underlineMatch[1]}</span>);
        remaining = remaining.substring(underlineMatch[0].length);
        continue;
      }

      // Italic: *text* or _text_
      const italicMatch = remaining.match(/^(\*|_)([^*_]+)\1/);
      if (italicMatch) {
        parts.push(<em key={`${msgId}-${lineIdx}-${keyCounter++}`} className="italic text-white/90">{italicMatch[2]}</em>);
        remaining = remaining.substring(italicMatch[0].length);
        continue;
      }

      // Strikethrough: ~~text~~
      const strikeMatch = remaining.match(/^~~([^~]+)~~/);
      if (strikeMatch) {
        parts.push(<del key={`${msgId}-${lineIdx}-${keyCounter++}`} className="line-through text-white/50">{strikeMatch[1]}</del>);
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

      // If no markdown match at start, take the next plain character
      parts.push(remaining[0]);
      remaining = remaining.substring(1);
    }

    return parts;
  };

  const activeTargetName = isGM
    ? (characters.find(c => (c.email_dono === selectedTargetKey || c.id === selectedTargetKey))?.nome || 'Canal Geral')
    : (characters.find(c => c.email_dono === currentUserProfile?.email)?.nome || 'Meu Notebook');

  return (
    <div className="flex flex-col h-[78vh] bg-[#313338] border border-[#232428] shadow-2xl rounded-none overflow-hidden text-[#dbdee1] font-sans">
      
      {/* Discord Header Bar */}
      <div className="bg-[#2b2d31] border-b border-[#1f2023] px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-md">
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
            </p>
          </div>
        </div>

        {/* GM Player Channel Selector - Made Wider with enhanced UI */}
        {isGM && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/70 font-bold uppercase tracking-wider hidden sm:inline">
              Ver Notebook de:
            </span>
            <select
              value={selectedTargetKey}
              onChange={(e) => setSelectedTargetKey(e.target.value)}
              className="bg-[#1e1f22] border border-[#3f4147] text-white text-xs font-bold px-3 py-2 rounded focus:outline-none focus:border-[#5865f2] uppercase tracking-wider w-64 sm:w-80 min-w-[260px] shadow-sm truncate"
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

      {/* Warning if no Channel ID is configured */}
      {!activeChannelId && (
        <div className="bg-[#f0b232]/10 border-b border-[#f0b232]/30 px-4 py-2.5 flex items-center gap-2 text-xs text-[#f0b232]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {isGM 
              ? 'Este jogador ainda não possui um ID de Canal do Discord vinculado. Abra a Janela de Configurações (⚙️) para vincular.'
              : 'O Mestre ainda não configurou seu Canal do Discord. Peça a ele para vincular seu canal no Painel de Configurações!'}
          </span>
        </div>
      )}

      {/* Messages Stream (Discord Mirror Layout) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scroll bg-[#313338]">
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
        ) : (
          messages.map((msg, idx) => {
            const isBot = msg.authorName.includes('[Discord]') || msg.authorName.includes('BOT') || msg.isFromDiscord;
            const avatarUrl = msg.authorAvatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
            
            // Format timestamp
            let timeStr = 'Agora';
            if (msg.createdAt) {
              const d = msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
              if (!isNaN(d.getTime())) {
                timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              }
            }

            return (
              <div 
                key={msg.id || idx}
                className="group flex items-start gap-3.5 hover:bg-[#2e3035] -mx-4 px-4 py-1.5 transition rounded-none"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[#1e1f22] overflow-hidden shrink-0 mt-0.5 shadow">
                  <img src={avatarUrl} alt={msg.authorName} className="w-full h-full object-cover" />
                </div>

                {/* Message Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-[13px] text-white hover:underline cursor-pointer">
                      {msg.authorName}
                    </span>
                    {isBot && (
                      <span className="bg-[#5865f2] text-white text-[9px] font-black uppercase px-1 py-0.2 rounded font-mono">
                        DISCORD
                      </span>
                    )}
                    <span className="text-[10px] text-[#949ba4] font-mono">
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
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
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

