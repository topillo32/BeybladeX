import type { Match, Player, StandingEntry, TournamentGroup } from "@/types";

export const computeGroupStandings = (
  matches: Match[],
  players: Player[],
  groupId: string
): StandingEntry[] => {
  const realPlayers = players.filter((p) => !p.id.startsWith("bye-"));
  const groupMatches = matches.filter((m) => m.groupId === groupId && m.isFinished);

  const map = new Map<string, StandingEntry>();
  realPlayers.forEach((p) => {
    map.set(p.id, {
      playerId: p.id, playerName: p.name, groupId,
      wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, diff: 0, played: 0,
    });
  });

  groupMatches.forEach((m) => {
    const aIsBye = m.playerA.id.startsWith("bye-");
    const bIsBye = m.playerB.id.startsWith("bye-");

    if (!aIsBye && !bIsBye) {
      // Match real vs real — contabilizar todo
      const a = map.get(m.playerA.id);
      const b = map.get(m.playerB.id);
      if (!a || !b) return;
      a.played++; b.played++;
      a.pointsFor += m.playerAScore; a.pointsAgainst += m.playerBScore;
      b.pointsFor += m.playerBScore; b.pointsAgainst += m.playerAScore;
      if (m.winnerId === m.playerA.id) { a.wins++; b.losses++; }
      else { b.wins++; a.losses++; }
    } else if (!aIsBye && bIsBye) {
      // playerA es real, playerB es bye — solo contar puntos y victoria del real
      const a = map.get(m.playerA.id);
      if (!a) return;
      a.played++;
      a.pointsFor += m.playerAScore;
      if (m.winnerId === m.playerA.id) a.wins++; else a.losses++;
    } else if (aIsBye && !bIsBye) {
      // playerA es bye, playerB es real
      const b = map.get(m.playerB.id);
      if (!b) return;
      b.played++;
      b.pointsFor += m.playerBScore;
      if (m.winnerId === m.playerB.id) b.wins++; else b.losses++;
    }
  });

  map.forEach((e) => { e.diff = e.pointsFor - e.pointsAgainst; });

  return [...map.values()].sort((a, b) =>
    b.wins !== a.wins ? b.wins - a.wins : b.pointsFor - a.pointsFor
  );
};

export const computeGlobalStandings = (
  groups: TournamentGroup[],
  matches: Match[],
  players: Player[]
): StandingEntry[] => {
  const all: StandingEntry[] = [];
  groups.forEach((g) => {
    const gPlayers = players.filter((p) => g.playerIds.includes(p.id));
    all.push(...computeGroupStandings(matches, gPlayers, g.id));
  });
  return all.sort((a, b) =>
    b.wins !== a.wins ? b.wins - a.wins : b.pointsFor - a.pointsFor
  );
};

export const getQualifiers = (standings: StandingEntry[], count: number, players: Player[]): Player[] => {
  return standings.slice(0, count).map((s) => players.find((p) => p.id === s.playerId)!).filter(Boolean);
};

/** Calcula cuántos clasifican: la potencia de 2 más cercana hacia abajo (8, 16, 32, 64, 128) */
export const autoQualifiersCount = (totalPlayers: number): number => {
  const BRACKETS = [128, 64, 32, 16, 8];
  return BRACKETS.find((n) => n <= totalPlayers) ?? 8;
};
