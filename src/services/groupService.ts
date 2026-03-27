import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, writeBatch, getDocs, query, where, arrayUnion,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Player, TournamentGroup, Match } from "@/types";

const groupsCol = (tId: string) => collection(db, "tournaments", tId, "groups");

export const assignJudge = async (tId: string, gId: string, judgeId: string, judgeName: string) =>
  updateDoc(doc(db, "tournaments", tId, "groups", gId), { judgeId, judgeName });

export const removeJudge = async (tId: string, gId: string) =>
  updateDoc(doc(db, "tournaments", tId, "groups", gId), { judgeId: null, judgeName: null });

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

export const addPlayerToGroupLiveWithPlayers = async (
  tournamentId: string,
  player: Player,
  existingGroups: TournamentGroup[],
  allPlayers: Player[],
  maxPerGroup = 4
): Promise<void> => {
  const [freshGroupsSnap, allMatchesSnap] = await Promise.all([
    getDocs(groupsCol(tournamentId)),
    getDocs(query(collection(db, "tournaments", tournamentId, "matches"), where("phase", "==", "GROUP"))),
  ]);
  const freshGroups = freshGroupsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentGroup));
  const allGroupMatches = allMatchesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Match));

  // ── Priority 1: replace a bye in a group whose round is not complete ──
  for (const g of freshGroups) {
    const groupMatches = allGroupMatches.filter((m) => m.groupId === g.id);
    const roundComplete = groupMatches.length > 0 && groupMatches.every((m) => m.isFinished);
    if (roundComplete) continue;

    const byeIds = g.playerIds.filter((id) => id.startsWith("bye-"));
    if (byeIds.length === 0) continue;

    // Pick bye with fewest finished matches
    const byeToReplace = [...byeIds].sort((a, b) => {
      const finA = groupMatches.filter((m) => (m.playerA.id === a || m.playerB.id === a) && m.isFinished).length;
      const finB = groupMatches.filter((m) => (m.playerA.id === b || m.playerB.id === b) && m.isFinished).length;
      return finA - finB;
    })[0];

    await replaceByeWithPlayer(tournamentId, g.id, byeToReplace, player, [...allPlayers, player]);
    return;
  }

  // ── Priority 2: group with open slot and round not complete ──
  const available = freshGroups
    .filter((g) => {
      if (g.playerIds.length >= maxPerGroup) return false;
      const groupMatches = allGroupMatches.filter((m) => m.groupId === g.id);
      if (groupMatches.length === 0) return true;
      return groupMatches.some((m) => !m.isFinished);
    })
    .sort((a, b) => b.playerIds.length - a.playerIds.length);

  if (available.length === 0) {
    const newName = `Group ${String.fromCharCode(65 + freshGroups.length)}`;
    await addDoc(
      collection(db, "tournaments", tournamentId, "groups"),
      { name: newName, playerIds: [player.id], tournamentId, createdAt: serverTimestamp() }
    );
    return;
  }

  const targetGroup = available[0];
  await updateDoc(doc(db, "tournaments", tournamentId, "groups", targetGroup.id), {
    playerIds: arrayUnion(player.id),
  });

  const matchesCol = collection(db, "tournaments", tournamentId, "matches");
  const batch = writeBatch(db);
  for (const memberId of targetGroup.playerIds) {
    const opponent = allPlayers.find((p) => p.id === memberId);
    if (!opponent) continue;
    const ref = doc(matchesCol);
    batch.set(ref, {
      tournamentId, groupId: targetGroup.id, phase: "GROUP",
      round: null, bracketPosition: null,
      playerA: player, playerB: opponent,
      playerAScore: 0, playerBScore: 0,
      isFinished: false, winnerId: null, history: [],
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
};

export const withdrawPlayerFromGroup = async (
  tournamentId: string,
  groupId: string,
  playerId: string
): Promise<void> => {
  const matchesCol = collection(db, "tournaments", tournamentId, "matches");
  const [snapA, snapB] = await Promise.all([
    getDocs(query(matchesCol, where("groupId", "==", groupId), where("playerA.id", "==", playerId))),
    getDocs(query(matchesCol, where("groupId", "==", groupId), where("playerB.id", "==", playerId))),
  ]);

  const allDocs = [...snapA.docs, ...snapB.docs];
  const hasFinished = allDocs.some((d) => d.data().isFinished);

  const batch = writeBatch(db);
  allDocs.forEach((d) => { if (!d.data().isFinished) batch.delete(d.ref); });

  const groupRef = doc(db, "tournaments", tournamentId, "groups", groupId);
  if (hasFinished) {
    batch.update(groupRef, { withdrawnPlayerIds: arrayUnion(playerId) });
  } else {
    const ids = await getGroupPlayerIds(tournamentId, groupId);
    batch.update(groupRef, { playerIds: ids.filter((id) => id !== playerId) });
  }

  await batch.commit();

  const { unenrollPlayerFromTournament } = await import("@/services/playerService");
  await unenrollPlayerFromTournament(playerId, tournamentId);
};

export const replaceByeWithPlayer = async (
  tournamentId: string,
  groupId: string,
  byeId: string,
  newPlayer: Player,
  allPlayers: Player[]
): Promise<void> => {
  const matchesCol = collection(db, "tournaments", tournamentId, "matches");
  const [snapA, snapB] = await Promise.all([
    getDocs(query(matchesCol, where("groupId", "==", groupId), where("playerA.id", "==", byeId))),
    getDocs(query(matchesCol, where("groupId", "==", groupId), where("playerB.id", "==", byeId))),
  ]);

  const batch = writeBatch(db);
  [...snapA.docs, ...snapB.docs].forEach((d) => {
    if (!d.data().isFinished) batch.delete(d.ref);
  });

  const ids = await getGroupPlayerIds(tournamentId, groupId);
  batch.update(doc(db, "tournaments", tournamentId, "groups", groupId), {
    playerIds: ids.map((id) => id === byeId ? newPlayer.id : id),
  });

  const realMemberIds = ids.filter((id) => id !== byeId && !id.startsWith("bye-"));
  for (const memberId of realMemberIds) {
    const opponent = allPlayers.find((p) => p.id === memberId);
    if (!opponent) continue;
    const ref = doc(matchesCol);
    batch.set(ref, {
      tournamentId, groupId, phase: "GROUP",
      round: null, bracketPosition: null,
      playerA: newPlayer, playerB: opponent,
      playerAScore: 0, playerBScore: 0,
      isFinished: false, winnerId: null, history: [],
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
  const [snapA, snapB] = await Promise.all([
    getDocs(query(matchesCol, where("groupId", "==", gId), where("playerA.id", "==", playerId))),
    getDocs(query(matchesCol, where("groupId", "==", gId), where("playerB.id", "==", playerId))),
  ]);

  const batch = writeBatch(db);
  [...snapA.docs, ...snapB.docs].forEach((d) => {
    if (!d.data().isFinished) batch.delete(d.ref);
  });

  const ids = await getGroupPlayerIds(tId, gId);
  batch.update(doc(db, "tournaments", tId, "groups", gId), {
    playerIds: ids.filter((id) => id !== playerId),
  });

  await batch.commit();

  if (!playerId.startsWith("bye-")) {
    const { unenrollPlayerFromTournament } = await import("@/services/playerService");
    await unenrollPlayerFromTournament(playerId, tId);
  }
};

const countByes = (playerIds: string[]) => playerIds.filter((id) => id.startsWith("bye-")).length;

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

  for (const bye of newByePlayers) {
    for (const real of realPlayers) {
      const ref = doc(matchesCol);
      batch.set(ref, {
        tournamentId, groupId: group.id, phase: "GROUP",
        round: null, bracketPosition: null,
        playerA: real, playerB: bye,
        playerAScore: 0, playerBScore: 0,
        isFinished: false, winnerId: null, history: [],
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
  const existing = await getDocs(groupsCol(tournamentId));
  const batch = writeBatch(db);
  existing.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

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
