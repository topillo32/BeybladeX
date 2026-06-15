"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { db } from "@/services/firebase";
import { updateMatchScore, undoLastScore, lockMatch, unlockMatch, createScoreEventId } from "@/services/matchService";
import { useLockHeartbeat } from "@/hooks/useLockHeartbeat";
import { useAuthContext } from "@/lib/AuthContext";
import { Match, FINISH_TYPES, Player, FinishType } from "@/types";
// import { ComboVerifier } from "./ComboVerifier";
import { ErrorToast } from "@/components/ui/ErrorToast";

interface Props { tournamentId: string; matchId: string; inline?: boolean; }

const useMatch = (tournamentId: string, matchId: string) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tournamentId || !matchId) { setLoading(false); return; }
    const unsub = onSnapshot(
      doc(db, "tournaments", tournamentId, "matches", matchId),
      (d) => { if (d.exists()) setMatch({ id: d.id, ...d.data() } as Match); else setError(new Error("Partida no encontrada.")); setLoading(false); },
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
      type="button"
      onClick={() => onScore(playerId, finishType)}
      disabled={disabled}
      className={`w-full touch-manipulation rounded-lg border px-1 py-2.5 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 sm:rounded-xl sm:px-2 sm:py-4 ${s.bg} ${s.border} ${s.text}`}
    >
      <span className="block font-gaming text-[10px] tracking-wider opacity-75 sm:text-xs sm:tracking-widest">{name}</span>
      <span className="mt-0.5 block font-gaming text-xl font-black sm:text-3xl">+{points}</span>
    </button>
  );
};

