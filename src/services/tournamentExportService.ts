import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Tournament, TournamentGroup, Match, Player } from "@/types";

export interface TournamentExportSnapshot {
  exportedAt: string;
  tournament: Tournament | null;
  groups: TournamentGroup[];
  matches: Match[];
  players: Player[];
}

export async function buildTournamentExportSnapshot(tournamentId: string): Promise<TournamentExportSnapshot> {
  const [tSnap, groupsSnap, matchesSnap, playersSnap] = await Promise.all([
    getDoc(doc(db, "tournaments", tournamentId)),
    getDocs(collection(db, "tournaments", tournamentId, "groups")),
    getDocs(collection(db, "tournaments", tournamentId, "matches")),
    getDocs(collection(db, "players")),
  ]);

  const tournament = tSnap.exists() ? ({ id: tSnap.id, ...tSnap.data() } as Tournament) : null;
  const groups = groupsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentGroup));
  const matches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Match));

  const playerIds = new Set<string>();
  matches.forEach((m) => {
    playerIds.add(m.playerA.id);
    playerIds.add(m.playerB.id);
  });
  groups.forEach((g) => g.playerIds.forEach((id) => playerIds.add(id)));

  const allPlayers = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Player));
  const players = allPlayers.filter((p) => playerIds.has(p.id));

  return {
    exportedAt: new Date().toISOString(),
    tournament,
    groups,
    matches,
    players,
  };
}

export function downloadTournamentJson(snapshot: TournamentExportSnapshot, filenameBase: string) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenameBase.replace(/[^a-z0-9-_]/gi, "_")}-export.json`;
  a.click();
  URL.revokeObjectURL(url);
}
