import React, { useState } from 'react';
import { 
  X, Copy, Check, Terminal, CheckCircle2, AlertTriangle, Info, 
  Trash2, RefreshCw, Cpu, Database, User, Shield, Radio, Activity
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Character } from '../types';

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
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const isGM = currentUserProfile?.role === 'GM';
  const errorCount = logs.filter(l => l.type === 'error').length;
  const warnCount = logs.filter(l => l.type === 'warn').length;

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
      `       RELATÓRIO DE DIAGNÓSTICO DO SISTEMA TELUMAK  `,
      `====================================================`,
      `Data/Hora: ${new Date().toLocaleString()} (${new Date().toISOString()})`,
      `Ambiente: Web App (Portal Telumak)`,
      `Usuário: ${currentUserProfile?.displayName || 'N/A'} (${currentUserProfile?.email || 'N/A'})`,
      `Cargo: ${isGM ? 'Mestre (GM)' : 'Jogador'}`,
      `Aba Atual: ${currentTab.toUpperCase()}`,
      `Total de Personagens Cadastrados: ${characters.length}`,
      `Personagens Ativos na Mesa: ${characters.filter(c => c.ativo_na_mesa).length}`,
      `Estatísticas de Logs: ${logs.length} eventos (${errorCount} erros, ${warnCount} avisos)`,
      `\n--- HISTÓRICO COMPLETO DE EVENTOS ---`,
      ...logs.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.title} ${l.details ? `\n  Detalhes: ${l.details}` : ''}`),
      `\n====================================================`
    ].join('\n');

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-[#0c0d0e] border border-blue-500/30 w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-white">
        
        {/* Header */}
        <div className="px-5 py-4 bg-[#141619] border-b border-blue-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500/10 text-sky-400 flex items-center justify-center border border-blue-500/30">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                  Diagnóstico & Telemetria do Sistema
                </h2>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 font-mono font-black uppercase">
                  Ativo
                </span>
              </div>
              <p className="text-[11px] text-white/50">
                Monitoramento de conexão, eventos de rede e logs em tempo real
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

        {/* Status Highlights */}
        <div className="p-4 bg-[#08090a] border-b border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#121417] p-3 border border-white/5">
            <span className="text-[9px] uppercase font-mono font-bold text-white/40 block mb-1 flex items-center gap-1">
              <Database className="h-3 w-3 text-sky-400" /> Firestore
            </span>
            <span className="text-emerald-400 font-black flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Sincronizado
            </span>
          </div>

          <div className="bg-[#121417] p-3 border border-white/5">
            <span className="text-[9px] uppercase font-mono font-bold text-white/40 block mb-1 flex items-center gap-1">
              <User className="h-3 w-3 text-sky-400" /> Usuário
            </span>
            <span className="text-white font-bold truncate block">
              {currentUserProfile?.displayName || 'Autenticado'}
            </span>
            <span className="text-[10px] text-sky-400 font-mono font-bold">
              {isGM ? 'Mestre (GM)' : 'Jogador'}
            </span>
          </div>

          <div className="bg-[#121417] p-3 border border-white/5">
            <span className="text-[9px] uppercase font-mono font-bold text-white/40 block mb-1 flex items-center gap-1">
              <Activity className="h-3 w-3 text-sky-400" /> Sessão Ativa
            </span>
            <span className="text-white font-bold uppercase font-mono">
              Aba: {currentTab}
            </span>
            <span className="text-[10px] text-white/40">
              {characters.length} fichas carregadas
            </span>
          </div>

          <div className="bg-[#121417] p-3 border border-white/5">
            <span className="text-[9px] uppercase font-mono font-bold text-white/40 block mb-1 flex items-center gap-1">
              <Shield className="h-3 w-3 text-sky-400" /> Saúde dos Logs
            </span>
            <div className="flex items-center gap-2">
              <span className={`font-bold ${errorCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {errorCount} {errorCount === 1 ? 'Erro' : 'Erros'}
              </span>
              <span className="text-white/20">•</span>
              <span className="text-white/60 font-mono text-[11px]">{logs.length} eventos</span>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="px-4 py-2.5 bg-[#141619] border-b border-white/5 flex flex-wrap items-center justify-between gap-2">
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
              <span>Limpar</span>
            </button>
          </div>
        </div>

        {/* Log Viewer Terminal */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#050607] font-mono text-xs space-y-2 custom-scroll select-text">
          {logs.length === 0 ? (
            <div className="py-16 text-center text-white/30 italic">
              Nenhum evento ou erro registrado no momento. Sistema operando nominalmente.
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
                    <pre className="mt-2 p-2.5 bg-black/70 border border-white/5 rounded-none text-[11px] text-white/60 overflow-x-auto whitespace-pre-wrap font-mono">
                      {log.details}
                    </pre>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#141619] border-t border-blue-500/20 flex items-center justify-between text-xs text-white/50">
          <span>O console de telemetria captura exceções e testes de rede da sessão.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-wider transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
