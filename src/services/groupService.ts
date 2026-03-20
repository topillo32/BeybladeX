import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, writeBatch, getDocs, query, where, arrayUnion,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Player, TournamentGroup } from "@/types";

const groupsCol = (tId: string) => collection(db, "tournaments", tId, "groups");

export const getGroups = async (tournamentId: string): Promise<TournamentGroup[]> => {
  const snap = await getDocs(groupsCol(tournamentId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentGroup));
};

export const createGroup = async (tournamentId: string, name: string) =>
  addDoc(groupsCol(tournamentId), { name, playerIds: [], tournamentId, createdAt: serverTimestamp() });

export const updateGroup = async (tId: string, gId: string, name: string) =>
  updateDoc(doc(db, "tournaments", tId, "groups", gId), { name });

export const deleteGroup = async (tId: string, gId: string) =>
  deleteDoc(doc(db, "tournaments", tId, "groups", gId));

export const addPlayerToGroup = async (tId: string, gId: string, playerId: string) =>
  updateDoc(doc(db, "tournaments", tId, "groups", gId), {
    playerIds: [...(await getGroupPlayerIds(tId, gId)), playerId],
  });

export const removePlayerFromGroup = async (tId: string, gId: string, playerId: string) => {
  const ids = await getGroupPlayerIds(tId, gId);
  updateDoc(doc(db, "tournaments", tId, "groups", gId), {
    playerIds: ids.filter((id) => id !== playerId),
  });
};

const getGroupPlayerIds = async (tId: string, gId: string): Promise<string[]> => {
  const { getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "tournaments", tId, "groups", gId));
  return snap.exists() ? (snap.data().playerIds as string[]) : [];
};

const MAX_PER_GROUP = 4;

/**
 * Adds a late-arriving player to the group with the most room (< MAX_PER_GROUP).
 * If all groups are full, creates a new group.
 * Only creates the NEW matches for this player vs existing group members.
 * Existing matches are never touched.
 */
