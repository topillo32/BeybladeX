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
import type { IntercommunalMatch, IntercommunalGroup, MatchEvent } from "@/types/intercommunal";

const MATCHES_COLLECTION = "intercommunal_matches";

export const getIntercommunalMatchesByGroup = async (groupId: string): Promise<IntercommunalMatch[]> => {
  const q = query(
    collection(db, MATCHES_COLLECTION),
    where("groupId", "==", groupId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IntercommunalMatch));
};

export const getIntercommunalMatchesByTournament = async (tournamentId: string): Promise<IntercommunalMatch[]> => {
  const q = query(
    collection(db, MATCHES_COLLECTION),
    where("tournamentId", "==", tournamentId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IntercommunalMatch));
};

export const generateGroupMatches = async (tournamentId: string, groups: IntercommunalGroup[]) => {
  const batch = writeBatch(db);

  // Delete existing matches for GROUPS phase
  const existingQuery = query(
    collection(db, MATCHES_COLLECTION),
    where("tournamentId", "==", tournamentId)
  );
  const existingSnapshot = await getDocs(existingQuery);
  existingSnapshot.docs.forEach(docSnap => {
    // Only delete if it belongs to a group
    if (docSnap.data().groupId) {
      batch.delete(docSnap.ref);
    }
  });

  // Generate round-robin matches for each group
  groups.forEach(group => {
    const members = group.memberIds;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const matchRef = doc(collection(db, MATCHES_COLLECTION));
        batch.set(matchRef, {
          tournamentId,
          groupId: group.id,
          memberAId: members[i],
          memberBId: members[j],
          memberAScore: 0,
          memberBScore: 0,
          isFinished: false,
          winnerMemberId: null,
          history: [],
          createdAt: serverTimestamp(),
        });
      }
    }
  });

  await batch.commit();
};

export const updateIntercommunalMatch = async (
  matchId: string,
  memberAScore: number,
  memberBScore: number,
  isFinished: boolean,
  winnerMemberId: string | null,
  history: MatchEvent[]
) => {
  const docRef = doc(db, MATCHES_COLLECTION, matchId);
  await updateDoc(docRef, {
    memberAScore,
    memberBScore,
    isFinished,
    winnerMemberId,
    history,
  });
};
