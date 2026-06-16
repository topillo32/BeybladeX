"use client";

import { useEffect, useState } from "react";
import { getIntercommunalStandings } from "@/services/intercommunalStandingService";
import type { IntercommunalTeamStanding } from "@/types/intercommunal";
import { getIntercommunalTournament } from "@/services/intercommunalTournamentService";

export default function IntercommunalStandingsPage({
  params,
}: {
  params: { id: string };
}) {
  const [standings, setStandings] = useState<IntercommunalTeamStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [qualifiersCount, setQualifiersCount] = useState(4);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [stData, tData] = await Promise.all([
          getIntercommunalStandings(params.id),
          getIntercommunalTournament(params.id),
        ]);
        setStandings(stData);
        if (tData) setQualifiersCount(tData.qualifiersCount);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [params.id]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Clasificación General</h2>
      </div>

      {loading ? (
        <div className="text-white">Cargando clasificación...</div>
      ) : standings.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center text-gray-400">
          No hay datos de clasificación aún. Asegúrate de generar los grupos y registrar partidas.
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-white">
              <thead className="bg-slate-900 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold text-center w-16">Pos</th>
                  <th className="px-4 py-3 font-semibold">Comuna</th>
                  <th className="px-4 py-3 font-semibold text-center">PJ</th>
                  <th className="px-4 py-3 font-semibold text-center text-green-400">V</th>
                  <th className="px-4 py-3 font-semibold text-center text-red-400">D</th>
                  <th className="px-4 py-3 font-semibold text-center">Pts</th>
                  <th className="px-4 py-3 font-semibold text-center">Pts Contra</th>
                  <th className="px-4 py-3 font-semibold text-center">Dif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {standings.map((team, index) => {
                  const isQualifying = index < qualifiersCount;
                  return (
                    <tr 
                      key={team.teamId} 
                      className={`hover:bg-slate-700/50 transition ${isQualifying ? "bg-green-900/10" : ""}`}
                    >
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm ${isQualifying ? "bg-green-600 text-white font-bold" : "text-gray-400"}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{team.teamName}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{team.matchesPlayed}</td>
                      <td className="px-4 py-3 text-center text-green-400 font-bold">{team.matchWins}</td>
                      <td className="px-4 py-3 text-center text-red-400">{team.matchLosses}</td>
                      <td className="px-4 py-3 text-center font-semibold">{team.pointsFor}</td>
                      <td className="px-4 py-3 text-center text-gray-400">{team.pointsAgainst}</td>
                      <td className="px-4 py-3 text-center font-mono">
                        {team.pointsDiff > 0 ? `+${team.pointsDiff}` : team.pointsDiff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-700 text-sm text-gray-400 bg-slate-800">
            <span className="inline-block w-3 h-3 bg-green-900/40 rounded mr-2"></span>
            Las primeras {qualifiersCount} comunas clasifican a la fase eliminatoria. Criterios de desempate: 1. Victorias, 2. Puntos a favor, 3. Diferencia de puntos.
          </div>
        </div>
      )}
    </div>
  );
}