export const addPlayerToGroupLive = async (
  tournamentId: string,
  player: Player,
  existingGroups: TournamentGroup[]
): Promise<void> => {
  // Find group with fewest players that still has room
  const available = existingGroups
    .filter((g) => g.playerIds.length < MAX_PER_GROUP)
    .sort((a, b) => a.playerIds.length - b.playerIds.length);

  let targetGroup: TournamentGroup;

  if (available.length === 0) {
    // All groups full → create a new one
    const newName = `Group ${String.fromCharCode(65 + existingGroups.length)}`;
    const ref = await addDoc(
      collection(db, "tournaments", tournamentId, "groups"),
      { name: newName, playerIds: [player.id], tournamentId, createdAt: serverTimestamp() }
    );
    targetGroup = { id: ref.id, name: newName, playerIds: [], tournamentId } as unknown as TournamentGroup;
    // No existing members to create matches against yet
    return;
  } else {
    targetGroup = available[0];
  }

  // Add player to group
  await updateDoc(doc(db, "tournaments", tournamentId, "groups", targetGroup.id), {
    playerIds: arrayUnion(player.id),
  });

  // Create only new matches: player vs each existing group member
  const matchesCol = collection(db, "tournaments", tournamentId, "matches");
  const batch = writeBatch(db);
  for (const existingId of targetGroup.playerIds) {
    // We need the full Player object — stored in matches, so we build a minimal one
    // The caller passes allPlayers so we can look it up
    const ref = doc(matchesCol);
    batch.set(ref, {
      tournamentId,
      groupId: targetGroup.id,
      phase: "GROUP",
      round: null,
      bracketPosition: null,
      playerA: player,
      playerB: { id: existingId, name: "" }, // placeholder, resolved below
      playerAScore: 0,
      playerBScore: 0,
      isFinished: false,
      winnerId: null,
      history: [],
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
};

/**
 * Same as addPlayerToGroupLive but receives full Player objects for proper match creation.
 */
export const addPlayerToGroupLiveWithPlayers = async (
  tournamentId: string,
  player: Player,
  existingGroups: TournamentGroup[],
  allPlayers: Player[]
): Promise<void> => {
  const available = existingGroups
    .filter((g) => g.playerIds.length < MAX_PER_GROUP)
    .sort((a, b) => a.playerIds.length - b.playerIds.length);

  let targetGroup: TournamentGroup;
  let existingMemberIds: string[] = [];

  if (available.length === 0) {
    const newName = `Group ${String.fromCharCode(65 + existingGroups.length)}`;
    await addDoc(
      collection(db, "tournaments", tournamentId, "groups"),
      { name: newName, playerIds: [player.id], tournamentId, createdAt: serverTimestamp() }
    );
    return; // new group with 1 player, no matches yet
  } else {
    targetGroup = available[0];
    existingMemberIds = targetGroup.playerIds;
  }

  await updateDoc(doc(db, "tournaments", tournamentId, "groups", targetGroup.id), {
    playerIds: arrayUnion(player.id),
  });

  const matchesCol = collection(db, "tournaments", tournamentId, "matches");
  const batch = writeBatch(db);
  for (const memberId of existingMemberIds) {
    const opponent = allPlayers.find((p) => p.id === memberId);
    if (!opponent) continue;
    const ref = doc(matchesCol);
    batch.set(ref, {
      tournamentId,
      groupId: targetGroup.id,
      phase: "GROUP",
      round: null,
      bracketPosition: null,
      playerA: player,
      playerB: opponent,
      playerAScore: 0,
      playerBScore: 0,
      isFinished: false,
      winnerId: null,
      history: [],
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
};

export const removePlayerFromGroupWithMatches = async (
  tId: string,
  gId: string,
  playerId: string
): Promise<void> => {
  const matchesCol = collection(db, "tournaments", tId, "matches");

  // Buscar matches no jugados de este jugador en este grupo
  const [snapA, snapB] = await Promise.all([
    getDocs(query(matchesCol, where("groupId", "==", gId), where("playerA.id", "==", playerId))),
    getDocs(query(matchesCol, where("groupId", "==", gId), where("playerB.id", "==", playerId))),
  ]);

  const batch = writeBatch(db);

  // Eliminar solo los matches no finalizados
  [...snapA.docs, ...snapB.docs].forEach((d) => {
    if (!d.data().isFinished) batch.delete(d.ref);
  });

  // Quitar del grupo
  const ids = await getGroupPlayerIds(tId, gId);
  batch.update(doc(db, "tournaments", tId, "groups", gId), {
    playerIds: ids.filter((id) => id !== playerId),
  });

  await batch.commit();
};

const countByes = (playerIds: string[]) => playerIds.filter((id) => id.startsWith("bye-")).length;

/**
 * Fills an incomplete group with bye players (auto-lose).
 * Max 3 byes per group. Byes get id "bye-{groupId}-{n}".
 */
export const fillGroupWithByes = async (
  tournamentId: string,
  group: TournamentGroup,
  realPlayers: Player[]
): Promise<void> => {
  const existingByes = countByes(group.playerIds);
  const slots = MAX_PER_GROUP - group.playerIds.length;
  const byesToAdd = Math.min(slots, 3 - existingByes);
  if (byesToAdd <= 0) return;

  const batch = writeBatch(db);
  const groupRef = doc(db, "tournaments", tournamentId, "groups", group.id);
  const matchesCol = collection(db, "tournaments", tournamentId, "matches");

  const newByePlayers: Player[] = [];
  for (let i = 0; i < byesToAdd; i++) {
    const byeId = `bye-${group.id}-${existingByes + i + 1}`;
    newByePlayers.push({ id: byeId, name: "BYE", tournamentIds: [], pendingTournamentIds: [], createdAt: null as any });
  }

  batch.update(groupRef, { playerIds: [...group.playerIds, ...newByePlayers.map((b) => b.id)] });

  // Solo creamos matches: cada nuevo bye vs cada jugador real (no bye vs bye)
  for (const bye of newByePlayers) {
    for (const real of realPlayers) {
      const ref = doc(matchesCol);
      batch.set(ref, {
        tournamentId,
        groupId: group.id,
        phase: "GROUP",
        round: null,
        bracketPosition: null,
        playerA: real,
        playerB: bye,
        playerAScore: 0,
        playerBScore: 0,
        isFinished: false,
        winnerId: null,
        history: [],
        createdAt: serverTimestamp(),
      });
    }
  }

  await batch.commit();
};

export const generateGroups = async (
  tournamentId: string,
  players: Player[],
  playersPerGroup: number
): Promise<TournamentGroup[]> => {
  // Borrar grupos existentes
  const existing = await getDocs(groupsCol(tournamentId));
  const batch = writeBatch(db);
  existing.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  // Mezclar jugadores
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const groupCount = Math.ceil(shuffled.length / playersPerGroup);

  const newBatch = writeBatch(db);
  const created: TournamentGroup[] = [];
  for (let i = 0; i < groupCount; i++) {
    const groupPlayers = shuffled.slice(i * playersPerGroup, (i + 1) * playersPerGroup);
    const ref = doc(groupsCol(tournamentId));
    const data = {
      name: `Group ${String.fromCharCode(65 + i)}`,
      playerIds: groupPlayers.map((p) => p.id),
      tournamentId,
      createdAt: serverTimestamp(),
    };
    newBatch.set(ref, data);
    created.push({ id: ref.id, ...data } as unknown as TournamentGroup);
  }
  await newBatch.commit();
  return created;
};
