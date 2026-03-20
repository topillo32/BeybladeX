"use client";
import { useState } from "react";
import { updateMatchScore, undoLastScore } from "@/services/matchService";
import type { Match, FinishType } from "@/types";
import { FINISH_TYPES } from "@/types";

interface Props {
  match: Match;
  editable?: boolean;
  onDelete?: (id: string) => void;
  tournamentId: string;
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

export const MatchCard = ({ match: m, editable = false, onDelete, tournamentId, judgeId, callerUid, isAdmin, currentPlayerId }: Props) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const winner = m.isFinished ? (m.winnerId === m.playerA.id ? m.playerA : m.playerB) : null;

  // Can score: editable AND (no judge assigned OR caller is judge OR caller is admin)
  const canScore = editable && (!judgeId || callerUid === judgeId || isAdmin);

  const score = async (playerId: string, ft: FinishType) => {
    if (submitting || m.isFinished || !callerUid) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateMatchScore(tournamentId, m.id, playerId, ft, callerUid, !!isAdmin);
    } catch (e: any) {
      if (e.message === "NOT_JUDGE") setError("Solo el juez asignado puede anotar puntos.");
    } finally {
      setSubmitting(false);
    }
  };

  const undo = async () => {
    if (submitting || !m.history?.length) return;
    setSubmitting(true);
    try { await undoLastScore(tournamentId, m.id); }
    finally { setSubmitting(false); }
  };

  return (
    <div className={`card p-4 space-y-3 transition-all relative ${m.isFinished ? "opacity-70" : "card-cyan"}`}>
      {submitting && (
        <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center z-10">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/60 animate-spin-slow" />
            <div className="absolute inset-1.5 rounded-full border border-purple-400/60 animate-spin-reverse" />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="section-title mb-0 text-xs">{m.phase.replace(/_/g, " ")}</span>
        {m.isFinished
          ? <span className="text-xs font-gaming text-green-400 border border-green-500/30 bg-green-500/10 px-2 py-0.5 rounded-full">FINISHED</span>
          : <span className="flex items-center gap-1.5 text-xs font-gaming text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />LIVE</span>
        }
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className={`flex-1 text-center py-2 rounded-xl ${
          winner?.id === m.playerA.id ? "bg-yellow-500/10 border border-yellow-500/20" :
          m.playerA.id === currentPlayerId ? "bg-cyan-500/10 border border-cyan-500/30" : ""
        }`}>
          <p className={`font-semibold truncate ${m.playerA.id === currentPlayerId ? "text-cyan-300" : "text-white"}`}>{m.playerA.name}</p>
        </div>
        <div className="font-gaming text-4xl font-black flex items-center gap-2 shrink-0">
          <span className="text-cyan-400">{m.playerAScore}</span>
          <span className="text-gray-600 text-xl">—</span>
          <span className="text-amber-400">{m.playerBScore}</span>
        </div>
        <div className={`flex-1 text-center py-2 rounded-xl ${
          winner?.id === m.playerB.id ? "bg-yellow-500/10 border border-yellow-500/20" :
          m.playerB.id === currentPlayerId ? "bg-cyan-500/10 border border-cyan-500/30" : ""
        }`}>
          <p className={`font-semibold truncate ${m.playerB.id === currentPlayerId ? "text-cyan-300" : "text-white"}`}>{m.playerB.name}</p>
        </div>
      </div>

      {winner && (
        <div className="text-center py-1">
          <span className="font-gaming text-xs tracking-widest text-yellow-400">🏆 {winner.name} wins</span>
        </div>
      )}

      {/* Judge lock notice */}
      {editable && !canScore && !m.isFinished && (
        <div className="text-center py-1">
          <span className="text-xs text-gray-500 font-gaming">🔒 Solo el juez puede anotar</span>
        </div>
      )}

      {error && <p className="text-red-400 text-xs text-center font-gaming">{error}</p>}

      {canScore && !m.isFinished && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          {([m.playerA, m.playerB] as const).map((player, idx) => (
            <div key={player.id} className="space-y-1.5">
              <p className={`text-xs font-gaming tracking-widest text-center ${idx === 0 ? "text-cyan-400" : "text-amber-400"}`}>
                {player.name}
              </p>
              {(Object.keys(FINISH_TYPES) as FinishType[]).map((ft) => (
                <button
                  key={ft}
                  onClick={() => score(player.id, ft)}
                  disabled={submitting}
                  className={`w-full border rounded-lg py-2.5 text-center transition-all active:scale-95 disabled:opacity-40 ${FINISH_STYLES[ft]}`}
                >
                  <span className="block font-gaming text-xs tracking-widest opacity-75">{FINISH_TYPES[ft].name}</span>
                  <span className="block font-gaming text-xl font-black">+{FINISH_TYPES[ft].points}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {editable && m.history?.length > 0 && (
        <button onClick={undo} disabled={submitting} className="btn-danger w-full text-xs">
          ↩ Deshacer último punto
        </button>
      )}

      {onDelete && (
        <button onClick={() => onDelete(m.id)} className="btn-danger w-full text-xs mt-1">Delete match</button>
      )}
    </div>
  );
};
