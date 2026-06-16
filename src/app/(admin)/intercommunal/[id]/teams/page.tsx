"use client";

import { useEffect, useState } from "react";
import { 
  getIntercommunalTeams, 
  createIntercommunalTeam, 
  deleteIntercommunalTeam,
  getIntercommunalMembersByTeam,
  setIntercommunalTeamMembers
} from "@/services/intercommunalTeamService";
import type { IntercommunalTeam, IntercommunalMember } from "@/types/intercommunal";

export default function IntercommunalTeamsPage({
  params,
}: {
  params: { id: string };
}) {
  const [teams, setTeams] = useState<IntercommunalTeam[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Team state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Manage Members state
  const [managingTeam, setManagingTeam] = useState<IntercommunalTeam | null>(null);
  const [memberNames, setMemberNames] = useState<string[]>(["", "", "", ""]);
  const [isSavingMembers, setIsSavingMembers] = useState(false);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await getIntercommunalTeams(params.id);
      setTeams(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, [params.id]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setIsCreating(true);
    try {
      await createIntercommunalTeam(params.id, newTeamName.trim());
      setShowCreateModal(false);
      setNewTeamName("");
      loadTeams();
    } catch (error) {
      console.error(error);
      alert("Error al crear la comuna.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("¿Eliminar esta comuna y todos sus integrantes?")) return;
    try {
      await deleteIntercommunalTeam(teamId);
      loadTeams();
    } catch (error) {
      console.error(error);
      alert("Error al eliminar comuna.");
    }
  };

  const openManageMembers = async (team: IntercommunalTeam) => {
    setManagingTeam(team);
    try {
      const members = await getIntercommunalMembersByTeam(team.id);
      const names = ["", "", "", ""];
      members.forEach((m, i) => {
        if (i < 4) names[i] = m.name;
      });
      setMemberNames(names);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveMembers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingTeam) return;

    // Validate 4 non-empty names
    if (memberNames.some(name => !name.trim())) {
      alert("Debe ingresar los nombres de los 4 integrantes.");
      return;
    }

    setIsSavingMembers(true);
    try {
      const membersToSave = memberNames.map(name => ({ name: name.trim() }));
      await setIntercommunalTeamMembers(params.id, managingTeam.id, membersToSave);
      setManagingTeam(null);
      alert("Integrantes guardados correctamente.");
    } catch (error) {
      console.error(error);
      alert("Error al guardar integrantes.");
    } finally {
      setIsSavingMembers(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Comunas Inscritas</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold transition"
        >
          Agregar Comuna
        </button>
      </div>

      {loading ? (
        <div className="text-white">Cargando comunas...</div>
      ) : teams.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center text-gray-400">
          No hay comunas registradas en este torneo.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div key={team.id} className="bg-slate-800 rounded-lg p-5 border border-slate-700 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-4">{team.name}</h3>
              <div className="mt-auto flex space-x-2">
                <button
                  onClick={() => openManageMembers(team)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-sm transition"
                >
                  Gestionar Integrantes
                </button>
                <button
                  onClick={() => handleDeleteTeam(team.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm transition"
                >
                  X
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Agregar Comuna */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-sm w-full border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Nueva Comuna</h2>
            <form onSubmit={handleCreateTeam}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre de la Comuna</label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Ej: Ñuñoa"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition disabled:opacity-50"
                >
                  {isCreating ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gestionar Integrantes */}
      {managingTeam && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700 my-8">
            <h2 className="text-xl font-bold text-white mb-4">Integrantes de {managingTeam.name}</h2>
            <p className="text-sm text-gray-400 mb-4">Cada comuna debe tener exactamente 4 integrantes.</p>
            <form onSubmit={handleSaveMembers} className="space-y-4">
              {[0, 1, 2, 3].map((index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Integrante {index + 1}</label>
                  <input
                    type="text"
                    required
                    value={memberNames[index]}
                    onChange={(e) => {
                      const newNames = [...memberNames];
                      newNames[index] = e.target.value;
                      setMemberNames(newNames);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder={`Nombre Integrante ${index + 1}`}
                  />
                </div>
              ))}
              <div className="flex space-x-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setManagingTeam(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingMembers}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded transition disabled:opacity-50"
                >
                  {isSavingMembers ? "Guardando..." : "Guardar Integrantes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
