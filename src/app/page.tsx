"use client";
export const dynamic = "force-dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import Link from "next/link";

export default function RootPage() {
  const { user, loading } = useAuthContext();
  const { t } = useLang();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push("/dashboard");
  }, [user, loading, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-spin-slow" />
        <div className="absolute inset-2 rounded-full border border-purple-400/40 animate-spin-reverse" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-purple-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-lg w-full animate-fade-in">
        <div className="relative w-24 h-24 animate-float">
          <div className="absolute inset-0 rounded-full border-[3px] border-cyan-400/40 animate-spin-slow" />
          <div className="absolute inset-2.5 rounded-full border-2 border-purple-400/40 animate-spin-reverse" />
          <div className="absolute inset-5 rounded-full border border-amber-400/40 animate-spin-slow" />
          <div className="absolute inset-0 flex items-center justify-center text-4xl">🌀</div>
        </div>

        <div className="space-y-2">
          <h1 className="font-gaming text-5xl md:text-6xl font-black tracking-widest animate-pulse-glow">
            BEYBLADE<span className="text-cyan-400">X</span>
          </h1>
          <p className="text-gray-400 text-sm tracking-[0.3em] uppercase font-medium">{t("tournamentManager")}</p>
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          <Link href="/auth" className="card card-cyan p-5 flex flex-col items-center gap-2 hover:border-cyan-400/40 transition-all group col-span-1 sm:col-span-2">
            <span className="text-3xl">⚔️</span>
            <p className="font-gaming text-sm font-bold tracking-widest text-cyan-300 group-hover:text-cyan-200 transition-colors">{t("signIn").toUpperCase()}</p>
            <p className="text-gray-400 text-xs">{t("adminAccess")}</p>
          </Link>
          <Link href="/t" className="card card-purple p-5 flex flex-col items-center gap-2 hover:border-purple-400/40 transition-all group">
            <span className="text-3xl">📺</span>
            <p className="font-gaming text-sm font-bold tracking-widest text-purple-300 group-hover:text-purple-200 transition-colors">{t("watch")}</p>
            <p className="text-gray-400 text-xs">{t("liveResults")}</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
