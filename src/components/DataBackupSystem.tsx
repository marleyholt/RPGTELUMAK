import React, { useState } from 'react';
import { Download, Database, Loader2, ShieldCheck } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Character } from '../types';

interface DataBackupSystemProps {
  characters: Character[];
}

export function DataBackupSystem({ characters }: DataBackupSystemProps) {
  const [isExportingChars, setIsExportingChars] = useState(false);

  // 1. Export Full DB Snapshot to JSON
  const handleExportDatabase = async () => {
    setIsExportingChars(true);
    try {
      const snapshot: any = {
        characters: characters,
        timestamp: new Date().toISOString()
      };

      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        snapshot.users = [];
        usersSnap.forEach(d => snapshot.users.push({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn('Could not fetch users', e);
      }
      
      try {
        const channelsSnap = await getDocs(collection(db, 'discord_channels'));
        snapshot.discord_channels = [];
        channelsSnap.forEach(d => snapshot.discord_channels.push({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn('Could not fetch channels', e);
      }

      try {
        const notesSnap = await getDocs(collection(db, 'campaign_notes'));
        snapshot.campaign_notes = [];
        notesSnap.forEach(d => snapshot.campaign_notes.push({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn('Could not fetch notes', e);
      }
      
      try {
        const npcsSnap = await getDocs(collection(db, 'npcs'));
        snapshot.npcs = [];
        npcsSnap.forEach(d => snapshot.npcs.push({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn('Could not fetch npcs', e);
      }

      const dataStr = JSON.stringify(snapshot, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.download = `HUB_Snapshot_DB_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert('Erro ao exportar banco de dados.');
    } finally {
      setIsExportingChars(false);
    }
  };

  return (
    <div className="bg-[#080808] border border-blue-500/30 p-4 space-y-3 shadow-lg mt-4">
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <Database className="h-4 w-4 text-emerald-400" />
        <h3 className="text-xs font-black uppercase tracking-wider text-white">
          Backup & Recovery (Banco de Dados)
        </h3>
      </div>
      
      <p className="text-[10px] text-white/50 font-mono leading-relaxed">
        Gera um snapshot (.json) contendo <strong>todas as Fichas de Personagens</strong> e, se possível, Usuários e Notas de Campanha vinculadas ao banco Firestore atual. (Para extrair os textos do Discord, utilize a aba Discord).
      </p>

      <button
        type="button"
        onClick={handleExportDatabase}
        disabled={isExportingChars}
        className="w-full sm:w-auto py-2 px-4 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/30 text-emerald-400 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isExportingChars ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
        Baixar Snapshot do Banco (.JSON)
      </button>

      <div className="flex items-start gap-2 pt-2">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/60 shrink-0" />
        <p className="text-[9px] text-emerald-200/60 font-mono leading-relaxed">
          Uso recomendado para migração segura de dados para SQL (Laravel) ou backup offline do Mestre.
        </p>
      </div>
    </div>
  );
}
