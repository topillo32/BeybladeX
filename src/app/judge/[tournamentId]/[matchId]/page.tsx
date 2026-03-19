"use client";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/services/firebase";
import { MatchCard } from "@/components/ui/MatchCard";
import type { Match } from "@/types";

export default function JudgePage({ params }: { params: { tournamentId: string; matchId: string } }) {
  const { tournamentId, matchId } = params;
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onSnapshot(doc(db, "tournaments", tournamentId, "matches", matchId), (d) => {
      setMatch(d.exists() ? ({ id: d.id, ...d.data() } as Match) : null);
      setLoading(false);
    });
  }, [tournamentId, matchId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-spin-slow" />
        <div className="absolute inset-2 rounded-full border border-purple-400/40 animate-spin-reverse" />
      </div>
    </div>
  );

  if (!match) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 font-gaming text-sm">
      Match not found.
    </div>
  );

  return (
    <div className="min-h-screen bg-[#030712] bg-grid flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <p className="font-gaming text-xs tracking-widest text-gray-500 mb-1">JUDGE PANEL</p>
          <div className="divider-cyan" />
        </div>
        <MatchCard match={match} tournamentId={tournamentId} editable={true} />
      </div>
    </div>
  );
}
