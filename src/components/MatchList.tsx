import { useState, useEffect } from "react";
import { generateGroupMatches, getMatchesByGroup, updateMatchScore, Match } from "../services/matchService";
import { Swords, Save, Trophy } from "lucide-react";

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
    const data = await getMatchesByGroup(tournamentId, groupId);
    setMatches(data);
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      await generateGroupMatches(tournamentId, groupId, players);
      await loadMatches();
    } catch (error) {
      console.error(error);
      alert("Error generando partidas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScoreChange = async (matchId: string, p1Score: number, p2Score: number) => {
     // Actualización optimista local
     setMatches(prev => prev.map(m => 
        m.id === matchId ? { ...m, player1: {...m.player1, score: p1Score}, player2: {...m.player2, score: p2Score} } : m
     ));

     await updateMatchScore(tournamentId, matchId, p1Score, p2Score);
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
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
            {matches.map((match) => {
                const isFinished = match.player1.score >= 4 || match.player2.score >= 4;
                return (
                    <div key={match.id} className={`relative bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-lg flex items-center justify-between ${isFinished ? 'border-cyan-500/30 bg-slate-800/80' : ''}`}>
                        {/* Player 1 */}
                        <div className="flex-1 text-center">
                            <p className={`font-bold text-sm mb-2 truncate ${match.player1.score > match.player2.score && isFinished ? 'text-yellow-400' : 'text-slate-300'}`}>
                                {match.player1.name}
                            </p>
                            <input 
                                type="number" 
                                min="0"
                                value={match.player1.score}
                                onChange={(e) => handleScoreChange(match.id, parseInt(e.target.value) || 0, match.player2.score)}
                                className="w-16 h-12 text-2xl font-mono text-center bg-slate-900 border border-slate-600 rounded text-cyan-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none"
                            />
                        </div>

                        {/* VS */}
                        <div className="px-4 flex flex-col items-center justify-center">
                            <span className="text-slate-600 font-black italic text-xl">VS</span>
                            {isFinished && <Trophy size={16} className="text-yellow-500 mt-1" />}
                        </div>

                        {/* Player 2 */}
                        <div className="flex-1 text-center">
                            <p className={`font-bold text-sm mb-2 truncate ${match.player2.score > match.player1.score && isFinished ? 'text-yellow-400' : 'text-slate-300'}`}>
                                {match.player2.name}
                            </p>
                            <input 
                                type="number" 
                                min="0"
                                value={match.player2.score}
                                onChange={(e) => handleScoreChange(match.id, match.player1.score, parseInt(e.target.value) || 0)}
                                className="w-16 h-12 text-2xl font-mono text-center bg-slate-900 border border-slate-600 rounded text-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none"
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default MatchList;