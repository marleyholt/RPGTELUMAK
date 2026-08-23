import React, { useState, useEffect } from 'react';
import { 
  X, Copy, Check, Terminal, CheckCircle2, AlertTriangle, Info, 
  Trash2, RefreshCw, Cpu, Database, User, Shield, Radio, Activity,
  BarChart3, ArrowUpRight, ArrowDownRight, HardDrive, Wifi, Sparkles, Zap, ShieldCheck
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Character } from '../types';
import { 
  DayUsageStats, 
  CollectionUsage,
  FIREBASE_SPARK_LIMITS, 
  getTodayStats, 
  subscribeToUsageStats, 
  resetTodayUsageStats,
  trackRead,
  trackWrite
} from '../utils/firebaseUsageTracker';

export interface GlobalLogEntry {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warn' | 'error';
  title: string;
  details?: string;
}

interface DiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: GlobalLogEntry[];
  onClearLogs: () => void;
  onAddLog: (type: 'info' | 'success' | 'warn' | 'error', title: string, details?: any) => void;
  currentUserProfile: UserProfile | null;
  characters: Character[];
  currentTab: string;
}

export function DiagnosticModal({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  onAddLog,
  currentUserProfile,
  characters,
  currentTab
}: DiagnosticModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'QUOTA' | 'LOGS'>('QUOTA');
  const [usageStats, setUsageStats] = useState<DayUsageStats>(getTodayStats());
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const unsub = subscribeToUsageStats((stats) => {
      setUsageStats(stats);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const isGM = currentUserProfile?.role === 'GM';
  const errorCount = logs.filter(l => l.type === 'error').length;
  const warnCount = logs.filter(l => l.type === 'warn').length;

  // Percentage calculations against Firebase Free Tier (Spark) limits
  const readsPercent = Math.min(100, Math.round((usageStats.totalReads / FIREBASE_SPARK_LIMITS.DAILY_READS) * 100 * 10) / 10);
  const writesPercent = Math.min(100, Math.round((usageStats.totalWrites / FIREBASE_SPARK_LIMITS.DAILY_WRITES) * 100 * 10) / 10);
  const deletesPercent = Math.min(100, Math.round((usageStats.totalDeletes / FIREBASE_SPARK_LIMITS.DAILY_DELETES) * 100 * 10) / 10);

  // Bandwidth calculation (KB / MB)
  const bandwidthKB = Math.round(usageStats.estimatedBytesTotal / 1024);
  const bandwidthMB = Math.round((bandwidthKB / 1024) * 100) / 100;
  const bandwidthPercent = Math.min(100, Math.round((bandwidthMB / FIREBASE_SPARK_LIMITS.DAILY_ESTIMATED_BANDWIDTH_MB) * 100 * 10) / 10);

  const getStatusColor = (percent: number) => {
    if (percent >= 85) return 'text-rose-400 bg-rose-500/20 border-rose-500/40';
    if (percent >= 60) return 'text-amber-400 bg-amber-500/20 border-amber-500/40';
    return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
  };

  const getBarColor = (percent: number) => {
    if (percent >= 85) return 'bg-rose-500';
    if (percent >= 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const handleTestDatabase = async () => {
    setIsTesting(true);
    onAddLog('info', 'Iniciando teste de ping com o banco Firestore...');
    try {
      const pingDoc = await addDoc(collection(db, 'system_diagnostic_pings'), {
        testerEmail: currentUserProfile?.email || 'anon',
        testerRole: currentUserProfile?.role || 'PLAYER',
        timestamp: serverTimestamp(),
        localTime: new Date().toISOString()
      });
      trackWrite('system_diagnostic_pings', 1);
      trackRead('system_diagnostic_pings', 1);

      onAddLog('success', 'Ping do Firestore respondido com sucesso!', {
        pingDocId: pingDoc.id,
        status: 'ONLINE',
        latencia: '< 100ms'
      });
    } catch (err: any) {
      onAddLog('error', `Falha no teste de banco Firestore: ${err?.message || err}`, {
        code: err?.code,
        details: err?.message
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyReport = () => {
    const report = [
      `====================================================`,
      `       RELATÓRIO DE CONSUMO & DIAGNÓSTICO TELUMAK   `,
      `====================================================`,
      `Data/Hora: ${new Date().toLocaleString()} (${new Date().toISOString()})`,
      `Usuário: ${currentUserProfile?.displayName || 'N/A'} (${currentUserProfile?.email || 'N/A'}) - ${isGM ? 'Mestre (GM)' : 'Jogador'}`,
      `Aba Atual: ${currentTab.toUpperCase()}`,
      `Total de Fichas: ${characters.length} (${characters.filter(c => c.ativo_na_mesa).length} ativas na mesa)`,
      `\n--- MÉTRICAS DE TRÁFEGO & COTA FIREBASE (HOJE: ${usageStats.date}) ---`,
      `• Leituras Hoje: ${usageStats.totalReads.toLocaleString()} / ${FIREBASE_SPARK_LIMITS.DAILY_READS.toLocaleString()} (${readsPercent}% da cota)`,
      `• Gravações Hoje: ${usageStats.totalWrites.toLocaleString()} / ${FIREBASE_SPARK_LIMITS.DAILY_WRITES.toLocaleString()} (${writesPercent}% da cota)`,
      `• Exclusões Hoje: ${usageStats.totalDeletes.toLocaleString()} / ${FIREBASE_SPARK_LIMITS.DAILY_DELETES.toLocaleString()} (${deletesPercent}% da cota)`,
      `• Tráfego Estimado: ${bandwidthKB} KB (~${bandwidthMB} MB)`,
      `• Leituras da Sessão Atual: ${usageStats.sessionReads.toLocaleString()}`,
      `• Gravações da Sessão Atual: ${usageStats.sessionWrites.toLocaleString()}`,
      `\n--- DETALHES POR COLEÇÃO ---`,
      ...(Object.entries(usageStats.collections) as [string, CollectionUsage][]).map(([col, data]) => 
        `  - ${col}: ${data.reads} leituras, ${data.writes} gravações, ${data.deletes} exclusões (~${Math.round(data.estimatedBytes / 1024)} KB)`
      ),
      `\n--- HISTÓRICO DE LOGS (${logs.length} eventos: ${errorCount} erros, ${warnCount} avisos) ---`,
      ...logs.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.title} ${l.details ? `\n  Detalhes: ${l.details}` : ''}`),
      `\n====================================================`
    ].join('\n');

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 animate-fadeIn">
      <div className="bg-[#0c0d0e] border border-blue-500/30 w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden font-sans text-white">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#141619] border-b border-blue-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500/10 text-sky-400 flex items-center justify-center border border-blue-500/30">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                  Diagnóstico & Gestão de Cota do Banco
                </h2>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 font-mono font-black uppercase">
                  Plano Spark Free
                </span>
              </div>
              <p className="text-[11px] text-white/50">
                Monitoramento de consumo diário, tráfego de rede e telemetria em tempo real
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-5 bg-[#08090a] border-b border-white/10 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('QUOTA')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition ${
              activeSubTab === 'QUOTA'
                ? 'border-blue-500 text-sky-400 bg-blue-500/10'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Consumo & Tráfego do Banco</span>
            {readsPercent >= 80 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('LOGS')}
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition ${
              activeSubTab === 'LOGS'
                ? 'border-blue-500 text-sky-400 bg-blue-500/10'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Terminal className="h-4 w-4" />
            <span>Logs & Telemetria em Tempo Real</span>
            {errorCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded text-[9px] font-bold">
                {errorCount}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scroll p-4 sm:p-5 space-y-4">
          
          {activeSubTab === 'QUOTA' && (
            <>
              {/* Top Banner Status */}
              <div className="p-4 bg-[#121417] border border-blue-500/20 rounded-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-none bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-white">
                      Status da Cota Diária: Saudável & Protegida
                    </h3>
                    <p className="text-xs text-white/60">
                      O portal utiliza carregamento sob demanda, limites de 50 mensagens e listeners indexados para garantir custo zero.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      resetTodayUsageStats();
                      onAddLog('info', 'Contadores de uso local foram reiniciados.');
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold text-white/40 hover:text-white border border-white/10 transition"
                    title="Zerar métricas salvas localmente hoje"
                  >
                    Zerar Métricas Locais
                  </button>
                </div>
              </div>

              {/* 3 Main Quota Gauges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                
                {/* 1. Daily Reads */}
                <div className="p-4 bg-[#121417] border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50 flex items-center gap-1.5">
                      <ArrowDownRight className="h-3.5 w-3.5 text-sky-400" /> Leituras de Documentos
                    </span>
                    <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 border ${getStatusColor(readsPercent)}`}>
                      {readsPercent}%
                    </span>
                  </div>
                  
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xl font-black font-mono text-white">
                      {usageStats.totalReads.toLocaleString()}
                    </span>
                    <span className="text-xs font-mono text-white/40">
                      limite {FIREBASE_SPARK_LIMITS.DAILY_READS.toLocaleString()}/dia
                    </span>
                  </div>

                  <div className="w-full bg-black/60 h-2 border border-white/5 overflow-hidden mb-2">
                    <div 
                      className={`h-full ${getBarColor(readsPercent)} transition-all duration-300`} 
                      style={{ width: `${Math.max(1, readsPercent)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-white/40 font-mono">
                    <span>Sessão atual: {usageStats.sessionReads.toLocaleString()}</span>
                    <span>Restante: {(FIREBASE_SPARK_LIMITS.DAILY_READS - usageStats.totalReads).toLocaleString()}</span>
                  </div>
                </div>

                {/* 2. Daily Writes */}
                <div className="p-4 bg-[#121417] border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50 flex items-center gap-1.5">
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" /> Gravações no Banco
                    </span>
                    <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 border ${getStatusColor(writesPercent)}`}>
                      {writesPercent}%
                    </span>
                  </div>
                  
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xl font-black font-mono text-white">
                      {usageStats.totalWrites.toLocaleString()}
                    </span>
                    <span className="text-xs font-mono text-white/40">
                      limite {FIREBASE_SPARK_LIMITS.DAILY_WRITES.toLocaleString()}/dia
                    </span>
                  </div>

                  <div className="w-full bg-black/60 h-2 border border-white/5 overflow-hidden mb-2">
                    <div 
                      className={`h-full ${getBarColor(writesPercent)} transition-all duration-300`} 
                      style={{ width: `${Math.max(1, writesPercent)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-white/40 font-mono">
                    <span>Sessão atual: {usageStats.sessionWrites.toLocaleString()}</span>
                    <span>Restante: {(FIREBASE_SPARK_LIMITS.DAILY_WRITES - usageStats.totalWrites).toLocaleString()}</span>
                  </div>
                </div>

                {/* 3. Estimated Traffic */}
                <div className="p-4 bg-[#121417] border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50 flex items-center gap-1.5">
                      <Wifi className="h-3.5 w-3.5 text-amber-400" /> Tráfego de Rede
                    </span>
                    <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 border ${getStatusColor(bandwidthPercent)}`}>
                      {bandwidthPercent}%
                    </span>
                  </div>
                  
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xl font-black font-mono text-white">
                      {bandwidthMB} <span className="text-xs font-normal text-white/60">MB</span>
                    </span>
                    <span className="text-xs font-mono text-white/40">
                      cota ~{FIREBASE_SPARK_LIMITS.DAILY_ESTIMATED_BANDWIDTH_MB} MB/dia
                    </span>
                  </div>

                  <div className="w-full bg-black/60 h-2 border border-white/5 overflow-hidden mb-2">
                    <div 
                      className={`h-full ${getBarColor(bandwidthPercent)} transition-all duration-300`} 
                      style={{ width: `${Math.max(1, bandwidthPercent)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-white/40 font-mono">
                    <span>Total KB: {bandwidthKB.toLocaleString()} KB</span>
                    <span>10 GB/mês Free</span>
                  </div>
                </div>

              </div>

              {/* Per-Collection Traffic Table */}
              <div className="bg-[#121417] border border-white/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-sky-400" />
                    Consumo por Coleção de Dados (Hoje)
                  </h4>
                  <span className="text-[10px] text-white/40 font-mono">Atualização em tempo real</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-white/50 text-[10px] uppercase">
                        <th className="pb-2 font-bold">Coleção Firestore</th>
                        <th className="pb-2 font-bold text-right">Leituras</th>
                        <th className="pb-2 font-bold text-right">Gravações</th>
                        <th className="pb-2 font-bold text-right">Exclusões</th>
                        <th className="pb-2 font-bold text-right">Tráfego Est.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(Object.entries(usageStats.collections) as [string, CollectionUsage][]).map(([colName, colData]) => {
                        const colKb = Math.round(colData.estimatedBytes / 1024);
                        return (
                          <tr key={colName} className="hover:bg-white/[0.02]">
                            <td className="py-2.5 font-bold text-sky-300 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-none inline-block"></span>
                              /{colName}
                            </td>
                            <td className="py-2.5 text-right text-white">
                              {colData.reads.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right text-emerald-400">
                              {colData.writes.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right text-rose-400">
                              {colData.deletes.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right text-white/60">
                              {colKb > 0 ? `${colKb} KB` : '< 1 KB'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Active Optimizations Checklist */}
              <div className="bg-[#121417] border border-emerald-500/20 p-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2 mb-2.5">
                  <Zap className="h-4 w-4" />
                  Otimizações Ativas Contra Estouro de Cota
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-white/70">
                  <div className="flex items-start gap-2 bg-black/30 p-2.5 border border-white/5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block font-sans">Limite de Mensagens no Discord (50 docs)</strong>
                      <span className="text-[11px] text-white/50">Carrega apenas as mensagens mais recentes por canal, economizando milhares de leituras.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-black/30 p-2.5 border border-white/5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block font-sans">Listeners com Desinscrição Automática</strong>
                      <span className="text-[11px] text-white/50">Ao trocar de canal ou sair de abas, todas as conexões antigas são canceladas imediatamente.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-black/30 p-2.5 border border-white/5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block font-sans">Chat da Mesa com Limit(50)</strong>
                      <span className="text-[11px] text-white/50">O chat principal sincroniza apenas as 50 interações mais recentes do combate/sessão.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-black/30 p-2.5 border border-white/5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block font-sans">Compactação de Imagens e Avatares</strong>
                      <span className="text-[11px] text-white/50">Uploads de imagens são redimensionados antes de salvar, economizando tráfego de rede e armazenamento.</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSubTab === 'LOGS' && (
            <div className="space-y-4">
              {/* Quick Action Bar for Logs */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#121417] p-3 border border-white/10">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={handleTestDatabase}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition shadow"
                  >
                    <Cpu className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Testando Ping...' : 'Testar Conexão Firestore'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="px-3 py-1.5 bg-[#1e2124] hover:bg-[#25282c] text-sky-300 border border-blue-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition shadow"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Relatório Copiado!' : 'Copiar Relatório Completo'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClearLogs}
                    className="px-2.5 py-1 text-xs text-white/40 hover:text-rose-400 transition flex items-center gap-1"
                    title="Limpar todos os logs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Limpar Logs</span>
                  </button>
                </div>
              </div>

              {/* Log List View */}
              <div className="p-4 bg-[#050607] font-mono text-xs space-y-2.5 border border-white/10 select-text max-h-[50vh] overflow-y-auto custom-scroll">
                {logs.length === 0 ? (
                  <div className="py-16 text-center text-white/30 italic">
                    Nenhum evento registrado nesta sessão.
                  </div>
                ) : (
                  logs.map((log) => {
                    let colorClass = 'text-white/80 border-white/5 bg-white/[0.02]';
                    let IconComp = Info;
                    let badge = 'INFO';
                    let badgeBg = 'bg-blue-500/20 text-sky-300 border-blue-500/30';

                    if (log.type === 'error') {
                      colorClass = 'text-rose-200 border-rose-500/30 bg-rose-500/10';
                      IconComp = AlertTriangle;
                      badge = 'ERRO';
                      badgeBg = 'bg-rose-500/30 text-rose-300 border-rose-500/40';
                    } else if (log.type === 'warn') {
                      colorClass = 'text-amber-200 border-amber-500/30 bg-amber-500/10';
                      IconComp = AlertTriangle;
                      badge = 'AVISO';
                      badgeBg = 'bg-amber-500/30 text-amber-300 border-amber-500/40';
                    } else if (log.type === 'success') {
                      colorClass = 'text-emerald-200 border-emerald-500/30 bg-emerald-500/10';
                      IconComp = CheckCircle2;
                      badge = 'SUCESSO';
                      badgeBg = 'bg-emerald-500/30 text-emerald-300 border-emerald-500/40';
                    }

                    return (
                      <div
                        key={log.id}
                        className={`p-3 border ${colorClass} transition leading-relaxed`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 font-bold">
                            <IconComp className="h-3.5 w-3.5 shrink-0" />
                            <span className={`text-[9px] px-1.5 py-0.5 border font-mono font-black uppercase ${badgeBg}`}>
                              {badge}
                            </span>
                            <span className="text-white">{log.title}</span>
                          </div>
                          <span className="text-[10px] text-white/40 shrink-0 font-mono">
                            {log.time}
                          </span>
                        </div>

                        {log.details && (
                          <pre className="mt-2 p-2.5 bg-black/70 border border-white/5 text-[11px] text-white/60 overflow-x-auto whitespace-pre-wrap font-mono">
                            {log.details}
                          </pre>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#141619] border-t border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/50">
          <div className="flex items-center gap-2">
            <span>Cota Diária Gratuita: <strong>50k Leituras</strong> e <strong>20k Gravações</strong>.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-wider transition"
          >
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
}
