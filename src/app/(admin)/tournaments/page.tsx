"use client";
export const dynamic = "force-dynamic";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { useTournaments, useLeagues } from "@/hooks/useTournament";
import { useAuthContext } from "@/lib/AuthContext";
import { createTournament, deleteTournament } from "@/services/tournamentService";
import { StatusBadge } from "@/components/ui/Badges";
import { useLang } from "@/lib/LangContext";
import type { TournamentStatus, EventType } from "@/types";

export default function TournamentsPage() {
  const { tournaments, loading } = useTournaments();
  const { leagues } = useLeagues();
  const { user, isAdmin } = useAuthContext();
  const { t } = useLang();
  const [name, setName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(16);
  const [eventType, setEventType] = useState<EventType>("tournament");
  const [leagueId, setLeagueId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TournamentStatus | "ALL">("ALL");

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      await createTournament({
        name: name.trim(),
        maxPlayers,
        playersPerGroup: 4,
        eventType,
        ...(eventType === "league_event" && leagueId ? { leagueId } : {}),
      }, user.uid);
      setName("");
      setEventType("tournament");
      setLeagueId("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    await deleteTournament(id);
  };

  const filtered = filter === "ALL" ? tournaments : tournaments.filter((tournament) => tournament.status === filter);

  const STATUS_FILTERS = ["ALL", "DRAFT", "REGISTRATION", "GROUP_STAGE", "KNOCKOUT", "FINISHED"] as const;

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="font-gaming text-3xl font-black tracking-widest text-white">{t("tournaments")}</h1>
          <div className="divider-cyan mt-3" />
        </div>

        {isAdmin && (
          <div className="card card-cyan p-5">
            <p className="section-title">{t("createTournament")}</p>
            <form onSubmit={handleCreate} className="space-y-3">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder={t("tournamentName")} className="input-base" required />
              <div>
                <label className="section-title block mb-1">{t("maxPlayers")}</label>
                <input type="number" value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  min={4} max={256} className="input-base text-sm" />
              </div>
              {/* Event type */}
              <div className="flex gap-2">
                {(["tournament", "league_event"] as EventType[]).map((et) => (
                  <button
                    key={et}
                    type="button"
                    onClick={() => { setEventType(et); if (et === "tournament") setLeagueId(""); }}
                    className={`flex-1 py-2 rounded-lg font-gaming text-xs tracking-wider border transition-all
                      ${eventType === et
                        ? et === "league_event"
                          ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                          : "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                        : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"}`}
                  >
                    {et === "tournament" ? `🏆 ${t("typeTournament")}` : `🏅 ${t("typeLeagueEvent")}`}
                  </button>
                ))}
              </div>
              {/* League selector */}
              {eventType === "league_event" && (
                <div>
                  <label className="section-title block mb-1">{t("selectLeague")}</label>
                  <select
                    value={leagueId}
                    onChange={(e) => setLeagueId(e.target.value)}
                    required
                    className="input-base text-sm"
                  >
                    <option value="">{t("selectLeaguePlaceholder")}</option>
                    {leagues.map((l) => (
                      <option key={l.id} value={l.id} className="bg-[#050d1a]">{l.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={submitting || (eventType === "league_event" && !leagueId)} className="btn-primary w-full font-gaming text-xs tracking-wider disabled:opacity-50">
                {submitting ? t("creating") : t("createTournament")}
              </button>
            </form>
          </div>
        )}

        <div className="flex gap-1 p-1 bg-white/5 rounded-xl overflow-x-auto">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`flex-1 py-2 rounded-lg font-gaming text-xs tracking-wider whitespace-nowrap transition-all min-w-fit px-3
                ${filter === s ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "text-gray-500 hover:text-gray-300"}`}>
              {s === "ALL" ? t("all") : t(s as any)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-spin-slow" />
              <div className="absolute inset-1.5 rounded-full border border-purple-400/40 animate-spin-reverse" />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-4xl mb-3">🏆</p>
            <p className="text-white font-semibold">{t("noTournamentsFound")}</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <ul className="divide-y divide-white/5">
              {filtered.map((tournament) => (
                <li key={tournament.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusBadge status={tournament.status} />
                    <Link href={`/tournaments/${tournament.id}`} className="font-semibold text-white hover:text-cyan-400 transition-colors truncate">
                      {tournament.name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Link href={`/tournaments/${tournament.id}`} className="btn-primary text-xs py-1.5 px-3 font-gaming tracking-wider">
                      {t("manage")}
                    </Link>
                    {isAdmin && (
                      <button onClick={() => handleDelete(tournament.id)} className="btn-danger py-1.5">{t("remove")}</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}