import {
  collection, addDoc, deleteDoc, doc, runTransaction,
  arrayUnion, serverTimestamp, writeBatch, getDocs, query, where,
} from "firebase/firestore";
import type { MatchEvent } from "@/types";
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

  const n = qualifiers.length;
  const phase = getPhaseForCount(n);

  // Emparejamiento: 1 vs último, 2 vs penúltimo...
  const newBatch = writeBatch(db);
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

// Mapeo: cantidad de jugadores → fase inicial
const getPhaseForCount = (n: number): MatchPhase => {
  if (n >= 128) return "ROUND_OF_128";
  if (n >= 64)  return "ROUND_OF_64";
  if (n >= 32)  return "ROUND_OF_32";
  if (n >= 16)  return "ROUND_OF_16";
  if (n >= 8)   return "QUARTERFINAL";
  if (n >= 4)   return "SEMIFINAL";
  return "FINAL";
};

// Orden de fases (sin THIRD_PLACE, se maneja aparte)
const PHASE_PROGRESSION: MatchPhase[] = [
  "ROUND_OF_128", "ROUND_OF_64", "ROUND_OF_32", "ROUND_OF_16", "QUARTERFINAL", "SEMIFINAL", "FINAL",
];

/**
 * Avanza el bracket al completarse una fase:
 * - SEMIFINAL completada → genera THIRD_PLACE (perdedores) + FINAL (ganadores)
 * - Cualquier otra fase → genera la siguiente con los ganadores
 */
export const advanceKnockoutRound = async (
  tournamentId: string,
  currentPhaseMatches: Match[]
): Promise<boolean> => {
  if (currentPhaseMatches.some((m) => !m.isFinished)) return false;

  const currentPhase = currentPhaseMatches[0].phase;
  if (currentPhase === "FINAL" || currentPhase === "THIRD_PLACE") return false;

  const sorted = [...currentPhaseMatches].sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));
  const batch = writeBatch(db);
  const col = collection(db, "tournaments", tournamentId, "matches");

  if (currentPhase === "SEMIFINAL") {
    // Ganadores → FINAL, Perdedores → THIRD_PLACE
    const winners = sorted.map((m) => m.winnerId === m.playerA.id ? m.playerA : m.playerB);
    const losers  = sorted.map((m) => m.winnerId === m.playerA.id ? m.playerB : m.playerA);

    const finalRef = doc(col);
    batch.set(finalRef, {
      tournamentId, groupId: null, phase: "FINAL",
      round: 1, bracketPosition: 0,
      playerA: winners[0], playerB: winners[1],
      playerAScore: 0, playerBScore: 0,
      isFinished: false, winnerId: null, history: [],
      createdAt: serverTimestamp(),
    });

    const thirdRef = doc(col);
    batch.set(thirdRef, {
      tournamentId, groupId: null, phase: "THIRD_PLACE",
      round: 1, bracketPosition: 0,
      playerA: losers[0], playerB: losers[1],
      playerAScore: 0, playerBScore: 0,
      isFinished: false, winnerId: null, history: [],
      createdAt: serverTimestamp(),
    });
  } else {
    // Siguiente fase normal con los ganadores
    const idx = PHASE_PROGRESSION.indexOf(currentPhase);
    if (idx === -1 || idx + 1 >= PHASE_PROGRESSION.length) return false;
    const nextPhase = PHASE_PROGRESSION[idx + 1];
    const winners = sorted.map((m) => m.winnerId === m.playerA.id ? m.playerA : m.playerB);

    for (let i = 0; i < winners.length; i += 2) {
      const ref = doc(col);
      batch.set(ref, {
        tournamentId, groupId: null, phase: nextPhase,
        round: (currentPhaseMatches[0].round ?? 1) + 1,
        bracketPosition: i / 2,
        playerA: winners[i], playerB: winners[i + 1],
        playerAScore: 0, playerBScore: 0,
        isFinished: false, winnerId: null, history: [],
        createdAt: serverTimestamp(),
      });
    }
  }

  await batch.commit();
  return true;
};

const WINNING_SCORE = 4;

/** Tiempo máximo sin renovar el bloqueo antes de que expire (renovar con `renewLock` mientras el modal está abierto). */
export const LOCK_TTL_MS = 300_000; // 5 minutos

/** Intervalo recomendado para llamar a `renewLock` desde la UI (ms). */
export const LOCK_RENEW_INTERVAL_MS = 20_000;

