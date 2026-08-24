import React, { useState, useEffect } from 'react';
import { Download, X, FileText, FileJson, FileType2, Loader2, Search, Filter } from 'lucide-react';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { DiscordChannelItem, DiscordNotebookMessage } from '../types';
import html2pdf from 'html2pdf.js';

interface DiscordExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: DiscordChannelItem[];
  isGM: boolean;
}

export function DiscordExportModal({ isOpen, onClose, channels, isGM }: DiscordExportModalProps) {
  const [selectedChannelId, setSelectedChannelId] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [authorName, setAuthorName] = useState<string>('');
  
  const [exportFormat, setExportFormat] = useState<'word' | 'json' | 'pdf'>('word');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let msgsRef = collection(db, 'discord_notebook_messages');
      const snap = await getDocs(msgsRef);
      let allMessages: DiscordNotebookMessage[] = [];
      
      snap.forEach(doc => {
        allMessages.push(Object.assign({ id: doc.id }, doc.data()) as DiscordNotebookMessage);
      });

      // Filtrar apenas pros canais permitidos (channels da props)
      const allowedIds = new Set(channels.map(c => c.id));
      allMessages = allMessages.filter(m => allowedIds.has(m.channelId));

      // Se um canal específico foi selecionado
      if (selectedChannelId !== 'ALL') {
        allMessages = allMessages.filter(m => m.channelId === selectedChannelId);
      }
      
      // Ordenar por data
      allMessages.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
        return timeA - timeB;
      });

      // Filtrar Autor
      if (authorName.trim()) {
        const queryAuthor = authorName.toLowerCase().trim();
        allMessages = allMessages.filter(m => (m.authorName || '').toLowerCase().includes(queryAuthor));
      }

      // Filtrar Datas
      if (startDate) {
        const startTimestamp = new Date(startDate + 'T00:00:00').getTime();
        allMessages = allMessages.filter(m => {
          if (!m.createdAt) return false;
          const time = m.createdAt.toDate ? m.createdAt.toDate().getTime() : m.createdAt;
          return time >= startTimestamp;
        });
      }
      if (endDate) {
        const endTimestamp = new Date(endDate + 'T23:59:59').getTime();
        allMessages = allMessages.filter(m => {
          if (!m.createdAt) return false;
          const time = m.createdAt.toDate ? m.createdAt.toDate().getTime() : m.createdAt;
          return time <= endTimestamp;
        });
      }

      if (allMessages.length === 0) {
        alert("Nenhuma mensagem encontrada com esses filtros.");
        setIsExporting(false);
        return;
      }

      const messagesByChannel: Record<string, DiscordNotebookMessage[]> = {};
      allMessages.forEach(m => {
        if (!messagesByChannel[m.channelId]) {
          messagesByChannel[m.channelId] = [];
        }
        messagesByChannel[m.channelId].push(m);
      });

      const sortedChannels = [...channels].sort((a, b) => (a.order || 0) - (b.order || 0));

      if (exportFormat === 'json') {
        const dataStr = JSON.stringify(messagesByChannel, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Extração_Discord_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (exportFormat === 'word' || exportFormat === 'pdf') {
        let html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>Extração Textos do Discord</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #313338; line-height: 1.5; background-color: #ffffff; margin: 20px; }
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
          <h1>Histórico de Extração</h1>
          <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          ${startDate ? `<p><strong>A partir de:</strong> ${startDate}</p>` : ''}
          ${endDate ? `<p><strong>Até:</strong> ${endDate}</p>` : ''}
          ${authorName ? `<p><strong>Autor filtrado:</strong> ${authorName}</p>` : ''}
        `;

        const processMarkdown = (text: string) => {
          if (!text) return '';
          let processed = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const lines = processed.split('\n');
          let outHtml = '';

          lines.forEach(line => {
            let l = line;
            if (l.startsWith('# ')) l = `<div class="h1-md">${l.substring(2)}</div>`;
            else if (l.startsWith('## ')) l = `<div class="h2-md">${l.substring(3)}</div>`;
            else if (l.startsWith('&gt; ')) l = `<blockquote>${l.substring(5)}</blockquote>`;
            else if (l.startsWith('- ') || l.startsWith('* ')) l = `<ul><li>${l.substring(2)}</li></ul>`;
            else l = `${l}<br/>`;
            
            l = l.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            l = l.replace(/\*(.*?)\*/g, '<em>$1</em>');
            l = l.replace(/__(.*?)__/g, '<u>$1</u>');
            l = l.replace(/`(.*?)`/g, '<code style="background:#f2f3f5;padding:2px 4px;border-radius:3px;">$1</code>');
            outHtml += l;
          });
          return outHtml.replace(/<\/ul><ul>/g, '');
        };

        sortedChannels.forEach(channel => {
          const msgs = messagesByChannel[channel.id] || [];
          if (msgs.length === 0) return;

          html += `<h2># ${channel.name} <span style="font-size: 11pt; font-weight: normal; color: #e3e5e8;">(${channel.category || 'Categoria Geral'})</span></h2>`;
          
          msgs.forEach(msg => {
            const dateStr = msg.createdAt && msg.createdAt.toDate 
              ? msg.createdAt.toDate().toLocaleString('pt-BR') 
              : '';
              
            html += `<div class="message">`;
            html += `<div class="header"><span class="author">${msg.authorName || 'Desconhecido'}</span><span class="date">${dateStr}</span></div>`;
            if (msg.content) html += `<div class="content">${processMarkdown(msg.content)}</div>`;
            if (msg.attachments && msg.attachments.length > 0) {
              html += `<div class="attachments">`;
              msg.attachments.forEach(url => html += `<img src="${url}" alt="Anexo" />`);
              html += `</div>`;
            }
            html += `</div>`;
          });
        });

        html += `</body></html>`;

        if (exportFormat === 'word') {
          const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Extração_Discord_${new Date().toISOString().split('T')[0]}.doc`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          // PDF export using html2pdf
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          document.body.appendChild(tempDiv);
          tempDiv.style.display = 'none';
          
          const opt = {
            margin:       10,
            filename:     `Extração_Discord_${new Date().toISOString().split('T')[0]}.pdf`,
            image:        { type: 'jpeg' as const, quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
          };
          
          await html2pdf().set(opt).from(tempDiv).save();
          document.body.removeChild(tempDiv);
        }
      }

    } catch (e) {
      console.error(e);
      alert('Erro ao extrair conversas.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1e1f22] border border-[#2b2d31] w-full max-w-lg shadow-2xl rounded-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#2b2d31] p-4 flex items-center justify-between border-b border-[#1e1f22]">
          <div className="flex items-center gap-2 text-white">
            <Download className="h-5 w-5 text-[#5865f2]" />
            <h2 className="font-bold">Extrair Conversas do Discord</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-[#b5bac1] mb-4">
            Defina os filtros desejados para exportar o histórico de mensagens. 
            Você só pode exportar canais aos quais possui acesso.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-[#b5bac1] uppercase tracking-wider mb-1">
                Filtrar Canal
              </label>
              <select 
                value={selectedChannelId}
                onChange={e => setSelectedChannelId(e.target.value)}
                className="w-full bg-[#1e1f22] border border-[#383a40] text-[#dbdee1] text-sm p-2 rounded focus:outline-none focus:border-[#5865f2]"
              >
                <option value="ALL">Todos os canais disponíveis</option>
                {channels.map(c => (
                  <option key={c.id} value={c.id}># {c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#b5bac1] uppercase tracking-wider mb-1">
                  Data Inicial (opcional)
                </label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-[#1e1f22] border border-[#383a40] text-[#dbdee1] text-sm p-2 rounded focus:outline-none focus:border-[#5865f2]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#b5bac1] uppercase tracking-wider mb-1">
                  Data Final (opcional)
                </label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-[#1e1f22] border border-[#383a40] text-[#dbdee1] text-sm p-2 rounded focus:outline-none focus:border-[#5865f2]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#b5bac1] uppercase tracking-wider mb-1">
                Filtrar por Usuário (opcional)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#949ba4]" />
                <input 
                  type="text"
                  placeholder="Nome do autor..."
                  value={authorName}
                  onChange={e => setAuthorName(e.target.value)}
                  className="w-full bg-[#1e1f22] border border-[#383a40] text-[#dbdee1] text-sm p-2 pl-9 rounded focus:outline-none focus:border-[#5865f2]"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-[11px] font-bold text-[#b5bac1] uppercase tracking-wider mb-2">
                Formato de Saída
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setExportFormat('word')}
                  className={`flex flex-col items-center justify-center p-3 rounded border transition-colors ${exportFormat === 'word' ? 'border-[#5865f2] bg-[#5865f2]/10 text-white' : 'border-[#383a40] text-[#949ba4] hover:border-[#5865f2]/50'}`}
                >
                  <FileText className="h-6 w-6 mb-1" />
                  <span className="text-xs font-bold">Word</span>
                </button>
                <button 
                  onClick={() => setExportFormat('pdf')}
                  className={`flex flex-col items-center justify-center p-3 rounded border transition-colors ${exportFormat === 'pdf' ? 'border-[#ed4245] bg-[#ed4245]/10 text-white' : 'border-[#383a40] text-[#949ba4] hover:border-[#ed4245]/50'}`}
                >
                  <FileType2 className="h-6 w-6 mb-1" />
                  <span className="text-xs font-bold">PDF</span>
                </button>
                <button 
                  onClick={() => setExportFormat('json')}
                  className={`flex flex-col items-center justify-center p-3 rounded border transition-colors ${exportFormat === 'json' ? 'border-[#3ba55c] bg-[#3ba55c]/10 text-white' : 'border-[#383a40] text-[#949ba4] hover:border-[#3ba55c]/50'}`}
                >
                  <FileJson className="h-6 w-6 mb-1" />
                  <span className="text-xs font-bold">JSON</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#2b2d31] p-4 flex items-center justify-end gap-3 border-t border-[#1e1f22]">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm text-white hover:underline focus:outline-none"
            disabled={isExporting}
          >
            Cancelar
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 bg-[#5865f2] hover:bg-[#4752c4] text-white px-6 py-2 rounded text-sm font-bold transition-colors disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isExporting ? 'Extraindo...' : 'Extrair Agora'}
          </button>
        </div>
      </div>
    </div>
  );
}
