"use client";
import { useState } from "react";
import Link from "next/link";
import { useTournament, useGroups, useMatches, usePlayers } from "@/hooks/useTournament";
import { computeGlobalStandings, computeGroupStandings } from "@/services/standingsService";
import { TournamentStepper } from "@/components/ui/TournamentStepper";
import { StatusBadge } from "@/components/ui/Badges";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { BracketView } from "@/components/bracket/BracketView";
import { MatchCard } from "@/components/ui/MatchCard";
import { Spinner } from "@/components/ui/Spinner";
import { useLang } from "@/lib/LangContext";
import { useAuthContext } from "@/lib/AuthContext";

type Tab = "overview" | "groups" | "matches" | "standings" | "bracket";

export default function PlayerTournamentDetailPage({ params }: { params: { tournamentId: string } }) {
  const { tournamentId } = params;
  const { tournament, loading } = useTournament(tournamentId);
  const { groups } = useGroups(tournamentId);
  const { matches } = useMatches(tournamentId);
  const { players } = usePlayers(tournamentId);
  const { t } = useLang();
  const { user } = useAuthContext();
  const [tab, setTab] = useState<Tab>("overview");

  if (loading) return <Spinner size={12} />;
  if (!tournament) return <div className="page-wrapper"><p className="text-gray-400">{t("tournamentNotFound")}</p></div>;

  const myPlayer = players.find((p) => p.userId === user?.uid);
  const groupMatches = matches.filter((m) => m.phase === "GROUP");
  const knockoutMatches = matches.filter((m) => m.phase !== "GROUP");
  const globalStandings = computeGlobalStandings(groups, matches, players);

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "overview",  label: t("overview"),  icon: "📊" },
    { key: "groups",    label: t("groups"),    icon: "👥" },
    { key: "matches",   label: t("matches"),   icon: "⚔️" },
    { key: "standings", label: t("standings"), icon: "📈" },
    { key: "bracket",   label: t("bracket"),   icon: "🏆" },
  ];

  return (
    <div className="page-wrapper">
      <div className={`w-full space-y-6 ${tab === "bracket" ? "" : "max-w-4xl"}`}>
        <div>
          <Link href="/player/tournaments" className="text-gray-500 hover:text-cyan-400 text-sm transition-colors">
            ← {t("availableTournaments")}
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="font-gaming text-2xl font-black tracking-widest text-white flex-1">{tournament.name}</h1>
            <StatusBadge status={tournament.status} />
          </div>
        </div>

        <div className="card p-4">
          <TournamentStepper status={tournament.status} />
        </div>

        {/* Tabs */}
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
          {tab === "overview" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: t("players"),    value: players.length,  icon: "👤" },
                { label: t("groups"),     value: groups.length,   icon: "👥" },
                { label: t("matches"),    value: matches.length,  icon: "⚔️" },
                { label: t("qualifiers"), value: tournament.qualifiersCount || t("tbd"), icon: "🏆" },
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
                </div>
              ) : groups.map((g) => {
                const gPlayers = players.filter((p) => g.playerIds.includes(p.id));
                const standings = computeGroupStandings(matches, gPlayers, g.id);
                return (
                  <div key={g.id} className="space-y-3">
                    <p className="font-gaming text-sm font-bold text-cyan-300 tracking-widest">{g.name}</p>
                    <StandingsTable standings={standings} highlightTop={2} highlightPlayerId={myPlayer?.id} />
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
                    <MatchCard key={m.id} match={m} tournamentId={tournamentId} editable={false} currentPlayerId={myPlayer?.id} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "standings" && (
            <div className="space-y-4">
              <p className="section-title">{t("globalRanking")}</p>
              <StandingsTable standings={globalStandings} highlightTop={tournament.qualifiersCount} highlightPlayerId={myPlayer?.id} />
            </div>
          )}

          {tab === "bracket" && (
            <BracketView matches={knockoutMatches} editable={false} />
          )}
        </div>
      </div>
    </div>
  );
}
