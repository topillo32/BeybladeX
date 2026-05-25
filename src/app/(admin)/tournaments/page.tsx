"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useTournaments, useLeagues } from "@/hooks/useTournament";
import { useAuthContext } from "@/lib/AuthContext";
import { createTournament, deleteTournament } from "@/services/tournamentService";
import { StatusBadge } from "@/components/ui/Badges";
import { useLang } from "@/lib/LangContext";
import { Pagination } from "@/components/ui/Pagination";
import type { EventType, TournamentStatus } from "@/types";

const ITEMS_PER_PAGE = 10;

export default function TournamentsPage() {
  const { tournaments, loading } = useTournaments();
  const { leagues, loading: leaguesLoading } = useLeagues();
  const { user, isAdmin, isStaff } = useAuthContext();
  const isLeader = user?.role === "leader";
  const { t } = useLang();
  const [filter, setFilter] = useState<TournamentStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [tName, setTName] = useState("");
  const [tLocation, setTLocation] = useState("");
  const [tMaxPlayers, setTMaxPlayers] = useState(16);
  const [tEventType, setTEventType] = useState<EventType>("tournament");
  const [tLeagueId, setTLeagueId] = useState("");
  const [tCommunityId, setTCommunityId] = useState("");
  const [tCreating, setTCreating] = useState(false);
  const [tSuccess, setTSuccess] = useState(false);
  const [tError, setTError] = useState<string | null>(null);

  const userCommunityIds = Array.isArray(user?.communityId)
    ? user.communityId
    : user?.communityId
      ? [user.communityId]
      : [];

  const visibleTournaments = isAdmin
    ? tournaments
    : tournaments.filter((tournament) => tournament.communityId && userCommunityIds.includes(tournament.communityId));

  const visibleLeagues = isAdmin
    ? leagues
    : leagues.filter((league) => league.communityId && userCommunityIds.includes(league.communityId));

  useEffect(() => {
    if (!tCommunityId && userCommunityIds.length > 0) {
      setTCommunityId(userCommunityIds[0]);
    }
  }, [userCommunityIds, tCommunityId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    await deleteTournament(id);
  };

  const handleCreateTournament = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tName.trim()) return;
    setTCreating(true);
    setTError(null);
    setTSuccess(false);

    const targetCommunity = tEventType === "league_event" && tLeagueId
      ? visibleLeagues.find((l) => l.id === tLeagueId)?.communityId
      : (isAdmin ? (tCommunityId || null) : userCommunityIds[0] || null);

    try {
      await createTournament({
        name: tName.trim(),
        location: tLocation.trim() || undefined,
        maxPlayers: tMaxPlayers,
        playersPerGroup: 4,
        eventType: tEventType,
        communityId: targetCommunity,
        ...(tEventType === "league_event" && tLeagueId ? { leagueId: tLeagueId } : {}),
      }, user?.uid ?? "");
      setTName("");
      setTLocation("");
      setTMaxPlayers(16);
      setTEventType("tournament");
      setTLeagueId("");
      setTSuccess(true);
      setTimeout(() => setTSuccess(false), 3000);
    } catch (error: any) {
      setTError(error?.message || "No se pudo crear el torneo");
    } finally {
      setTCreating(false);
    }
  };

  const filtered = filter === "ALL" ? visibleTournaments : visibleTournaments.filter((tournament) => tournament.status === filter);
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedTournaments = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const STATUS_FILTERS = [
    { key: "ALL",         icon: "🔍" },
    { key: "DRAFT",       icon: "⚙️" },
    { key: "REGISTRATION",icon: "📋" },
    { key: "GROUP_STAGE", icon: "👥" },
    { key: "KNOCKOUT",    icon: "⚔️" },
    { key: "FINISHED",    icon: "✅" },
  ] as const;

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="font-gaming text-3xl font-black tracking-widest text-white">{t("tournaments")}</h1>
          <div className="divider-cyan mt-3" />
        </div>

        {(isAdmin || isLeader) && (
          <div className="card card-cyan p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="section-title">Crear torneo</p>
              {leaguesLoading && <span className="text-xs text-gray-400">Cargando ligas...</span>}
            </div>
            <form onSubmit={handleCreateTournament} className="space-y-3 mt-4">
              <input
                type="text"
                value={tName}
                onChange={(e) => setTName(e.target.value)}
                placeholder="Nombre del torneo"
                className="input-base text-sm"
                required
              />
              <input
                type="text"
                value={tLocation}
                onChange={(e) => setTLocation(e.target.value)}
                placeholder="Ubicación (opcional)"
                className="input-base text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-title block mb-1 text-xs">Max jugadores</label>
                  <input
                    type="number"
                    value={tMaxPlayers}
                    onChange={(e) => setTMaxPlayers(Number(e.target.value))}
                    min={4}
                    max={200}
                    className="input-base text-sm"
                  />
                </div>
                <div>
                  <label className="section-title block mb-1 text-xs">Tipo</label>
                  <select
                    value={tEventType}
                    onChange={(e) => { setTEventType(e.target.value as EventType); setTLeagueId(""); }}
                    className="input-base text-sm"
                  >
                    <option value="tournament">Torneo</option>
                    <option value="league_event">Evento de liga</option>
                  </select>
                </div>
              </div>

              {tEventType === "league_event" && (
                <div>
                  <label className="section-title block mb-1 text-xs">Liga</label>
                  <select
                    value={tLeagueId}
                    onChange={(e) => setTLeagueId(e.target.value)}
                    className="input-base text-sm"
                    required
                  >
                    <option value="">Seleccionar liga</option>
                    {visibleLeagues.map((league) => (
                      <option key={league.id} value={league.id}>{league.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {!isAdmin && userCommunityIds.length > 0 && (
                <p className="text-gray-400 text-xs">El torneo se creará en tu comunidad asignada.</p>
              )}
              {tError && <p className="text-red-400 text-xs">{tError}</p>}
              {tSuccess && <p className="text-green-400 text-xs">✓ Torneo creado</p>}
              <button
                type="submit"
                disabled={tCreating || (tEventType === "league_event" && !tLeagueId) || (!isAdmin && userCommunityIds.length === 0)}
                className="btn-primary w-full font-gaming text-xs tracking-wider disabled:opacity-50 mt-2"
              >
                {tCreating ? "Guardando..." : "Crear torneo"}
              </button>
            </form>
          </div>
        )}

        <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
          {STATUS_FILTERS.map(({ key, icon }) => (
            <button key={key} onClick={() => { setFilter(key as any); setPage(1); }}
              className={`flex-1 py-2 rounded-lg font-gaming text-xs tracking-wider transition-all
                ${filter === key ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "text-white hover:bg-white/5"}`}>
              <span>{icon}</span>
              <span className="hidden sm:inline ml-1">{key === "ALL" ? t("all") : t(key as any)}</span>
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
              {paginatedTournaments.map((tournament) => (
                <li key={tournament.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-white/3 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusBadge status={tournament.status} />
                    <div className="min-w-0">
                      <Link href={`/tournaments/${tournament.id}`} className="font-semibold text-white hover:text-cyan-400 transition-colors truncate text-sm block">
                        {tournament.name}
                      </Link>
                      {tournament.location && (
                        <p className="text-white/50 text-xs truncate">📍 {tournament.location}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <Link href={`/tournaments/${tournament.id}`} className="btn-primary text-xs py-1.5 px-3 font-gaming tracking-wider">
                      <span className="hidden sm:inline">{t("manage")}</span>
                      <span className="sm:hidden">→</span>
                    </Link>
                    {isAdmin && (
                      <button onClick={() => handleDelete(tournament.id)} className="btn-danger py-1.5 px-2">
                        <span className="hidden sm:inline">{t("remove")}</span>
                        <span className="sm:hidden">🗑️</span>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            <div className="pb-4" />
          </div>
        )}
      </div>
    </div>
  );
}