export const JudgeMatchControl = ({ tournamentId, matchId, inline = false }: Props) => {
  const { match, loading, error } = useMatch(tournamentId, matchId);
  const { user, isAdmin } = useAuthContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [lockErr, setLockErr] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hasLock, setHasLock] = useState(false);
  const router = useRouter();
  const uid = user?.uid;

  useLockHeartbeat(hasLock, tournamentId, matchId, uid);

  useEffect(() => {
    if (match?.isFinished) setShowWinnerModal(true);
  }, [match?.isFinished]);

  // Limpiar el lock al salir si lo tomamos
  useEffect(() => {
    return () => {
      if (hasLock && uid && tournamentId && matchId) {
        void unlockMatch(tournamentId, matchId, uid);
      }
    };
  }, [hasLock, uid, tournamentId, matchId]);

  const takeLock = async () => {
    if (!uid || !matchId || !tournamentId) return;
    setIsSubmitting(true);
    setLockErr(null);
    try {
      await lockMatch(tournamentId, matchId, uid, !!isAdmin);
      setHasLock(true);
    } catch (e: any) {
      if (e.message === "LOCKED")
        setLockErr("Esta partida está siendo anotada por otro juez en este momento.");
      else
        setLockErr("No se pudo tomar el enfrentamiento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScore = async (playerId: string, finishType: FinishType) => {
    if (isSubmitting || match?.isFinished || !uid) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await updateMatchScore(tournamentId, matchId, playerId, finishType, uid, !!isAdmin, createScoreEventId());
    } catch (e: any) {
      setActionError(
        e.message === "NOT_JUDGE"     ? "Tu usuario no está asignado como juez de este grupo."
        : e.message === "PHASE_LOCKED" ? "Esta fase ya cerró y no se pueden registrar más puntos."
        : e.message === "LOCK_EXPIRED" ? "El control expiró. Cerrá y volvé a abrir la partida."
        : `No se pudo registrar el punto. Detalle: ${e.message}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndo = async () => {
    if (isSubmitting || !match?.history?.length || !uid) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await undoLastScore(tournamentId, matchId, uid, !!isAdmin);
    } catch (e: any) {
      setActionError(`No se pudo deshacer el último punto. Detalle: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-spin-slow" />
        <div className="absolute inset-2 rounded-full border border-purple-400/40 animate-spin-reverse" />
      </div>
    </div>
  );

  if (error || !match) return (
    <div className="flex items-center justify-center py-10 text-white/40 font-gaming text-sm">
      {error?.message ?? "No se encontró la partida."}
    </div>
  );

  const winner = match.isFinished
    ? [match.playerA, match.playerB].find((p) => p.id === match.winnerId)
    : null;

  const MAX = 4;

  const isLockedByOther = !!(
    match && match.lockedBy && match.lockedBy !== uid &&
    match.lockedAt && (Date.now() - match.lockedAt) < 300_000 // LOCK_TTL_MS
  );

  return (
    <div className={inline ? "space-y-4" : "page-wrapper"}>
      <div className={inline ? "space-y-4" : "page-content"}>

        {!inline && (
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="btn-ghost text-sm py-1.5 px-3">← Volver</button>
            <p className="font-gaming text-xs tracking-widest text-gray-500">{match.phase.replace(/_/g, " ")}</p>
          </div>
        )}

        {/* Aviso si otro juez tiene el lock */}
        {(lockErr || isLockedByOther) && !match.isFinished && (
          <div className="card border-orange-500/30 bg-orange-500/10 p-4 text-center space-y-2">
            <p className="text-3xl">🔒</p>
            <p className="text-orange-400 font-gaming text-sm">ENFRENTAMIENTO EN USO</p>
            <p className="text-orange-300 text-xs">Otro juez está anotando esta partida en este momento.</p>
          </div>
        )}

        {/* Modal ganador */}
        {showWinnerModal && winner && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
            <div className="card card-cyan p-8 text-center space-y-5 max-w-sm w-full" style={{ boxShadow: "0 0 40px rgba(234,179,8,0.2)" }}>
              <p className="font-gaming text-xs tracking-widest text-yellow-500">MATCH OVER</p>
              <p className="font-gaming text-4xl font-black text-yellow-400">🏆</p>
              <p className="font-gaming text-2xl font-black text-white">{winner.name}</p>
              <p className="text-gray-400 text-sm">{match.playerAScore} — {match.playerBScore}</p>
              <div className="flex flex-col gap-2 pt-2">
                <button onClick={() => router.push(`/tournaments/${tournamentId}`)} className="btn-primary font-gaming text-xs tracking-wider py-3">
                  Volver al torneo
                </button>
                <button onClick={() => setShowWinnerModal(false)} className="btn-ghost text-xs py-2">
                  Ver detalles del match
                </button>
              </div>
            </div>
          </div>
        )}

        {actionError && <ErrorToast error={actionError} onClose={() => setActionError(null)} />}

        {/*
        <ComboVerifier
          tournamentId={tournamentId}
          playerAId={match.playerA.id} playerAName={match.playerA.name}
          playerBId={match.playerB.id} playerBName={match.playerB.name}
          defaultExpanded compact
        />
        */}

        {/* Scoreboard */}
        <div className="card card-cyan p-4 sm:p-6">
          <p className="section-title mb-3 text-center sm:mb-4">Scoreboard</p>
          <div className="sm:hidden space-y-2">
            <div className="flex items-baseline justify-center gap-3 font-gaming font-black">
              <span className="text-4xl tabular-nums text-cyan-400">{match.playerAScore}</span>
              <span className="text-xl text-gray-400">—</span>
              <span className="text-4xl tabular-nums text-amber-400">{match.playerBScore}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs font-semibold leading-tight">
              <p className="break-words text-cyan-300">{match.playerA.name}</p>
              <p className="break-words text-amber-300">{match.playerB.name}</p>
            </div>
          </div>
          <div className="hidden items-center justify-between gap-4 sm:flex">
            <p className="flex-1 text-center text-lg font-semibold text-cyan-300 truncate">{match.playerA.name}</p>
            <div className="flex shrink-0 items-center gap-3 font-gaming text-5xl font-black">
              <span className="tabular-nums text-cyan-400">{match.playerAScore}</span>
              <span className="text-2xl text-gray-400">—</span>
              <span className="tabular-nums text-amber-400">{match.playerBScore}</span>
            </div>
            <p className="flex-1 text-center text-lg font-semibold text-amber-300 truncate">{match.playerB.name}</p>
          </div>
          <div className="mt-5 space-y-2">
            {[{ score: match.playerAScore, color: "from-cyan-600 to-cyan-400" }, { score: match.playerBScore, color: "from-amber-600 to-amber-400" }].map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-16 text-right font-gaming">{p.score}/{MAX}</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${p.color} rounded-full transition-all duration-500`} style={{ width: `${Math.min((p.score / MAX) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {winner && (
          <div className="card p-6 text-center border-yellow-500/25" style={{ boxShadow: "0 0 24px rgba(234,179,8,0.1)" }}>
            <p className="font-gaming text-xs tracking-widest text-yellow-500 mb-2">MATCH OVER</p>
            <p className="font-gaming text-3xl font-black text-yellow-400 animate-pulse-glow">🏆 {winner.name}</p>
          </div>
        )}

        {!match.isFinished && !(lockErr || isLockedByOther) && !hasLock && !isAdmin && (
          <div className="card p-6 text-center space-y-4">
            <p className="text-gray-300 font-gaming text-sm">Debes tomar el control de la partida para anotar.</p>
            <button
              onClick={takeLock}
              disabled={isSubmitting}
              className="btn-primary py-3 px-6 font-gaming text-sm"
            >
              🔒 Tomar Enfrentamiento
            </button>
          </div>
        )}

        {!match.isFinished && !(lockErr || isLockedByOther) && hasLock && (
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {([match.playerA, match.playerB] as Player[]).map((player, idx) => (
              <div key={player.id} className="min-w-0 space-y-1.5 sm:space-y-2">
                <div className={`line-clamp-2 rounded-lg py-1.5 text-center font-gaming text-[10px] font-bold tracking-widest sm:rounded-xl sm:py-2 sm:text-xs ${idx === 0 ? "text-cyan-400 bg-cyan-500/8" : "text-amber-400 bg-amber-500/8"}`}>
                  {player.name}
                </div>
                {(Object.keys(FINISH_TYPES) as FinishType[]).map((key) => (
                  <ScoreButton key={key} finishType={key} playerId={player.id} onScore={handleScore} disabled={isSubmitting} />
                ))}
              </div>
            ))}
          </div>
        )}

        {match.history?.length > 0 && !(lockErr || isLockedByOther) && (hasLock || isAdmin) && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <p className="section-title mb-0">Historial</p>
              <button onClick={handleUndo} disabled={isSubmitting} className="btn-danger text-xs py-1 px-3">
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

