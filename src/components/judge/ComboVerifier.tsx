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
  /** Abre el acordeón al montar (útil en modal móvil). */
  defaultExpanded?: boolean;
  /** Menos padding y tipografía más compacta. */
  compact?: boolean;
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
  combo, state, onChange, compact,
}: {
  combo: ResolvedCombo;
  state: VerifyState;
  onChange: (s: VerifyState) => void;
  compact?: boolean;
}) => (
  <div className={`card space-y-2 border transition-colors ${compact ? "p-2.5 sm:p-3" : "p-3"} ${
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
    <div className={`space-y-0.5 ${compact ? "text-xs sm:text-sm" : "text-sm"}`}>
      <p className="break-words font-semibold text-white leading-snug">
        {combo.bladeName}
        {combo.assistBladeName && <span className="text-gray-400"> + {combo.assistBladeName}</span>}
      </p>
      <p className="break-words text-gray-400 text-[11px] sm:text-xs leading-snug">{combo.ratchetName} · {combo.bitName}</p>
    </div>
    <div className={`flex gap-2 pt-1 ${compact ? "gap-1.5" : ""}`}>
      <button
        type="button"
        onClick={() => onChange("valid")}
        className={`flex-1 touch-manipulation rounded-lg font-gaming tracking-wider border transition-all ${
          compact ? "min-h-[44px] py-2 text-[11px] sm:text-xs" : "py-1.5 text-xs"
        } ${
          state === "valid"
            ? "bg-green-500/20 border-green-500/50 text-green-300"
            : "bg-white/5 border-white/10 text-gray-400 hover:border-green-500/30 hover:text-green-400"
        }`}
      >✓ Válido</button>
      <button
        type="button"
        onClick={() => onChange("invalid")}
        className={`flex-1 touch-manipulation rounded-lg font-gaming tracking-wider border transition-all ${
          compact ? "min-h-[44px] py-2 text-[11px] sm:text-xs" : "py-1.5 text-xs"
        } ${
          state === "invalid"
            ? "bg-red-500/20 border-red-500/50 text-red-300"
            : "bg-white/5 border-white/10 text-gray-400 hover:border-red-500/30 hover:text-red-400"
        }`}
      >✗ Inválido</button>
    </div>
  </div>
);

const PlayerCombos = ({
  playerId, tournamentId, playerName, onValidationChange, compact,
}: {
  playerId: string;
  tournamentId: string;
  playerName: string;
  compact?: boolean;
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
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <p className={`font-gaming tracking-wider text-gray-400 ${compact ? "text-[10px] sm:text-xs" : "section-title"}`}>{playerName}</p>
      {loading ? (
        <p className="text-gray-500 text-xs text-center py-4">Cargando combos...</p>
      ) : missingSlots.length > 0 ? (
        <div className="card p-3 border-red-500/30 bg-red-500/5">
          <p className="text-red-400 text-xs font-gaming">⚠ Combos faltantes: Slot {missingSlots.join(", ")}</p>
        </div>
      ) : (
        <>
          {combos.sort((a, b) => a.slot - b.slot).map((c) => (
            <SlotVerifier key={c.slot} combo={c} state={states[c.slot]} compact={compact} onChange={(s) => updateState(c.slot, s)} />
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

export const ComboVerifier = ({
  tournamentId,
  playerAId,
  playerAName,
  playerBId,
  playerBName,
  defaultExpanded = false,
  compact = false,
  onValidationChange,
}: Props) => {
  const [open, setOpen] = useState(defaultExpanded);
  const [activePlayer, setActivePlayer] = useState<"A" | "B">("A");
  const [stateA, setStateA] = useState<{ allValid: boolean; hasInvalid: boolean }>({ allValid: false, hasInvalid: false });
  const [stateB, setStateB] = useState<{ allValid: boolean; hasInvalid: boolean }>({ allValid: false, hasInvalid: false });

  useEffect(() => {
    onValidationChange?.(stateA.allValid && stateB.allValid, stateA.hasInvalid || stateB.hasInvalid);
  }, [stateA, stateB]);

  return (
    <div className={`card overflow-hidden ${compact ? "rounded-xl" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between text-left transition-colors hover:bg-white/5 ${
          compact ? "min-h-[48px] px-3 py-2.5 sm:px-5 sm:py-3 touch-manipulation" : "px-5 py-3"
        }`}
      >
        <span className={`mb-0 font-gaming ${compact ? "text-[11px] tracking-wide sm:text-xs sm:tracking-widest" : "section-title"}`}>
          🔍 Verificar combos
        </span>
        <span className="shrink-0 text-gray-500 font-gaming text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className={`space-y-3 border-t border-white/5 pt-3 sm:space-y-4 sm:pt-4 ${compact ? "px-3 pb-4 sm:px-5 sm:pb-5" : "px-5 pb-5"}`}>
          <div className="flex gap-1.5 sm:gap-2">
            {(["A", "B"] as const).map((p) => (
              <button
                key={p}
                type="button"
                title={p === "A" ? playerAName : playerBName}
                onClick={() => setActivePlayer(p)}
                className={`min-h-[44px] min-w-0 flex-1 touch-manipulation rounded-lg font-gaming tracking-wider border px-1 transition-all sm:py-2 ${
                  compact ? "py-2 text-[10px] leading-tight sm:text-xs" : "py-2 text-xs"
                } ${
                  activePlayer === p
                    ? p === "A"
                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                      : "bg-amber-500/20 border-amber-500/50 text-amber-300"
                    : "bg-white/5 border-white/10 text-gray-400"
                }`}
              >
                <span className="line-clamp-2 break-words">{p === "A" ? playerAName : playerBName}</span>
              </button>
            ))}
          </div>

          {activePlayer === "A" ? (
            <PlayerCombos
              playerId={playerAId} tournamentId={tournamentId} playerName={playerAName} compact={compact}
              onValidationChange={(allValid, hasInvalid) => setStateA({ allValid, hasInvalid })}
            />
          ) : (
            <PlayerCombos
              playerId={playerBId} tournamentId={tournamentId} playerName={playerBName} compact={compact}
              onValidationChange={(allValid, hasInvalid) => setStateB({ allValid, hasInvalid })}
            />
          )}
        </div>
      )}
    </div>
  );
};
