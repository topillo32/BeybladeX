"use client";
import { usePlayerCombos } from "@/hooks/usePlayerCombos";
import { createOrUpdateCombo } from "@/lib/repositories/combosRepository";
import { validateComboIntegrity } from "@/lib/validators/comboValidator";
import { getPartById } from "@/lib/repositories/partsRepository";
import { ComboSelector } from "./ComboSelector";
import type { Combo } from "@/types/combos";

interface Props {
  playerId: string;
  tournamentId: string;
  changedBy: string;
}

export const ComboList = ({ playerId, tournamentId, changedBy }: Props) => {
  const { combos, loading, refresh } = usePlayerCombos(playerId, tournamentId);

  const handleSave = async (data: Omit<Combo, "id" | "createdAt" | "isActive">) => {
    const blade = await getPartById(data.bladeId);
    if (!blade) throw new Error("Blade no encontrado.");
    const err = validateComboIntegrity(data, blade);
    if (err) throw new Error(err);
    await createOrUpdateCombo(data, changedBy);
    refresh();
  };

  if (loading) return <p className="text-gray-400 text-sm text-center py-8">Cargando combos...</p>;

  return (
    <div className="space-y-4">
      {([1, 2, 3] as const).map((slot) => (
        <ComboSelector
          key={slot}
          slot={slot}
          playerId={playerId}
          tournamentId={tournamentId}
          initial={combos.find((c) => c.slot === slot)}
          onSave={handleSave}
        />
      ))}
    </div>
  );
};
