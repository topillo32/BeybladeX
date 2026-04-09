import { describe, it, expect } from "vitest";
import { autoQualifiersCount, computeGroupStandings } from "./standingsService";
import type { Match, Player } from "../types";

describe("autoQualifiersCount", () => {
  it("elige la potencia de 2 más alta que no supera el total", () => {
    expect(autoQualifiersCount(10)).toBe(8);
    expect(autoQualifiersCount(64)).toBe(64);
    expect(autoQualifiersCount(3)).toBe(8);
  });
});

describe("computeGroupStandings", () => {
  it("ordena por victorias y puntos a favor", () => {
    const groupId = "g1";
    const players: Player[] = [
      { id: "p1", name: "A", tournamentIds: [], pendingTournamentIds: [], createdAt: {} as any },
      { id: "p2", name: "B", tournamentIds: [], pendingTournamentIds: [], createdAt: {} as any },
    ];
    const matches: Match[] = [
      {
        id: "m1",
        tournamentId: "t1",
        groupId,
        phase: "GROUP",
        playerA: players[0],
        playerB: players[1],
        playerAScore: 4,
        playerBScore: 0,
        isFinished: true,
        winnerId: "p1",
        history: [],
        createdAt: {} as any,
      },
    ];
    const out = computeGroupStandings(matches, players, groupId, []);
    expect(out[0].playerId).toBe("p1");
    expect(out[0].wins).toBe(1);
    expect(out[1].wins).toBe(0);
  });
});
