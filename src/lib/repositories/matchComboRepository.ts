import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { createComboHistory } from "@/lib/repositories/comboHistoryRepository";
import { getPlayerCombos } from "@/lib/repositories/combosRepository";
import type { ComboSnapshot } from "@/types/combos";

export const assignComboToMatch = async (
  tournamentId: string,
  matchId: string,
  playerId: string,
  slot: 1 | 2 | 3,
  changedBy: string
): Promise<ComboSnapshot> => {
  const combos = await getPlayerCombos(playerId, tournamentId);
  const combo = combos.find((c) => c.slot === slot);
  if (!combo) throw new Error(`El jugador no tiene combo activo en el slot ${slot}.`);

  // Guardar snapshot en historial vinculado al match
  const historyId = await createComboHistory({
    playerId,
    tournamentId,
    matchId,
    slot,
    bladeId: combo.bladeId,
    assistBladeId: combo.assistBladeId,
    ratchetId: combo.ratchetId,
    bitId: combo.bitId,
    changedBy,
  });

  // Actualizar el match con el snapshot
  const field = playerId; // se usa desde fuera con playerAId/playerBId
  await updateDoc(doc(db, "tournaments", tournamentId, "matches", matchId), {
    [`comboSnapshots.${field}`]: { slot, comboHistoryId: historyId },
  });

  return { slot, comboHistoryId: historyId };
};
