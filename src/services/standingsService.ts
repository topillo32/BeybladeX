import type { Match, Player, StandingEntry, TournamentGroup } from "@/types";

export const computeGroupStandings = (
  matches: Match[],
  players: Player[],
  groupId: string,
  withdrawnPlayerIds: string[] = []
): StandingEntry[] => {
  // Treat withdrawn players same as byes — exclude from standings, their results don't count as real wins
  const isGhost = (id: string) => id.startsWith("bye-") || withdrawnPlayerIds.includes(id);
  const realPlayers = players.filter((p) => !isGhost(p.id));
  const groupMatches = matches.filter((m) => m.groupId === groupId && m.isFinished);

  const map = new Map<string, StandingEntry>();
  realPlayers.forEach((p) => {
    map.set(p.id, {
      playerId: p.id, playerName: p.name, groupId,
      wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, diff: 0, played: 0,
    });
  });

  groupMatches.forEach((m) => {
    const aIsGhost = isGhost(m.playerA.id);
    const bIsGhost = isGhost(m.playerB.id);

    if (!aIsGhost && !bIsGhost) {
      const a = map.get(m.playerA.id);
      const b = map.get(m.playerB.id);
      if (!a || !b) return;
      a.played++; b.played++;
      a.pointsFor += m.playerAScore; a.pointsAgainst += m.playerBScore;
      b.pointsFor += m.playerBScore; b.pointsAgainst += m.playerAScore;
      if (m.winnerId === m.playerA.id) { a.wins++; b.losses++; }
      else { b.wins++; a.losses++; }
    } else if (!aIsGhost && bIsGhost) {
      // real vs ghost — only count pointsFor, no win/loss impact
      const a = map.get(m.playerA.id);
      if (!a) return;
      a.played++;
      a.pointsFor += m.playerAScore;
      if (m.winnerId === m.playerA.id) a.wins++; else a.losses++;
    } else if (aIsGhost && !bIsGhost) {
      const b = map.get(m.playerB.id);
      if (!b) return;
      b.played++;
      b.pointsFor += m.playerBScore;
      if (m.winnerId === m.playerB.id) b.wins++; else b.losses++;
    }
  });

  map.forEach((e) => { e.diff = e.pointsFor - e.pointsAgainst; });

  return Array.from(map.values()).sort((a, b) =>
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
    all.push(...computeGroupStandings(matches, gPlayers, g.id, g.withdrawnPlayerIds ?? []));
  });

  // Include knockout matches stats into the standings
  const knockoutMatches = matches.filter((m) => m.phase !== "GROUP" && m.isFinished);
  knockoutMatches.forEach((m) => {
    const aIsGhost = m.playerA.id.startsWith("bye-");
    const bIsGhost = m.playerB.id.startsWith("bye-");

    const pA = all.find((s) => s.playerId === m.playerA.id);
    const pB = all.find((s) => s.playerId === m.playerB.id);

    if (pA && !aIsGhost) {
      pA.played++;
      pA.pointsFor += m.playerAScore;
      // If opponent is ghost, don't count as real win/loss, or maybe we do? 
      // Usually a BYE in knockout gives a free win, but we'll follow group logic:
      if (!bIsGhost) {
        pA.pointsAgainst += m.playerBScore;
        if (m.winnerId === m.playerA.id) pA.wins++;
        else if (m.winnerId === m.playerB.id) pA.losses++;
      } else {
        if (m.winnerId === m.playerA.id) pA.wins++;
      }
      pA.diff = pA.pointsFor - pA.pointsAgainst;
    }

    if (pB && !bIsGhost) {
      pB.played++;
      pB.pointsFor += m.playerBScore;
      if (!aIsGhost) {
        pB.pointsAgainst += m.playerAScore;
        if (m.winnerId === m.playerB.id) pB.wins++;
        else if (m.winnerId === m.playerA.id) pB.losses++;
      } else {
        if (m.winnerId === m.playerB.id) pB.wins++;
      }
      pB.diff = pB.pointsFor - pB.pointsAgainst;
    }
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
