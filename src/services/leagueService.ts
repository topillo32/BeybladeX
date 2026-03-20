import {
  collection, addDoc, deleteDoc, doc, serverTimestamp,
  query, orderBy, getDocs, where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { League, LeagueStandingEntry, Tournament, Match, Player } from "@/types";

const col = collection(db, "leagues");

export const createLeague = async (name: string, description: string, uid: string) =>
  addDoc(col, { name, description, createdBy: uid, createdAt: serverTimestamp() });

export const deleteLeague = (id: string) => deleteDoc(doc(db, "leagues", id));

export const getLeagues = async (): Promise<League[]> => {
  const snap = await getDocs(query(col, orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as League));
};

/**
 * League standings by total match WINS across all jornadas.
 * Each finished match where a player is the winner counts as +1 win.
 * Tiebreaker: matches played.
 */
export const computeLeagueStandings = async (leagueId: string): Promise<LeagueStandingEntry[]> => {
  const tSnap = await getDocs(
    query(
      collection(db, "tournaments"),
      where("leagueId", "==", leagueId),
      where("status", "==", "FINISHED")
    )
  );
  const events = tSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament));

  const map = new Map<string, LeagueStandingEntry>();

  const ensure = (id: string, name: string, userId?: string) => {
    if (!map.has(id)) map.set(id, { playerId: id, playerName: name, userId, wins: 0, podiums: 0, roundsPlayed: 0 });
    return map.get(id)!;
  };

  for (const event of events) {
    const [matchesSnap, playersSnap] = await Promise.all([
      getDocs(query(collection(db, "tournaments", event.id, "matches"), where("isFinished", "==", true))),
      getDocs(query(collection(db, "players"), where("tournamentIds", "array-contains", event.id))),
    ]);

    const matches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Match));
    const players = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Player));
    const playerUserMap = new Map(players.map((p) => [p.id, p.userId]));

    // Track which players participated in this event
    const participantIds = new Set<string>();

    for (const m of matches) {
      // Skip bye matches
      if (m.playerA.id.startsWith("bye-") || m.playerB.id.startsWith("bye-")) continue;

      const playerA = ensure(m.playerA.id, m.playerA.name, playerUserMap.get(m.playerA.id));
      const playerB = ensure(m.playerB.id, m.playerB.name, playerUserMap.get(m.playerB.id));

      participantIds.add(m.playerA.id);
      participantIds.add(m.playerB.id);

      if (m.winnerId === m.playerA.id) playerA.wins += 1;
      else if (m.winnerId === m.playerB.id) playerB.wins += 1;
    }

    // Count this event as a round played for each participant
    participantIds.forEach((pid) => {
      const entry = map.get(pid);
      if (entry) entry.roundsPlayed += 1;
    });
  }

  return Array.from(map.values()).sort((a, b) =>
    b.wins !== a.wins ? b.wins - a.wins : b.roundsPlayed - a.roundsPlayed
  );
};
