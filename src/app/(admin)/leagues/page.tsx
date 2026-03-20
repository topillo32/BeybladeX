"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { useLeagues } from "@/hooks/useTournament";
import { useAuthContext } from "@/lib/AuthContext";
import { createLeague, deleteLeague } from "@/services/leagueService";
import { useLang } from "@/lib/LangContext";

export default function LeaguesPage() {
  const { leagues, loading } = useLeagues();
  const { user, isAdmin } = useAuthContext();
  const { t } = useLang();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    setSubmitting(true);
    try {
      await createLeague(name.trim(), description.trim(), user.uid);
      setName(""); setDescription("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    await deleteLeague(id);
  };

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="font-gaming text-3xl font-black tracking-widest text-white">🏅 {t("leagues")}</h1>
          <div className="divider-cyan mt-3" />
        </div>

        {isAdmin && (
          <div className="card card-cyan p-5">
            <p className="section-title">{t("createLeague")}</p>
            <form onSubmit={handleCreate} className="space-y-3">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder={t("leagueName")} className="input-base" required />
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder={t("leagueDescription")} className="input-base text-sm" />
              <button type="submit" disabled={submitting} className="btn-primary w-full font-gaming text-xs tracking-wider">
                {submitting ? t("creating") : t("createLeague")}
              </button>
            </form>
          </div>
        )}

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
              {leagues.map((league) => (
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
          </div>
        )}
      </div>
    </div>
  );
}
