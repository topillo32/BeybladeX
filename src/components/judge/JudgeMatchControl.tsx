"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { db } from "@/services/firebase";
import { updateMatchScore, undoLastScore } from "@/services/matchService";
import { Match, FINISH_TYPES, Player, FinishType } from "@/types";

interface Props { tournamentId: string; matchId: string; }

const useMatch = (tournamentId: string, matchId: string) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tournamentId || !matchId) { setLoading(false); return; }
    const unsub = onSnapshot(
      doc(db, "tournaments", tournamentId, "matches", matchId),
      (d) => { if (d.exists()) setMatch({ id: d.id, ...d.data() } as Match); else setError(new Error("Match not found.")); setLoading(false); },
      (err) => { setError(err); setLoading(false); }
    );
    return () => unsub();
  }, [tournamentId, matchId]);

  return { match, loading, error };
};

const FINISH_STYLES: Record<FinishType, { border: string; text: string; bg: string }> = {
  SPIN:   { border: "border-blue-500/30",   text: "text-blue-300",   bg: "bg-blue-500/10 hover:bg-blue-500/20" },
  OVER:   { border: "border-purple-500/30", text: "text-purple-300", bg: "bg-purple-500/10 hover:bg-purple-500/20" },
  BURST:  { border: "border-amber-500/30",  text: "text-amber-300",  bg: "bg-amber-500/10 hover:bg-amber-500/20" },
  XTREME: { border: "border-red-500/30",    text: "text-red-300",    bg: "bg-red-500/10 hover:bg-red-500/20" },
};

const ScoreButton = ({ finishType, playerId, onScore, disabled }: {
  finishType: FinishType; playerId: string;
  onScore: (id: string, ft: FinishType) => void; disabled: boolean;
}) => {
  const { name, points } = FINISH_TYPES[finishType];
  const s = FINISH_STYLES[finishType];
  return (
    <button
      onClick={() => onScore(playerId, finishType)}
      disabled={disabled}
      className={`w-full border rounded-xl py-4 px-2 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${s.bg} ${s.border} ${s.text}`}
    >
      <span className="block font-gaming text-xs tracking-widest opacity-75">{name}</span>
      <span className="block font-gaming text-3xl font-black mt-0.5">+{points}</span>
    </button>
  );
};

