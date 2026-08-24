import React, { useState } from 'react';
import { Download, FileJson, FileText, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Character, DiscordChannelItem, DiscordNotebookMessage } from '../types';

interface DataBackupSystemProps {
  characters: Character[];
}

export function DataBackupSystem({ characters }: DataBackupSystemProps) {
  const [isExportingChars, setIsExportingChars] = useState(false);
  const [isExportingDiscord, setIsExportingDiscord] = useState(false);

  // 1. Export Characters to JSON
  const handleExportCharacters = () => {
    setIsExportingChars(true);
    try {
      const dataStr = JSON.stringify(characters, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.download = `HUB_Fichas_Backup_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert('Erro ao exportar fichas.');
    } finally {
      setIsExportingChars(false);
    }
  };

  // 2. Export Discord to Word (.doc)
  const handleExportDiscord = async () => {
    setIsExportingDiscord(true);
    try {
      // Fetch Channels
      const channelsSnap = await getDocs(collection(db, 'discord_channels'));
      const channels: Record<string, DiscordChannelItem> = {};
      channelsSnap.forEach(doc => {
        channels[doc.id] = { id: doc.id, ...doc.data() } as DiscordChannelItem;
      });

      // Fetch Messages
      const msgQuery = query(collection(db, 'discord_notebook_messages'), orderBy('createdAt', 'asc'));
      const msgSnap = await getDocs(msgQuery);
      
      const messagesByChannel: Record<string, DiscordNotebookMessage[]> = {};
      msgSnap.forEach(doc => {
        const data = { id: doc.id, ...doc.data() } as DiscordNotebookMessage;
        if (!messagesByChannel[data.channelId]) {
          messagesByChannel[data.channelId] = [];
        }
        messagesByChannel[data.channelId].push(data);
      });

      let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Backup Textos do Discord - HUB</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #313338; line-height: 1.5; background-color: #ffffff; }
          h1 { font-size: 20pt; color: #1e1f22; border-bottom: 2px solid #5865f2; padding-bottom: 5px; margin-bottom: 30px; }
          h2 { font-size: 16pt; color: #f2f3f5; background-color: #5865f2; padding: 10px; margin-top: 40px; margin-bottom: 20px; border-radius: 4px; }
          .message { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e3e5e8; }
          .header { margin-bottom: 4px; display: flex; align-items: baseline; }
          .author { font-weight: bold; color: #1e1f22; font-size: 12pt; }
          .date { color: #80848e; font-size: 9pt; margin-left: 10px; }
          .content { white-space: pre-wrap; font-size: 11pt; color: #313338; }
          .attachments { margin-top: 10px; }
          .attachments img { max-width: 400px; height: auto; border-radius: 4px; border: 1px solid #e3e5e8; margin-right: 10px; margin-bottom: 10px; display: block; }
          blockquote { border-left: 4px solid #c9cdcf; padding-left: 12px; color: #4e5058; margin-left: 0; background-color: #f2f3f5; padding-top: 4px; padding-bottom: 4px; }
          .h1-md { font-size: 16pt; font-weight: bold; margin: 8px 0; }
          .h2-md { font-size: 14pt; font-weight: bold; margin: 8px 0; }
          ul { margin: 4px 0; padding-left: 20px; }
        </style>
      </head>
      <body>
        <h1>Histórico e Textos do Discord - Backup</h1>
        <p><strong>Data da Extração:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <p><em>Documento gerado automaticamente pelo HUB.</em></p>
      `;

      // Helper to process markdown to HTML
      const processMarkdown = (text: string) => {
        if (!text) return '';
        let processed = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        const lines = processed.split('\n');
        let outHtml = '';

        lines.forEach(line => {
          let l = line;
          if (l.startsWith('# ')) {
            l = `<div class="h1-md">${l.substring(2)}</div>`;
          } else if (l.startsWith('## ')) {
            l = `<div class="h2-md">${l.substring(3)}</div>`;
          } else if (l.startsWith('&gt; ')) { // blockquote mapped from >
            l = `<blockquote>${l.substring(5)}</blockquote>`;
          } else if (l.startsWith('- ') || l.startsWith('* ')) {
            l = `<ul><li>${l.substring(2)}</li></ul>`;
          } else {
            l = `${l}<br/>`;
          }
          
          // Bold, italic, underline
          l = l.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          l = l.replace(/\*(.*?)\*/g, '<em>$1</em>');
          l = l.replace(/__(.*?)__/g, '<u>$1</u>');
          l = l.replace(/`(.*?)`/g, '<code style="background:#f2f3f5;padding:2px 4px;border-radius:3px;">$1</code>');
          
          outHtml += l;
        });

        // clean up consecutive ul
        outHtml = outHtml.replace(/<\/ul><ul>/g, '');
        return outHtml;
      };

      // Loop through channels
      const sortedChannels = Object.values(channels).sort((a, b) => (a.order || 0) - (b.order || 0));

      if (sortedChannels.length === 0) {
         html += `<p>Nenhum canal encontrado.</p>`;
      }

      sortedChannels.forEach(channel => {
        const msgs = messagesByChannel[channel.id] || [];
        if (msgs.length === 0) return; // Skip empty channels

        html += `<h2># ${channel.name} <span style="font-size: 11pt; font-weight: normal; color: #e3e5e8;">(${channel.category || 'Categoria Geral'})</span></h2>`;
        
        msgs.forEach(msg => {
          const dateStr = msg.createdAt && msg.createdAt.toDate 
            ? msg.createdAt.toDate().toLocaleString('pt-BR') 
            : '';
            
          html += `<div class="message">`;
          html += `<div class="header"><span class="author">${msg.authorName || 'Desconhecido'}</span><span class="date">${dateStr}</span></div>`;
          
          if (msg.content) {
            html += `<div class="content">${processMarkdown(msg.content)}</div>`;
          }

          if (msg.attachments && msg.attachments.length > 0) {
            html += `<div class="attachments">`;
            msg.attachments.forEach(url => {
              html += `<img src="${url}" alt="Anexo do Discord" />`;
            });
            html += `</div>`;
          }
          
          html += `</div>`;
        });
      });

      html += `</body></html>`;

      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.download = `HUB_Textos_Discord_${date}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert('Erro ao exportar textos do Discord.');
    } finally {
      setIsExportingDiscord(false);
    }
  };

  return (
    <div className="bg-[#080808] border border-blue-500/30 p-4 space-y-4 shadow-lg mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Download className="h-4 w-4 text-emerald-400" />
            Sistema de Backup & Extração (GM)
          </h3>
          <p className="text-[10px] text-white/50 font-mono mt-0.5">
            Exporte as Fichas e Textos do Discord para salvar offline, criar PDFs, e garantir segurança dos dados.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Backup Fichas */}
        <div className="bg-black border border-white/5 p-4 flex flex-col items-center text-center space-y-3 group hover:border-emerald-500/30 transition-colors">
          <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400 group-hover:scale-110 transition-transform">
            <FileJson className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Extrair Fichas</h4>
            <p className="text-[10px] text-white/40 font-mono mt-1 mb-4">
              Baixa o banco de dados completo de todas as fichas de personagem cadastradas em arquivo (.json).
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCharacters}
            disabled={isExportingChars || characters.length === 0}
            className="w-full mt-auto py-2 bg-[#111] hover:bg-[#1a1a1a] border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isExportingChars ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            Exportar Fichas
          </button>
        </div>

        {/* Backup Discord */}
        <div className="bg-black border border-white/5 p-4 flex flex-col items-center text-center space-y-3 group hover:border-blue-500/30 transition-colors">
          <div className="p-3 bg-blue-500/10 rounded-full text-blue-400 group-hover:scale-110 transition-transform">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Extrair Discord</h4>
            <p className="text-[10px] text-white/40 font-mono mt-1 mb-4">
              Consolida e extrai os Textos do Discord de todos os canais para um arquivo de leitura do Word (.doc) mantendo formatação.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportDiscord}
            disabled={isExportingDiscord}
            className="w-full mt-auto py-2 bg-[#111] hover:bg-[#1a1a1a] border border-blue-500/30 text-blue-400 text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isExportingDiscord ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            Exportar para Word
          </button>
        </div>
      </div>

      <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 mt-4 flex items-start gap-3">
        <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-emerald-200/80 font-mono leading-relaxed">
          <strong>Segurança de Dados:</strong> O arquivo Word usa as URLs das imagens salvas. Ao abrir, o Word fará o download de todas as rolagens, ícones e imagens. Você pode salvar como PDF posteriormente para congelar as imagens sem depender de internet.
        </p>
      </div>
    </div>
  );
}
