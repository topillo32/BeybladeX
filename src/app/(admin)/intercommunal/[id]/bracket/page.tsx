"use client";

import { useEffect, useState } from "react";
import { getIntercommunalTournament } from "@/services/intercommunalTournamentService";
import { getIntercommunalTeams } from "@/services/intercommunalTeamService";
import { 
  getIntercommunalTeamMatches, 
  generateKnockoutBracket,
  updateIntercommunalTeamMatch
} from "@/services/intercommunalTeamMatchService";
import type { IntercommunalTournament, IntercommunalTeam, IntercommunalTeamMatch, MatchPhase } from "@/types/intercommunal";

export default function IntercommunalBracketPage({
  params,
}: {
  params: { id: string };
}) {
  const [tournament, setTournament] = useState<IntercommunalTournament | null>(null);
  const [teams, setTeams] = useState<Record<string, IntercommunalTeam>>({});
  const [teamMatches, setTeamMatches] = useState<IntercommunalTeamMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Edit Modal State
  const [editingMatch, setEditingMatch] = useState<IntercommunalTeamMatch | null>(null);
  const [winsA, setWinsA] = useState(0);
  const [winsB, setWinsB] = useState(0);
  const [pointsA, setPointsA] = useState(0);
  const [pointsB, setPointsB] = useState(0);
  const [winnerId, setWinnerId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tData, tmsData, tmMatchesData] = await Promise.all([
        getIntercommunalTournament(params.id),
        getIntercommunalTeams(params.id),
        getIntercommunalTeamMatches(params.id),
      ]);

      setTournament(tData);

      const teamMap: Record<string, IntercommunalTeam> = {};
      tmsData.forEach(t => teamMap[t.id] = t);
      setTeams(teamMap);

      setTeamMatches(tmMatchesData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  const handleGenerateBracket = async () => {
    if (!tournament) return;
    if (!confirm(`¿Generar bracket con ${tournament.qualifiersCount} comunas? Esto sobreescribirá la fase actual.`)) return;
    
    setIsGenerating(true);
    try {
      await generateKnockoutBracket(params.id, tournament.qualifiersCount);
      await loadData();
      alert("Sorteo realizado y llaves generadas.");
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Error al generar bracket.");
    } finally {
      setIsGenerating(false);
    }
  };

  const openEditModal = (match: IntercommunalTeamMatch) => {
    setEditingMatch(match);
    setWinsA(match.teamAWins || 0);
    setWinsB(match.teamBWins || 0);
    setPointsA(match.teamAPoints || 0);
    setPointsB(match.teamBPoints || 0);
    setWinnerId(match.winnerTeamId);
  };

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;
    if (!winnerId) {
      alert("Debes seleccionar un ganador.");
      return;
    }

    try {
      await updateIntercommunalTeamMatch(editingMatch.id, {
        teamAWins: winsA,
        teamBWins: winsB,
        teamAPoints: pointsA,
        teamBPoints: pointsB,
        isFinished: true,
        winnerTeamId: winnerId,
      });
      setEditingMatch(null);
      await loadData();
    } catch (error) {
      console.error(error);
      alert("Error al actualizar la llave.");
    }
  };

  if (loading) return <div className="text-white">Cargando eliminatorias...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Fase Eliminatoria</h2>
        <button
          onClick={handleGenerateBracket}
          disabled={isGenerating}
          className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 text-white px-4 py-2 rounded font-semibold transition"
        >
          {isGenerating ? "Generando..." : "Realizar Sorteo (Bolillero)"}
        </button>
      </div>

      {teamMatches.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center text-gray-400">
          No hay llaves generadas. Haz clic en "Realizar Sorteo" para emparejar a las comunas clasificadas.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teamMatches.map(match => {
            const teamA = teams[match.teamAId];
            const teamB = teams[match.teamBId];
            return (
              <div key={match.id} className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <div className="text-sm font-bold text-blue-400 mb-4">{match.phase}</div>
                
                <div className="space-y-3 mb-6">
                  {/* Team A */}
                  <div className={`flex justify-between items-center p-3 rounded ${match.winnerTeamId === match.teamAId ? 'bg-green-900/30 border border-green-700/50' : 'bg-slate-900'}`}>
                    <span className={`font-semibold ${match.winnerTeamId === match.teamAId ? 'text-green-400' : 'text-white'}`}>
                      {teamA?.name || "Desconocido"}
                    </span>
                    <span className="font-mono text-xl font-bold text-white">{match.teamAWins}</span>
                  </div>
                  
                  {/* Team B */}
                  <div className={`flex justify-between items-center p-3 rounded ${match.winnerTeamId === match.teamBId ? 'bg-green-900/30 border border-green-700/50' : 'bg-slate-900'}`}>
                    <span className={`font-semibold ${match.winnerTeamId === match.teamBId ? 'text-green-400' : 'text-white'}`}>
                      {teamB?.name || "Desconocido"}
                    </span>
                    <span className="font-mono text-xl font-bold text-white">{match.teamBWins}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditModal(match)}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-sm font-medium transition"
                  >
                    Editar Resultado Global
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Match Modal */}
      {editingMatch && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700 my-8">
            <h2 className="text-xl font-bold text-white mb-6">Registrar Resultado de Llave</h2>
            
            <form onSubmit={handleSaveMatch} className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-900 p-4 rounded border border-slate-700">
                <div className="text-center">
                  <div className="text-white font-bold mb-2 truncate" title={teams[editingMatch.teamAId]?.name}>
                    {teams[editingMatch.teamAId]?.name}
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Victorias</label>
                    <input
                      type="number"
                      min={0}
                      value={winsA}
                      onChange={e => setWinsA(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-center font-mono focus:outline-none focus:border-blue-500 mb-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Puntos</label>
                    <input
                      type="number"
                      min={0}
                      value={pointsA}
                      onChange={e => setPointsA(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-center font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-white font-bold mb-2 truncate" title={teams[editingMatch.teamBId]?.name}>
                    {teams[editingMatch.teamBId]?.name}
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Victorias</label>
                    <input
                      type="number"
                      min={0}
                      value={winsB}
                      onChange={e => setWinsB(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-center font-mono focus:outline-none focus:border-blue-500 mb-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Puntos</label>
                    <input
                      type="number"
                      min={0}
                      value={pointsB}
                      onChange={e => setPointsB(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-center font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Ganador de la Llave</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setWinnerId(editingMatch.teamAId)}
                    className={`py-2 px-3 rounded font-semibold border transition ${
                      winnerId === editingMatch.teamAId 
                        ? "bg-green-600 border-green-500 text-white" 
                        : "bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600"
                    }`}
                  >
                    {teams[editingMatch.teamAId]?.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWinnerId(editingMatch.teamBId)}
                    className={`py-2 px-3 rounded font-semibold border transition ${
                      winnerId === editingMatch.teamBId 
                        ? "bg-green-600 border-green-500 text-white" 
                        : "bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600"
                    }`}
                  >
                    {teams[editingMatch.teamBId]?.name}
                  </button>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition font-bold"
                >
                  Guardar Llave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
