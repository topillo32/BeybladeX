"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/services/firebase";
import { createMatch, deleteMatch } from "@/services/matchService";
import type { Match, Player } from "@/types";
import Link from "next/link";

interface Props {
  tournamentId: string;
  tournamentName: string;
}

export const MatchManagement = ({ tournamentId, tournamentName }: Props) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerAId, setPlayerAId] = useState("");
  const [playerBId, setPlayerBId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "players"), orderBy("createdAt", "desc")),
      (snap) => setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Player)))
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "tournaments", tournamentId, "matches"), orderBy("createdAt", "desc")),
      (snap) => { setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Match))); setLoading(false); },
      () => { setError("Failed to load matches."); setLoading(false); }
    );
    return () => unsub();
  }, [tournamentId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerAId || !playerBId || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const pA = players.find((p) => p.id === playerAId)!;
      const pB = players.find((p) => p.id === playerBId)!;
      await createMatch(tournamentId, pA, pB);
      setPlayerAId("");
      setPlayerBId("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (matchId: string) => {
    if (!window.confirm("Delete this match?")) return;
    try { await deleteMatch(tournamentId, matchId); } catch (err: any) { setError(err.message); }
  };

  const active = matches.filter((m) => !m.isFinished);
  const finished = matches.filter((m) => m.isFinished);

  return (
    <div className="space-y-4">
      {/* Create match form */}
      <div className="card card-cyan p-5">
        <p className="section-title">New match</p>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cyan-400 font-gaming tracking-widest mb-1.5">Player A</label>
              <select value={playerAId} onChange={(e) => setPlayerAId(e.target.value)} className="input-base text-sm" required>
                <option value="">Select...</option>
                {players.filter((p) => p.id !== playerBId).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-amber-400 font-gaming tracking-widest mb-1.5">Player B</label>
              <select value={playerBId} onChange={(e) => setPlayerBId(e.target.value)} className="input-base text-sm" required>
                <option value="">Select...</option>
                {players.filter((p) => p.id !== playerAId).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" disabled={isSubmitting || !playerAId || !playerBId} className="btn-primary w-full font-gaming text-xs tracking-wider">
            {isSubmitting ? "Creating..." : "Create Match"}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </form>
      </div>

      {/* Matches */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-spin-slow" />
            <div className="absolute inset-1.5 rounded-full border border-purple-400/40 animate-spin-reverse" />
          </div>
        </div>
      ) : matches.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-4xl mb-3">⚔️</p>
          <p className="text-white font-semibold">No matches yet</p>
          <p className="text-gray-300 text-sm mt-1">Select two players above to create the first match</p>
        </div>
      ) : (
        <div className="space-y-4">
          {active.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <p className="section-title mb-0">Active ({active.length})</p>
              </div>
              <ul className="divide-y divide-white/5">
                {active.map((m) => <MatchRow key={m.id} match={m} tournamentId={tournamentId} onDelete={handleDelete} />)}
              </ul>
            </div>
          )}
          {finished.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5">
                <p className="section-title mb-0">Finished ({finished.length})</p>
              </div>
              <ul className="divide-y divide-white/5">
                {finished.map((m) => <MatchRow key={m.id} match={m} tournamentId={tournamentId} onDelete={handleDelete} />)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MatchRow = ({ match: m, tournamentId, onDelete }: { match: Match; tournamentId: string; onDelete: (id: string) => void }) => {
  const winner = m.isFinished ? (m.winnerId === m.playerA.id ? m.playerA.name : m.playerB.name) : null;

  return (
    <li className="px-5 py-4 hover:bg-white/3 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Score */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-cyan-300 font-medium truncate flex-1 text-right">{m.playerA.name}</span>
          <div className="font-gaming font-black text-xl shrink-0 flex items-center gap-1.5">
            <span className="text-cyan-400">{m.playerAScore}</span>
            <span className="text-gray-400 text-sm">—</span>
            <span className="text-amber-400">{m.playerBScore}</span>
          </div>
          <span className="text-amber-300 font-medium truncate flex-1">{m.playerB.name}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          {!m.isFinished && (
            <Link href={`/judge/${tournamentId}/${m.id}`} className="btn-primary text-xs py-1.5 px-3 font-gaming tracking-wider">
              Judge
            </Link>
          )}
          <button onClick={() => onDelete(m.id)} className="btn-danger py-1.5">Delete</button>
        </div>
      </div>

      {winner && (
        <p className="text-xs text-yellow-400 font-gaming tracking-widest mt-2 text-center">
          🏆 {winner} wins
        </p>
      )}
    </li>
  );
};
