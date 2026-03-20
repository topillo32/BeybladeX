"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTournaments } from "@/hooks/useTournament";
import { computeLeagueStandings } from "@/services/leagueService";
import { StatusBadge } from "@/components/ui/Badges";
import { Spinner } from "@/components/ui/Spinner";
import { useLang } from "@/lib/LangContext";
import type { LeagueStandingEntry } from "@/types";

export default function LeagueDetailPage({ params }: { params: { leagueId: string } }) {
  const { leagueId } = params;
  const { tournaments } = useTournaments();
  const { t } = useLang();
  const [standings, setStandings] = useState<LeagueStandingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const leagueEvents = tournaments.filter((ev) => ev.leagueId === leagueId);

  useEffect(() => {
    setLoading(true);
    computeLeagueStandings(leagueId).then((s) => { setStandings(s); setLoading(false); });
  }, [leagueId]);

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-3xl space-y-6">
        <div>
          <Link href="/leagues" className="text-gray-500 hover:text-cyan-400 text-sm transition-colors">← {t("leagues")}</Link>
          <h1 className="font-gaming text-2xl font-black tracking-widest text-white mt-2">🏅 {t("leagueStandings")}</h1>
          <div className="divider-cyan mt-2" />
        </div>

        {loading ? <Spinner size={10} /> : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5 text-left section-title">#</th>
                  <th className="px-4 py-2.5 text-left section-title">{t("player")}</th>
                  <th className="px-4 py-2.5 text-center section-title">🏆 {t("wins")}</th>
                  <th className="px-4 py-2.5 text-center section-title">{t("rounds")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {standings.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">{t("noFinishedEvents")}</td></tr>
                ) : standings.map((s, i) => (
                  <tr key={s.playerId} className={`transition-colors ${i < 3 ? "bg-cyan-500/5" : "hover:bg-white/3"}`}>
                    <td className="px-4 py-3">
                      <span className={`font-gaming text-xs font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-gray-500"}`}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1).padStart(2, "0")}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{s.playerName}</td>
                    <td className="px-4 py-3 text-center font-gaming font-black text-cyan-400 text-lg">{s.wins}</td>
                    <td className="px-4 py-3 text-center text-gray-400 font-gaming text-xs">{s.roundsPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="space-y-3">
          <p className="section-title">{t("leagueEvents")} ({leagueEvents.length})</p>
          {leagueEvents.length === 0 ? (
            <div className="card p-6 text-center text-gray-500 text-sm">{t("noLeagueEvents")}</div>
          ) : (
            <div className="card overflow-hidden">
              <ul className="divide-y divide-white/5">
                {leagueEvents.map((ev) => (
                  <li key={ev.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/3 transition-colors">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={ev.status} />
                      <span className="font-medium text-white">{ev.name}</span>
                    </div>
                    <Link href={`/tournaments/${ev.id}`} className="text-gray-500 hover:text-cyan-400 text-sm transition-colors">→</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
