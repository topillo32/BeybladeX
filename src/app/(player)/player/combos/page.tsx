"use client";
export const dynamic = "force-dynamic";
import { useAuthContext } from "@/lib/AuthContext";
import { usePlayerCombos } from "@/hooks/usePlayerCombos";
import { useTournaments } from "@/hooks/useTournament";
import { createOrUpdateCombo } from "@/lib/repositories/combosRepository";
import { validateComboIntegrity } from "@/lib/validators/comboValidator";
import { getPartById } from "@/lib/repositories/partsRepository";
import { ComboSelector } from "@/components/combos/ComboSelector";
import { Spinner } from "@/components/ui/Spinner";
import { useState } from "react";
import type { Combo } from "@/types/combos";

export default function PlayerCombosPage() {
  const { user } = useAuthContext();
  const { tournaments, loading: tournamentsLoading } = useTournaments();
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const { combos, loading: combosLoading, refresh } = usePlayerCombos(user?.uid ?? "", selectedTournamentId);

  const activeTournaments = tournaments.filter((t) => t.status !== "FINISHED" && t.status !== "DRAFT");

  const handleSave = async (data: Omit<Combo, "id" | "createdAt" | "isActive">) => {
    const blade = await getPartById(data.bladeId);
    if (!blade) throw new Error("Blade no encontrado.");
    const err = validateComboIntegrity(data, blade);
    if (err) throw new Error(err);
    await createOrUpdateCombo(data, user!.uid);
    refresh();
  };

  if (tournamentsLoading) return <Spinner />;

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="font-gaming text-2xl font-black tracking-widest text-white">🌀 Mis Combos</h1>
          <div className="divider-cyan mt-3" />
        </div>

        {/* Selector de torneo */}
        <div>
          <label className="section-title block mb-2">Torneo</label>
          <select value={selectedTournamentId} onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="input-base text-sm">
            <option value="">— Selecciona un torneo —</option>
            {activeTournaments.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {!selectedTournamentId ? (
          <div className="card p-10 text-center">
            <p className="text-4xl mb-3">🌀</p>
            <p className="text-white font-semibold">Selecciona un torneo para ver tus combos</p>
          </div>
        ) : combosLoading ? <Spinner /> : (
          <div className="space-y-4">
            {/* Estado de combos */}
            <div className="flex gap-2">
              {([1, 2, 3] as const).map((slot) => {
                const has = combos.some((c) => c.slot === slot);
                return (
                  <div key={slot} className={`flex-1 text-center py-2 rounded-lg font-gaming text-xs border
                    ${has ? "text-green-400 border-green-500/30 bg-green-500/10" : "text-red-400 border-red-500/30 bg-red-500/10"}`}>
                    Combo {slot} {has ? "✓" : "✗"}
                  </div>
                );
              })}
            </div>

            {/* Los 3 selectores */}
            {([1, 2, 3] as const).map((slot) => (
              <ComboSelector
                key={slot}
                slot={slot}
                playerId={user!.uid}
                tournamentId={selectedTournamentId}
                initial={combos.find((c) => c.slot === slot)}
                onSave={handleSave}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
