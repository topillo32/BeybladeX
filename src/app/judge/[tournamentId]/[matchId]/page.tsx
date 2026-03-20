"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthContext } from "@/lib/AuthContext";
import { MatchCard } from "@/components/ui/MatchCard";
import { Spinner } from "@/components/ui/Spinner";
import type { Match } from "@/types";

export default function JudgePage({ params }: { params: { tournamentId: string; matchId: string } }) {
  const { tournamentId, matchId } = params;
  const { user, loading: authLoading, isStaff } = useAuthContext();
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [matchLoading, setMatchLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/auth"); return; }
    if (!isStaff) { router.push("/player/tournaments"); return; }
  }, [user, authLoading, isStaff, router]);

  useEffect(() => {
    if (!user || !isStaff) return;
    return onSnapshot(doc(db, "tournaments", tournamentId, "matches", matchId), (d) => {
      setMatch(d.exists() ? ({ id: d.id, ...d.data() } as Match) : null);
      setMatchLoading(false);
    });
  }, [tournamentId, matchId, user, isStaff]);

  if (authLoading || matchLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712]">
      <Spinner size={12} />
    </div>
  );

  if (!match) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 font-gaming text-sm bg-[#030712]">
      Partida no encontrada.
    </div>
  );

  // Determine if this user is the assigned judge for this match's group
  // The group's judgeId is not on the match doc, but we pass callerUid + isAdmin
  // so the backend transaction validates it. UI will show lock if not judge.
  return (
    <div className="min-h-screen bg-[#030712] bg-grid flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <p className="font-gaming text-xs tracking-widest text-gray-500 mb-1">⚖️ PANEL DE JUEZ</p>
          <p className="text-gray-600 text-xs font-gaming">{user?.displayName}</p>
          <div className="divider-cyan mt-2" />
        </div>
        <MatchCard
          match={match}
          tournamentId={tournamentId}
          editable={true}
          callerUid={user?.uid}
          isAdmin={user?.role === "admin"}
        />
      </div>
    </div>
  );
}
