"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthContext } from "@/lib/AuthContext";
import { useLeagues, useTournaments } from "@/hooks/useTournament";
import { getPlayerByUserId } from "@/services/playerService";
import { Spinner } from "@/components/ui/Spinner";
import { useLang } from "@/lib/LangContext";
import type { Player } from "@/types";

export default function PlayerLeaguesPage() {
  const { user } = useAuthContext();
  const { leagues, loading: leaguesLoading } = useLeagues();
  const { tournaments } = useTournaments();
  const { t } = useLang();
  const [player, setPlayer] = useState<Player | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    getPlayerByUserId(user.uid).then(setPlayer);
  }, [user]);

  if (leaguesLoading || player === undefined) return <Spinner size={12} />;

  // A player is in a league if they are enrolled in at least one jornada of that league
  const myLeagues = leagues.filter((league) =>
    tournaments.some(
      (t) => t.leagueId === league.id && player && t.id && (
        (player.tournamentIds ?? []).includes(t.id) ||
        (player.pendingTournamentIds ?? []).includes(t.id)
      )
    )
  );

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-1">
          <h1 className="font-gaming text-2xl font-black tracking-widest text-white">🏅 {t("myLeagues")}</h1>
          {player && <p className="text-gray-400 text-sm">{player.name}</p>}
        </div>

        {myLeagues.length === 0 ? (
          <div className="card p-12 text-center space-y-3">
            <p className="text-4xl">🏅</p>
            <p className="text-white font-semibold">{t("notInAnyLeague")}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {myLeagues.map((league) => {
              const jornadas = tournaments.filter((t) => t.leagueId === league.id);
              return (
                <li key={league.id} className="card p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-gaming font-bold text-white tracking-wide truncate">{league.name}</p>
                    {league.description && <p className="text-gray-500 text-xs truncate mt-0.5">{league.description}</p>}
                    <p className="text-gray-600 text-xs mt-1">{jornadas.length} {t("rounds")}</p>
                  </div>
                  <Link
                    href={`/player/leagues/${league.id}`}
                    className="font-gaming text-xs text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg transition-all shrink-0"
                  >
                    👁 {t("view")}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
