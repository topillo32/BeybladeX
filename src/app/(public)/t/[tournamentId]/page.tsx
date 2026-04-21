"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTournament, useGroups, useMatches, usePlayers } from "@/hooks/useTournament";
import { computeGroupStandings, computeGlobalStandings } from "@/services/standingsService";
import { StatusBadge } from "@/components/ui/Badges";
import { TournamentStepper } from "@/components/ui/TournamentStepper";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { BracketView } from "@/components/bracket/BracketView";
import { MatchCard } from "@/components/ui/MatchCard";
import { Spinner } from "@/components/ui/Spinner";
import { useLang } from "@/lib/LangContext";
import { LangToggle } from "@/components/ui/LangToggle";
import { useAuthContext } from "@/lib/AuthContext";
import { getPlayerByUserId, enrollPlayerInTournament, leavePlayerFromTournament } from "@/services/playerService";
import type { Player } from "@/types";
import { OPEN_REGISTRATION_STATUSES as OPEN_REG } from "@/types";

type Tab = "participants" | "groups" | "matches" | "standings" | "bracket";

export default function PublicTournamentPage({ params }: { params: { tournamentId: string } }) {
  const { tournamentId } = params;
  const { tournament, loading } = useTournament(tournamentId);
  const { groups } = useGroups(tournamentId);
  const { matches } = useMatches(tournamentId);
  const { players } = usePlayers(tournamentId);
  const { t } = useLang();
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("participants");
  const [player, setPlayer] = useState<Player | null | undefined>(undefined);
  const [enrolling, setEnrolling] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setPlayer(null); return; }
    getPlayerByUserId(user.uid).then(setPlayer);
  }, [user, authLoading]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  );
  if (!tournament) return <div className="page-wrapper"><p className="text-gray-400">{t("tournamentNotFound")}</p></div>;

  const groupMatches    = matches.filter((m) => m.phase === "GROUP");
  const knockoutMatches = matches.filter((m) => m.phase !== "GROUP");
  const globalStandings = computeGlobalStandings(groups, matches, players);
  const liveMatches     = matches.filter((m) => !m.isFinished);
  const registeredNames = players.map((p) => p.name).sort();

  const canEnroll = player && OPEN_REG.includes(tournament.status);
  const myStatus = !player ? null
    : player.tournamentIds?.includes(tournamentId) ? "enrolled"
    : player.pendingTournamentIds?.includes(tournamentId) ? "pending"
    : "none";

  const handleEnroll = async () => {
    if (!player) return;
    setEnrolling(true);
    setActionError(null);
    try {
      await enrollPlayerInTournament(player.id, tournamentId, tournament.status);
      const updated = await getPlayerByUserId(user!.uid);
      setPlayer(updated);
      router.refresh();
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setEnrolling(false);
    }
  };

  const handleLeave = async () => {
    if (!player) return;
    if (!confirm(`¿Seguro que quieres salir de "${tournament.name}"?`)) return;
    setLeaving(true);
    setActionError(null);
    try {
      await leavePlayerFromTournament(player.id, tournamentId);
      const updated = await getPlayerByUserId(user!.uid);
      setPlayer(updated);
      router.refresh();
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setLeaving(false);
    }
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "participants", label: t("participants"), icon: "👤" },
    { key: "groups",       label: t("groups"),       icon: "👥" },
    { key: "matches",      label: t("matches"),      icon: "⚔️" },
    { key: "standings",    label: t("standings"),    icon: "📈" },
    { key: "bracket",      label: t("bracket"),      icon: "🏆" },
  ];

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-4xl space-y-6">

        <div className="text-center space-y-2">
          <div className="flex justify-end"><LangToggle /></div>
          <StatusBadge status={tournament.status} />
          <h1 className="font-gaming text-3xl font-black tracking-widest text-white">{tournament.name}</h1>
          {tournament.location && (
            <p className="text-white/70 text-sm">📍 {tournament.location}</p>
          )}
          {liveMatches.length > 0 && (
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-red-400 font-gaming text-xs tracking-widest">
                {liveMatches.length} MATCH{liveMatches.length > 1 ? "ES" : ""} LIVE
              </span>
            </div>
          )}
          <div className="divider-cyan" />
        </div>

        <div className="card p-4">
          <TournamentStepper status={tournament.status} />
        </div>

        {/* Botón de inscripción — visible para todos cuando el torneo está abierto */}
        {OPEN_REG.includes(tournament.status) && (
          <div className="card p-4 space-y-2">
            {actionError && <p className="text-red-400 text-xs text-center">{actionError}</p>}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-semibold text-sm">📋 {t("registrationOpen")}</p>
                {myStatus === "enrolled" && <p className="text-green-400 text-xs font-gaming mt-0.5">✅ {t("alreadyEnrolled")}</p>}
                {myStatus === "pending"  && <p className="text-amber-400 text-xs font-gaming mt-0.5">⏳ {t("pendingEnrollment")}</p>}
                {!authLoading && !user && <p className="text-white/50 text-xs mt-0.5">{t("signIn")} para inscribirte</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                {authLoading || player === undefined ? (
                  <div className="w-24 h-8 rounded-lg bg-white/10 animate-pulse" />
                ) : (
                  <>
                    {!user && (
                      <a href={`/auth?redirect=/t/${tournamentId}`} className="btn-primary font-gaming text-xs tracking-wider py-2 px-4">
                        {t("signIn")}
                      </a>
                    )}
                    {user && myStatus === "none" && (
                      <button onClick={handleEnroll} disabled={enrolling || !player}
                        className="btn-primary font-gaming text-xs tracking-wider py-2 px-4 disabled:opacity-50">
                        {enrolling ? "..." : tournament.status === "GROUP_STAGE" ? t("requestEnroll") : t("enrollMe")}
                      </button>
                    )}
                    {user && (myStatus === "enrolled" || myStatus === "pending") && (
                      <button onClick={handleLeave} disabled={leaving}
                        className="font-gaming text-xs text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-lg transition-all disabled:opacity-50">
                        {leaving ? "..." : myStatus === "pending" ? "✕ Cancelar" : "✕ Salir"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-1 p-1 bg-white/5 rounded-xl overflow-x-auto">
          {TABS.map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={`flex-1 py-2.5 rounded-lg font-gaming text-xs tracking-wider whitespace-nowrap transition-all min-w-fit px-2
                ${tab === tb.key ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "text-gray-500 hover:text-gray-300"}`}>
              {tb.icon} {tb.label}
            </button>
          ))}
        </div>

        <div className="animate-fade-in" key={tab}>

          {tab === "participants" && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                <p className="section-title mb-0">👤 {t("participants")}</p>
                <span className="font-gaming text-xs text-cyan-400">
                  {registeredNames.length} / {tournament.maxPlayers}
                </span>
              </div>
              {registeredNames.length === 0 ? (
                <div className="px-5 py-10 text-center space-y-2">
                  <p className="text-3xl">👤</p>
                  <p className="text-white font-semibold">{t("noParticipantsYet")}</p>
                  {tournament.status === "REGISTRATION" && (
                    <p className="text-cyan-400 font-gaming text-xs tracking-widest">{t("registrationOpen")}</p>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {registeredNames.map((name, i) => (
                    <li key={name} className="flex items-center gap-4 px-5 py-3">
                      <span className={`font-gaming text-sm font-bold w-6 text-right shrink-0
                        ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-gray-600"}`}>
                        {i + 1}
                      </span>
                      <span className="font-medium text-white">{name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "groups" && (
            <div className="space-y-6">
              {groups.length === 0 ? (
                <div className="card p-10 text-center">
                  <p className="text-gray-400">{t("noGroupsYet")}</p>
                </div>
              ) : groups.map((g) => {
                const gPlayers = players.filter((p) => g.playerIds.includes(p.id));
                const standings = computeGroupStandings(matches, gPlayers, g.id);
                return (
                  <div key={g.id} className="space-y-2">
                    <p className="font-gaming text-sm font-bold text-cyan-300 tracking-widest">{g.name}</p>
                    <StandingsTable standings={standings} highlightTop={2} />
                  </div>
                );
              })}
            </div>
          )}

          {tab === "matches" && (
            <div className="grid md:grid-cols-2 gap-4">
              {groupMatches.length === 0
                ? <div className="card p-10 text-center col-span-2"><p className="text-gray-400">{t("noMatchesYet")}</p></div>
                : groupMatches.map((m) => <MatchCard key={m.id} match={m} tournamentId={tournamentId} editable={false} />)
              }
            </div>
          )}

          {tab === "standings" && (
            <div className="space-y-3">
              <p className="section-title">{t("globalRanking")}</p>
              <StandingsTable standings={globalStandings} highlightTop={tournament.qualifiersCount} />
            </div>
          )}

          {tab === "bracket" && <BracketView matches={knockoutMatches} />}
        </div>
      </div>
    </div>
  );
}
