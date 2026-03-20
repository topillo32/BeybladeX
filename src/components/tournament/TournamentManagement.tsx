"use client";

import { useState, useEffect, FormEvent } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/services/firebase";
import { createTournament, updateTournament, deleteTournament } from "@/services/tournamentService";
import type { Tournament } from "@/types";
import Link from "next/link";

export const TournamentManagement = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Tournament | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "tournaments"), orderBy("createdAt", "desc")),
      (snap) => { setTournaments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament))); setLoading(false); },
      () => { setError("Failed to load tournaments."); setLoading(false); }
    );
    return () => unsub();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      editing ? await updateTournament(editing.id, { name: name.trim() }) : await createTournament({ name: name.trim(), maxPlayers: 16, playersPerGroup: 4, eventType: "tournament" }, "admin");
      setName("");
      setEditing(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (t: Tournament) => { setEditing(t); setName(t.name); };
  const handleCancel = () => { setEditing(null); setName(""); setError(null); };
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this tournament?")) return;
    try { await deleteTournament(id); } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="page-wrapper">
      <div className="page-content">

        {/* Page header */}
        <div className="text-center pb-2">
          <h1 className="font-gaming text-3xl font-black tracking-widest text-white">Tournaments</h1>
          <p className="text-gray-300 text-sm mt-1">Create events, set up groups and run matches</p>
          <div className="divider-cyan mt-3" />
        </div>

        {/* Form */}
        <div className={`card card-cyan p-5 animate-fade-in`}>
          <p className="section-title">{editing ? `Editing — ${editing.name}` : "Create new tournament"}</p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tournament name..."
              className="input-base"
              autoFocus={!!editing}
              required
            />
            <button type="submit" disabled={isSubmitting} className="btn-primary font-gaming text-xs tracking-wider">
              {isSubmitting ? "..." : editing ? "Save" : "Create"}
            </button>
            {editing && (
              <button type="button" onClick={handleCancel} className="btn-ghost text-sm">Cancel</button>
            )}
          </form>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-spin-slow" />
              <div className="absolute inset-1.5 rounded-full border border-purple-400/40 animate-spin-reverse" />
            </div>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-4xl mb-3">🏆</p>
            <p className="text-white font-semibold">No tournaments yet</p>
            <p className="text-gray-300 text-sm mt-1">Create your first tournament using the form above</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5">
              <p className="section-title mb-0">{tournaments.length} tournament{tournaments.length !== 1 ? "s" : ""}</p>
            </div>
            <ul className="divide-y divide-white/5">
              {tournaments.map((t, i) => {
                const isEditing = editing?.id === t.id;
                return (
                  <li key={t.id} className={`flex items-center justify-between px-5 py-4 transition-colors ${isEditing ? "bg-cyan-500/5" : "hover:bg-white/3"}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center font-gaming text-cyan-400 text-xs font-bold shrink-0">
                        {String(tournaments.length - i).padStart(2, "0")}
                      </div>
                      <Link href={`/tournaments/${t.id}`} className="font-semibold text-white hover:text-cyan-400 transition-colors truncate">
                        {t.name}
                      </Link>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-3">
                      <button onClick={() => handleEdit(t)} className="btn-warning">Edit</button>
                      <button onClick={() => handleDelete(t.id)} className="btn-danger">Delete</button>
                    </div>
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
