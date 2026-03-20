"use client";
import { useState } from "react";
import type { Match, FinishType } from "@/types";
import { FINISH_TYPES } from "@/types";
import { updateMatchScore, undoLastScore, advanceKnockoutRound } from "@/services/matchService";

interface Props {
  matches: Match[];
  tournamentId?: string;
  editable?: boolean;
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

export const BracketView = ({ matches, tournamentId, editable }: Props) => {
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const handleAdvanceRound = async (phaseMatches: Match[]) => {
    setAdvancing(true);
    try { await advanceKnockoutRound(tournamentId!, phaseMatches); }
    finally { setAdvancing(false); }
  };

  // Sync activeMatch with live data from matches prop
  const liveMatch = activeMatch ? (matches.find((m) => m.id === activeMatch.id) ?? activeMatch) : null;

  const handleScore = async (playerId: string, ft: FinishType) => {
    if (!liveMatch || submitting) return;
    setSubmitting(true);
    try { await updateMatchScore(tournamentId!, liveMatch.id, playerId, ft); }
    finally { setSubmitting(false); }
  };

  const handleUndo = async () => {
    if (!liveMatch || submitting || !liveMatch.history?.length) return;
    setSubmitting(true);
    try { await undoLastScore(tournamentId!, liveMatch.id); }
    finally { setSubmitting(false); }
  };

  const phases = PHASE_ORDER.filter((p) => matches.some((m) => m.phase === p));

  if (phases.length === 0) return (
    <div className="card p-10 text-center">
      <p className="text-4xl mb-3">⚔️</p>
      <p className="text-white font-semibold">Bracket not generated yet</p>
    </div>
  );

  const winner = liveMatch?.isFinished
    ? [liveMatch.playerA, liveMatch.playerB].find((p) => p.id === liveMatch.winnerId)
    : null;

  return (
    <>
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
                            onClick={() => setActiveMatch(m)}
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

      {/* Modal */}
      {liveMatch && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4 py-6">
          <div className="card card-cyan w-full max-w-2xl flex flex-col gap-5 p-6" style={{maxHeight: "90vh", overflowY: "auto"}}>

            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="font-gaming text-sm tracking-widest text-gray-300">{PHASE_LABELS[liveMatch.phase] ?? liveMatch.phase.replace(/_/g, " ")}</p>
              <button onClick={() => setActiveMatch(null)} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
            </div>

            {/* Scoreboard */}
            <div className="flex items-center justify-between gap-4">
              <p className="text-cyan-300 font-semibold text-lg flex-1 text-center truncate">{liveMatch.playerA.name}</p>
              <div className="font-gaming text-5xl font-black flex items-center gap-3 shrink-0">
                <span className="text-cyan-400">{liveMatch.playerAScore}</span>
                <span className="text-gray-500 text-2xl">—</span>
                <span className="text-amber-400">{liveMatch.playerBScore}</span>
              </div>
              <p className="text-amber-300 font-semibold text-lg flex-1 text-center truncate">{liveMatch.playerB.name}</p>
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
              <div className="grid grid-cols-2 gap-4">
                {[liveMatch.playerA, liveMatch.playerB].map((player, idx) => (
                  <div key={player.id} className="space-y-2">
                    <p className={`text-xs font-gaming tracking-widest text-center ${idx === 0 ? "text-cyan-400" : "text-amber-400"}`}>
                      {player.name}
                    </p>
                    {(Object.keys(FINISH_TYPES) as FinishType[]).map((ft) => (
                      <button
                        key={ft}
                        onClick={() => handleScore(player.id, ft)}
                        disabled={submitting}
                        className={`w-full border rounded-xl py-3 text-center transition-all active:scale-95 disabled:opacity-40 ${FINISH_STYLES[ft]}`}
                      >
                        <span className="block font-gaming text-xs tracking-widest opacity-75">{FINISH_TYPES[ft].name}</span>
                        <span className="block font-gaming text-2xl font-black">+{FINISH_TYPES[ft].points}</span>
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

            <button onClick={() => setActiveMatch(null)} className="btn-ghost w-full text-xs py-2">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
