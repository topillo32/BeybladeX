"use client";
import { useEffect, useState } from "react";
import { getPlayerCombos } from "@/lib/repositories/combosRepository";
import { getPartById } from "@/lib/repositories/partsRepository";
import type { Combo } from "@/types/combos";

interface ResolvedCombo extends Combo {
  bladeName: string;
  assistBladeName?: string;
  ratchetName: string;
  bitName: string;
}

interface Props {
  tournamentId: string;
  playerAId: string;
  playerAName: string;
  playerBId: string;
  playerBName: string;
  onValidationChange?: (allValid: boolean, hasInvalid: boolean) => void;
}

type VerifyState = "pending" | "valid" | "invalid";

async function resolveCombo(combo: Combo): Promise<ResolvedCombo> {
  const [blade, assistBlade, ratchet, bit] = await Promise.all([
    getPartById(combo.bladeId),
    combo.assistBladeId ? getPartById(combo.assistBladeId) : Promise.resolve(null),
    getPartById(combo.ratchetId),
    getPartById(combo.bitId),
  ]);
  return {
    ...combo,
    bladeName: blade?.name ?? combo.bladeId,
    assistBladeName: assistBlade?.name,
    ratchetName: ratchet?.name ?? combo.ratchetId,
    bitName: bit?.name ?? combo.bitId,
  };
}

const SlotVerifier = ({
  combo, state, onChange,
}: {
  combo: ResolvedCombo;
  state: VerifyState;
  onChange: (s: VerifyState) => void;
}) => (
  <div className={`card p-3 space-y-2 border transition-colors ${
    state === "valid" ? "border-green-500/40 bg-green-500/5" :
    state === "invalid" ? "border-red-500/40 bg-red-500/5" :
    "border-white/10"
  }`}>
    <div className="flex items-center justify-between">
      <span className="font-gaming text-xs text-gray-400 tracking-widest">COMBO {combo.slot}</span>
      {state !== "pending" && (
        <span className={`font-gaming text-xs font-bold ${state === "valid" ? "text-green-400" : "text-red-400"}`}>
          {state === "valid" ? "✓ VÁLIDO" : "✗ INVÁLIDO"}
        </span>
      )}
    </div>
    <div className="text-sm space-y-0.5">
      <p className="text-white font-semibold">
        {combo.bladeName}
        {combo.assistBladeName && <span className="text-gray-400"> + {combo.assistBladeName}</span>}
      </p>
      <p className="text-gray-400 text-xs">{combo.ratchetName} · {combo.bitName}</p>
    </div>
    <div className="flex gap-2 pt-1">
      <button
        onClick={() => onChange("valid")}
        className={`flex-1 py-1.5 rounded-lg text-xs font-gaming tracking-wider border transition-all ${
          state === "valid"
            ? "bg-green-500/20 border-green-500/50 text-green-300"
            : "bg-white/5 border-white/10 text-gray-400 hover:border-green-500/30 hover:text-green-400"
        }`}
      >✓ Válido</button>
      <button
        onClick={() => onChange("invalid")}
        className={`flex-1 py-1.5 rounded-lg text-xs font-gaming tracking-wider border transition-all ${
          state === "invalid"
            ? "bg-red-500/20 border-red-500/50 text-red-300"
            : "bg-white/5 border-white/10 text-gray-400 hover:border-red-500/30 hover:text-red-400"
        }`}
      >✗ Inválido</button>
    </div>
  </div>
);

const PlayerCombos = ({
  playerId, tournamentId, playerName, onValidationChange,
}: {
  playerId: string;
  tournamentId: string;
  playerName: string;
  onValidationChange?: (allValid: boolean, hasInvalid: boolean) => void;
}) => {
  const [combos, setCombos] = useState<ResolvedCombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState<Record<number, VerifyState>>({ 1: "pending", 2: "pending", 3: "pending" });

  useEffect(() => {
    setLoading(true);
    getPlayerCombos(playerId, tournamentId)
      .then((raw) => Promise.all(raw.map(resolveCombo)))
      .then(setCombos)
      .finally(() => setLoading(false));
  }, [playerId, tournamentId]);

  const allChecked = combos.length === 3 && Object.values(states).every((s) => s !== "pending");
  const hasInvalid = Object.values(states).some((s) => s === "invalid");

  useEffect(() => {
    onValidationChange?.(allChecked && !hasInvalid, hasInvalid);
  }, [allChecked, hasInvalid]);

  const missingSlots = ([1, 2, 3] as const).filter((s) => !combos.find((c) => c.slot === s));

  const updateState = (slot: number, s: VerifyState) =>
    setStates((prev) => ({ ...prev, [slot]: s }));

  return (
    <div className="space-y-3">
      <p className="section-title">{playerName}</p>
      {loading ? (
        <p className="text-gray-500 text-xs text-center py-4">Cargando combos...</p>
      ) : missingSlots.length > 0 ? (
        <div className="card p-3 border-red-500/30 bg-red-500/5">
          <p className="text-red-400 text-xs font-gaming">⚠ Combos faltantes: Slot {missingSlots.join(", ")}</p>
        </div>
      ) : (
        <>
          {combos.sort((a, b) => a.slot - b.slot).map((c) => (
            <SlotVerifier key={c.slot} combo={c} state={states[c.slot]} onChange={(s) => updateState(c.slot, s)} />
          ))}
          {allChecked && (
            <div className={`text-center py-2 rounded-lg font-gaming text-xs font-bold border ${
              hasInvalid
                ? "text-red-400 border-red-500/30 bg-red-500/10"
                : "text-green-400 border-green-500/30 bg-green-500/10"
            }`}>
              {hasInvalid ? "✗ COMBO(S) INVÁLIDO(S)" : "✓ TODOS LOS COMBOS VÁLIDOS"}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const ComboVerifier = ({ tournamentId, playerAId, playerAName, playerBId, playerBName, onValidationChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [activePlayer, setActivePlayer] = useState<"A" | "B">("A");
  const [stateA, setStateA] = useState<{ allValid: boolean; hasInvalid: boolean }>({ allValid: false, hasInvalid: false });
  const [stateB, setStateB] = useState<{ allValid: boolean; hasInvalid: boolean }>({ allValid: false, hasInvalid: false });

  useEffect(() => {
    onValidationChange?.(stateA.allValid && stateB.allValid, stateA.hasInvalid || stateB.hasInvalid);
  }, [stateA, stateB]);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
      >
        <span className="section-title mb-0">🔍 Verificar Combos</span>
        <span className="text-gray-500 text-xs font-gaming">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
          <div className="flex gap-2">
            {(["A", "B"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setActivePlayer(p)}
                className={`flex-1 py-2 rounded-lg font-gaming text-xs tracking-wider border transition-all ${
                  activePlayer === p
                    ? p === "A"
                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                      : "bg-amber-500/20 border-amber-500/50 text-amber-300"
                    : "bg-white/5 border-white/10 text-gray-400"
                }`}
              >
                {p === "A" ? playerAName : playerBName}
              </button>
            ))}
          </div>

          {activePlayer === "A" ? (
            <PlayerCombos
              playerId={playerAId} tournamentId={tournamentId} playerName={playerAName}
              onValidationChange={(allValid, hasInvalid) => setStateA({ allValid, hasInvalid })}
            />
          ) : (
            <PlayerCombos
              playerId={playerBId} tournamentId={tournamentId} playerName={playerBName}
              onValidationChange={(allValid, hasInvalid) => setStateB({ allValid, hasInvalid })}
            />
          )}
        </div>
      )}
    </div>
  );
};
