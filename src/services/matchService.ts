import {
  collection, addDoc, deleteDoc, doc, runTransaction,
  arrayUnion, serverTimestamp, writeBatch, getDocs, query, where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Match, MatchPhase, Player, TournamentGroup, FinishType, FINISH_TYPES, StandingEntry } from "@/types";
import { FINISH_TYPES as FT } from "@/types";

const matchesCol = (tId: string) => collection(db, "tournaments", tId, "matches");

export const createMatch = async (
  tournamentId: string,
  playerA: Player,
  playerB: Player,
  phase: MatchPhase = "GROUP",
  groupId?: string,
  round?: number,
  bracketPosition?: number
) => {
  await addDoc(matchesCol(tournamentId), {
    tournamentId, groupId: groupId ?? null, phase,
    round: round ?? null, bracketPosition: bracketPosition ?? null,
    playerA, playerB,
    playerAScore: 0, playerBScore: 0,
    isFinished: false, winnerId: null, history: [],
    createdAt: serverTimestamp(),
  });
};

export const deleteMatch = async (tId: string, matchId: string) =>
  deleteDoc(doc(db, "tournaments", tId, "matches", matchId));

/** Genera todos los matches round-robin para un grupo */
export const generateGroupMatches = async (
  tournamentId: string,
  group: TournamentGroup,
  players: Player[]
): Promise<void> => {
  // Borrar matches previos del grupo
  const existing = await getDocs(
    query(matchesCol(tournamentId), where("groupId", "==", group.id))
  );
  const batch = writeBatch(db);
  existing.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  // Round-robin: cada par juega una vez
  const newBatch = writeBatch(db);
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const ref = doc(matchesCol(tournamentId));
      newBatch.set(ref, {
        tournamentId, groupId: group.id, phase: "GROUP",
        round: null, bracketPosition: null,
        playerA: players[i], playerB: players[j],
        playerAScore: 0, playerBScore: 0,
        isFinished: false, winnerId: null, history: [],
        createdAt: serverTimestamp(),
      });
    }
  }
  await newBatch.commit();
};

/** Genera el bracket de eliminación directa a partir del ranking global */
export const generateKnockoutBracket = async (
  tournamentId: string,
  qualifiers: Player[]
): Promise<void> => {
  // Borrar bracket previo
  const existing = await getDocs(
    query(matchesCol(tournamentId), where("phase", "!=", "GROUP"))
  );
  const batch = writeBatch(db);
  existing.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  // Emparejamiento: 1 vs último, 2 vs penúltimo...
  const n = qualifiers.length;
  const newBatch = writeBatch(db);
  const phaseMap: Record<number, MatchPhase> = {
    64: "ROUND_OF_64", 32: "ROUND_OF_32", 16: "QUARTERFINAL", 8: "SEMIFINAL", 4: "FINAL",
  };
  const phase: MatchPhase = phaseMap[n] ?? "ROUND_OF_32";

  for (let i = 0; i < n / 2; i++) {
    const ref = doc(matchesCol(tournamentId));
    newBatch.set(ref, {
      tournamentId, groupId: null, phase,
      round: 1, bracketPosition: i,
      playerA: qualifiers[i], playerB: qualifiers[n - 1 - i],
      playerAScore: 0, playerBScore: 0,
      isFinished: false, winnerId: null, history: [],
      createdAt: serverTimestamp(),
    });
  }
  await newBatch.commit();
};

const WINNING_SCORE = 4;

export const updateMatchScore = async (
  tournamentId: string,
  matchId: string,
  playerId: string,
  finishType: FinishType
) => {
  const matchRef = doc(db, "tournaments", tournamentId, "matches", matchId);
  const { points, name } = FT[finishType];

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef);
    if (!snap.exists()) throw new Error("Match not found.");
    const data = snap.data() as Omit<Match, "id">;
    if (data.isFinished) return;

    const isA = data.playerA.id === playerId;
    const field = isA ? "playerAScore" : "playerBScore";
    const newScore = (data[field] || 0) + points;

    const update: Record<string, unknown> = {
      [field]: newScore,
      history: arrayUnion({ playerId, finishType: name, points, timestamp: serverTimestamp() }),
    };
    if (newScore >= WINNING_SCORE) {
      update.isFinished = true;
      update.winnerId = playerId;
    }
    tx.update(matchRef, update);
  });
};
