"use client";
import { useState, FormEvent } from "react";
import { usePlayers, useTournaments } from "@/hooks/useTournament";
import { useAuthContext } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import { createPlayer, updatePlayer, deletePlayer, enrollPlayerInTournament, unenrollPlayerFromTournament } from "@/services/playerService";
import { OPEN_REGISTRATION_STATUSES } from "@/types";
import type { Player } from "@/types";

const AVATAR_COLORS = [
  "from-cyan-500 to-blue-600", "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600", "from-emerald-500 to-teal-600",
  "from-red-500 to-rose-600", "from-indigo-500 to-violet-600",
];

export default function PlayersPage() {
  const { players, loading } = usePlayers();
  const { tournaments } = useTournaments();
  const { isAdmin, isStaff } = useAuthContext();
  const { t } = useLang();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Player | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      editing ? await updatePlayer(editing.id, name) : await createPlayer(name);
      setName(""); setEditing(null);
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleEnroll = async (playerId: string, tournamentId: string, enrolled: boolean, tournamentStatus: string) => {
    enrolled
      ? await unenrollPlayerFromTournament(playerId, tournamentId)
      : await enrollPlayerInTournament(playerId, tournamentId, tournamentStatus);
  };

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="font-gaming text-3xl font-black tracking-widest text-white">{t("players")}</h1>
          <div className="divider-cyan mt-3" style={{ background: "linear-gradient(to right, transparent, rgba(168,85,247,0.4), transparent)" }} />
        </div>

        {isStaff && (
          <div className="card card-purple p-5">
            <p className="section-title">{editing ? `${t("editing")} — ${editing.name}` : t("addPlayer")}</p>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder={t("playerName")} className="input-base" required />
              <button type="submit" disabled={submitting} className="btn-primary font-gaming text-xs tracking-wider">
                {submitting ? "..." : editing ? t("save") : t("add")}
              </button>
              {editing && <button type="button" onClick={() => { setEditing(null); setName(""); }} className="btn-ghost text-sm">{t("cancel")}</button>}
            </form>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-spin-slow" />
              <div className="absolute inset-1.5 rounded-full border border-purple-400/40 animate-spin-reverse" />
            </div>
          </div>
        ) : players.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-4xl mb-3">👤</p>
            <p className="text-white font-semibold">{t("noPlayersYet")}</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5">
              <p className="section-title mb-0">{players.length} {t("bladers")}</p>
            </div>
            <ul className="divide-y divide-white/5">
              {players.map((p, i) => {
                const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                const initials = p.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <li key={p.id} className="px-5 py-3.5 hover:bg-white/3 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center font-gaming font-bold text-white text-xs shrink-0`}>
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-white">{p.name}</p>
                          <p className="text-gray-400 text-xs">{p.tournamentIds?.length ?? 0} {t("tournaments").toLowerCase()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {isStaff && <button onClick={() => { setEditing(p); setName(p.name); }} className="btn-warning">{t("edit")}</button>}
                        {isAdmin && <button onClick={() => deletePlayer(p.id)} className="btn-danger">{t("remove")}</button>}
                      </div>
                    </div>
                    {isStaff && tournaments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 pl-12">
                        {tournaments.filter((tournament) => OPEN_REGISTRATION_STATUSES.includes(tournament.status)).map((tournament) => {
                          const enrolled = p.tournamentIds?.includes(tournament.id);
                          return (
                            <button key={tournament.id} onClick={() => handleEnroll(p.id, tournament.id, !!enrolled, tournament.status)}
                              className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-all
                                ${enrolled ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300"
                                           : "bg-white/5 border-white/10 text-gray-400 hover:border-cyan-500/30 hover:text-cyan-300"}`}>
                              {enrolled ? "✓ " : "+ "}{tournament.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}