import { useState, useEffect } from "react";
import { generateGroupMatches } from "../services/matchService";
import { getDocs, query, where, collection } from "firebase/firestore";
import { db } from "../services/firebase";
import { Swords, Trophy } from "lucide-react";
import type { Match, TournamentGroup } from "@/types";

interface MatchListProps {
  tournamentId: string;
  groupId: string;
  groupName: string;
  players: { id: string; name: string }[];
}

const MatchList = ({ tournamentId, groupId, groupName, players }: MatchListProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadMatches();
  }, [groupId]);

  const loadMatches = async () => {
    const snap = await getDocs(
      query(collection(db, "tournaments", tournamentId, "matches"), where("groupId", "==", groupId))
    );
    setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Match)));
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const group: TournamentGroup = { id: groupId, name: groupName, playerIds: players.map((p) => p.id), tournamentId } as TournamentGroup;
      await generateGroupMatches(tournamentId, group, players as any);
      await loadMatches();
    } catch (error) {
      console.error(error);
      alert("Error generando partidas");
    } finally {
      setIsLoading(false);
    }
  };

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
        <Swords size={48} className="mx-auto text-slate-600 mb-4" />
        <h3 className="text-xl text-white font-bold mb-2">No hay batallas iniciadas</h3>
        <p className="text-slate-400 mb-6">Genera los cruces para el {groupName}</p>
        <button
          onClick={handleGenerate}
          disabled={isLoading || players.length < 2}
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-6 rounded-full transition-all shadow-[0_0_15px_rgba(6,182,212,0.5)] disabled:opacity-50"
        >
          {isLoading ? "Generando..." : "GENERAR ENFRENTAMIENTOS"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Swords className="text-cyan-400" /> Arena: {groupName}
      </h3>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {matches.map((match) => (
          <div
            key={match.id}
            className={`bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-lg flex items-center justify-between ${match.isFinished ? "border-cyan-500/30" : ""}`}
          >
            <div className="flex-1 text-center">
              <p className={`font-bold text-sm mb-2 truncate ${match.winnerId === match.playerA.id ? "text-yellow-400" : "text-slate-300"}`}>
                {match.playerA.name}
              </p>
              <span className="text-2xl font-mono text-cyan-400">{match.playerAScore}</span>
            </div>
            <div className="px-4 flex flex-col items-center">
              <span className="text-slate-600 font-black italic text-xl">VS</span>
              {match.isFinished && <Trophy size={16} className="text-yellow-500 mt-1" />}
            </div>
            <div className="flex-1 text-center">
              <p className={`font-bold text-sm mb-2 truncate ${match.winnerId === match.playerB.id ? "text-yellow-400" : "text-slate-300"}`}>
                {match.playerB.name}
              </p>
              <span className="text-2xl font-mono text-red-400">{match.playerBScore}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MatchList;
