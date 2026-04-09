"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/AuthContext";
import { JudgeMatchControl } from "@/components/judge/JudgeMatchControl";
import { Spinner } from "@/components/ui/Spinner";

export default function JudgePage({ params }: { params: { tournamentId: string; matchId: string } }) {
  const { tournamentId, matchId } = params;
  const { user, loading: authLoading, isStaff } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth");
      return;
    }
    if (!isStaff) router.push("/player/tournaments");
  }, [user, authLoading, isStaff, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f766e]">
        <Spinner size={12} />
      </div>
    );
  }

  if (!user || !isStaff) return null;

  return (
    <div className="min-h-screen bg-[#0f766e] bg-grid flex items-start justify-center px-4 py-6">
      <div className="w-full max-w-md">
        <p className="font-gaming text-xs tracking-widest text-gray-500 text-center mb-2">⚖️ PANEL DE JUEZ</p>
        <p className="text-gray-600 text-xs font-gaming text-center mb-4">{user.displayName}</p>
        <JudgeMatchControl tournamentId={tournamentId} matchId={matchId} />
      </div>
    </div>
  );
}
