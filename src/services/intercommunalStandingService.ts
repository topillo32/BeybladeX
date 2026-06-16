import { getIntercommunalMatchesByTournament } from "./intercommunalMatchService";
import { getIntercommunalTeams, getIntercommunalMembersByTournament } from "./intercommunalTeamService";
import type { IntercommunalTeamStanding, IntercommunalMember } from "@/types/intercommunal";

export const getIntercommunalStandings = async (tournamentId: string): Promise<IntercommunalTeamStanding[]> => {
  const [matches, teams, members] = await Promise.all([
    getIntercommunalMatchesByTournament(tournamentId),
    getIntercommunalTeams(tournamentId),
    getIntercommunalMembersByTournament(tournamentId),
  ]);

  // Map member to team
  const memberTeamMap: Record<string, string> = {};
  members.forEach(m => memberTeamMap[m.id] = m.teamId);

  // Initialize standings
  const standingsMap: Record<string, IntercommunalTeamStanding> = {};
  teams.forEach(t => {
    standingsMap[t.id] = {
      teamId: t.id,
      teamName: t.name,
      logoUrl: t.logoUrl,
      matchWins: 0,
      matchLosses: 0,
      matchesPlayed: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointsDiff: 0,
    };
  });

  // Calculate standings from finished matches
  matches.forEach(match => {
    if (!match.isFinished) return;
    
    const teamAId = memberTeamMap[match.memberAId];
    const teamBId = memberTeamMap[match.memberBId];

    if (!teamAId || !teamBId) return;

    // Update Team A
    if (standingsMap[teamAId]) {
      standingsMap[teamAId].matchesPlayed += 1;
      standingsMap[teamAId].pointsFor += match.memberAScore;
      standingsMap[teamAId].pointsAgainst += match.memberBScore;
      if (match.winnerMemberId === match.memberAId) standingsMap[teamAId].matchWins += 1;
      else standingsMap[teamAId].matchLosses += 1;
    }

    // Update Team B
    if (standingsMap[teamBId]) {
      standingsMap[teamBId].matchesPlayed += 1;
      standingsMap[teamBId].pointsFor += match.memberBScore;
      standingsMap[teamBId].pointsAgainst += match.memberAScore;
      if (match.winnerMemberId === match.memberBId) standingsMap[teamBId].matchWins += 1;
      else standingsMap[teamBId].matchLosses += 1;
    }
  });

  // Calculate pointsDiff
  Object.values(standingsMap).forEach(s => {
    s.pointsDiff = s.pointsFor - s.pointsAgainst;
  });

  // Convert to array and sort
  const standingsArray = Object.values(standingsMap);
  
  standingsArray.sort((a, b) => {
    if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins; // 1. Victorias
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor; // 2. Puntos
    if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff; // 3. Diferencia
    return 0; // Empate absoluto
  });

  return standingsArray;
};
