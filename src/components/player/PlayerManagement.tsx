"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { Trash2, UserPlus, ShieldAlert, Users, Loader } from "lucide-react";
import type { Player } from "@/types";
import PlayerRegistrationForm from "../PlayerRegistrationForm";

const PlayerManagement = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  const fetchPlayers = async () => {
    setIsLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "players"));
      const playersList = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Player)
      );
      setPlayers(playersList);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los jugadores.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleDeletePlayer = async (playerId: string) => {
    if (window.confirm("¿Seguro que quieres eliminar este jugador de forma permanente?")) {
      try {
        await deleteDoc(doc(db, "players", playerId));
        await fetchPlayers(); // Recargar
      } catch (err) {
        console.error(err);
        setError("Error al eliminar el jugador.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <Users className="text-cyan-400" />
          <span>Gestión de <span className="text-cyan-400">Bladers</span></span>
        </h2>
        <button
          onClick={() => setShowRegister(!showRegister)}
          className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-400 hover:to-teal-400 text-white font-bold py-2.5 px-6 rounded-lg shadow-lg shadow-green-500/20 transition-all text-sm uppercase flex items-center gap-2"
        >
          <UserPlus size={18} />
          {showRegister ? "Ocultar Formulario" : "Nuevo Blader"}
        </button>
      </div>
      
      {showRegister && (
        <div className="flex justify-center p-4 bg-slate-900/50 rounded-xl animate-in fade-in slide-in-from-top-5 duration-300">
           <PlayerRegistrationForm onSuccess={fetchPlayers} />
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-slate-900 shadow-xl rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-5 min-h-[400px] relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
              <Loader className="animate-spin text-cyan-500" size={48} />
            </div>
          ) : players.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center h-full text-slate-500 py-16">
              <ShieldAlert size={64} className="mb-4 text-slate-600"/>
              <h3 className="font-bold text-xl text-slate-400">No hay Bladers</h3>
              <p>Aún no se han registrado jugadores en la base de datos.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-400">
                <thead className="text-xs text-slate-400 uppercase bg-slate-950/50">
                  <tr>
                    <th scope="col" className="px-6 py-3">Nombre</th>
                    <th scope="col" className="px-6 py-3 text-center">Torneos Jugados</th>
                    <th scope="col" className="px-6 py-3 text-center">Inscripciones Pendientes</th>
                    <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player) => (
                    <tr key={player.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                        {player.name}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-cyan-900 text-cyan-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                           {player.tournamentIds?.length || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-yellow-900 text-yellow-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                           {player.pendingTournamentIds?.length || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeletePlayer(player.id)}
                          className="text-slate-500 hover:text-red-500 p-2 rounded-md transition-colors"
                          title="Eliminar Jugador"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerManagement;