"use client";
export const dynamic = "force-dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import Link from "next/link";
import Image from "next/image";

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
        <div className="absolute inset-0 rounded-full border-2 border-blue-500/40 animate-spin-slow" />
        <div className="absolute inset-2 rounded-full border border-slate-500/40 animate-spin-reverse" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-slate-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-lg w-full animate-fade-in">
        <div className="relative w-24 h-24 animate-float">
          <Image src="/logo.png" alt="BeyMatch Logo" width={96} height={96} className="rounded-full object-cover w-full h-full ring-2 ring-blue-500/40" priority />
        </div>

        <div className="space-y-2">
          <h1 className="font-gaming text-5xl md:text-6xl font-black tracking-widest animate-pulse-glow">
            BEY<span className="text-blue-500">MATCH</span>
          </h1>
          <p className="text-gray-400 text-sm tracking-[0.3em] uppercase font-medium">{t("tournamentManager")}</p>
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          <Link href="/auth" className="card border-blue-500/20 bg-blue-600/5 p-4 flex flex-col items-center gap-2 hover:border-blue-400/40 transition-all group col-span-1 sm:col-span-2">
            <span className="text-3xl">⚔️</span>
            <p className="font-gaming text-sm font-bold tracking-widest text-blue-400 group-hover:text-blue-300 transition-colors">{t("signIn").toUpperCase()}</p>
            <p className="text-gray-400 text-xs">{t("adminAccess")}</p>
          </Link>
          <Link href="/t" className="card border-slate-500/20 bg-slate-500/5 p-4 flex flex-col items-center gap-2 hover:border-slate-400/40 transition-all group">
            <span className="text-3xl">📺</span>
            <p className="font-gaming text-sm font-bold tracking-widest text-slate-300 group-hover:text-white transition-colors">{t("watch")}</p>
            <p className="text-gray-400 text-xs">{t("liveResults")}</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
