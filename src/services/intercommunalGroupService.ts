import {
  collection,
  doc,
  serverTimestamp,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { IntercommunalGroup, IntercommunalTeam, IntercommunalMember } from "@/types/intercommunal";
import { getIntercommunalTeams, getIntercommunalMembersByTournament } from "./intercommunalTeamService";

const GROUPS_COLLECTION = "intercommunal_groups";

export const getIntercommunalGroups = async (tournamentId: string): Promise<IntercommunalGroup[]> => {
  const q = query(
    collection(db, GROUPS_COLLECTION),
    where("tournamentId", "==", tournamentId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IntercommunalGroup));
};

export const createEmptyGroups = async (tournamentId: string) => {
  const teams = await getIntercommunalTeams(tournamentId);
  const numGroups = teams.length;

  if (numGroups === 0) {
    throw new Error("No hay equipos registrados.");
  }

  const batch = writeBatch(db);

  // Delete existing groups for this tournament
  const existingGroupsQuery = query(collection(db, GROUPS_COLLECTION), where("tournamentId", "==", tournamentId));
  const existingGroupsSnapshot = await getDocs(existingGroupsQuery);
  existingGroupsSnapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));

  // Save the new empty groups
  for (let i = 0; i < numGroups; i++) {
    const newGroupRef = doc(collection(db, GROUPS_COLLECTION));
    batch.set(newGroupRef, {
      tournamentId,
      name: `Grupo ${i + 1}`,
      memberIds: [],
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
};

export const generateIntercommunalGroups = async (tournamentId: string) => {
  // Fetch teams and members
  const teams = await getIntercommunalTeams(tournamentId);
  const members = await getIntercommunalMembersByTournament(tournamentId);

  // Group members by team
  const membersByTeam: Record<string, IntercommunalMember[]> = {};
  teams.forEach(t => membersByTeam[t.id] = []);
  members.forEach(m => {
    if (membersByTeam[m.teamId]) {
      membersByTeam[m.teamId].push(m);
    }
  });

  // Verify each team has exactly 4 members
  for (const team of teams) {
    if (membersByTeam[team.id].length !== 4) {
      throw new Error(`El equipo ${team.name} no tiene exactamente 4 integrantes. Por favor, corrige esto antes de generar los grupos.`);
    }
  }

  const batch = writeBatch(db);

  // Delete existing groups for this tournament
  const existingGroupsQuery = query(collection(db, GROUPS_COLLECTION), where("tournamentId", "==", tournamentId));
  const existingGroupsSnapshot = await getDocs(existingGroupsQuery);
  existingGroupsSnapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));

  // Create N groups of 4 people (N = number of teams)
  const numGroups = teams.length;
  const groupsData: { name: string; memberIds: string[] }[] = [];
  
  for (let i = 0; i < numGroups; i++) {
    groupsData.push({
      name: `Grupo ${i + 1}`,
      memberIds: [],
    });
  }

  // Helper to get team ID from member ID
  const getTeamId = (memberId: string) => members.find(m => m.id === memberId)?.teamId;

  // Distribute members
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);

  for (const team of shuffledTeams) {
    const teamMembers = [...membersByTeam[team.id]].sort(() => Math.random() - 0.5);

    for (let i = 0; i < 4; i++) {
      // Find groups that don't have a member from this team yet
      let availableGroups = groupsData.filter(
        g => !g.memberIds.some(mid => getTeamId(mid) === team.id)
      );

      // If all groups have a member from this team (only happens if numTeams < 4),
      // fallback to any group that is not full yet.
      if (availableGroups.length === 0) {
        availableGroups = groupsData.filter(g => g.memberIds.length < 4);
      }

      // Sort by current size (ascending), then random
      availableGroups.sort((a, b) => {
        if (a.memberIds.length !== b.memberIds.length) {
          return a.memberIds.length - b.memberIds.length;
        }
        return Math.random() - 0.5;
      });

      // Assign member to the best available group
      if (availableGroups.length > 0) {
        availableGroups[0].memberIds.push(teamMembers[i].id);
      }
    }
  }

  // Save the new groups
  for (let i = 0; i < numGroups; i++) {
    const newGroupRef = doc(collection(db, GROUPS_COLLECTION));
    batch.set(newGroupRef, {
      tournamentId,
      name: groupsData[i].name,
      memberIds: groupsData[i].memberIds,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
};

export const updateIntercommunalGroupMembers = async (groupId: string, memberIds: string[]) => {
  const docRef = doc(db, GROUPS_COLLECTION, groupId);
  const batch = writeBatch(db);
  batch.update(docRef, { memberIds });
  await batch.commit();
};

export const updateAllIntercommunalGroups = async (groups: IntercommunalGroup[]) => {
  const batch = writeBatch(db);
  groups.forEach(group => {
    const docRef = doc(db, GROUPS_COLLECTION, group.id);
    batch.update(docRef, { memberIds: group.memberIds });
  });
  await batch.commit();
};
