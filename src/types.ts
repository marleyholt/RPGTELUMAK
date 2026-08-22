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
  nivel: number;
  hp_atual: number;
  hp_max: number;
  ether_atual: number;
  ether_max: number;
  destino_atual: number;
  destino_max: number;
  
  // Base Attributes
  fisico: number;
  destreza: number;
  cognicao: number;
  carisma: number;
  primordio: number;

  // Combat modifiers
  ferramenta_fisico: number;
  ferramenta_destreza: number;
  ferramenta_cognicao: number;
  ferramenta_carisma: number;

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

  // Combat simulation state
  ativo_na_mesa?: boolean;
  versao_ativa_id?: string; //points to some alternative form id, if blank means Base
}

export interface CharVersion {
  id: string; // "base" or custom ID
  versao_nome: string; // e.g., "Forma Titã", "Modo Bestial", "Base"
  nivel: number;
  hp_max: number;
  ether_max: number;
  destino_max: number;
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
