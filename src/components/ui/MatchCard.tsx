"use client";
import { useState } from "react";
import {
  updateMatchScore,
  undoLastScore,
  lockMatch,
  unlockMatch,
  createScoreEventId,
  LOCK_TTL_MS,
} from "@/services/matchService";
import { useLockHeartbeat } from "@/hooks/useLockHeartbeat";
import type { Match, FinishType } from "@/types";
import { FINISH_TYPES } from "@/types";
import { ComboVerifier } from "@/components/judge/ComboVerifier";

interface Props {
  match: Match;
  editable?: boolean;
  onDelete?: (id: string) => void;
  tournamentId: string;
  tournamentStatus?: string;
  allMatches?: Match[];
  judgeId?: string;
  callerUid?: string;
  isAdmin?: boolean;
  currentPlayerId?: string;
}

const FINISH_STYLES: Record<FinishType, string> = {
  SPIN:   "border-blue-500/30 text-blue-300 bg-blue-500/10 hover:bg-blue-500/20",
  OVER:   "border-purple-500/30 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20",
  BURST:  "border-amber-500/30 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20",
  XTREME: "border-red-500/30 text-red-300 bg-red-500/10 hover:bg-red-500/20",
};

export const MatchCard = ({ match: m, editable = false, onDelete, tournamentId, tournamentStatus, allMatches = [], judgeId, callerUid, isAdmin, currentPlayerId }: Props) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comboValidation, setComboValidation] = useState<{ allValid: boolean; hasInvalid: boolean }>({ allValid: false, hasInvalid: false });

  useLockHeartbeat(open, tournamentId, m.id, callerUid, !!isAdmin);

  const winner = m.isFinished ? (m.winnerId === m.playerA.id ? m.playerA : m.playerB) : null;
  const canScore = editable && (!judgeId || callerUid === judgeId || isAdmin);

  const PHASE_ORDER = ["GROUP","ROUND_OF_128","ROUND_OF_64","ROUND_OF_32","ROUND_OF_16","QUARTERFINAL","SEMIFINAL","THIRD_PLACE","FINAL"];
  const currentIdx = PHASE_ORDER.indexOf(m.phase);
  const hasLaterPhase = allMatches.some((x) => PHASE_ORDER.indexOf(x.phase) > currentIdx);

  const phaseLocked =
    tournamentStatus === "FINISHED" ||
    (m.phase === "GROUP" && tournamentStatus !== "GROUP_STAGE") ||
    hasLaterPhase;

  // Lock activo de otro usuario
  const isLockedByOther = !!(
    m.lockedBy && m.lockedBy !== callerUid &&
    m.lockedAt && (Date.now() - m.lockedAt) < LOCK_TTL_MS
  );

  const openModal = async () => {
    if (phaseLocked || !callerUid) return;
    try {
      await lockMatch(tournamentId, m.id, callerUid, !!isAdmin);
      setOpen(true);
      setError(null);
    } catch (e: any) {
      if (e.message === "LOCKED") setError("Otro juez ya tiene esta partida abierta. Espera a que la cierre.");
      else if (e.message === "NOT_JUDGE") setError("No eres el juez asignado a este grupo.");
      else setError("No se pudo abrir la partida.");
    }
  };

  const closeModal = () => {
    setOpen(false);
    setError(null);
    if (callerUid) void unlockMatch(tournamentId, m.id, callerUid);
  };

  const score = async (playerId: string, ft: FinishType) => {
    if (submitting || m.isFinished || !callerUid) return;
    if (comboValidation.hasInvalid) { setError("Hay combos inválidos. Resuelve la verificación antes de anotar."); return; }
    setSubmitting(true);
    setError(null);
    try {
      await updateMatchScore(tournamentId, m.id, playerId, ft, callerUid, !!isAdmin, createScoreEventId());
    } catch (e: any) {
      setError(
        e.message === "NOT_JUDGE"    ? "Solo el juez asignado puede anotar puntos."
        : e.message === "PHASE_LOCKED" ? "Esta fase ya cerró y no se puede modificar."
        : e.message === "LOCKED"       ? "Otro juez está anotando en este momento."
        : e.message === "LOCK_REQUIRED" ? "Abre la partida (botón Anotar) para tomar el bloqueo antes de anotar."
        : e.message === "LOCK_EXPIRED" ? "El bloqueo expiró. Cierra y vuelve a abrir."
        : e.message === "AUTH_REQUIRED" ? "Sesión no válida."
        : "Error al anotar. Intenta de nuevo."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const undo = async () => {
    if (submitting || !m.history?.length) return;
    setSubmitting(true);
    setError(null);
    try {
      await undoLastScore(tournamentId, m.id, callerUid, !!isAdmin);
    } catch (e: any) {
      setError(
        e.message === "LOCK_REQUIRED" ? "Vuelve a abrir la partida para tomar el bloqueo."
          : e.message === "LOCK_EXPIRED" ? "El bloqueo expiró. Cierra y abre de nuevo."
          : "Error al deshacer. Intenta de nuevo."
      );
    }
    finally { setSubmitting(false); }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (!confirm("¿Eliminar esta partida? Esta acción no se puede deshacer.")) return;
    onDelete(m.id);
  };

  return (
    <>
      {/* ── Compact card ── */}
      <div className={`card p-4 space-y-3 transition-all ${m.isFinished ? "opacity-70" : "card-cyan"}`}>
        <div className="flex items-center justify-between">
          <span className="section-title mb-0 text-xs">{m.phase.replace(/_/g, " ")}</span>
          <div className="flex items-center gap-2">
            {isLockedByOther && !m.isFinished && (
              <span className="text-xs font-gaming text-orange-400 border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 rounded-full">🔒 En uso</span>
            )}
            {m.isFinished
              ? <span className="text-xs font-gaming text-green-400 border border-green-500/30 bg-green-500/10 px-2 py-0.5 rounded-full">FINISHED</span>
              : <span className="flex items-center gap-1.5 text-xs font-gaming text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />LIVE</span>
            }
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className={`flex-1 text-center py-2 rounded-xl ${
            winner?.id === m.playerA.id ? "bg-yellow-500/10 border border-yellow-500/20" :
            m.playerA.id === currentPlayerId ? "bg-cyan-500/10 border border-cyan-500/30" : ""
          }`}>
            <p className={`font-semibold truncate text-sm ${m.playerA.id === currentPlayerId ? "text-cyan-300" : "text-white"}`}>{m.playerA.name}</p>
          </div>
          <div className="font-gaming text-3xl font-black flex items-center gap-2 shrink-0">
            <span className="text-cyan-400">{m.playerAScore}</span>
            <span className="text-gray-600 text-lg">—</span>
            <span className="text-amber-400">{m.playerBScore}</span>
          </div>
          <div className={`flex-1 text-center py-2 rounded-xl ${
            winner?.id === m.playerB.id ? "bg-yellow-500/10 border border-yellow-500/20" :
            m.playerB.id === currentPlayerId ? "bg-cyan-500/10 border border-cyan-500/30" : ""
          }`}>
            <p className={`font-semibold truncate text-sm ${m.playerB.id === currentPlayerId ? "text-cyan-300" : "text-white"}`}>{m.playerB.name}</p>
          </div>
        </div>

        {winner && <p className="text-center font-gaming text-xs tracking-widest text-yellow-400">🏆 {winner.name} wins</p>}

        {error && <p className="text-red-400 text-xs text-center font-gaming">{error}</p>}

        <div className="flex gap-2">
          {editable && (
            <button onClick={openModal} disabled={phaseLocked || isLockedByOther}
              className={`flex-1 text-xs font-gaming py-2 rounded-lg transition-all border ${
                phaseLocked
                  ? "text-gray-600 border-white/5 bg-white/2 cursor-not-allowed"
                  : isLockedByOther
                  ? "text-orange-400 border-orange-500/30 bg-orange-500/10 cursor-not-allowed"
                  : m.isFinished
                  ? "text-gray-400 border-white/10 bg-white/3 hover:bg-white/8"
                  : canScore
                  ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20"
                  : "text-gray-500 border-white/10 bg-white/3"
              }`}>
              {phaseLocked ? "🔒 Cerrado" : isLockedByOther ? "🔒 En uso" : m.isFinished ? "✏️ Corregir" : canScore ? "⚔️ Anotar" : "👁 Ver"}
            </button>
          )}
          {onDelete && <button onClick={handleDelete} className="btn-danger text-xs py-2 px-3">✕</button>}
        </div>
      </div>

      {/* ── Modal — móvil: panel a altura completa + scroll interno (evita recortes) ── */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/85 sm:items-center sm:justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="match-modal-title"
        >
          <div className="card card-cyan mt-[env(safe-area-inset-top)] mb-[env(safe-area-inset-bottom)] flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-none rounded-b-2xl shadow-2xl sm:mt-0 sm:mb-0 sm:h-auto sm:max-h-[min(90vh,56rem)] sm:rounded-2xl">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:pt-6">
                <p id="match-modal-title" className="font-gaming text-xs tracking-widest text-gray-300 sm:text-sm">
                  {m.phase.replace(/_/g, " ")}
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white touch-manipulation"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y px-4 pb-6 sm:px-6 sm:pb-6 [scrollbar-gutter:stable] space-y-4">

            {editable && (
              <ComboVerifier
                tournamentId={tournamentId}
                playerAId={m.playerA.id} playerAName={m.playerA.name}
                playerBId={m.playerB.id} playerBName={m.playerB.name}
                defaultExpanded
                compact
                onValidationChange={(allValid, hasInvalid) => setComboValidation({ allValid, hasInvalid })}
              />
            )}

            {comboValidation.hasInvalid && (
              <div className="text-center py-2 rounded-lg font-gaming text-xs font-bold border text-red-400 border-red-500/30 bg-red-500/10">
                ⚠ Combos inválidos — no se puede anotar hasta resolver
              </div>
            )}

            <div className="sm:hidden space-y-2">
              <div className="flex items-baseline justify-center gap-3 font-gaming font-black">
                <span className="text-4xl tabular-nums text-cyan-400">{m.playerAScore}</span>
                <span className="text-xl text-gray-500">—</span>
                <span className="text-4xl tabular-nums text-amber-400">{m.playerBScore}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs font-semibold leading-tight">
                <p className="break-words text-cyan-300">{m.playerA.name}</p>
                <p className="break-words text-amber-300">{m.playerB.name}</p>
              </div>
            </div>
            <div className="hidden items-center justify-between gap-3 sm:flex">
              <p className="flex-1 text-center text-lg font-semibold text-cyan-300 truncate">{m.playerA.name}</p>
              <div className="flex shrink-0 items-center gap-3 font-gaming text-5xl font-black">
                <span className="tabular-nums text-cyan-400">{m.playerAScore}</span>
                <span className="text-2xl text-gray-500">—</span>
                <span className="tabular-nums text-amber-400">{m.playerBScore}</span>
              </div>
              <p className="flex-1 text-center text-lg font-semibold text-amber-300 truncate">{m.playerB.name}</p>
            </div>

            {winner && (
              <div className="text-center space-y-1">
                <p className="font-gaming text-xs tracking-widest text-yellow-500">MATCH OVER</p>
                <p className="font-gaming text-2xl font-black text-yellow-400">🏆 {winner.name}</p>
              </div>
            )}

            {error && (
              <div className="text-red-400 text-xs text-center font-gaming bg-red-500/10 border border-red-500/30 rounded-lg py-2 px-3">
                ⚠ {error}
              </div>
            )}

            {canScore && !m.isFinished && !phaseLocked && (
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {([m.playerA, m.playerB] as const).map((player, idx) => (
                  <div key={player.id} className="min-w-0 space-y-1.5 sm:space-y-2">
                    <p className={`line-clamp-2 text-center font-gaming text-[10px] tracking-widest sm:text-xs ${idx === 0 ? "text-cyan-400" : "text-amber-400"}`}>
                      {player.name}
                    </p>
                    {(Object.keys(FINISH_TYPES) as FinishType[]).map((ft) => (
                      <button
                        key={ft}
                        type="button"
                        onClick={() => score(player.id, ft)}
                        disabled={submitting || comboValidation.hasInvalid}
                        className={`w-full touch-manipulation rounded-lg border py-2 text-center transition-all active:scale-[0.98] disabled:opacity-40 sm:rounded-xl sm:py-3 ${FINISH_STYLES[ft]}`}
                      >
                        <span className="block font-gaming text-[10px] tracking-wider opacity-75 sm:text-xs sm:tracking-widest leading-tight">{FINISH_TYPES[ft].name}</span>
                        <span className="block font-gaming text-lg font-black sm:text-2xl">+{FINISH_TYPES[ft].points}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {!canScore && !m.isFinished && editable && (
              <p className="text-center text-xs text-gray-500 font-gaming">🔒 Solo el juez puede anotar</p>
            )}

            {m.history?.length > 0 && (
              <div className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-3 py-2 sm:px-4 sm:py-2.5">
                  <p className="section-title mb-0 text-xs">Historial</p>
                  {editable && !phaseLocked && (
                    <button type="button" onClick={undo} disabled={submitting} className="btn-danger touch-manipulation py-1.5 px-2 text-[10px] sm:text-xs">
                      ↩ Deshacer
                    </button>
                  )}
                </div>
                <ul className="max-h-36 divide-y divide-white/5 overflow-y-auto sm:max-h-48">
                  {[...m.history].reverse().map((event, i) => {
                    const isA = event.playerId === m.playerA.id;
                    return (
                      <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className={`font-medium ${isA ? "text-cyan-300" : "text-amber-300"}`}>
                          {isA ? m.playerA.name : m.playerB.name}
                        </span>
                        <span className="text-gray-500 text-xs">{event.finishType}</span>
                        <span className="font-gaming text-green-400 font-bold text-xs">+{event.points}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <button type="button" onClick={closeModal} className="btn-ghost w-full touch-manipulation py-3 text-xs sm:py-2">
              Cerrar
            </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