/** Genera id para `clientEventId` en cada toque de anotación (idempotencia). */
export function createScoreEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const lockMatch = async (
  tournamentId: string,
  matchId: string,
  callerUid: string,
  isAdmin = false
) => {
  const matchRef = doc(db, "tournaments", tournamentId, "matches", matchId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef);
    if (!snap.exists()) throw new Error("Match not found.");
    const data = snap.data() as Match;
    if (data.phase === "GROUP" && data.groupId && !isAdmin) {
      const groupRef = doc(db, "tournaments", tournamentId, "groups", data.groupId);
      const gSnap = await tx.get(groupRef);
      if (gSnap.exists()) {
        const jid = gSnap.data().judgeId as string | undefined;
        if (jid && jid !== callerUid) throw new Error("NOT_JUDGE");
      }
    }
    const now = Date.now();
    // Si hay un lock activo de otro usuario y no ha expirado
    if (data.lockedBy && data.lockedBy !== callerUid && data.lockedAt && (now - data.lockedAt) < LOCK_TTL_MS)
      throw new Error("LOCKED");
    tx.update(matchRef, { lockedBy: callerUid, lockedAt: now });
  });
};

export const unlockMatch = async (tournamentId: string, matchId: string, callerUid: string) => {
  const matchRef = doc(db, "tournaments", tournamentId, "matches", matchId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef);
    if (!snap.exists()) return;
    const data = snap.data() as Match;
    if (data.lockedBy === callerUid) tx.update(matchRef, { lockedBy: null, lockedAt: null });
  });
};

/** Renueva `lockedAt` si quien llama sigue siendo el titular (para no expirar durante anotación larga). */
export const renewLock = async (tournamentId: string, matchId: string, callerUid: string) => {
  const matchRef = doc(db, "tournaments", tournamentId, "matches", matchId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef);
    if (!snap.exists()) return;
    const data = snap.data() as Match;
    if (data.isFinished) return;
    if (data.lockedBy !== callerUid) return;
    tx.update(matchRef, { lockedAt: Date.now() });
  });
};

export const updateMatchScore = async (
  tournamentId: string,
  matchId: string,
  playerId: string,
  finishType: FinishType,
  callerUid: string,
  isAdmin: boolean,
  clientEventId?: string
) => {
  const matchRef = doc(db, "tournaments", tournamentId, "matches", matchId);
  const { points, name } = FT[finishType];
  const eventId = clientEventId ?? createScoreEventId();

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef);
    if (!snap.exists()) throw new Error("Match not found.");
    const data = snap.data() as Omit<Match, "id">;
    if (data.isFinished) return;

    const priorHistory = (data.history ?? []) as MatchEvent[];
    if (priorHistory.some((e) => e.clientEventId && e.clientEventId === eventId)) return;

    if (!isAdmin) {
      if (!callerUid) throw new Error("AUTH_REQUIRED");
      const nowCheck = Date.now();
      if (!data.lockedBy || data.lockedBy !== callerUid) throw new Error("LOCK_REQUIRED");
      if (data.lockedAt && nowCheck - data.lockedAt >= LOCK_TTL_MS) throw new Error("LOCK_EXPIRED");
    }

    // Verificar que el torneo no haya avanzado de fase
    const { getDoc: gd, getDocs: gds, collection: col, query: q, where: w } = await import("firebase/firestore");
    const tournSnap = await gd(doc(db, "tournaments", tournamentId));
    const finalMatchScore = tournSnap.exists()
      ? (tournSnap.data().finalMatchScore as number | undefined)
      : undefined;
    if (tournSnap.exists()) {
      const status = tournSnap.data().status;
      // Torneo finalizado — todo bloqueado
      if (status === "FINISHED") throw new Error("PHASE_LOCKED");
      // Match de grupo — bloqueado si el torneo ya no está en GROUP_STAGE
      if (data.phase === "GROUP" && status !== "GROUP_STAGE") throw new Error("PHASE_LOCKED");
      // Match de knockout — bloqueado si ya existe una fase posterior con matches
      if (data.phase !== "GROUP") {
        const PHASE_ORDER: MatchPhase[] = ["ROUND_OF_128","ROUND_OF_64","ROUND_OF_32","ROUND_OF_16","QUARTERFINAL","SEMIFINAL","THIRD_PLACE","FINAL"];
        const currentIdx = PHASE_ORDER.indexOf(data.phase as MatchPhase);
        if (currentIdx !== -1) {
          let laterPhases = PHASE_ORDER.slice(currentIdx + 1);
          // THIRD_PLACE and FINAL are parallel phases. FINAL should not lock THIRD_PLACE.
          if (data.phase === "THIRD_PLACE") {
            laterPhases = laterPhases.filter(p => p !== "FINAL");
          }
          const matchesCol = col(db, "tournaments", tournamentId, "matches");
          for (const phase of laterPhases) {
            const laterSnap = await gds(q(matchesCol, w("phase", "==", phase)));
            if (!laterSnap.empty) throw new Error("PHASE_LOCKED");
          }
        }
      }
    }

    // Validate judge for group matches
    if (data.phase === "GROUP" && data.groupId) {
      const { getDoc: gd } = await import("firebase/firestore");
      const groupSnap = await gd(doc(db, "tournaments", tournamentId, "groups", data.groupId));
      if (groupSnap.exists()) {
        const groupData = groupSnap.data();
        const judgeId = groupData.judgeId;
        if (judgeId && callerUid !== judgeId && !isAdmin) {
          throw new Error("NOT_JUDGE");
        }
      }
    }

    const isA = data.playerA.id === playerId;
    const field = isA ? "playerAScore" : "playerBScore";
    const newScore = (data[field] || 0) + points;

    const eventPayload: MatchEvent = {
      playerId,
      finishType: name,
      points,
      timestamp: Date.now(),
      clientEventId: eventId,
      recordedByUid: callerUid,
    };

    const winningScore = data.phase === "FINAL"
      ? (finalMatchScore ?? WINNING_SCORE)
      : WINNING_SCORE;

    const update: Record<string, unknown> = {
      [field]: newScore,
      history: arrayUnion(eventPayload),
    };
    if (newScore >= winningScore) {
      update.isFinished = true;
      update.winnerId = playerId;
      update.lockedBy = null;
      update.lockedAt = null;
    }
    tx.update(matchRef, update);

    const auditRef = doc(collection(db, "tournaments", tournamentId, "matches", matchId, "scoreAudit"));
    tx.set(auditRef, {
      action: "score",
      playerId,
      finishType: name,
      points,
      recordedByUid: callerUid,
      clientEventId: eventId,
      createdAt: serverTimestamp(),
    });
  });

  // Si el match era de grupo, verificar si el grupo terminó para reasignar juez
  const updatedSnap = await import("firebase/firestore").then(({ getDoc }) =>
    getDoc(doc(db, "tournaments", tournamentId, "matches", matchId))
  );
  if (updatedSnap.exists() && updatedSnap.data().isFinished && updatedSnap.data().groupId) {
    const groupId = updatedSnap.data().groupId;
    const groupMatchesSnap = await getDocs(
      query(matchesCol(tournamentId), where("groupId", "==", groupId))
    );
    const allFinished = groupMatchesSnap.docs.every((d) => d.data().isFinished);
    if (allFinished) {
      const { reassignJudgeOnGroupComplete } = await import("./judgeService");
      const playersSnap = await getDocs(collection(db, "players"));
      const players = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
      await reassignJudgeOnGroupComplete(tournamentId, groupId, players);
    }
  }
};

