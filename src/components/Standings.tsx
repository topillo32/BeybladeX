import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

interface StandingsProps {
  tournamentId: string;
}

interface PlayerStats {
  id: string;
  name: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
}

const Standings = ({ tournamentId }: StandingsProps) => {
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    calculateStandings();
  }, [tournamentId]);

  const calculateStandings = async () => {
    setIsLoading(true);
    try {
      // 1. Obtener todas las partidas del torneo (esto requiere iterar grupos o tener una collection group query)
      // Para simplificar sin collectionGroup, iteramos los grupos primero
      const groupsSnapshot = await getDocs(collection(db, "tournaments", tournamentId, "groups"));
      const playerStatsMap: Record<string, PlayerStats> = {};

      for (const groupDoc of groupsSnapshot.docs) {
        const matchesSnapshot = await getDocs(collection(db, "tournaments", tournamentId, "matches")); // Nota: matches está dentro de torneo en la estructura original plana o anidada?
        // Asumimos estructura anidada tournaments/{id}/matches según matchService original
        // En el matchList.tsx usa getMatchesByGroup, que consulta matches con where groupId.
        // Aquí haremos fetch de TODOS los matches del torneo si la colección es root/matches o tournaments/matches.
        // Ajuste: matchService usa `tournaments/{id}/matches`. Podemos hacer fetch directo.
        
        const matchesRef = collection(db, "tournaments", tournamentId, "matches");
        const allMatches = await getDocs(matchesRef);

        allMatches.forEach(doc => {
            const m = doc.data();
            if (m.status !== "finished") return;

            const p1 = m.player1;
            const p2 = m.player2;

            // Init stats
            if (!playerStatsMap[p1.id]) playerStatsMap[p1.id] = { id: p1.id, name: p1.name, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, diff: 0 };
            if (!playerStatsMap[p2.id]) playerStatsMap[p2.id] = { id: p2.id, name: p2.name, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, diff: 0 };

            // Update points
            playerStatsMap[p1.id].pointsFor += p1.score;
            playerStatsMap[p1.id].pointsAgainst += p2.score;
            playerStatsMap[p2.id].pointsFor += p2.score;
            playerStatsMap[p2.id].pointsAgainst += p1.score;

            // Update wins
            if (p1.score > p2.score) {
                playerStatsMap[p1.id].wins++;
                playerStatsMap[p2.id].losses++;
            } else if (p2.score > p1.score) {
                playerStatsMap[p2.id].wins++;
                playerStatsMap[p1.id].losses++;
            }
        });
      }

      const sortedStats = Object.values(playerStatsMap).sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins;
          return (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst);
      });

      setStats(sortedStats);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-800">
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
            <Trophy className="text-yellow-400" size={20} />
            <h3 className="font-bold text-white uppercase italic">Ranking Global</h3>
        </div>
        <table className="w-full text-sm text-left text-slate-400">
            <thead className="text-xs text-slate-500 uppercase bg-slate-900/50">
                <tr>
                    <th className="px-6 py-3">Jugador</th>
                    <th className="px-6 py-3 text-center">W - L</th>
                    <th className="px-6 py-3 text-center">PTS</th>
                    <th className="px-6 py-3 text-center">Diff</th>
                </tr>
            </thead>
            <tbody>
                {stats.map((p, idx) => (
                    <tr key={p.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                            <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${idx < 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-800'}`}>{idx + 1}</span>
                            {p.name}
                        </td>
                        <td className="px-6 py-4 text-center"><span className="text-green-400">{p.wins}</span> - <span className="text-red-400">{p.losses}</span></td>
                        <td className="px-6 py-4 text-center text-white font-bold">{p.pointsFor}</td>
                        <td className="px-6 py-4 text-center">{p.pointsFor - p.pointsAgainst}</td>
                    </tr>
                ))}
                {stats.length === 0 && !isLoading && (
                    <tr><td colSpan={4} className="text-center py-6">Sin datos registrados</td></tr>
                )}
            </tbody>
        </table>
    </div>
  );
};

export default Standings;