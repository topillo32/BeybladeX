"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import Link from "next/link";
import { useAuthContext } from "@/lib/AuthContext";
import { useTournaments, usePlayers } from "@/hooks/useTournament";
import { StatusBadge } from "@/components/ui/Badges";
import { Spinner } from "@/components/ui/Spinner";
import { useLang } from "@/lib/LangContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/services/firebase";

export default function DashboardPage() {
  const { user, isAdmin, maintenance } = useAuthContext();
  const { t } = useLang();
  const { tournaments, loading: tournamentsLoading } = useTournaments();
  const { players, loading: playersLoading } = usePlayers();
  const [toggling, setToggling] = useState(false);

  const toggleMaintenance = async () => {
    setToggling(true);
    await setDoc(doc(db, "config", "app"), { maintenanceMode: !maintenance }, { merge: true });
    setToggling(false);
  };

  const active = tournaments.filter((t) => t.status !== "FINISHED" && t.status !== "DRAFT");
  const finished = tournaments.filter((t) => t.status === "FINISHED");

  if (tournamentsLoading || playersLoading) return <Spinner size={12} />;

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-4xl space-y-8">
        <div>
          <p className="text-gray-400 text-sm">{t("welcomeBack")}</p>
          <h1 className="font-gaming text-3xl font-black tracking-widest text-white mt-0.5">{user?.displayName}</h1>
          <div className="divider-cyan mt-3" />
        </div>

        {/* Modo mantenimiento — solo admins */}
        {isAdmin && (
          <div className={`card p-4 flex items-center justify-between gap-4 border ${
            maintenance ? "border-amber-500/40 bg-amber-500/5" : "border-white/7"
          }`}>
            <div>
              <p className="font-gaming text-sm text-white tracking-wider">
                {maintenance ? "⚙️ Modo mantenimiento activo" : "⚙️ Modo mantenimiento"}
              </p>
              <p className="text-white/40 text-xs mt-0.5">
                {maintenance
                  ? "Solo staff y admins pueden acceder. Los players son deslogueados automáticamente."
                  : "Al activarlo, los players serán deslogueados y no podrán acceder."}
              </p>
            </div>
            <button
              onClick={toggleMaintenance}
              disabled={toggling}
              className={`shrink-0 font-gaming text-xs px-4 py-2 rounded-lg border transition-all disabled:opacity-50 ${
                maintenance
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                  : "bg-white/5 border-white/15 text-white/60 hover:bg-white/10"
              }`}
            >
              {toggling ? "..." : maintenance ? "Desactivar" : "Activar"}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t("totalTournaments"), value: tournaments.length, icon: "🏆", color: "text-cyan-400" },
            { label: t("active"),           value: active.length,      icon: "⚡", color: "text-amber-400" },
            { label: t("finished"),         value: finished.length,    icon: "✅", color: "text-green-400" },
            { label: t("players"),          value: players.length,     icon: "👤", color: "text-purple-400" },
          ].map((s) => (
            <div key={s.label} className="card card-cyan p-4 text-center space-y-1">
              <p className="text-2xl">{s.icon}</p>
              <p className={`font-gaming text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-gray-400 text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="section-title mb-0">{t("recentTournaments")}</p>
            <Link href="/tournaments" className="text-cyan-400 hover:text-cyan-300 text-xs font-gaming tracking-wider transition-colors">
              {t("viewAll")}
            </Link>
          </div>
          {tournaments.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-3xl mb-2">🏆</p>
              <p className="text-white font-semibold">{t("noTournaments")}</p>
              <Link href="/tournaments" className="btn-primary inline-block mt-3 text-xs font-gaming tracking-wider">
                {t("createFirst")}
              </Link>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <ul className="divide-y divide-white/5">
                {tournaments.slice(0, 5).map((tournament) => (
                  <li key={tournament.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/3 transition-colors">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={tournament.status} />
                      <Link href={`/tournaments/${tournament.id}`} className="font-medium text-white hover:text-cyan-400 transition-colors">
                        {tournament.name}
                      </Link>
                    </div>
                    <Link href={`/tournaments/${tournament.id}`} className="text-gray-500 hover:text-cyan-400 text-sm transition-colors">→</Link>
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
