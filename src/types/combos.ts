import { Timestamp } from "firebase/firestore";

export type BladeSystem = "BX" | "CX" | "UX";
export type PartType = "Blade" | "Ratchet" | "Bit";

export interface Part {
  id: string;
  name: string;
  type: PartType;
  bladeSystem?: BladeSystem; // solo si type === "Blade"
  imageUrl?: string;
  isActive: boolean;
  createdAt: Timestamp;
}

export interface Combo {
  id: string;
  playerId: string;
  tournamentId: string;
  slot: 1 | 2 | 3;
  bladeId: string;
  assistBladeId: string | null; // solo si blade es CX
  ratchetId: string;
  bitId: string;
  isActive: boolean;
  createdAt: Timestamp;
}

export interface ComboHistory {
  id: string;
  playerId: string;
  tournamentId: string;
  matchId?: string;
  slot: 1 | 2 | 3;
  bladeId: string;
  assistBladeId: string | null;
  ratchetId: string;
  bitId: string;
  changedAt: Timestamp;
  changedBy: string; // uid
}

export interface ComboSnapshot {
  slot: 1 | 2 | 3;
  comboHistoryId: string;
}
