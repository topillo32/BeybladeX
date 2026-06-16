import {
  collection,
  doc,
  serverTimestamp,
  getDocs,
  query,
  where,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { IntercommunalTeamMatch, MatchPhase } from "@/types/intercommunal";
import { getIntercommunalStandings } from "./intercommunalStandingService";

const TEAM_MATCHES_COLLECTION = "intercommunal_team_matches";

export const getIntercommunalTeamMatches = async (tournamentId: string): Promise<IntercommunalTeamMatch[]> => {
  const q = query(
    collection(db, TEAM_MATCHES_COLLECTION),
    where("tournamentId", "==", tournamentId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IntercommunalTeamMatch));
};

export const generateKnockoutBracket = async (tournamentId: string, qualifiersCount: number) => {
  const standings = await getIntercommunalStandings(tournamentId);
  if (standings.length < qualifiersCount) {
    throw new Error("No hay suficientes comunas para llenar los cupos clasificatorios.");
  }

  const qualifiedTeams = standings.slice(0, qualifiersCount);

  // Bolillero: shuffle the qualified teams to randomize the matchups
  const shuffledTeams = [...qualifiedTeams].sort(() => Math.random() - 0.5);

  const batch = writeBatch(db);

  // Delete existing KO matches
  const existingQuery = query(
    collection(db, TEAM_MATCHES_COLLECTION),
    where("tournamentId", "==", tournamentId)
  );
  const existingSnapshot = await getDocs(existingQuery);
  existingSnapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));

  // Determine phase name based on qualifiers count
  let phase: MatchPhase = "FINAL";
  if (qualifiersCount >= 16) phase = "ROUND_OF_16";
  else if (qualifiersCount >= 8) phase = "QUARTER_FINALS";
  else if (qualifiersCount >= 4) phase = "SEMI_FINALS";

  // Create matchups
  for (let i = 0; i < shuffledTeams.length; i += 2) {
    if (i + 1 >= shuffledTeams.length) break;

    const teamA = shuffledTeams[i];
    const teamB = shuffledTeams[i + 1];

    const matchRef = doc(collection(db, TEAM_MATCHES_COLLECTION));
    batch.set(matchRef, {
      tournamentId,
      phase,
      teamAId: teamA.teamId,
      teamBId: teamB.teamId,
      teamAWins: 0,
      teamBWins: 0,
      teamAPoints: 0,
      teamBPoints: 0,
      isFinished: false,
      winnerTeamId: null,
      requiresSuddenDeath: false,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
};

export const updateIntercommunalTeamMatch = async (
  matchId: string,
  data: Partial<IntercommunalTeamMatch>
) => {
  const docRef = doc(db, TEAM_MATCHES_COLLECTION, matchId);
  await updateDoc(docRef, data as Record<string, any>);
};
