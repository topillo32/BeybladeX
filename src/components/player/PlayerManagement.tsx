"use client";

import { useState, useEffect, FormEvent } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/services/firebase";
import { createPlayer, updatePlayer, deletePlayer } from "@/services/playerService";
import type { Player } from "@/types";

interface PlayerWithId extends Player { id: string; }

const AVATAR_COLORS = [
  "from-cyan-500 to-blue-600",
  "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-red-500 to-rose-600",
  "from-indigo-500 to-violet-600",
];

export const PlayerManagement = () => {
  const [players, setPlayers] = useState<PlayerWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [editingPlayer, setEditingPlayer] = useState<PlayerWithId | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "players"), orderBy("createdAt", "desc")),
      (snap) => { setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlayerWithId))); setLoading(false); },
      () => { setError("Failed to load players."); setLoading(false); }
    );
    return () => unsub();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      editingPlayer ? await updatePlayer(editingPlayer.id, name.trim()) : await createPlayer(name.trim());
      setName("");
      setEditingPlayer(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (p: PlayerWithId) => { setEditingPlayer(p); setName(p.name); };
  const handleCancel = () => { setEditingPlayer(null); setName(""); setError(null); };
  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this player?")) return;
    try { await deletePlayer(id); } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="page-wrapper">
      <div className="page-content">

        {/* Page header */}
        <div className="text-center pb-2">
          <h1 className="font-gaming text-3xl font-black tracking-widest text-white">Players</h1>
          <p className="text-gray-300 text-sm mt-1">Register the bladers competing in your tournaments</p>
          <div className="divider-cyan mt-3" style={{ background: "linear-gradient(to right, transparent, rgba(168,85,247,0.4), transparent)" }} />
        </div>

        {/* Form */}
        <div className={`card p-5 ${editingPlayer ? "card-cyan" : "card-purple"} animate-fade-in`}>
          <p className="section-title">{editingPlayer ? `Editing — ${editingPlayer.name}` : "Add new player"}</p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Player name..."
              className="input-base"
              autoFocus={!!editingPlayer}
              required
            />
            <button type="submit" disabled={isSubmitting} className="btn-primary font-gaming text-xs tracking-wider">
              {isSubmitting ? "..." : editingPlayer ? "Save" : "Add"}
            </button>
            {editingPlayer && (
              <button type="button" onClick={handleCancel} className="btn-ghost text-sm">
                Cancel
              </button>
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
        ) : players.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-4xl mb-3">👤</p>
            <p className="text-white font-semibold">No players yet</p>
            <p className="text-gray-300 text-sm mt-1">Add your first blader using the form above</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <p className="section-title mb-0">{players.length} blader{players.length !== 1 ? "s" : ""} registered</p>
            </div>
            <ul className="divide-y divide-white/5">
              {players.map((player, i) => {
                const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                const initials = player.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                const isEditing = editingPlayer?.id === player.id;
                return (
                  <li key={player.id} className={`flex items-center justify-between px-5 py-3.5 transition-colors ${isEditing ? "bg-cyan-500/5" : "hover:bg-white/3"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center font-gaming font-bold text-white text-xs shrink-0`}>
                        {initials}
                      </div>
                      <div>
                        <p className="font-medium text-white leading-tight">{player.name}</p>
                        <p className="text-gray-400 text-xs font-gaming tracking-widest">#{String(players.length - i).padStart(3, "0")}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleEdit(player)} className="btn-warning">Edit</button>
                      <button onClick={() => handleDelete(player.id)} className="btn-danger">Remove</button>
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
