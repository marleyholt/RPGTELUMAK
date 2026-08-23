import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Copy, Check, Download, Trash2, Search, Filter, 
  History, User, Shield, Swords, Dices, MessageSquare, 
  Settings, Key, AlertCircle, FileText, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import { 
  AuditLogEntry, 
  AuditCategory, 
  getAuditLogs, 
  clearAuditLogs, 
  subscribeToAuditLogs 
} from '../utils/auditTelemetry';

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
  isGM?: boolean;
}

export function AuditModal({ isOpen, onClose, currentUserEmail, isGM }: AuditModalProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAuditLogs((newLogs) => {
      setLogs(newLogs);
    });
    return unsub;
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchCategory = selectedCategory === 'TODAS' || log.category === selectedCategory;
      if (!matchCategory) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(term);
      const matchUser = (log.user || '').toLowerCase().includes(term);
      const matchDetails = log.details ? JSON.stringify(log.details).toLowerCase().includes(term) : false;

      return matchAction || matchUser || matchDetails;
    });
  }, [logs, selectedCategory, searchTerm]);

  if (!isOpen) return null;

  const categories: { id: string; label: string; icon: any; color: string }[] = [
    { id: 'TODAS', label: 'Todas as Ações', icon: History, color: 'text-white' },
    { id: 'PERSONAGEM', label: 'Fichas & Stats', icon: User, color: 'text-cyan-400' },
    { id: 'COMBATE', label: 'Combate & HP', icon: Swords, color: 'text-rose-400' },
    { id: 'DADOS', label: 'Rolagens de Dados', icon: Dices, color: 'text-amber-400' },
    { id: 'DISCORD', label: 'Chat & Discord', icon: MessageSquare, color: 'text-indigo-400' },
    { id: 'MESTRE', label: 'Ações do Mestre', icon: Shield, color: 'text-yellow-400' },
    { id: 'AUTENTICACAO', label: 'Login & Acesso', icon: Key, color: 'text-emerald-400' },
    { id: 'SISTEMA', label: 'Sistema & Config', icon: Settings, color: 'text-sky-400' },
  ];

  const getCategoryBadge = (category: AuditCategory) => {
    switch (category) {
      case 'PERSONAGEM':
        return { bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', label: 'FICHA' };
      case 'COMBATE':
        return { bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30', label: 'COMBATE' };
      case 'DADOS':
        return { bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: 'DADOS' };
      case 'DISCORD':
        return { bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', label: 'DISCORD' };
      case 'MESTRE':
        return { bg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', label: 'MESTRE' };
      case 'AUTENTICACAO':
        return { bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', label: 'AUTH' };
      default:
        return { bg: 'bg-sky-500/20 text-sky-300 border-sky-500/30', label: 'SISTEMA' };
    }
  };

  const handleExportTxt = () => {
    const lines = [
      `=============================================================`,
      `          RELATÓRIO DE AUDITORIA DE AÇÕES - RPG TELUMAK      `,
      `=============================================================`,
      `Gerado em: ${new Date().toLocaleString()}`,
      `Solicitante: ${currentUserEmail || 'Anônimo'}`,
      `Total de Registros: ${logs.length} (Filtrados: ${filteredLogs.length})`,
      `Categoria Ativa: ${selectedCategory}`,
      `\n------------------- HISTÓRICO CRONOLÓGICO -------------------`,
      ...filteredLogs.map(l => {
        let det = '';
        if (l.details) {
          det = typeof l.details === 'object' ? `\n    Detalhes: ${JSON.stringify(l.details, null, 2)}` : `\n    Detalhes: ${l.details}`;
        }
        return `[${l.time}] [${l.category}] (${l.user}${l.userRole ? ` - ${l.userRole}` : ''}): ${l.action}${det}`;
      }),
      `\n=============================================================`
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_telumak_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = () => {
    const summary = filteredLogs.slice(0, 50).map(l => `[${l.time}] [${l.category}] ${l.user}: ${l.action}`).join('\n');
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 animate-fadeIn">
      <div className="bg-[#0b0d0f] border border-amber-500/30 w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden font-sans text-white">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#141619] border-b border-amber-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <History className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                  Auditoria de Ações & Histórico
                </h2>
                <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 font-mono font-black uppercase">
                  {logs.length} Registros Gravados
                </span>
              </div>
              <p className="text-[11px] text-white/50">
                Registro persistente de todas as ações de jogadores, rolagens, edições de ficha e combate
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

        {/* Filters and Search Bar */}
        <div className="p-3 bg-[#0e1012] border-b border-white/10 space-y-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="h-3.5 w-3.5 text-white/40 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por ação, jogador ou detalhe..."
                className="w-full bg-black/60 border border-white/10 pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-500 transition font-mono"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-white/40 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Actions: Export / Copy / Clear */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleCopySummary}
                className="px-2.5 py-1.5 bg-[#1a1c1e] hover:bg-[#25282c] border border-white/10 text-xs font-bold text-white/80 hover:text-white flex items-center gap-1.5 transition"
                title="Copiar resumo para área de transferência"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-sky-400" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportTxt}
                className="px-2.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition"
                title="Baixar arquivo TXT com relatório completo"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Exportar (.txt)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Deseja limpar todo o histórico de auditoria gravado neste dispositivo?')) {
                    clearAuditLogs();
                  }
                }}
                className="p-1.5 text-white/40 hover:text-rose-400 hover:bg-white/5 border border-transparent hover:border-rose-500/20 transition"
                title="Limpar Histórico Local de Auditoria"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-1">
            {categories.map((cat) => {
              const IconComp = cat.icon;
              const isSelected = selectedCategory === cat.id;
              const count = cat.id === 'TODAS' 
                ? logs.length 
                : logs.filter(l => l.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap transition border ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow'
                      : 'bg-black/40 border-white/5 text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <IconComp className="h-3 w-3" />
                  <span>{cat.label}</span>
                  <span className="text-[9px] font-mono opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Logs Stream Body */}
        <div className="flex-1 overflow-y-auto custom-scroll p-3 sm:p-4 space-y-2 select-text">
          {filteredLogs.length === 0 ? (
            <div className="py-20 text-center text-white/30 space-y-2">
              <History className="h-8 w-8 mx-auto opacity-30" />
              <p className="text-xs italic font-mono">
                {searchTerm ? 'Nenhuma ação encontrada com os filtros atuais.' : 'Nenhuma ação registrada nesta sessão.'}
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const badge = getCategoryBadge(log.category);
              const isExpanded = expandedLogId === log.id;
              const hasDetails = log.details && (typeof log.details === 'object' ? Object.keys(log.details).length > 0 : String(log.details).length > 0);

              return (
                <div
                  key={log.id}
                  className="bg-[#121417] border border-white/10 hover:border-white/20 transition p-3 space-y-1.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[9px] font-black font-mono uppercase px-1.5 py-0.5 border ${badge.bg}`}>
                        {badge.label}
                      </span>
                      
                      <span className="font-bold text-white tracking-wide">
                        {log.action}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-white/50 shrink-0 font-mono">
                      <span className="text-sky-400 font-sans font-bold flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {log.user}
                        {log.userRole && (
                          <span className="text-[9px] text-white/40">({log.userRole})</span>
                        )}
                      </span>
                      <span>•</span>
                      <span>{log.time}</span>

                      {hasDetails && (
                        <button
                          type="button"
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="ml-1 text-white/40 hover:text-amber-400 transition"
                          title="Ver detalhes da ação"
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded JSON Details */}
                  {isExpanded && hasDetails && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <pre className="p-2.5 bg-black/80 border border-white/5 text-[11px] text-amber-200/80 font-mono overflow-x-auto whitespace-pre-wrap">
                        {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : String(log.details)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#141619] border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/50">
          <div className="flex items-center gap-2">
            <span>Armazenamento local persistente: <strong>{logs.length}/500 eventos</strong> mantidos.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase text-[10px] tracking-wider transition shadow"
          >
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
}
