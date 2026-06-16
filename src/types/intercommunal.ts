import { Timestamp } from "firebase/firestore";
import { MatchEvent, MatchPhase } from "./index";

// ─── Torneo Intercomunal ──────────────────────────────────────────
export interface IntercommunalTournament {
  id: string;
  name: string;
  status: "DRAFT" | "REGISTRATION" | "GROUPS" | "KNOCKOUT" | "FINISHED";
  maxTeams: number;
  qualifiersCount: number; // Cupos definidos por el admin para pasar a eliminatorias
  createdAt: Timestamp;
}

// ─── Equipo (La Comuna) ───────────────────────────────────────────
export interface IntercommunalTeam {
  id: string;
  tournamentId: string;
  name: string;
  logoUrl?: string;
  createdAt: Timestamp;
}

// ─── Integrante (Miembro de la Comuna) ────────────────────────────
export interface IntercommunalMember {
  id: string;
  teamId: string;
  tournamentId: string;
  name: string;
  linkedUserId?: string | null;
  createdAt: Timestamp;
}

// ─── Grupo de Fase Inicial ─────────────────────────────────────────
export interface IntercommunalGroup {
  id: string;
  tournamentId: string;
  name: string;
  memberIds: string[]; // IDs de los IntercommunalMember asignados aquí
  createdAt: Timestamp;
}

// ─── Choque de Equipos (Knockout o Resumen Global) ────────────────
export interface IntercommunalTeamMatch {
  id: string;
  tournamentId: string;
  phase: MatchPhase | "GROUP_OVERALL"; // Para clasificar si es cuartos, semi, o un global de grupos
  teamAId: string;
  teamBId: string;
  teamAWins: number;
  teamBWins: number;
  teamAPoints: number;
  teamBPoints: number;
  isFinished: boolean;
  winnerTeamId: string | null;
  requiresSuddenDeath: boolean;
  suddenDeathMatchId?: string | null;
  createdAt: Timestamp;
}

// ─── Match Individual 3G ──────────────────────────────────────────
export interface IntercommunalMatch {
  id: string;
  tournamentId: string;
  teamMatchId?: string; // Si es fase KO, pertenece a un choque de equipos
  groupId?: string; // Si es fase de grupos, pertenece a un grupo
  memberAId: string;
  memberBId: string;
  memberAScore: number;
  memberBScore: number;
  isFinished: boolean;
  winnerMemberId: string | null;
  history: MatchEvent[];
  createdAt: Timestamp;
}

// ─── Tabla de Clasificación ────────────────────────────────────────
export interface IntercommunalTeamStanding {
  teamId: string;
  teamName: string;
  logoUrl?: string;
  matchWins: number;      // 1. Prioridad: Victorias
  pointsFor: number;      // 2. Prioridad: Puntos anotados
  pointsAgainst: number;
  pointsDiff: number;     // 3. Prioridad: Diferencia de puntos
  matchesPlayed: number;
  matchLosses: number;
}