export const undoLastScore = async (
  tournamentId: string,
  matchId: string,
  callerUid: string,
  isAdmin: boolean
) => {
  const matchRef = doc(db, "tournaments", tournamentId, "matches", matchId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef);
    if (!snap.exists()) throw new Error("Match not found.");
    const data = snap.data() as Omit<Match, "id">;
    if (!data.history?.length) return;

    if (!callerUid) throw new Error("AUTH_REQUIRED");
    const nowU = Date.now();
    if (!data.lockedBy || data.lockedBy !== callerUid) throw new Error("LOCK_REQUIRED");
    if (data.lockedAt && nowU - data.lockedAt >= LOCK_TTL_MS) throw new Error("LOCK_EXPIRED");

    // Verificar que el torneo no haya avanzado de fase
    const { getDoc: gd, getDocs: gds, collection: col, query: q, where: w } = await import("firebase/firestore");
    const tournSnap = await gd(doc(db, "tournaments", tournamentId));
    if (tournSnap.exists()) {
      const status = tournSnap.data().status;
      if (status === "FINISHED") throw new Error("PHASE_LOCKED");
      if (data.phase === "GROUP" && status !== "GROUP_STAGE") throw new Error("PHASE_LOCKED");
      if (data.phase !== "GROUP") {
        const PHASE_ORDER: MatchPhase[] = ["ROUND_OF_128","ROUND_OF_64","ROUND_OF_32","ROUND_OF_16","QUARTERFINAL","SEMIFINAL","THIRD_PLACE","FINAL"];
        const currentIdx = PHASE_ORDER.indexOf(data.phase as MatchPhase);
        if (currentIdx !== -1) {
          let laterPhases = PHASE_ORDER.slice(currentIdx + 1);
          // THIRD_PLACE and FINAL are parallel phases. FINAL should not lock THIRD_PLACE.
          if (data.phase === "THIRD_PLACE") {
            laterPhases = laterPhases.filter(p => p !== "FINAL");
          }
          const matchesCol = col(db, "tournaments", tournamentId, "matches");
          for (const phase of laterPhases) {
            const laterSnap = await gds(q(matchesCol, w("phase", "==", phase)));
            if (!laterSnap.empty) throw new Error("PHASE_LOCKED");
          }
        }
      }
    }

    const history = [...data.history];
    history.pop(); // quitar el último evento

    // Recalcular scores desde el history
    let playerAScore = 0;
    let playerBScore = 0;
    for (const event of history) {
      if (event.playerId === data.playerA.id) playerAScore += event.points;
      else playerBScore += event.points;
    }

    tx.update(matchRef, {
      history,
      playerAScore,
      playerBScore,
      isFinished: false,
      winnerId: null,
    });

    const undoAuditRef = doc(collection(db, "tournaments", tournamentId, "matches", matchId, "scoreAudit"));
    tx.set(undoAuditRef, {
      action: "undo",
      recordedByUid: callerUid,
      createdAt: serverTimestamp(),
    });
  });
};
