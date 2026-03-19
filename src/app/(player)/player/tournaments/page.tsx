"use client";
import { useEffect, useState } from "react";
import { useAuthContext } from "@/lib/AuthContext";
import { useTournaments } from "@/hooks/useTournament";
import { getPlayerByUserId, enrollPlayerInTournament } from "@/services/playerService";
import { StatusBadge } from "@/components/ui/Badges";
import { Spinner } from "@/components/ui/Spinner";
import { useLang } from "@/lib/LangContext";
import type { Player, Tournament } from "@/types";
import { OPEN_REGISTRATION_STATUSES as OPEN_REG } from "@/types";

export default function PlayerTournamentsPage() {
  const { user } = useAuthContext();
  const { tournaments, loading } = useTournaments();
  const { t } = useLang();

  const [player, setPlayer] = useState<Player | null | undefined>(undefined);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getPlayerByUserId(user.uid).then(setPlayer);
  }, [user]);

  const openTournaments = tournaments.filter((t) => OPEN_REG.includes(t.status));

  const getMyStatus = (t: Tournament) => {
    if (!player) return null;
    if (player.tournamentIds?.includes(t.id)) return "enrolled";
    if (player.pendingTournamentIds?.includes(t.id)) return "pending";
    return "none";
  };

  const handleEnroll = async (tournament: Tournament) => {
    if (!player) return;
    setEnrolling(tournament.id);
    try {
      await enrollPlayerInTournament(player.id, tournament.id, tournament.status);
      const updated = await getPlayerByUserId(user!.uid);
      setPlayer(updated);
    } finally {
      setEnrolling(null);
    }
  };

  if (loading || player === undefined) return <Spinner size={12} />;

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-1">
          <h1 className="font-gaming text-2xl font-black tracking-widest text-white">
            🌀 {t("availableTournaments")}
          </h1>
          {player && (
            <p className="text-gray-400 text-sm">
              {t("myDashboard")} — <span className="text-cyan-400">{player.name}</span>
            </p>
          )}
        </div>

        {player === null && (
          <div className="card border border-amber-500/30 p-4 text-amber-400 text-sm">
            ⚠️ {t("notLinked")}
          </div>
        )}

        {openTournaments.length === 0 ? (
          <div className="card p-12 text-center space-y-3">
            <p className="text-4xl">🏆</p>
            <p className="text-white font-semibold">{t("noOpenTournaments")}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {openTournaments.map((tournament) => {
              const status = getMyStatus(tournament);
              const isEnrolling = enrolling === tournament.id;

              return (
                <li key={tournament.id} className="card p-4 flex items-center gap-4">
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="font-gaming font-bold text-white tracking-wide truncate">
                      {tournament.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={tournament.status} />
                      <span className="text-gray-500 text-xs">{tournament.maxPlayers} max</span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {status === "enrolled" && (
                      <span className="font-gaming text-xs text-green-400 border border-green-500/30 bg-green-500/10 px-3 py-1.5 rounded-lg">
                        {t("alreadyEnrolled")}
                      </span>
                    )}
                    {status === "pending" && (
                      <span className="font-gaming text-xs text-amber-400 border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 rounded-lg">
                        ⏳ {t("pendingEnrollment")}
                      </span>
                    )}
                    {status === "none" && player && (
                      <button
                        onClick={() => handleEnroll(tournament)}
                        disabled={isEnrolling}
                        className="btn-primary font-gaming text-xs tracking-wider py-1.5 px-4 disabled:opacity-50"
                      >
                        {isEnrolling
                          ? "..."
                          : tournament.status === "GROUP_STAGE"
                          ? t("requestEnroll")
                          : t("enrollMe")}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
