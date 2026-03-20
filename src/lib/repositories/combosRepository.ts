import { collection, doc, getDocs, setDoc, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase";
import type { Combo } from "@/types/combos";
import { validatePlayerHasAllCombos } from "@/lib/validators/comboValidator";

const col = collection(db, "combos");

export const createOrUpdateCombo = async (
  combo: Omit<Combo, "id" | "createdAt" | "isActive">,
  changedBy: string
): Promise<string> => {
  // Buscar si ya existe un combo activo en ese slot
  const existing = await getDocs(
    query(col,
      where("playerId", "==", combo.playerId),
      where("tournamentId", "==", combo.tournamentId),
      where("slot", "==", combo.slot),
      where("isActive", "==", true)
    )
  );

  // Desactivar el combo anterior si existe
  if (!existing.empty) {
    const prev = existing.docs[0];
    await setDoc(prev.ref, { isActive: false }, { merge: true });

    // Guardar historial del combo anterior
    const { createComboHistory } = await import("@/lib/repositories/comboHistoryRepository");
    await createComboHistory({ ...(prev.data() as Omit<Combo, "id" | "createdAt" | "isActive">), changedBy });
  }

  const id = `${combo.playerId}_${combo.tournamentId}_${combo.slot}`;
  await setDoc(doc(db, "combos", id), { ...combo, isActive: true, createdAt: serverTimestamp() });
  return id;
};

export const getPlayerCombos = async (playerId: string, tournamentId: string): Promise<Combo[]> => {
  const snap = await getDocs(
    query(col,
      where("playerId", "==", playerId),
      where("tournamentId", "==", tournamentId),
      where("isActive", "==", true)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Combo));
};

export const validatePlayerCombos = async (
  playerId: string,
  tournamentId: string
): Promise<string | null> => {
  const combos = await getPlayerCombos(playerId, tournamentId);
  return validatePlayerHasAllCombos(combos);
};
