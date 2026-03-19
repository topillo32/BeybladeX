import {
  collection, addDoc, updateDoc, deleteDoc,
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

export const createPlayer = async (name: string) => {
  if (!name.trim()) throw new Error("Name cannot be empty.");
  await addDoc(col, {
    name: name.trim(),
    tournamentIds: [],
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

export const approvePlayerEnrollment = async (playerId: string, tournamentId: string) =>
  updateDoc(doc(db, "players", playerId), {
    pendingTournamentIds: arrayRemove(tournamentId),
    tournamentIds: arrayUnion(tournamentId),
  });
