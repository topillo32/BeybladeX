import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, limit } from "firebase/firestore";
import { db } from "@/services/firebase";
import type { ComboHistory } from "@/types/combos";

const col = collection(db, "comboHistory");

export const createComboHistory = async (
  data: Omit<ComboHistory, "id" | "changedAt"> & { changedBy: string }
): Promise<string> => {
  const ref = await addDoc(col, { ...data, changedAt: serverTimestamp() });
  return ref.id;
};

export const getComboHistoryByPlayer = async (
  playerId: string,
  tournamentId: string
): Promise<ComboHistory[]> => {
  const snap = await getDocs(
    query(col,
      where("playerId", "==", playerId),
      where("tournamentId", "==", tournamentId),
      orderBy("changedAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ComboHistory));
};

export const getLatestComboBySlot = async (
  playerId: string,
  tournamentId: string,
  slot: 1 | 2 | 3
): Promise<ComboHistory | null> => {
  const snap = await getDocs(
    query(col,
      where("playerId", "==", playerId),
      where("tournamentId", "==", tournamentId),
      where("slot", "==", slot),
      orderBy("changedAt", "desc"),
      limit(1)
    )
  );
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as ComboHistory;
};
