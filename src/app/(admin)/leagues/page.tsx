"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import Link from "next/link";
import { useLeagues } from "@/hooks/useTournament";
import { useAuthContext } from "@/lib/AuthContext";
import { deleteLeague } from "@/services/leagueService";
import { useLang } from "@/lib/LangContext";
import { Pagination } from "@/components/ui/Pagination";

const ITEMS_PER_PAGE = 10;

export default function LeaguesPage() {
  const { leagues, loading } = useLeagues();
  const { user, isAdmin } = useAuthContext();
  const { t } = useLang();
  const [page, setPage] = useState(1);

  const userCommunityIds = Array.isArray(user?.communityId)
    ? user.communityId
    : user?.communityId
      ? [user.communityId]
      : [];

  const visibleLeagues = isAdmin
    ? leagues
    : leagues.filter((league) => league.communityId && userCommunityIds.includes(league.communityId));

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    await deleteLeague(id);
  };

  const totalPages = Math.ceil(visibleLeagues.length / ITEMS_PER_PAGE);
  const paginatedLeagues = visibleLeagues.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="font-gaming text-3xl font-black tracking-widest text-white">🏅 {t("leagues")}</h1>
          <div className="divider-cyan mt-3" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-spin-slow" />
              <div className="absolute inset-1.5 rounded-full border border-purple-400/40 animate-spin-reverse" />
            </div>
          </div>
        ) : leagues.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-4xl mb-3">🏅</p>
            <p className="text-white font-semibold">{t("noLeagues")}</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <ul className="divide-y divide-white/5">
              {paginatedLeagues.map((league) => (
                <li key={league.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-gaming font-bold text-white tracking-wide truncate">{league.name}</p>
                    {league.description && <p className="text-gray-500 text-xs truncate mt-0.5">{league.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Link href={`/leagues/${league.id}`} className="btn-primary text-xs py-1.5 px-3 font-gaming tracking-wider">
                      {t("standings")}
                    </Link>
                    {isAdmin && (
                      <button onClick={() => handleDelete(league.id)} className="btn-danger py-1.5">{t("remove")}</button>
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