export const JudgeMatchControl = ({ tournamentId, matchId }: Props) => {
  const { match, loading, error } = useMatch(tournamentId, matchId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const router = useRouter();

  // Mostrar modal cuando el match termina
  useEffect(() => {
    if (match?.isFinished) setShowWinnerModal(true);
  }, [match?.isFinished]);

  const handleScore = async (playerId: string, finishType: FinishType) => {
    if (isSubmitting || match?.isFinished) return;
    setIsSubmitting(true);
    try { await updateMatchScore(tournamentId, matchId, playerId, finishType); }
    catch (err) { console.error(err); }
    finally { setIsSubmitting(false); }
  };

  const handleUndo = async () => {
    if (isSubmitting || !match?.history?.length) return;
    setIsSubmitting(true);
    try { await undoLastScore(tournamentId, matchId); }
    catch (err) { console.error(err); }
    finally { setIsSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-spin-slow" />
        <div className="absolute inset-2 rounded-full border border-purple-400/40 animate-spin-reverse" />
      </div>
    </div>
  );

  if (error || !match) return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center text-red-400 font-gaming text-sm">
      {error?.message ?? "No match data."}
    </div>
  );

  const winner = match.isFinished
    ? [match.playerA, match.playerB].find((p) => p.id === match.winnerId)
    : null;

  const MAX = 4;

  return (
    <div className="page-wrapper">
      <div className="page-content">

        {/* Header con botón volver */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="btn-ghost text-sm py-1.5 px-3"
          >
            ← Volver
          </button>
          <p className="font-gaming text-xs tracking-widest text-gray-500">{match.phase.replace(/_/g, " ")}</p>
        </div>

        {/* Modal ganador */}
        {showWinnerModal && winner && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
            <div className="card card-cyan p-8 text-center space-y-5 max-w-sm w-full" style={{ boxShadow: "0 0 40px rgba(234,179,8,0.2)" }}>
              <p className="font-gaming text-xs tracking-widest text-yellow-500">MATCH OVER</p>
              <p className="font-gaming text-4xl font-black text-yellow-400">🏆</p>
              <p className="font-gaming text-2xl font-black text-white">{winner.name}</p>
              <p className="text-gray-400 text-sm">{match.playerAScore} — {match.playerBScore}</p>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => router.push(`/tournaments/${tournamentId}`)}
                  className="btn-primary font-gaming text-xs tracking-wider py-3"
                >
                  Volver al torneo
                </button>
                <button
                  onClick={() => setShowWinnerModal(false)}
                  className="btn-ghost text-xs py-2"
                >
                  Ver detalles del match
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scoreboard */}
        <div className="card card-cyan p-6">
          <p className="section-title text-center mb-4">Scoreboard</p>

          {/* Names + score */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-cyan-300 font-semibold text-lg flex-1 text-center truncate">{match.playerA.name}</p>
            <div className="font-gaming text-5xl font-black flex items-center gap-3 shrink-0">
              <span className="text-cyan-400">{match.playerAScore}</span>
              <span className="text-gray-400 text-2xl">—</span>
              <span className="text-amber-400">{match.playerBScore}</span>
            </div>
            <p className="text-amber-300 font-semibold text-lg flex-1 text-center truncate">{match.playerB.name}</p>
          </div>

          {/* Progress bars */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-16 text-right font-gaming">{match.playerAScore}/{MAX}</span>
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-500" style={{ width: `${Math.min((match.playerAScore / MAX) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-16 text-right font-gaming">{match.playerBScore}/{MAX}</span>
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500" style={{ width: `${Math.min((match.playerBScore / MAX) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Winner */}
        {winner && (
          <div className="card p-6 text-center border-yellow-500/25" style={{ boxShadow: "0 0 24px rgba(234,179,8,0.1)" }}>
            <p className="font-gaming text-xs tracking-widest text-yellow-500 mb-2">MATCH OVER</p>
            <p className="font-gaming text-3xl font-black text-yellow-400 animate-pulse-glow">🏆 {winner.name}</p>
          </div>
        )}

        {/* Controls */}
        {!match.isFinished && (
          <div className="grid grid-cols-2 gap-4">
            {([match.playerA, match.playerB] as Player[]).map((player, idx) => (
              <div key={player.id} className="space-y-2">
                <div className={`text-center py-2 rounded-xl font-gaming text-xs tracking-widest font-bold ${idx === 0 ? "text-cyan-400 bg-cyan-500/8" : "text-amber-400 bg-amber-500/8"}`}>
                  {player.name}
                </div>
                {(Object.keys(FINISH_TYPES) as FinishType[]).map((key) => (
                  <ScoreButton key={key} finishType={key} playerId={player.id} onScore={handleScore} disabled={isSubmitting} />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* History */}
        {match.history?.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <p className="section-title mb-0">History</p>
              <button
                onClick={handleUndo}
                disabled={isSubmitting}
                className="btn-danger text-xs py-1 px-3"
              >
                ↩ Deshacer último
              </button>
            </div>
            <ul className="divide-y divide-white/5 max-h-52 overflow-y-auto">
              {[...match.history].reverse().map((event, i) => {
                const isA = event.playerId === match.playerA.id;
                return (
                  <li key={i} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <span className={`font-medium ${isA ? "text-cyan-300" : "text-amber-300"}`}>
                      {isA ? match.playerA.name : match.playerB.name}
                    </span>
                    <span className="text-gray-400 text-xs">{event.finishType}</span>
                    <span className="font-gaming text-green-400 font-bold text-xs">+{event.points}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
