"use client";
import { useState } from "react";
import Link from "next/link";
import { useTournament, useGroups, useMatches, usePlayers, useCurrentPlayer } from "@/hooks/useTournament";
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
  const { player: myPlayer } = useCurrentPlayer(user?.uid);
  const [tab, setTab] = useState<Tab>("overview");

  if (loading) return <Spinner size={12} />;
  if (!tournament) return <div className="page-wrapper"><p className="text-gray-400">{t("tournamentNotFound")}</p></div>;

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
      <div className={`w-full space-y-6 px-2 sm:px-0 ${tab === "bracket" ? "" : "max-w-4xl"}`}>
        <div>
          <Link href="/player/tournaments" className="text-gray-500 hover:text-cyan-400 text-sm transition-colors">
            ← {t("availableTournaments")}
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="font-gaming text-2xl font-black tracking-widest text-white flex-1">{tournament.name}</h1>
            <StatusBadge status={tournament.status} />
          </div>
          {tournament.location && (
            <p className="text-gray-400 text-sm mt-1">📍 {tournament.location}</p>
          )}
        </div>

        <div className="card p-4">
          <TournamentStepper status={tournament.status} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
          {TABS.map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={`flex-1 py-2.5 rounded-lg font-gaming text-xs tracking-wider transition-all
                ${tab === tb.key ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "text-white hover:bg-white/5"}`}>
              <span className="text-base">{tb.icon}</span>
              <span className="hidden sm:inline ml-1">{tb.label}</span>
            </button>
          ))}
        </div>

        <div className="animate-fade-in" key={tab}>
          {tab === "overview" && (
            <div className="space-y-4">
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

              {players.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <p className="section-title mb-0">👤 {t("players")}</p>
                    <span className="font-gaming text-xs text-cyan-400">{players.length} / {tournament.maxPlayers}</span>
                  </div>
                  <ul className="divide-y divide-white/5">
                    {players.map((p, i) => (
                      <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/3 transition-colors">
                        <span className="font-gaming text-xs text-white/30 w-5 text-right shrink-0">{i + 1}</span>
                        <span className="text-sm text-white font-medium">{p.name}</span>
                        {p.id === myPlayer?.id && (
                          <span className="text-xs text-cyan-400 font-gaming border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 rounded-full ml-auto">Tú</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
                const gPlayers = players.filter((p) => g.playerIds.includes(p.id) && !p.id.startsWith("bye-"));
                const standings = computeGroupStandings(matches, players.filter((p) => g.playerIds.includes(p.id)), g.id);
                return (
                  <div key={g.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-gaming text-sm font-bold text-cyan-300 tracking-widest">{g.name}</p>
                      {g.judgeName && (
                        <span className="text-xs text-purple-300 font-gaming border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 rounded-full">⚖️ {g.judgeName}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-1">
                      {gPlayers.map((p) => (
                        <span key={p.id} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                          p.id === myPlayer?.id
                            ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                            : "bg-white/5 border-white/10 text-white/70"
                        }`}>{p.name}</span>
                      ))}
                    </div>
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
                    <MatchCard key={m.id} match={m} tournamentId={tournamentId} tournamentStatus={tournament.status} editable={false} currentPlayerId={myPlayer?.id} />
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
