"use client";

import { useEffect, useState } from "react";
import { 
  getIntercommunalTournament, 
  advanceIntercommunalTournamentStatus 
} from "@/services/intercommunalTournamentService";
import { getIntercommunalTeams } from "@/services/intercommunalTeamService";
import type { IntercommunalTournament, IntercommunalTeam } from "@/types/intercommunal";

export default function IntercommunalTournamentDashboardPage({
  params,
}: {
  params: { id: string };
}) {
  const [tournament, setTournament] = useState<IntercommunalTournament | null>(null);
  const [teams, setTeams] = useState<IntercommunalTeam[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const t = await getIntercommunalTournament(params.id);
      setTournament(t);
      if (t) {
        const tms = await getIntercommunalTeams(t.id);
        setTeams(tms);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  const handleAdvanceStatus = async (nextStatus: IntercommunalTournament["status"]) => {
    if (!confirm(`¿Estás seguro de avanzar el torneo al estado: ${nextStatus}?`)) return;
    try {
      await advanceIntercommunalTournamentStatus(params.id, nextStatus);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Error al cambiar estado.");
    }
  };

  if (loading) return <div className="text-white">Cargando...</div>;
  if (!tournament) return <div className="text-white">Torneo no encontrado.</div>;

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">Panel de Control</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900 p-4 rounded border border-slate-700">
            <p className="text-gray-400 text-sm">Estado Actual</p>
            <p className="text-2xl font-bold text-blue-400">{tournament.status}</p>
          </div>
          <div className="bg-slate-900 p-4 rounded border border-slate-700">
            <p className="text-gray-400 text-sm">Comunas Registradas</p>
            <p className="text-2xl font-bold text-white">{teams.length} / {tournament.maxTeams}</p>
          </div>
          <div className="bg-slate-900 p-4 rounded border border-slate-700">
            <p className="text-gray-400 text-sm">Cupos a Eliminatorias</p>
            <p className="text-2xl font-bold text-white">{tournament.qualifiersCount}</p>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-lg font-semibold text-white mb-3">Acciones de Estado</h3>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={tournament.status !== "DRAFT"}
              onClick={() => handleAdvanceStatus("REGISTRATION")}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-gray-500 text-white px-4 py-2 rounded font-medium transition"
            >
              Abrir Inscripciones
            </button>
            <button
              disabled={tournament.status !== "REGISTRATION"}
              onClick={() => handleAdvanceStatus("GROUPS")}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-gray-500 text-white px-4 py-2 rounded font-medium transition"
            >
              Iniciar Fase de Grupos
            </button>
            <button
              disabled={tournament.status !== "GROUPS"}
              onClick={() => handleAdvanceStatus("KNOCKOUT")}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:text-gray-500 text-white px-4 py-2 rounded font-medium transition"
            >
              Pasar a Eliminatorias
            </button>
            <button
              disabled={tournament.status !== "KNOCKOUT"}
              onClick={() => handleAdvanceStatus("FINISHED")}
              className="bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-gray-500 text-white px-4 py-2 rounded font-medium transition"
            >
              Finalizar Torneo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
