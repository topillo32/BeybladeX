"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getIntercommunalTournaments,
  createIntercommunalTournament,
  deleteIntercommunalTournament,
} from "@/services/intercommunalTournamentService";
import type { IntercommunalTournament } from "@/types/intercommunal";

export default function IntercommunalDashboardPage() {
  const [tournaments, setTournaments] = useState<IntercommunalTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Create Form State
  const [name, setName] = useState("");
  const [maxTeams, setMaxTeams] = useState(8);
  const [qualifiersCount, setQualifiersCount] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const data = await getIntercommunalTournaments();
      setTournaments(data);
    } catch (error) {
      console.error("Error loading tournaments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await createIntercommunalTournament({
        name,
        maxTeams,
        qualifiersCount,
      });
      setShowModal(false);
      setName("");
      setMaxTeams(8);
      setQualifiersCount(4);
      loadTournaments();
    } catch (error) {
      console.error("Error creating tournament:", error);
      alert("Error creating tournament");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tournament? All related data should be deleted manually for now.")) return;
    try {
      await deleteIntercommunalTournament(id);
      loadTournaments();
    } catch (error) {
      console.error("Error deleting tournament:", error);
      alert("Error deleting tournament");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Torneos Intercomunales</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold transition"
        >
          Nuevo Torneo
        </button>
      </div>

      {loading ? (
        <div className="text-white text-center py-10">Cargando...</div>
      ) : tournaments.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center text-gray-400">
          No hay torneos intercomunales registrados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-5 flex flex-col">
              <h2 className="text-xl font-bold text-white mb-2">{tournament.name}</h2>
              <div className="flex-grow space-y-1 text-sm text-gray-300 mb-4">
                <p><span className="font-semibold text-gray-400">Estado:</span> {tournament.status}</p>
                <p><span className="font-semibold text-gray-400">Max Equipos:</span> {tournament.maxTeams}</p>
                <p><span className="font-semibold text-gray-400">Clasifican:</span> {tournament.qualifiersCount}</p>
              </div>
              <div className="flex space-x-2 mt-auto pt-4 border-t border-slate-700">
                <button
                  onClick={() => router.push(`/intercommunal/${tournament.id}`)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-center font-medium transition"
                >
                  Gestionar
                </button>
                <button
                  onClick={() => handleDelete(tournament.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded font-medium transition"
                  title="Eliminar torneo"
                >
                  X
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Creación */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">Crear Nuevo Torneo</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre del Torneo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Ej: Liga Intercomunal Santiago 2026"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Max Comunas (Equipos)</label>
                  <input
                    type="number"
                    required
                    min={2}
                    value={maxTeams}
                    onChange={(e) => setMaxTeams(parseInt(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Cupos Clasificatorios</label>
                  <input
                    type="number"
                    required
                    min={2}
                    value={qualifiersCount}
                    onChange={(e) => setQualifiersCount(parseInt(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition disabled:opacity-50"
                >
                  {isSubmitting ? "Creando..." : "Crear Torneo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
