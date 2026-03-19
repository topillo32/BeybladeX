import { Timestamp } from "firebase/firestore";

// ─── Auth & Roles ────────────────────────────────────────────────────────────
export type UserRole = "admin" | "staff" | "player";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Timestamp;
}

// ─── Tournament ───────────────────────────────────────────────────────────────
export type TournamentStatus =
  | "DRAFT"
  | "REGISTRATION"
  | "GROUP_STAGE"
  | "KNOCKOUT"
  | "FINISHED";

export interface Tournament {
  id: string;
  name: string;
  status: TournamentStatus;
  maxPlayers: number;
  playersPerGroup: number;
  qualifiersCount: number; // set just before KNOCKOUT, defaults to top 50%
  createdBy: string;
  createdAt: Timestamp;
  startedAt?: Timestamp;
  finishedAt?: Timestamp;
}

/** Statuses where new players can still be enrolled */
export const OPEN_REGISTRATION_STATUSES: TournamentStatus[] = ["DRAFT", "REGISTRATION", "GROUP_STAGE"];

// ─── Player ───────────────────────────────────────────────────────────────────
export type EnrollmentStatus = "approved" | "pending";

export interface Player {
  id: string;
  name: string;
  userId?: string;
  tournamentIds: string[];          // approved enrollments
  pendingTournamentIds: string[];   // awaiting approval
  createdAt: Timestamp;
}

// ─── Group ────────────────────────────────────────────────────────────────────
export interface TournamentGroup {
  id: string;
  tournamentId: string;
  name: string;
  playerIds: string[];
  createdAt: Timestamp;
}

// ─── Match ────────────────────────────────────────────────────────────────────
export type MatchPhase = "GROUP" | "ROUND_OF_64" | "ROUND_OF_32" | "QUARTERFINAL" | "SEMIFINAL" | "FINAL";

export const FINISH_TYPES = {
  SPIN:   { points: 1, name: "Spin Finish" },
  OVER:   { points: 2, name: "Over Finish" },
  BURST:  { points: 2, name: "Burst Finish" },
  XTREME: { points: 3, name: "Xtreme Finish" },
} as const;

export type FinishType = keyof typeof FINISH_TYPES;

export interface MatchEvent {
  playerId: string;
  finishType: (typeof FINISH_TYPES)[FinishType]["name"];
  points: number;
  timestamp: Timestamp;
}

export interface Match {
  id: string;
  tournamentId: string;
  groupId?: string;
  phase: MatchPhase;
  round?: number;
  bracketPosition?: number;
  playerA: Player;
  playerB: Player;
  playerAScore: number;
  playerBScore: number;
  isFinished: boolean;
  winnerId: string | null;
  history: MatchEvent[];
  createdAt: Timestamp;
}

// ─── Standings ────────────────────────────────────────────────────────────────
export interface StandingEntry {
  playerId: string;
  playerName: string;
  groupId: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  played: number;
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
export const TOURNAMENT_STEPS: { status: TournamentStatus; label: string; icon: string }[] = [
  { status: "DRAFT",        label: "Setup",        icon: "⚙️" },
  { status: "REGISTRATION", label: "Registration", icon: "📋" },
  { status: "GROUP_STAGE",  label: "Groups",       icon: "👥" },
  { status: "KNOCKOUT",     label: "Knockout",     icon: "⚔️" },
  { status: "FINISHED",     label: "Finished",     icon: "🏆" },
];
