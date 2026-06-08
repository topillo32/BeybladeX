"use client";
import { useState } from "react";
import type { Match, FinishType } from "@/types";
import { FINISH_TYPES } from "@/types";
import { updateMatchScore, undoLastScore, advanceKnockoutRound, lockMatch, unlockMatch, createScoreEventId } from "@/services/matchService";
import { useLockHeartbeat } from "@/hooks/useLockHeartbeat";

interface Props {
  matches: Match[];
  tournamentId?: string;
  editable?: boolean;
  callerUid?: string;
  isAdmin?: boolean;
}

const PHASE_ORDER = ["ROUND_OF_64", "ROUND_OF_32", "ROUND_OF_16", "QUARTERFINAL", "SEMIFINAL", "THIRD_PLACE", "FINAL"];
const PHASE_LABELS: Record<string, string> = {
  ROUND_OF_64:  "Round of 64",
  ROUND_OF_32:  "Round of 32",
  ROUND_OF_16:  "Octavos de Final",
  QUARTERFINAL: "Cuartos de Final",
  SEMIFINAL:    "Semifinal",
  THIRD_PLACE:  "3er y 4to Lugar",
  FINAL:        "Final",
};

// Fases que al completarse generan la siguiente ronda (excluye THIRD_PLACE y FINAL)
const CAN_ADVANCE = ["ROUND_OF_64", "ROUND_OF_32", "ROUND_OF_16", "QUARTERFINAL", "SEMIFINAL"];

const FINISH_STYLES: Record<FinishType, string> = {
  SPIN:   "border-blue-500/30 text-blue-300 bg-blue-500/10 hover:bg-blue-500/20",
  OVER:   "border-purple-500/30 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20",
  BURST:  "border-amber-500/30 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20",
  XTREME: "border-red-500/30 text-red-300 bg-red-500/10 hover:bg-red-500/20",
};

