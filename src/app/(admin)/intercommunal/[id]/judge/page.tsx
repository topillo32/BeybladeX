"use client";

import { useEffect, useState } from "react";
import { getIntercommunalMatchesByTournament, updateIntercommunalMatch } from "@/services/intercommunalMatchService";
import { getIntercommunalMembersByTournament, getIntercommunalTeams } from "@/services/intercommunalTeamService";
import { getIntercommunalGroups } from "@/services/intercommunalGroupService";
import type { IntercommunalMatch, IntercommunalMember, IntercommunalTeam, IntercommunalGroup } from "@/types/intercommunal";

export default function IntercommunalJudgePage({
  params,
}: {
  params: { id: string };
}) {
  const [matches, setMatches] = useState<IntercommunalMatch[]>([]);
  const [members, setMembers] = useState<Record<string, IntercommunalMember>>({});
  const [teams, setTeams] = useState<Record<string, IntercommunalTeam>>({});
  const [groups, setGroups] = useState<Record<string, IntercommunalGroup>>({});
  const [loading, setLoading] = useState(true);

  // Judge Modal State
  const [judgingMatch, setJudgingMatch] = useState<IntercommunalMatch | null>(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedMatches, fetchedMembers, fetchedTeams, fetchedGroups] = await Promise.all([
        getIntercommunalMatchesByTournament(params.id),
        getIntercommunalMembersByTournament(params.id),
        getIntercommunalTeams(params.id),
        getIntercommunalGroups(params.id),
      ]);

      setMatches(fetchedMatches);
      
      const memberMap: Record<string, IntercommunalMember> = {};
      fetchedMembers.forEach(m => memberMap[m.id] = m);
      setMembers(memberMap);

      const teamMap: Record<string, IntercommunalTeam> = {};
      fetchedTeams.forEach(t => teamMap[t.id] = t);
      setTeams(teamMap);

      const groupMap: Record<string, IntercommunalGroup> = {};
      fetchedGroups.forEach(g => groupMap[g.id] = g);
      setGroups(groupMap);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  const openJudgeModal = (match: IntercommunalMatch) => {
    setJudgingMatch(match);
    setScoreA(match.memberAScore || 0);
    setScoreB(match.memberBScore || 0);
    setWinnerId(match.winnerMemberId);
  };

  const handleJudgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judgingMatch) return;
    if (!winnerId) {
      alert("Debes seleccionar un ganador.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateIntercommunalMatch(
        judgingMatch.id,
        scoreA,
        scoreB,
        true,
        winnerId,
        judgingMatch.history || []
      );
      setJudgingMatch(null);
      await loadData();
    } catch (error) {
      console.error(error);
      alert("Error al guardar el resultado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="text-white p-6">Cargando partidas...</div>;

  const pendingMatches = matches.filter(m => !m.isFinished);
  const finishedMatches = matches.filter(m => m.isFinished);

  const getMatchTitle = (match: IntercommunalMatch) => {
    const memberA = members[match.memberAId];
    const memberB = members[match.memberBId];
    const teamA = memberA ? teams[memberA.teamId] : null;
    const teamB = memberB ? teams[memberB.teamId] : null;

    const nameA = memberA ? `${memberA.name} (${teamA?.name || '?'})` : "Desconocido";
    const nameB = memberB ? `${memberB.name} (${teamB?.name || '?'})` : "Desconocido";

    return `${nameA} vs ${nameB}`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Partidas Pendientes</h2>
        {pendingMatches.length === 0 ? (
          <div className="bg-slate-800 rounded p-6 text-gray-400">No hay partidas pendientes.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingMatches.map(match => {
              const group = match.groupId ? groups[match.groupId] : null;
              return (
                <div key={match.id} className="bg-slate-800 border border-slate-700 rounded p-4 flex flex-col">
                  <div className="text-xs text-blue-400 mb-2 font-bold">{group?.name || "Fase Eliminatoria"}</div>
                  <div className="text-white font-medium mb-4">{getMatchTitle(match)}</div>
                  <button
                    onClick={() => openJudgeModal(match)}
                    className="mt-auto bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-semibold transition"
                  >
                    Juzgar Partida
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Partidas Finalizadas</h2>
        {finishedMatches.length === 0 ? (
          <div className="bg-slate-800 rounded p-6 text-gray-400">No hay partidas finalizadas.</div>
        ) : (
          <div className="overflow-x-auto bg-slate-800 rounded border border-slate-700">
            <table className="w-full text-left text-white text-sm">
              <thead className="bg-slate-900 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Fase/Grupo</th>
                  <th className="px-4 py-3">Jugador A</th>
                  <th className="px-4 py-3 text-center">Score</th>
                  <th className="px-4 py-3">Jugador B</th>
                  <th className="px-4 py-3">Ganador</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {finishedMatches.map(match => {
                  const group = match.groupId ? groups[match.groupId] : null;
                  const memberA = members[match.memberAId];
                  const memberB = members[match.memberBId];
                  const winner = match.winnerMemberId ? members[match.winnerMemberId] : null;

                  return (
                    <tr key={match.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-blue-400 font-medium">{group?.name || "KO"}</td>
                      <td className="px-4 py-3">{memberA?.name}</td>
                      <td className="px-4 py-3 text-center font-bold font-mono text-lg bg-slate-900/50">
                        {match.memberAScore} - {match.memberBScore}
                      </td>
                      <td className="px-4 py-3">{memberB?.name}</td>
                      <td className="px-4 py-3 text-green-400 font-medium">{winner?.name}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openJudgeModal(match)}
                          className="text-blue-400 hover:text-blue-300 underline text-xs"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Judge Modal */}
      {judgingMatch && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700 my-8">
            <h2 className="text-xl font-bold text-white mb-2">Registrar Resultado</h2>
            <div className="text-gray-400 text-sm mb-6 pb-4 border-b border-slate-700">
              {getMatchTitle(judgingMatch)}
            </div>

            <form onSubmit={handleJudgeSubmit} className="space-y-6">
              <div className="flex justify-between items-center bg-slate-900 p-4 rounded border border-slate-700">
                <div className="flex-1 text-center">
                  <label className="block text-sm font-bold text-white mb-2 truncate px-2" title={members[judgingMatch.memberAId]?.name}>
                    {members[judgingMatch.memberAId]?.name}
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={scoreA}
                    onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
                    className="w-20 text-center bg-slate-800 border border-slate-600 rounded px-2 py-2 text-white font-mono text-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="px-4 text-gray-500 font-bold text-xl">-</div>
                <div className="flex-1 text-center">
                  <label className="block text-sm font-bold text-white mb-2 truncate px-2" title={members[judgingMatch.memberBId]?.name}>
                    {members[judgingMatch.memberBId]?.name}
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={scoreB}
                    onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
                    className="w-20 text-center bg-slate-800 border border-slate-600 rounded px-2 py-2 text-white font-mono text-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Ganador del Match</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setWinnerId(judgingMatch.memberAId)}
                    className={`py-2 px-3 rounded font-semibold border transition ${
                      winnerId === judgingMatch.memberAId 
                        ? "bg-green-600 border-green-500 text-white" 
                        : "bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600"
                    }`}
                  >
                    {members[judgingMatch.memberAId]?.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWinnerId(judgingMatch.memberBId)}
                    className={`py-2 px-3 rounded font-semibold border transition ${
                      winnerId === judgingMatch.memberBId 
                        ? "bg-green-600 border-green-500 text-white" 
                        : "bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600"
                    }`}
                  >
                    {members[judgingMatch.memberBId]?.name}
                  </button>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setJudgingMatch(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition disabled:opacity-50 font-bold"
                >
                  {isSubmitting ? "Guardando..." : "Finalizar Match"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
