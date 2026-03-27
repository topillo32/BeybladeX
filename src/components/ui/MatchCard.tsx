"use client";
import { useState } from "react";
import { updateMatchScore, undoLastScore } from "@/services/matchService";
import type { Match, FinishType } from "@/types";
import { FINISH_TYPES } from "@/types";
import { ComboVerifier } from "@/components/judge/ComboVerifier";

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
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comboValidation, setComboValidation] = useState<{ allValid: boolean; hasInvalid: boolean }>({ allValid: false, hasInvalid: false });

  const winner = m.isFinished ? (m.winnerId === m.playerA.id ? m.playerA : m.playerB) : null;
  const canScore = editable && (!judgeId || callerUid === judgeId || isAdmin);

  const score = async (playerId: string, ft: FinishType) => {
    if (submitting || m.isFinished || !callerUid) return;
    if (comboValidation.hasInvalid) {
      setError("Hay combos inválidos. Resuelve la verificación antes de anotar.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateMatchScore(tournamentId, m.id, playerId, ft, callerUid, !!isAdmin);
    } catch (e: any) {
      setError(e.message === "NOT_JUDGE" ? "Solo el juez asignado puede anotar puntos." : "Error al anotar. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const undo = async () => {
    if (submitting || !m.history?.length) return;
    setSubmitting(true);
    setError(null);
    try { await undoLastScore(tournamentId, m.id); }
    catch { setError("Error al deshacer. Intenta de nuevo."); }
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

        {winner && (
          <p className="text-center font-gaming text-xs tracking-widest text-yellow-400">🏆 {winner.name} wins</p>
        )}

        <div className="flex gap-2">
          {editable && (
            <button
              onClick={() => setOpen(true)}
              className={`flex-1 text-xs font-gaming py-2 rounded-lg transition-all border ${
                m.isFinished
                  ? "text-gray-400 border-white/10 bg-white/3 hover:bg-white/8"
                  : canScore
                  ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20"
                  : "text-gray-500 border-white/10 bg-white/3"
              }`}
            >
              {m.isFinished ? "✏️ Corregir" : canScore ? "⚔️ Anotar" : "👁 Ver"}
            </button>
          )}
          {onDelete && (
            <button onClick={handleDelete} className="btn-danger text-xs py-2 px-3">✕</button>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {open && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4 py-6">
          <div className="card card-cyan w-full max-w-2xl flex flex-col gap-5 p-6" style={{ maxHeight: "90vh", overflowY: "auto" }}>

            <div className="flex items-center justify-between">
              <p className="font-gaming text-sm tracking-widest text-gray-300">{m.phase.replace(/_/g, " ")}</p>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
            </div>

            {editable && (
              <ComboVerifier
                tournamentId={tournamentId}
                playerAId={m.playerA.id}
                playerAName={m.playerA.name}
                playerBId={m.playerB.id}
                playerBName={m.playerB.name}
                onValidationChange={(allValid, hasInvalid) => setComboValidation({ allValid, hasInvalid })}
              />
            )}

            {comboValidation.hasInvalid && (
              <div className="text-center py-2 rounded-lg font-gaming text-xs font-bold border text-red-400 border-red-500/30 bg-red-500/10">
                ⚠ Combos inválidos — no se puede anotar hasta resolver
              </div>
            )}

            {/* Scoreboard */}
            <div className="flex items-center justify-between gap-4">
              <p className="text-cyan-300 font-semibold text-lg flex-1 text-center truncate">{m.playerA.name}</p>
              <div className="font-gaming text-5xl font-black flex items-center gap-3 shrink-0">
                <span className="text-cyan-400">{m.playerAScore}</span>
                <span className="text-gray-500 text-2xl">—</span>
                <span className="text-amber-400">{m.playerBScore}</span>
              </div>
              <p className="text-amber-300 font-semibold text-lg flex-1 text-center truncate">{m.playerB.name}</p>
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

            {canScore && !m.isFinished && (
              <div className="grid grid-cols-2 gap-4">
                {([m.playerA, m.playerB] as const).map((player, idx) => (
                  <div key={player.id} className="space-y-2">
                    <p className={`text-xs font-gaming tracking-widest text-center ${idx === 0 ? "text-cyan-400" : "text-amber-400"}`}>
                      {player.name}
                    </p>
                    {(Object.keys(FINISH_TYPES) as FinishType[]).map((ft) => (
                      <button
                        key={ft}
                        onClick={() => score(player.id, ft)}
                        disabled={submitting || comboValidation.hasInvalid}
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

            {!canScore && !m.isFinished && editable && (
              <p className="text-center text-xs text-gray-500 font-gaming">🔒 Solo el juez puede anotar</p>
            )}

            {m.history?.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                  <p className="section-title mb-0 text-xs">Historial</p>
                  {editable && (
                    <button onClick={undo} disabled={submitting} className="btn-danger text-xs py-1 px-2.5">
                      ↩ Deshacer último
                    </button>
                  )}
                </div>
                <ul className="divide-y divide-white/5 max-h-48 overflow-y-auto">
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

            <button onClick={() => setOpen(false)} className="btn-ghost w-full text-xs py-2">Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
};
