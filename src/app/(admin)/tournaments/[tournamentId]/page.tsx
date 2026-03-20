"use client";
import { useState } from "react";
import Link from "next/link";
import { useTournament, useGroups, useMatches, usePlayers, usePendingPlayers, useUnenrolledPlayers } from "@/hooks/useTournament";
import { useAuthContext } from "@/lib/AuthContext";
import { updateTournament, advanceTournamentStatus } from "@/services/tournamentService";
import { generateGroups, addPlayerToGroupLiveWithPlayers, fillGroupWithByes, removePlayerFromGroupWithMatches } from "@/services/groupService";
import { generateGroupMatches, generateKnockoutBracket } from "@/services/matchService";
import { computeGlobalStandings, getQualifiers, computeGroupStandings, autoQualifiersCount } from "@/services/standingsService";
import { TournamentStepper } from "@/components/ui/TournamentStepper";
import { StatusBadge } from "@/components/ui/Badges";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { BracketView } from "@/components/bracket/BracketView";
import { MatchCard } from "@/components/ui/MatchCard";
import { Spinner } from "@/components/ui/Spinner";
import { deleteMatch } from "@/services/matchService";
import { enrollPlayerInTournament, approvePlayerEnrollment, unenrollPlayerFromTournament } from "@/services/playerService";
import type { TournamentStatus } from "@/types";
import { useLang } from "@/lib/LangContext";
import { OPEN_REGISTRATION_STATUSES as OPEN_REG } from "@/types";

type Tab = "overview" | "groups" | "matches" | "standings" | "bracket";

const NEXT_STATUS: Partial<Record<TournamentStatus, TournamentStatus>> = {
  DRAFT: "REGISTRATION", REGISTRATION: "GROUP_STAGE",
  GROUP_STAGE: "KNOCKOUT", KNOCKOUT: "FINISHED",
};

