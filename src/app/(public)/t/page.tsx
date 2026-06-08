"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot } from "firebase/firestore";
import { useTournaments } from "@/hooks/useTournament";
import { db } from "@/services/firebase";
import { StatusBadge } from "@/components/ui/Badges";
import { Spinner } from "@/components/ui/Spinner";
import { useLang } from "@/lib/LangContext";
import type { AppUser, Tournament } from "@/types";

export default function PublicTournamentsPage() {
  const { tournaments, loading } = useTournaments();
  const { t } = useLang();
  const [communityLeaders, setCommunityLeaders] = useState<Record<string, string[]>>({});
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const leadersMap: Record<string, string[]> = {};
      const creatorsMap: Record<string, string> = {};

      snap.docs.forEach((doc) => {
        const user = doc.data() as AppUser;
        const name = user.displayName || user.email || "Líder desconocido";
        creatorsMap[user.uid] = name;

        if (user.role === "leader" && user.communityId) {
          const communityIds = Array.isArray(user.communityId) ? user.communityId : [user.communityId];
          communityIds.forEach((communityId) => {
            if (!communityId) return;
            leadersMap[communityId] = leadersMap[communityId] ?? [];
            if (!leadersMap[communityId].includes(name)) leadersMap[communityId].push(name);
          });
        }
      });

      setCommunityLeaders(leadersMap);
      setCreatorNames(creatorsMap);
    });
    return unsub;
  }, []);

  const active = tournaments.filter((t) => t.status !== "DRAFT");

  const renderLeaders = (tournament: Tournament) => {
    const names = tournament.communityId
      ? communityLeaders[tournament.communityId]
      : creatorNames[tournament.createdBy]
        ? [creatorNames[tournament.createdBy]]
        : undefined;
    if (!names?.length) return null;
    return (
      <p className="text-gray-400 text-xs break-words mt-1">
        🧑‍💼 Líder{names.length > 1 ? "es" : ""}: {names.join(", ")}
      </p>
    );
  };

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-2xl space-y-4">
        <div className="text-center">
          <h1 className="font-gaming text-3xl font-black tracking-widest text-white">
            BEYBLADE<span className="text-cyan-400">X</span> PAC
          </h1>
          <p className="text-gray-400 text-sm mt-1">{t("tournamentManager")}</p>
          <div className="divider-cyan mt-3" />
        </div>

        {loading ? <Spinner size={10} /> : active.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-4xl mb-3">🏆</p>
            <p className="text-white font-semibold">{t("noTournamentsFound")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((t) => (
              <Link key={t.id} href={`/t/${t.id}`}
                className="card card-cyan p-4 flex flex-col gap-2 hover:border-cyan-400/40 transition-all group block">
                <div className="flex items-center gap-3">
                  <StatusBadge status={t.status} />
                  <p className="font-semibold text-white group-hover:text-cyan-400 transition-colors">{t.name}</p>
                </div>
                {renderLeaders(t)}
                <span className="text-gray-500 group-hover:text-cyan-400 transition-colors">→</span>
              </Link>
            ))}
          </div>
        )}

        <p className="text-center text-gray-600 text-xs">
          <Link href="/auth" className="text-cyan-500 hover:underline">{t("signIn")}</Link>
        </p>
      </div>
    </div>
  );
}
