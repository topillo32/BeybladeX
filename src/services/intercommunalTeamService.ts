import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
  getDoc,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { IntercommunalTeam, IntercommunalMember } from "@/types/intercommunal";

const TEAMS_COLLECTION = "intercommunal_teams";
const MEMBERS_COLLECTION = "intercommunal_members";

export const getIntercommunalTeams = async (tournamentId: string): Promise<IntercommunalTeam[]> => {
  const q = query(
    collection(db, TEAMS_COLLECTION),
    where("tournamentId", "==", tournamentId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IntercommunalTeam));
};

export const createIntercommunalTeam = async (
  tournamentId: string,
  name: string,
  logoUrl?: string
) => {
  const teamData = {
    tournamentId,
    name,
    logoUrl: logoUrl || "",
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, TEAMS_COLLECTION), teamData);
  return docRef.id;
};

export const deleteIntercommunalTeam = async (teamId: string) => {
  const batch = writeBatch(db);
  
  // Delete the team
  const teamRef = doc(db, TEAMS_COLLECTION, teamId);
  batch.delete(teamRef);

  // Delete associated members
  const membersQuery = query(collection(db, MEMBERS_COLLECTION), where("teamId", "==", teamId));
  const membersSnapshot = await getDocs(membersQuery);
  
  membersSnapshot.docs.forEach((memberDoc) => {
    batch.delete(doc(db, MEMBERS_COLLECTION, memberDoc.id));
  });

  await batch.commit();
};

export const getIntercommunalMembersByTeam = async (teamId: string): Promise<IntercommunalMember[]> => {
  const q = query(
    collection(db, MEMBERS_COLLECTION),
    where("teamId", "==", teamId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IntercommunalMember));
};

export const getIntercommunalMembersByTournament = async (tournamentId: string): Promise<IntercommunalMember[]> => {
  const q = query(
    collection(db, MEMBERS_COLLECTION),
    where("tournamentId", "==", tournamentId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IntercommunalMember));
};

export const setIntercommunalTeamMembers = async (
  tournamentId: string,
  teamId: string,
  members: { name: string; linkedUserId?: string | null }[]
) => {
  if (members.length !== 4) {
    throw new Error("A team must have exactly 4 members.");
  }

  const batch = writeBatch(db);

  // Get current members
  const currentMembersQuery = query(collection(db, MEMBERS_COLLECTION), where("teamId", "==", teamId));
  const currentMembersSnapshot = await getDocs(currentMembersQuery);

  // Delete current members
  currentMembersSnapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  // Add new members
  members.forEach((member) => {
    const newMemberRef = doc(collection(db, MEMBERS_COLLECTION));
    batch.set(newMemberRef, {
      teamId,
      tournamentId,
      name: member.name,
      linkedUserId: member.linkedUserId || null,
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
};