export default function TournamentDetailPage({ params }: { params: { tournamentId: string } }) {
  const { tournamentId } = params;
  const { tournament, loading } = useTournament(tournamentId);
  const { groups } = useGroups(tournamentId);
  const { matches } = useMatches(tournamentId);
  const { players } = usePlayers(tournamentId);
  const { players: pendingPlayers } = usePendingPlayers(tournamentId);
  const { players: unenrolledPlayers } = useUnenrolledPlayers(tournamentId);
  const { isAdmin, isStaff } = useAuthContext();
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("overview");
  const [working, setWorking] = useState(false);
  const [enrollSearch, setEnrollSearch] = useState("");

  if (loading) return <Spinner size={12} />;
  if (!tournament) return <div className="page-wrapper"><p className="text-gray-400">{t("tournamentNotFound")}</p></div>;

  const groupMatches = matches.filter((m) => m.phase === "GROUP");
  const knockoutMatches = matches.filter((m) => m.phase !== "GROUP");
  const globalStandings = computeGlobalStandings(groups, matches, players);
  const autoCount = autoQualifiersCount(globalStandings.length);

  const handleAdvance = async () => {
    const next = NEXT_STATUS[tournament.status];
    if (!next) return;

    // remove the old manual validation

    setWorking(true);
    try {
      if (next === "GROUP_STAGE") {
        const freshGroups = await generateGroups(tournamentId, players, tournament.playersPerGroup);
        for (const g of freshGroups) {
          const gPlayers = players.filter((p) => g.playerIds.includes(p.id));
          await generateGroupMatches(tournamentId, g, gPlayers);
        }
      }
      if (next === "KNOCKOUT") {
        await updateTournament(tournamentId, { qualifiersCount: autoCount });
        const qualifiers = getQualifiers(globalStandings, autoCount, players);
        await generateKnockoutBracket(tournamentId, qualifiers);
      }
      await advanceTournamentStatus(tournamentId, next);
    } finally {
      setWorking(false);
    }
  };

  const handleEnroll = async (playerId: string) => {
    await enrollPlayerInTournament(playerId, tournamentId, tournament.status);
  };

  const handleApprove = async (player: import("@/types").Player) => {
    setWorking(true);
    try {
      await addPlayerToGroupLiveWithPlayers(tournamentId, player, groups, [...players, player]);
      await approvePlayerEnrollment(player.id, tournamentId);
    } finally {
      setWorking(false);
    }
  };

  const handleReject = async (playerId: string) => {
    await unenrollPlayerFromTournament(playerId, tournamentId);
  };

  const NEXT_LABEL_T = () => ({
    DRAFT: t("openRegistration"),
    REGISTRATION: t("startGroupStage"),
    GROUP_STAGE: t("startKnockout"),
    KNOCKOUT: t("finishTournament"),
  } as Partial<Record<TournamentStatus, string>>);

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "overview",  label: t("overview"),  icon: "📊" },
    { key: "groups",    label: t("groups"),    icon: "👥" },
    { key: "matches",   label: t("matches"),   icon: "⚔️" },
    { key: "standings", label: t("standings"), icon: "📈" },
    { key: "bracket",   label: t("bracket"),   icon: "🏆" },
  ];

  return (
    <div className="page-wrapper">
      {working && (
        <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50 gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/60 animate-spin-slow" />
            <div className="absolute inset-2 rounded-full border border-purple-400/60 animate-spin-reverse" />
          </div>
          <p className="font-gaming text-cyan-400 text-sm tracking-widest animate-pulse">{t("processing")}</p>
        </div>
      )}
      <div className={`w-full space-y-6 ${tab === "bracket" ? "" : "max-w-4xl"}`}>
        {/* Header */}
        <div>
          <Link href="/tournaments" className="text-gray-500 hover:text-cyan-400 text-sm transition-colors">{t("back")}</Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="font-gaming text-2xl font-black tracking-widest text-white flex-1">{tournament.name}</h1>
            <StatusBadge status={tournament.status} />
          </div>
        </div>

        {/* Stepper */}
        <div className="card p-4">
          <TournamentStepper status={tournament.status} />
        </div>

        {/* Pending approvals — GROUP_STAGE only */}
        {isStaff && tournament.status === "GROUP_STAGE" && pendingPlayers.length > 0 && (
          <div className="card p-4 space-y-3 border border-amber-500/30">
            <p className="section-title text-amber-400">⏳ {t("pendingApproval")} ({pendingPlayers.length})</p>
            <ul className="divide-y divide-white/5">
              {pendingPlayers.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 gap-3">
                  <span className="text-white font-medium">{p.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(p)} className="btn-primary text-xs py-1.5 px-3 font-gaming tracking-wider">✓ {t("approve")}</button>
                    <button onClick={() => handleReject(p.id)} className="btn-danger text-xs py-1.5">✗ {t("reject")}</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Enroll players panel — visible to staff when registration is open */}
        {isStaff && OPEN_REG.includes(tournament.status) && (
          <div className="card p-4 space-y-3">
            <p className="section-title">➕ {t("addPlayers")}</p>
            <input type="text" value={enrollSearch} onChange={(e) => setEnrollSearch(e.target.value)}
              placeholder={t("searchPlayer")} className="input-base text-sm" />
            {(() => {
              const filtered = unenrolledPlayers.filter((p) =>
                p.name.toLowerCase().includes(enrollSearch.toLowerCase())
              );
              if (filtered.length === 0) return <p className="text-gray-500 text-sm text-center py-2">{t("noPlayersAvailable")}</p>;
              return (
                <ul className="divide-y divide-white/5 max-h-48 overflow-y-auto">
                  {filtered.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-2 gap-3">
                      <span className="text-white text-sm">{p.name}</span>
                      <button onClick={() => handleEnroll(p.id)}
                        className="btn-primary text-xs py-1 px-3 font-gaming tracking-wider shrink-0">
                        {tournament.status === "GROUP_STAGE" ? t("request") : t("enroll")}
                      </button>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>
        )}

        {/* Qualifiers info — auto-calculated, shown during GROUP_STAGE */}
        {isAdmin && tournament.status === "GROUP_STAGE" && (
          <div className="card card-cyan p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="section-title mb-1">{t("howManyQualify")}</p>
              <p className="text-gray-400 text-xs">{globalStandings.length} {t("playersInStandings")}</p>
            </div>
            <div className="text-center">
              <p className="font-gaming text-3xl font-black text-cyan-400">{autoCount}</p>
              <p className="text-gray-500 text-xs font-gaming tracking-wider">{t("auto")}</p>
            </div>
          </div>
        )}

        {/* Advance button */}
        {isAdmin && NEXT_STATUS[tournament.status] && (
          <button onClick={handleAdvance} disabled={working}
            className="btn-primary w-full font-gaming text-sm tracking-wider py-3.5">
            {working ? t("processing") : `👉 ${NEXT_LABEL_T()[tournament.status]}`}
          </button>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 rounded-lg font-gaming text-xs tracking-wider whitespace-nowrap transition-all min-w-fit px-2
                ${tab === t.key ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "text-gray-500 hover:text-gray-300"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="animate-fade-in" key={tab}>
          {tab === "overview" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: t("players"),    value: players.length,                    icon: "👤" },
                { label: t("groups"),     value: groups.length,                     icon: "👥" },
                { label: t("matches"),    value: matches.length,                    icon: "⚔️" },
                { label: t("qualifiers"), value: tournament.status === "GROUP_STAGE" ? autoCount : (tournament.qualifiersCount || t("tbd")), icon: "🏆" },
              ].map((s) => (
                <div key={s.label} className="card card-cyan p-4 text-center space-y-1">
                  <p className="text-2xl">{s.icon}</p>
                  <p className="font-gaming text-3xl font-black text-cyan-400">{s.value}</p>
                  <p className="text-gray-400 text-xs">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {tab === "groups" && (
            <div className="space-y-6">
              {groups.length === 0 ? (
                <div className="card p-10 text-center">
                  <p className="text-4xl mb-3">👥</p>
                  <p className="text-white font-semibold">{t("noGroupsYet")}</p>
                  <p className="text-gray-400 text-sm mt-1">{t("groupsAutoGenerated")}</p>
                </div>
              ) : groups.map((g) => {
                const gPlayers = players.filter((p) => g.playerIds.includes(p.id));
                const standings = computeGroupStandings(matches, gPlayers, g.id);
                const byeCount = g.playerIds.filter((id) => id.startsWith("bye-")).length;
                const slots = tournament.playersPerGroup - g.playerIds.length;
                const canFill = isAdmin && slots > 0 && byeCount < 3;
                return (
                  <div key={g.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-gaming text-sm font-bold text-cyan-300 tracking-widest">{g.name}</p>
                      {canFill && (
                        <button
                          onClick={async () => {
                            setWorking(true);
                            try { await fillGroupWithByes(tournamentId, g, gPlayers.filter((p) => !p.id.startsWith("bye-"))); }
                            finally { setWorking(false); }
                          }}
                          className="btn-ghost text-xs py-1 px-3 border border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        >
                          🃏 Rellenar con byes ({slots})
                        </button>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex flex-wrap gap-2">
                        {g.playerIds.map((pid) => {
                          const p = players.find((pl) => pl.id === pid);
                          const name = pid.startsWith("bye-") ? "BYE" : (p?.name ?? pid);
                          const hasPlayed = matches.some(
                            (m) => m.groupId === g.id && m.isFinished &&
                              (m.playerA.id === pid || m.playerB.id === pid)
                          );
                          return (
                            <span key={pid} className="flex items-center gap-1 bg-white/5 border border-white/10 text-gray-300 text-xs px-2.5 py-1 rounded-full">
                              {name}
                              {!hasPlayed && (
                                <button
                                  onClick={async () => {
                                    setWorking(true);
                                    try { await removePlayerFromGroupWithMatches(tournamentId, g.id, pid); }
                                    finally { setWorking(false); }
                                  }}
                                  className="ml-1 text-red-400 hover:text-red-300 leading-none"
                                  title="Quitar jugador"
                                >✕</button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <StandingsTable standings={standings} highlightTop={2} />
                  </div>
                );
              })}
            </div>
          )}

          {tab === "matches" && (
            <div className="space-y-4">
              {groupMatches.length === 0 ? (
                <div className="card p-10 text-center">
                  <p className="text-4xl mb-3">⚔️</p>
                  <p className="text-white font-semibold">{t("noMatchesYet")}</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {groupMatches.map((m) => (
                    <MatchCard key={m.id} match={m} tournamentId={tournamentId} editable={isStaff}
                      onDelete={isAdmin ? (id) => deleteMatch(tournamentId, id) : undefined} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "standings" && (
            <div className="space-y-4">
              <p className="section-title">{t("globalRanking")}</p>
              <StandingsTable standings={globalStandings} highlightTop={tournament.qualifiersCount} />
            </div>
          )}

          {tab === "bracket" && (
            <BracketView matches={knockoutMatches} tournamentId={tournamentId} editable={isStaff} />
          )}
        </div>
      </div>
    </div>
  );
}
