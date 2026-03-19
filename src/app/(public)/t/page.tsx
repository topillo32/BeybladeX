"use client";
import Link from "next/link";
import { useTournaments } from "@/hooks/useTournament";
import { StatusBadge } from "@/components/ui/Badges";

export default function PublicTournamentsPage() {
  const { tournaments, loading } = useTournaments();
  const active = tournaments.filter((t) => t.status !== "DRAFT");

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="font-gaming text-3xl font-black tracking-widest text-white">Live Tournaments</h1>
          <p className="text-gray-400 text-sm mt-1">Follow your favorite bladers in real time</p>
          <div className="divider-cyan mt-3" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-spin-slow" />
              <div className="absolute inset-1.5 rounded-full border border-purple-400/40 animate-spin-reverse" />
            </div>
          </div>
        ) : active.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-4xl mb-3">🏆</p>
            <p className="text-white font-semibold">No active tournaments</p>
            <p className="text-gray-400 text-sm mt-1">Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((t) => (
              <Link key={t.id} href={`/t/${t.id}`}
                className="card card-cyan p-5 flex items-center justify-between hover:border-cyan-400/40 transition-all group block">
                <div className="flex items-center gap-3">
                  <StatusBadge status={t.status} />
                  <p className="font-semibold text-white group-hover:text-cyan-400 transition-colors">{t.name}</p>
                </div>
                <span className="text-gray-500 group-hover:text-cyan-400 transition-colors">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
