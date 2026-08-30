// Telumak RPG - Offline Mode & Campaign Data Management
// Provides zero-quota preparation mode for GM and robust JSON backup/restore

import { Character, NPC, DiscordChannelItem, DiscordNotebookMessage } from '../types';
import { db } from '../firebase';
import { collection, doc, writeBatch, getDocs, setDoc } from 'firebase/firestore';
import { trackWrite, trackRead } from './firebaseUsageTracker';

const OFFLINE_MODE_KEY = 'telumak_offline_mode_active';
const OFFLINE_CHARS_KEY = 'telumak_offline_characters_v2';
const OFFLINE_NPCS_KEY = 'telumak_offline_npcs_v2';
const OFFLINE_CHANNELS_KEY = 'telumak_offline_channels_v2';
const OFFLINE_MSGS_KEY = 'telumak_offline_messages_v2';
const LAST_OFFLINE_SYNC_KEY = 'telumak_offline_last_sync';

export interface CampaignBackupFile {
  tipo: 'TELUMAK_CAMPANHA_BACKUP';
  versao: '2.0';
  data_geracao: string;
  gerado_por?: string;
  dados: {
    personagens: Character[];
    npcs: NPC[];
    canais_discord: Array<{
      id: string;
      name: string;
      category?: string;
      type?: 'text' | 'voice';
      topic?: string;
      mensagens: DiscordNotebookMessage[];
    }>;
  };
}

// 1. Offline Mode State
export function isOfflineModeActive(): boolean {
  try {
    return localStorage.getItem(OFFLINE_MODE_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

export function setOfflineModeActive(active: boolean): void {
  try {
    localStorage.setItem(OFFLINE_MODE_KEY, active ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('telumakOfflineModeChanged', { detail: active }));
  } catch (e) {
    console.warn('Erro ao atualizar estado do modo offline:', e);
  }
}

// 2. Offline Data Storage (Local Workspace)
export function saveOfflineCharacters(chars: Character[]) {
  try {
    localStorage.setItem(OFFLINE_CHARS_KEY, JSON.stringify(chars));
    localStorage.setItem(LAST_OFFLINE_SYNC_KEY, new Date().toISOString());
  } catch (e) {
    console.warn('Erro ao salvar personagens no modo offline:', e);
  }
}

export function loadOfflineCharacters(): Character[] | null {
  try {
    const raw = localStorage.getItem(OFFLINE_CHARS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function saveOfflineNpcs(npcs: NPC[]) {
  try {
    localStorage.setItem(OFFLINE_NPCS_KEY, JSON.stringify(npcs));
  } catch (e) {
    console.warn('Erro ao salvar NPCs no modo offline:', e);
  }
}

export function loadOfflineNpcs(): NPC[] | null {
  try {
    const raw = localStorage.getItem(OFFLINE_NPCS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function saveOfflineDiscordData(channels: DiscordChannelItem[], messages: DiscordNotebookMessage[]) {
  try {
    localStorage.setItem(OFFLINE_CHANNELS_KEY, JSON.stringify(channels));
    localStorage.setItem(OFFLINE_MSGS_KEY, JSON.stringify(messages));
  } catch (e) {
    console.warn('Erro ao salvar canais/mensagens no modo offline:', e);
  }
}

export function loadOfflineDiscordData(): { channels: DiscordChannelItem[]; messages: DiscordNotebookMessage[] } | null {
  try {
    const rawChannels = localStorage.getItem(OFFLINE_CHANNELS_KEY);
    const rawMsgs = localStorage.getItem(OFFLINE_MSGS_KEY);
    if (!rawChannels && !rawMsgs) return null;
    return {
      channels: rawChannels ? JSON.parse(rawChannels) : [],
      messages: rawMsgs ? JSON.parse(rawMsgs) : []
    };
  } catch (e) {
    return null;
  }
}

// 3. Generate Complete JSON Backup
export function generateCampaignBackup(params: {
  characters: Character[];
  npcs: NPC[];
  selectedChannels: Array<{
    channel: DiscordChannelItem;
    messages: DiscordNotebookMessage[];
  }>;
  authorEmail?: string;
}): CampaignBackupFile {
  return {
    tipo: 'TELUMAK_CAMPANHA_BACKUP',
    versao: '2.0',
    data_geracao: new Date().toISOString(),
    gerado_por: params.authorEmail || 'Mestre',
    dados: {
      personagens: params.characters,
      npcs: params.npcs,
      canais_discord: params.selectedChannels.map(item => ({
        id: item.channel.id,
        name: item.channel.name,
        category: item.channel.category,
        type: item.channel.type,
        topic: item.channel.topic,
        mensagens: item.messages
      }))
    }
  };
}

// 4. Download Backup File to disk
export function downloadBackupFile(backupData: CampaignBackupFile, customFilename?: string) {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = customFilename || `Telumak_Campanha_Backup_${dateStr}.json`;
  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 5. Cloud Sync (Push offline data to Firebase Firestore)
export async function syncCampaignToCloud(backupData: CampaignBackupFile['dados']): Promise<{
  charactersCount: number;
  npcsCount: number;
  channelsCount: number;
  messagesCount: number;
}> {
  let charactersCount = 0;
  let npcsCount = 0;
  let channelsCount = 0;
  let messagesCount = 0;

  // 1. Sync Characters
  if (backupData.personagens && backupData.personagens.length > 0) {
    for (const char of backupData.personagens) {
      if (!char.id) continue;
      const charRef = doc(db, 'characters', char.id);
      await setDoc(charRef, char, { merge: true });
      trackWrite('characters', 1);
      charactersCount++;
    }
  }

  // 2. Sync NPCs
  if (backupData.npcs && backupData.npcs.length > 0) {
    for (const npc of backupData.npcs) {
      if (!npc.id) continue;
      const npcRef = doc(db, 'npcs', npc.id);
      await setDoc(npcRef, npc, { merge: true });
      trackWrite('npcs', 1);
      npcsCount++;
    }
  }

  // 3. Sync Discord Channels & Messages
  if (backupData.canais_discord && backupData.canais_discord.length > 0) {
    for (const ch of backupData.canais_discord) {
      if (!ch.id) continue;
      const channelRef = doc(db, 'discord_channels', ch.id);
      await setDoc(channelRef, {
        name: ch.name,
        category: ch.category || 'TEXTO',
        type: ch.type || 'text',
        topic: ch.topic || ''
      }, { merge: true });
      trackWrite('discord_channels', 1);
      channelsCount++;

      if (ch.mensagens && ch.mensagens.length > 0) {
        for (const msg of ch.mensagens) {
          if (!msg.id) continue;
          const msgRef = doc(db, 'discord_notebook_messages', msg.id);
          await setDoc(msgRef, {
            ...msg,
            channelId: ch.id
          }, { merge: true });
          trackWrite('discord_notebook_messages', 1);
          messagesCount++;
        }
      }
    }
  }

  return {
    charactersCount,
    npcsCount,
    channelsCount,
    messagesCount
  };
}
