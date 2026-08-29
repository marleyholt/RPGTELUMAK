import { UserProfile, Character } from '../types';

export interface DiscordChannelMeta {
  id: string;
  name: string;
  category?: string;
  type?: 'text' | 'voice';
  isPrivate?: boolean;
  isDm?: boolean;
  targetCharacterId?: string;
  allowedEmails?: string[];
  discordChannelId?: string;
}

export function getUserReadStorageKey(email?: string | null): string {
  const cleanEmail = email ? email.toLowerCase().trim() : 'guest';
  return `telumak_discord_channel_reads_${cleanEmail}`;
}

export function getChannelReadTimes(email?: string | null): { [key: string]: number } {
  try {
    const key = getUserReadStorageKey(email);
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function saveChannelReadTime(
  email: string | null | undefined, 
  channelKeys: string[], 
  timestamp: number = Date.now()
): void {
  try {
    const key = getUserReadStorageKey(email);
    const existing = getChannelReadTimes(email);
    channelKeys.forEach(k => {
      if (k) {
        existing[k] = timestamp;
        existing[k.toLowerCase().trim()] = timestamp;
        existing[k.toLowerCase().replace(/^#/, '').trim()] = timestamp;
      }
    });
    localStorage.setItem(key, JSON.stringify(existing));
    
    // Notifica outros componentes na mesma janela
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('discord_unread_update', { detail: { timestamp, channelKeys } }));
    }
  } catch (err) {
    console.warn("Could not save channel read time:", err);
  }
}

/**
 * Verifica se um usuário tem permissão para visualizar um determinado canal.
 */
export function canUserAccessChannel(
  channel: DiscordChannelMeta, 
  userProfile: UserProfile | null, 
  myCharacters: Character[]
): boolean {
  if (!userProfile) return false;
  const isGM = userProfile.role === 'GM';
  const myEmail = userProfile.email ? userProfile.email.toLowerCase().trim() : '';

  // DM (Mensagem Direta)
  if (channel.isDm || channel.id.startsWith('dm_')) {
    if (!myEmail) return false;
    const myEmailClean = myEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (channel.id.includes(myEmailClean)) return true;
    if (channel.allowedEmails && channel.allowedEmails.some(e => e.toLowerCase().trim() === myEmail)) {
      return true;
    }
    return false;
  }

  // Canal público
  if (!channel.isPrivate) {
    return true;
  }

  // Se for GM, tem acesso a todos os canais do servidor
  if (isGM) {
    return true;
  }

  // Se o canal pertence a um personagem específico
  if (channel.targetCharacterId) {
    return myCharacters.some(c => c.id === channel.targetCharacterId);
  }

  // Se o canal tem lista de e-mails permitidos
  if (channel.allowedEmails && channel.allowedEmails.length > 0) {
    return channel.allowedEmails.some(e => e.toLowerCase().trim() === myEmail);
  }

  return false;
}

/**
 * Conta quantas mensagens não lidas existem para o usuário logado em todos os canais aos quais ele tem acesso.
 */
export function countUnreadDiscordMessages(
  recentMessages: any[],
  channels: DiscordChannelMeta[],
  userProfile: UserProfile | null,
  myCharacters: Character[],
  activeChannelId?: string | null
): number {
  if (!userProfile || !userProfile.email || !recentMessages || recentMessages.length === 0) {
    return 0;
  }

  const myEmail = userProfile.email.toLowerCase().trim();
  const myEmailClean = myEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
  const isGM = userProfile.role === 'GM';
  const readTimes = getChannelReadTimes(myEmail);
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;

  // Monta mapa de canais conhecidos para consulta rápida
  const channelMap = new Map<string, DiscordChannelMeta>();
  channels.forEach(ch => {
    if (ch.id) channelMap.set(ch.id.toLowerCase().trim(), ch);
    if (ch.discordChannelId) channelMap.set(ch.discordChannelId.toLowerCase().trim(), ch);
    if (ch.name) {
      channelMap.set(ch.name.toLowerCase().trim(), ch);
      channelMap.set(ch.name.toLowerCase().replace(/^#/, '').trim(), ch);
    }
  });

  let unreadCount = 0;

  for (const m of recentMessages) {
    if (!m) continue;

    // Se a mensagem foi enviada pelo próprio usuário logado, nunca conta como não lida
    const authorEmail = (m.authorEmail || '').toLowerCase().trim();
    if (authorEmail && authorEmail === myEmail) {
      continue;
    }

    const mChannelId = String(m.channelId || '').trim().toLowerCase();
    const mChannelName = String(m.channelName || '').trim().toLowerCase().replace(/^#/, '');

    // Se o usuário está atualmente com esse canal aberto e visualizando-o, não conta
    if (activeChannelId) {
      const actClean = activeChannelId.trim().toLowerCase();
      if (mChannelId === actClean || mChannelName === actClean) {
        continue;
      }
    }

    // Identificar canal correspondente
    let ch = channelMap.get(mChannelId) || (mChannelName ? channelMap.get(mChannelName) : undefined);

    // Se for DM e não está no channelMap, constrói meta dinâmico
    if (!ch && mChannelId.startsWith('dm_')) {
      ch = {
        id: mChannelId,
        name: mChannelName || 'Mensagem Direta',
        isDm: true,
        isPrivate: true,
        allowedEmails: [myEmail]
      };
    }

    // Verificar acesso ao canal
    if (ch) {
      if (!canUserAccessChannel(ch, userProfile, myCharacters)) {
        continue; // Usuário não tem acesso a esse canal
      }
    } else {
      // Se não for DM e não estiver na lista de canais, se for público ou GM tem acesso
      if (mChannelId.startsWith('dm_')) {
        if (!mChannelId.includes(myEmailClean)) {
          continue;
        }
      } else if (!isGM) {
        // Canal desconhecido/não listado para player não GM: aceitar por padrão como público do discord
      }
    }

    // Obter timestamp da última leitura deste canal pelo usuário
    let lastRead = 0;
    const keysToCheck = [
      mChannelId,
      mChannelName,
      ch?.id,
      ch?.discordChannelId,
      ch?.name?.toLowerCase().trim()
    ].filter(Boolean) as string[];

    for (const k of keysToCheck) {
      const cleanKey = String(k).toLowerCase().trim();
      if (readTimes[cleanKey] && readTimes[cleanKey] > lastRead) {
        lastRead = readTimes[cleanKey];
      }
    }

    // Calcular timestamp da mensagem
    let msgTime = 0;
    if (m.createdAt) {
      if (typeof m.createdAt.toDate === 'function') {
        msgTime = m.createdAt.toDate().getTime();
      } else if (m.createdAt.seconds) {
        msgTime = m.createdAt.seconds * 1000;
      } else {
        const parsed = new Date(m.createdAt).getTime();
        msgTime = isNaN(parsed) ? Date.now() : parsed;
      }
    } else {
      msgTime = Date.now();
    }

    // Comparar timestamp
    if (lastRead === 0) {
      if (msgTime > threeDaysAgo) {
        unreadCount++;
      }
    } else if (msgTime > lastRead) {
      unreadCount++;
    }
  }

  return unreadCount;
}
