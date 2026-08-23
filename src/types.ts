export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  role: "GM" | "PLAYER";
}

export interface Character {
  id: string; // Matches document ID
  email_dono: string;
  nome: string;
  cla?: string; // Clan
  ocupacao?: string; // Occupation
  posicao_social?: string; // e.g. "Deus Rei"
  cidadania?: string; // e.g. "Rëno"
  seguimento?: string; // e.g. "Conquistador"
  nivelamento_alma?: string; // e.g. "9 (116). Alma: Reihao (25) 2x"
  
  // Finanças
  ryo_dourado?: number;
  ryo_prateado?: number;
  ryo_bronze?: number;

  nivel: number;
  hp_atual: number;
  hp_max: number;
  ether_atual: number;
  ether_max: number;
  destino_atual: number;
  destino_max: number;
  
  // Consumed counters
  hp_consumidos?: number;
  ether_consumidos?: number;
  destino_consumidos?: number;

  // Markers / Marcadores
  alcance_atual?: number;
  alcance_max?: string | number; // e.g. "03 (6) | 15 (30) metros"
  movimento_atual?: number;
  movimento_max?: string | number; // e.g. "03 | 15 metros"
  fortitude_atual?: number;
  fortitude_max?: string | number; // e.g. "29+4 | 33 equipados"
  tecnicas_atual?: number;
  tecnicas_max?: string | number; // e.g. "02 | 00 equipada"

  // Base Attributes
  fisico: number;
  destreza: number;
  cognicao: number;
  carisma: number;
  primordio: number;
  primordio_detalhe?: string; // e.g. "(45+20+5+5)"

  // Combat modifiers & Tool counters / Ferramentas de combate
  ferramenta_fisico: number; // Modifier (e.g. +0)
  ferramenta_fisico_atual?: number; // Usos atuais (e.g. 2)
  ferramenta_fisico_max?: number; // Usos max (e.g. 2)
  ferramenta_fisico_sec_atual?: number; // Segundo contador (e.g. 3)
  ferramenta_fisico_sec_max?: number; // Segundo contador max (e.g. 3)

  ferramenta_destreza: number;
  ferramenta_destreza_atual?: number;
  ferramenta_destreza_max?: number;

  ferramenta_cognicao: number;
  ferramenta_cognicao_atual?: number;
  ferramenta_cognicao_max?: number;

  ferramenta_carisma: number;
  ferramenta_carisma_atual?: number;
  ferramenta_carisma_max?: number;

  // Asset image states
  img_saudavel?: string;
  img_ferido?: string;
  img_muito_ferido?: string;

  // HTML blocks
  html_ataques?: string;
  html_dons?: string;
  html_equipamentos?: string;
  html_defesa?: string;

  // Status effects applied to player
  status_ativos?: string[]; // Array of status IDs

  // Combat simulation state & Security Archive
  ativo_na_mesa?: boolean;
  versao_ativa_id?: string; //points to some alternative form id, if blank means Base
  arquivado?: boolean; // Soft-delete / Lixeira
  arquivadoEm?: any;
}

export interface CharVersion {
  id: string; // "base" or custom ID
  versao_nome: string; // e.g., "Forma Titã", "Modo Bestial", "Base"
  nivel: number;
  hp_max: number;
  ether_max: number;
  destino_max: number;
  alcance_max?: string | number;
  movimento_max?: string | number;
  fortitude_max?: string | number;
  fisico: number;
  destreza: number;
  cognicao: number;
  carisma: number;
  primordio: number;
  img_saudavel?: string;
  img_ferido?: string;
  img_muito_ferido?: string;
  html_ataques?: string;
  html_dons?: string;
  html_equipamentos?: string;
  html_defesa?: string;
}

export interface ChatMessage {
  id: string;
  remetente: string; // Name of character, or "MESTRE"
  remetente_email: string;
  destinatario: "TODOS" | "GM" | string; // target email/id or TODOS/GM
  tipo: "CHAT" | "ROLL" | "SYSTEM" | "WHISPER";
  conteudo: string; // can contain HTML for rolls
  createdAt: any; // firestore timestamp
  ocultada?: boolean; // GM can toggle message visibility to hide from other players
}

export interface CustomStatusType {
  id: string;
  nome: string;
  imageUrl: string;
}

export interface ArenaToken {
  id: string;
  name: string;
  img: string;
  type: "PLAYER" | "NPC" | "OBJ";
  x: number; // grid position
  y: number; // grid position
  sqm?: number; // Size in SQM: 1 (1x1), 2 (2x2), 3 (3x3), etc.
  charId?: string; // link to existing character
}

export interface ArenaState {
  bg: string;
  gridWidth: number;
  gridHeight: number;
}

export interface CampaignNote {
  id: string;
  titulo: string;
  conteudo: string;
  autor_uid: string;
  autor_email: string;
  tipo: "PUBLIC" | "PRIVATE" | "GM_ONLY"; // PUBLIC = todos, PRIVATE = apenas autor e GM, GM_ONLY = apenas mestre
  createdAt: any;
}

export interface DiscordChannelConfig {
  defaultChannelId?: string;
  guildId?: string;
  guildName?: string;
  playerChannels?: { [userEmailOrCharId: string]: string }; // Maps player email or charId to Discord Channel ID
}

export interface DiscordNotebookMessage {
  id: string;
  channelId: string;
  authorName: string;
  authorEmail?: string;
  authorAvatar?: string;
  content: string;
  attachments?: string[];
  isFromDiscord?: boolean;
  pinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: any;
  createdAt: any;
}

export interface DiscordChannelItem {
  id: string;
  name: string;
  category: string;
  type: 'text' | 'voice';
  icon?: string;
  topic?: string;
  isPrivate?: boolean;
  allowedEmails?: string[];
  order?: number;
  charKey?: string;
  discordChannelId?: string;
  createdAt?: any;
}
