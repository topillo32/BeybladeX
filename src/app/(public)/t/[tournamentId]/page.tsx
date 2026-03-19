"use client";
import { useState } from "react";
import { useTournament, useGroups, useMatches, usePlayers } from "@/hooks/useTournament";
import { computeGroupStandings, computeGlobalStandings } from "@/services/standingsService";
import { StatusBadge } from "@/components/ui/Badges";
import { TournamentStepper } from "@/components/ui/TournamentStepper";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { BracketView } from "@/components/bracket/BracketView";
import { MatchCard } from "@/components/ui/MatchCard";

type Tab = "groups" | "matches" | "standings" | "bracket";

export default function PublicTournamentPage({ params }: { params: { tournamentId: string } }) {
  const { tournamentId } = params;
  const { tournament, loading } = useTournament(tournamentId);
  const { groups } = useGroups(tournamentId);
  const { matches } = useMatches(tournamentId);
  const { players } = usePlayers(tournamentId);
  const [tab, setTab] = useState<Tab>("groups");

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-spin-slow" />
        <div className="absolute inset-2 rounded-full border border-purple-400/40 animate-spin-reverse" />
      </div>
    </div>
  );
  if (!tournament) return <div className="page-wrapper"><p className="text-gray-400">Tournament not found.</p></div>;

  const groupMatches = matches.filter((m) => m.phase === "GROUP");
  const knockoutMatches = matches.filter((m) => m.phase !== "GROUP");
  const globalStandings = computeGlobalStandings(groups, matches, players);
  const liveMatches = matches.filter((m) => !m.isFinished);

  const TABS = [
    { key: "groups" as Tab,    label: "Groups",    icon: "👥" },
    { key: "matches" as Tab,   label: "Matches",   icon: "⚔️" },
    { key: "standings" as Tab, label: "Standings", icon: "📈" },
    { key: "bracket" as Tab,   label: "Bracket",   icon: "🏆" },
  ];

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <StatusBadge status={tournament.status} />
          <h1 className="font-gaming text-3xl font-black tracking-widest text-white">{tournament.name}</h1>
          {liveMatches.length > 0 && (
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-red-400 font-gaming text-xs tracking-widest">{liveMatches.length} MATCH{liveMatches.length > 1 ? "ES" : ""} LIVE</span>
            </div>
          )}
          <div className="divider-cyan" />
        </div>

        {/* Stepper */}
        <div className="card p-4">
          <TournamentStepper status={tournament.status} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 rounded-lg font-gaming text-xs tracking-wider transition-all
                ${tab === t.key ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "text-gray-500 hover:text-gray-300"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="animate-fade-in" key={tab}>
          {tab === "groups" && (
            <div className="space-y-6">
              {groups.length === 0 ? (
                <div className="card p-10 text-center"><p className="text-gray-400">Groups not available yet</p></div>
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
                ? <div className="card p-10 text-center col-span-2"><p className="text-gray-400">No matches yet</p></div>
                : groupMatches.map((m) => <MatchCard key={m.id} match={m} tournamentId={tournamentId} editable={false} />)
              }
            </div>
          )}

          {tab === "standings" && (
            <div className="space-y-3">
              <p className="section-title">Global Ranking — Top {tournament.qualifiersCount} qualify</p>
              <StandingsTable standings={globalStandings} highlightTop={tournament.qualifiersCount} />
            </div>
          )}

          {tab === "bracket" && <BracketView matches={knockoutMatches} />}
        </div>
      </div>
    </div>
  );
}