export const BracketView = ({ matches, tournamentId, editable, callerUid, isAdmin = false }: Props) => {
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const handleAdvanceRound = async (phaseMatches: Match[]) => {
    setAdvancing(true);
    try { await advanceKnockoutRound(tournamentId!, phaseMatches); }
    finally { setAdvancing(false); }
  };

  // Sync activeMatch with live data from matches prop
  const liveMatch = activeMatch ? (matches.find((m) => m.id === activeMatch.id) ?? activeMatch) : null;

  useLockHeartbeat(!!liveMatch && !!tournamentId, tournamentId, liveMatch?.id, callerUid, !!isAdmin);

  const handleScore = async (playerId: string, ft: FinishType) => {
    if (!liveMatch || submitting || !callerUid) return;
    setSubmitting(true);
    setModalError(null);
    try {
      await updateMatchScore(tournamentId!, liveMatch.id, playerId, ft, callerUid, !!isAdmin, createScoreEventId());
    } catch (e: any) {
      setModalError(
        e.message === "LOCK_REQUIRED" ? "Cierra y vuelve a abrir la partida."
          : e.message === "LOCK_EXPIRED" ? "El bloqueo expiró. Cierra y abre de nuevo."
          : e.message === "PHASE_LOCKED" ? "Esta fase ya no admite cambios."
          : "Error al anotar."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUndo = async () => {
    if (!liveMatch || submitting || !liveMatch.history?.length || !callerUid) return;
    setSubmitting(true);
    setModalError(null);
    try {
      await undoLastScore(tournamentId!, liveMatch.id, callerUid, !!isAdmin);
    } catch (e: any) {
      setModalError(
        e.message === "LOCK_REQUIRED" ? "Vuelve a abrir la partida para tomar el bloqueo."
          : e.message === "LOCK_EXPIRED" ? "El bloqueo expiró. Cierra y abre de nuevo."
          : "Error al deshacer."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openBracketModal = async (m: Match) => {
    if (!editable || !tournamentId || !callerUid) return;
    setModalError(null);
    setListError(null);
    try {
      await lockMatch(tournamentId, m.id, callerUid, !!isAdmin);
      setActiveMatch(m);
    } catch (e: any) {
      const msg =
        e.message === "LOCKED" ? "Otro juez ya tiene esta partida abierta."
        : e.message === "NOT_JUDGE" ? "No eres el juez asignado (en grupos solo puede anotar el juez del grupo)."
        : "No se pudo abrir la partida.";
      setListError(msg);
    }
  };

  const closeBracketModal = () => {
    if (tournamentId && activeMatch && callerUid) void unlockMatch(tournamentId, activeMatch.id, callerUid);
    setActiveMatch(null);
    setModalError(null);
  };

  const phases = PHASE_ORDER.filter((p) => matches.some((m) => m.phase === p));

  if (phases.length === 0) return (
    <div className="card p-6 text-center">
      <p className="text-4xl mb-3">⚔️</p>
      <p className="text-white font-semibold">Bracket not generated yet</p>
    </div>
  );

  const winner = liveMatch?.isFinished
    ? [liveMatch.playerA, liveMatch.playerB].find((p) => p.id === liveMatch.winnerId)
    : null;

  return (
    <>
      {listError && (
        <div className="mb-3 text-red-400 text-xs text-center font-gaming bg-red-500/10 border border-red-500/30 rounded-lg py-2 px-3">
          ⚠ {listError}
          <button type="button" onClick={() => setListError(null)} className="ml-2 text-red-300 hover:text-white">✕</button>
        </div>
      )}
      {/* Bracket */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max">
          {phases.map((phase) => {
            const phaseMatches = matches
              .filter((m) => m.phase === phase)
              .sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));
            return (
              <div key={phase} className="flex flex-col gap-4 w-72">
                <div className="space-y-1">
                  <p className="section-title text-center">{PHASE_LABELS[phase]}</p>
                  {editable && tournamentId &&
                    CAN_ADVANCE.includes(phase) &&
                    phaseMatches.length > 0 &&
                    phaseMatches.every((m) => m.isFinished) &&
                    !matches.some((m) => m.phase === "FINAL" && phase === "SEMIFINAL") &&
                    !matches.some((m) => m.phase === PHASE_ORDER[PHASE_ORDER.indexOf(phase) + 1] && phase !== "SEMIFINAL") && (
                    <button
                      onClick={() => handleAdvanceRound(phaseMatches)}
                      disabled={advancing}
                      className="btn-primary text-xs font-gaming tracking-wider py-1.5 px-3 w-full"
                    >
                      {advancing ? "..." : "Siguiente ronda →"}
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  {phaseMatches.map((m) => {
                    const w = m.isFinished ? (m.winnerId === m.playerA.id ? m.playerA : m.playerB) : null;
                    return (
                      <div key={m.id} className={`card p-4 space-y-3 ${m.isFinished ? "opacity-80" : "card-cyan"}`}>
                        {[m.playerA, m.playerB].map((p, i) => {
                          const score = i === 0 ? m.playerAScore : m.playerBScore;
                          const isWinner = w?.id === p.id;
                          return (
                            <div key={p.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${isWinner ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-white/3"}`}>
                              <span className={`font-medium truncate ${isWinner ? "text-yellow-300" : "text-gray-300"}`}>{p.name}</span>
                              <span className={`font-gaming font-black text-lg ml-3 shrink-0 ${isWinner ? "text-yellow-400" : "text-gray-500"}`}>{score}</span>
                            </div>
                          );
                        })}
                        {editable && tournamentId ? (
                          <button
                            onClick={() => void openBracketModal(m)}
                            className={`w-full text-sm font-gaming py-2 rounded-lg transition-all border ${
                              m.isFinished
                                ? "text-gray-400 border-white/10 bg-white/3 hover:bg-white/8"
                                : "text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20"
                            }`}
                          >
                            {m.isFinished ? "✏️ Corregir" : "⚔️ Anotar"}
                          </button>
                        ) : !m.isFinished && (
                          <span className="flex items-center justify-center gap-1.5 text-xs font-gaming text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />LIVE
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal — mismo patrón que MatchCard para móvil */}
      {liveMatch && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/85 sm:items-center sm:justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="card card-cyan mt-[env(safe-area-inset-top)] mb-[env(safe-area-inset-bottom)] flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-none rounded-b-2xl shadow-2xl sm:mt-0 sm:mb-0 sm:h-auto sm:max-h-[min(90vh,56rem)] sm:rounded-2xl">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:pt-6">
                <p className="font-gaming text-xs tracking-widest text-gray-300 sm:text-sm">
                  {PHASE_LABELS[liveMatch.phase] ?? liveMatch.phase.replace(/_/g, " ")}
                </p>
                <button
                  type="button"
                  onClick={closeBracketModal}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white touch-manipulation"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain touch-pan-y px-4 pb-6 sm:px-6 sm:pb-6 [scrollbar-gutter:stable]">

            {modalError && (
              <div className="text-red-400 text-xs text-center font-gaming bg-red-500/10 border border-red-500/30 rounded-lg py-2 px-3">
                ⚠ {modalError}
              </div>
            )}

            <div className="sm:hidden space-y-2">
              <div className="flex items-baseline justify-center gap-3 font-gaming font-black">
                <span className="text-4xl tabular-nums text-cyan-400">{liveMatch.playerAScore}</span>
                <span className="text-xl text-gray-500">—</span>
                <span className="text-4xl tabular-nums text-amber-400">{liveMatch.playerBScore}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs font-semibold leading-tight">
                <p className="break-words text-cyan-300">{liveMatch.playerA.name}</p>
                <p className="break-words text-amber-300">{liveMatch.playerB.name}</p>
              </div>
            </div>
            <div className="hidden items-center justify-between gap-3 sm:flex">
              <p className="flex-1 text-center text-lg font-semibold text-cyan-300 truncate">{liveMatch.playerA.name}</p>
              <div className="flex shrink-0 items-center gap-3 font-gaming text-5xl font-black">
                <span className="tabular-nums text-cyan-400">{liveMatch.playerAScore}</span>
                <span className="text-2xl text-gray-500">—</span>
                <span className="tabular-nums text-amber-400">{liveMatch.playerBScore}</span>
              </div>
              <p className="flex-1 text-center text-lg font-semibold text-amber-300 truncate">{liveMatch.playerB.name}</p>
            </div>

            {/* Winner banner */}
            {winner && (
              <div className="text-center py-2 space-y-1">
                <p className="font-gaming text-xs tracking-widest text-yellow-500">MATCH OVER</p>
                <p className="font-gaming text-2xl font-black text-yellow-400">🏆 {winner.name}</p>
              </div>
            )}

            {/* Score buttons — siempre visibles si editable (para corregir) */}
            {!liveMatch.isFinished && (
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {[liveMatch.playerA, liveMatch.playerB].map((player, idx) => (
                  <div key={player.id} className="min-w-0 space-y-1.5 sm:space-y-2">
                    <p className={`line-clamp-2 text-center font-gaming text-[10px] tracking-widest sm:text-xs ${idx === 0 ? "text-cyan-400" : "text-amber-400"}`}>
                      {player.name}
                    </p>
                    {(Object.keys(FINISH_TYPES) as FinishType[]).map((ft) => (
                      <button
                        key={ft}
                        type="button"
                        onClick={() => handleScore(player.id, ft)}
                        disabled={submitting}
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

            {/* Undo + history — disponible siempre que haya historial */}
            {liveMatch.history?.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                  <p className="section-title mb-0 text-xs">Historial</p>
                  <button onClick={handleUndo} disabled={submitting} className="btn-danger text-xs py-1 px-2.5">
                    ↩ Deshacer último
                  </button>
                </div>
                <ul className="divide-y divide-white/5 max-h-48 overflow-y-auto">
                  {[...liveMatch.history].reverse().map((event, i) => {
                    const isA = event.playerId === liveMatch.playerA.id;
                    return (
                      <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className={`font-medium ${isA ? "text-cyan-300" : "text-amber-300"}`}>
                          {isA ? liveMatch.playerA.name : liveMatch.playerB.name}
                        </span>
                        <span className="text-gray-500 text-xs">{event.finishType}</span>
                        <span className="font-gaming text-green-400 font-bold text-xs">+{event.points}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <button type="button" onClick={closeBracketModal} className="btn-ghost w-full touch-manipulation py-3 text-xs sm:py-2">
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
