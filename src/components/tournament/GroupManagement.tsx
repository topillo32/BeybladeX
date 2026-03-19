"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/services/firebase";
import { createGroup, updateGroup, deleteGroup, addPlayerToGroup, removePlayerFromGroup } from "@/services/groupService";
import type { TournamentGroup, Player } from "@/types";

interface Props { tournamentId: string; }

export const GroupManagement = ({ tournamentId }: Props) => {
  const [groups, setGroups] = useState<TournamentGroup[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroup, setEditingGroup] = useState<TournamentGroup | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);
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
      query(collection(db, "tournaments", tournamentId, "groups"), orderBy("createdAt", "asc")),
      (snap) => setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentGroup)))
    );
    return () => unsub();
  }, [tournamentId]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await createGroup(tournamentId, newGroupName.trim());
      setNewGroupName("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateGroup = async (groupId: string) => {
    if (!editName.trim()) return;
    try {
      await updateGroup(tournamentId, groupId, editName.trim());
      setEditingGroup(null);
      setEditName("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm("Delete this group?")) return;
    try { await deleteGroup(tournamentId, groupId); } catch (err: any) { setError(err.message); }
  };

  const togglePlayer = async (group: TournamentGroup, playerId: string) => {
    try {
      group.playerIds.includes(playerId)
        ? await removePlayerFromGroup(tournamentId, group.id, playerId)
        : await addPlayerToGroup(tournamentId, group.id, playerId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Create group form */}
      <div className="card card-cyan p-5">
        <p className="section-title">Create a group</p>
        <form onSubmit={handleCreateGroup} className="flex gap-2">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder='e.g. "Group A" or "Pool 1"'
            className="input-base"
            required
          />
          <button type="submit" disabled={isSubmitting} className="btn-primary font-gaming text-xs tracking-wider">
            {isSubmitting ? "..." : "Create"}
          </button>
        </form>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>

      {/* Empty state */}
      {groups.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-white font-semibold">No groups yet</p>
          <p className="text-gray-300 text-sm mt-1">Create a group above, then assign players to it</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const groupPlayers = players.filter((p) => group.playerIds.includes(p.id));
            const available = players.filter((p) => !group.playerIds.includes(p.id));
            const isEditing = editingGroup?.id === group.id;

            return (
              <div key={group.id} className="card card-cyan p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                  {isEditing ? (
                    <div className="flex gap-2 flex-1">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="input-base py-2 text-sm"
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleUpdateGroup(group.id)}
                      />
                      <button onClick={() => handleUpdateGroup(group.id)} className="btn-primary text-xs py-2 px-4">Save</button>
                      <button onClick={() => setEditingGroup(null)} className="btn-ghost text-xs py-2 px-3">✕</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center font-gaming text-cyan-400 text-xs font-bold shrink-0">
                          {group.playerIds.length}
                        </div>
                        <h3 className="font-gaming font-bold text-white tracking-wider text-sm">{group.name}</h3>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingGroup(group); setEditName(group.name); }} className="btn-warning">Rename</button>
                        <button onClick={() => handleDeleteGroup(group.id)} className="btn-danger">Delete</button>
                      </div>
                    </>
                  )}
                </div>

                {/* Players in group */}
                {groupPlayers.length > 0 ? (
                  <div>
                    <p className="section-title">Players — click to remove</p>
                    <div className="flex flex-wrap gap-2">
                      {groupPlayers.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => togglePlayer(group, p.id)}
                          className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300 transition-all"
                          title="Click to remove"
                        >
                          {p.name} <span className="opacity-50">✕</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-xs">No players assigned yet — use the dropdown below</p>
                )}

                {/* Add player */}
                {available.length > 0 && (
                  <div>
                    <p className="section-title">Add player</p>
                    <select
                      defaultValue=""
                      onChange={(e) => { if (e.target.value) { togglePlayer(group, e.target.value); e.target.value = ""; } }}
                      className="input-base text-sm"
                    >
                      <option value="" disabled>Select a player to add...</option>
                      {available.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {players.length === 0 && (
                  <p className="text-gray-400 text-xs text-center">
                    No players registered yet —{" "}
                    <a href="/players" className="text-cyan-500 hover:underline">go add some</a>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
