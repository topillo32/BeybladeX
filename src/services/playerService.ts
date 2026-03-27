import {
  collection, addDoc, updateDoc, deleteDoc, setDoc,
  doc, serverTimestamp, arrayUnion, arrayRemove, getDoc, query, where, getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

const col = collection(db, "players");

/** Ensures legacy player documents have both array fields */
const ensureArrayFields = async (playerId: string) => {
  const snap = await getDoc(doc(db, "players", playerId));
  if (!snap.exists()) return;
  const data = snap.data();
  const patch: Record<string, unknown> = {};
  if (!Array.isArray(data.tournamentIds))        patch.tournamentIds = [];
  if (!Array.isArray(data.pendingTournamentIds)) patch.pendingTournamentIds = [];
  if (Object.keys(patch).length > 0)
    await updateDoc(doc(db, "players", playerId), patch);
};

export const getPlayerByUserId = async (uid: string) => {
  // First try direct doc lookup (players created after uid-as-id change)
  const direct = await getDoc(doc(db, "players", uid));
  if (direct.exists()) return { id: direct.id, ...direct.data() } as import("@/types").Player;
  // Fallback: query by userId field (legacy players with random id)
  const snap = await getDocs(query(collection(db, "players"), where("userId", "==", uid)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as import("@/types").Player;
};

/** Used internally for recovery when player doc is missing after a failed registration. */
export const createPlayerDoc = async (uid: string, displayName: string): Promise<void> => {
  const nameLower = displayName.trim().toLowerCase();
  // Check if an unlinked player with this name exists first
  const snap = await getDocs(query(col, where("nameLower", "==", nameLower)));
  const unlinked = snap.docs.find((d) => !d.data().userId);
  if (unlinked) {
    await updateDoc(unlinked.ref, { userId: uid });
    return;
  }
  // Only create if no doc exists yet for this uid
  const existing = await getDoc(doc(db, "players", uid));
  if (existing.exists()) return;
  await setDoc(doc(db, "players", uid), {
    name: displayName.trim(),
    nameLower,
    userId: uid,
    tournamentIds: [],
    pendingTournamentIds: [],
    createdAt: serverTimestamp(),
  });
};

export const createPlayer = async (name: string, tournamentId?: string) => {
  if (!name.trim()) throw new Error("Name cannot be empty.");
  const nameLower = name.trim().toLowerCase();
  // Prevent duplicate names (case-insensitive)
  const existing = await getDocs(query(col, where("nameLower", "==", nameLower)));
  if (!existing.empty) throw new Error(`Ya existe un jugador con el nombre "${name.trim()}".`);
  await addDoc(col, {
    name: name.trim(),
    nameLower,
    tournamentIds: tournamentId ? [tournamentId] : [],
    pendingTournamentIds: [],
    createdAt: serverTimestamp(),
  });
};

export const updatePlayer = async (id: string, name: string) =>
  updateDoc(doc(db, "players", id), { name: name.trim() });

export const deletePlayer = async (id: string) =>
  deleteDoc(doc(db, "players", id));

export const enrollPlayerInTournament = async (
  playerId: string,
  tournamentId: string,
  tournamentStatus: string
) => {
  await ensureArrayFields(playerId);
  if (tournamentStatus === "GROUP_STAGE") {
    await updateDoc(doc(db, "players", playerId), {
      pendingTournamentIds: arrayUnion(tournamentId),
    });
  } else {
    await updateDoc(doc(db, "players", playerId), {
      tournamentIds: arrayUnion(tournamentId),
    });
  }
};

export const unenrollPlayerFromTournament = async (playerId: string, tournamentId: string) =>
  updateDoc(doc(db, "players", playerId), {
    tournamentIds: arrayRemove(tournamentId),
    pendingTournamentIds: arrayRemove(tournamentId),
  });

export const leavePlayerFromTournament = async (
  playerId: string,
  tournamentId: string
): Promise<void> => {
  const [snapA, snapB] = await Promise.all([
    getDocs(query(collection(db, "tournaments", tournamentId, "matches"), where("playerA.id", "==", playerId))),
    getDocs(query(collection(db, "tournaments", tournamentId, "matches"), where("playerB.id", "==", playerId))),
  ]);
  const allMatchDocs = [...snapA.docs, ...snapB.docs];
  const hasFinished = allMatchDocs.some((d) => d.data().isFinished);

  if (hasFinished) {
    // Find which group this player belongs to
    const groupId = allMatchDocs.find((d) => d.data().groupId)?.data().groupId ?? null;
    if (!groupId) throw new Error("No se encontró el grupo del jugador.");
    const { withdrawPlayerFromGroup } = await import("@/services/groupService");
    await withdrawPlayerFromGroup(tournamentId, groupId, playerId);
  } else {
    // No finished matches — clean removal
    const groupId = allMatchDocs.find((d) => d.data().groupId)?.data().groupId ?? null;
    if (groupId) {
      const { removePlayerFromGroupWithMatches } = await import("@/services/groupService");
      await removePlayerFromGroupWithMatches(tournamentId, groupId, playerId);
    }
    await unenrollPlayerFromTournament(playerId, tournamentId);
  }
};

export const approvePlayerEnrollment = async (playerId: string, tournamentId: string) =>
  updateDoc(doc(db, "players", playerId), {
    pendingTournamentIds: arrayRemove(tournamentId),
    tournamentIds: arrayUnion(tournamentId),
  });
