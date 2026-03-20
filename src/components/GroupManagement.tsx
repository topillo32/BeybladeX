import { useState, useEffect, FormEvent } from "react";
import { createGroup, getGroups, deleteGroup, generateGroups } from "../services/groupService";
import { collection, getDocs, query, where } from "firebase/firestore"; // Import directo para listar jugadores
import { db } from "../services/firebase";
import PlayerRegistrationForm from "./PlayerRegistrationForm";
import MatchList from "./MatchList";
import { Trash2, UserPlus, Users, Wand2, ShieldCheck, User, Swords } from "lucide-react";
import type { Player } from "@/types";

interface Group {
  id: string;
  name: string;
  playerIds: string[];
}

interface GroupManagementProps {
  tournamentId: string;
}

const GroupManagement = ({ tournamentId }: GroupManagementProps) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [playersPerGroup, setPlayersPerGroup] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroupForMatches, setSelectedGroupForMatches] = useState<Group | null>(null);

  // Cargar grupos al iniciar
  useEffect(() => {
    fetchGroups();
    fetchPlayers();
  }, [tournamentId]);

  const fetchPlayers = async () => {
    try {
      const q = query(collection(db, "players"), where("tournamentIds", "array-contains", tournamentId));
      const snapshot = await getDocs(q);
      const playersData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Player));
      setAvailablePlayers(playersData);
    } catch (err) {
      console.error("Error cargando jugadores:", err);
    }
  };

  const fetchGroups = async () => {
    try {
      const data = await getGroups(tournamentId);
      setGroups(data as Group[]);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los grupos.");
    }
  };

  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      await createGroup(tournamentId, newGroupName);
      setNewGroupName("");
      await fetchGroups(); // Recargar la lista
    } catch (err) {
      setError("Error al crear el grupo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm("¿Seguro que quieres eliminar este grupo?")) return;
    try {
      await deleteGroup(tournamentId, groupId);
      await fetchGroups();
    } catch (err: any) {
      setError(err.message || "Error al eliminar el grupo.");
    }
  };

  const handleGenerateGroups = async () => {
    if (selectedPlayers.length === 0) {
      setError("Selecciona al menos un jugador.");
      return;
    }
    if (groups.length > 0) {
        if(!window.confirm("Ya existen grupos. Generar nuevos grupos podría duplicar información si no se limpian los anteriores. ¿Continuar?")) return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const playersToGroup = availablePlayers.filter(p => selectedPlayers.includes(p.id));
      await generateGroups(tournamentId, playersToGroup, playersPerGroup);
      await fetchGroups();
      setSelectedPlayers([]); // Limpiar selección
    } catch (err: any) {
      setError(err.message || "Error al generar grupos.");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPlayers.length === availablePlayers.length) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(availablePlayers.map((p) => p.id));
    }
  };

  if (selectedGroupForMatches) {
      return (
          <div className="space-y-6">
              <button onClick={() => setSelectedGroupForMatches(null)} className="text-slate-400 hover:text-cyan-400 text-sm font-bold uppercase mb-4">← Volver a Grupos</button>
              <MatchList tournamentId={tournamentId} groupId={selectedGroupForMatches.id} groupName={selectedGroupForMatches.name} players={availablePlayers.filter(p => selectedGroupForMatches.playerIds.includes(p.id))} />
          </div>
      )
  }

  return (
    <div className="space-y-8">
      {/* Header de Gestión */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2"><ShieldCheck className="text-cyan-500"/> Gestión de Grupos</h3>
        <button
          onClick={() => setShowRegistration(!showRegistration)}
          className="text-sm bg-slate-800 hover:bg-slate-700 text-green-400 border border-green-500/30 py-2.5 px-5 rounded-lg font-bold uppercase shadow-lg transition-all flex items-center gap-2"
        >
          <UserPlus size={18} /> {showRegistration ? "Ocultar Registro" : "Registrar Nuevo Jugador"}
        </button>
      </div>

      {/* Formulario de Registro Desplegable */}
      {showRegistration && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300 flex justify-center">
          <PlayerRegistrationForm onSuccess={fetchPlayers} tournamentId={tournamentId} />
        </div>
      )}

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}

      {/* Sección de Generación Automática */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700">
        <h4 className="font-bold text-lg mb-4 text-white flex items-center gap-2">
            <Wand2 className="text-indigo-400" size={20}/> Generador Automático
        </h4>
        
        <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-500">Selecciona Jugadores ({selectedPlayers.length})</span>
                <button type="button" onClick={handleSelectAll} className="text-sm text-cyan-500 font-semibold hover:text-cyan-400">
                    {selectedPlayers.length === availablePlayers.length ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-60 overflow-y-auto p-2">
                {availablePlayers.map(player => (
                    <label key={player.id} 
                        className={`
                            flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                            ${selectedPlayers.includes(player.id)
                                ? 'bg-cyan-900/30 border-cyan-500/50' 
                                : 'bg-slate-800 border-slate-700 hover:border-slate-500'}
                        `}
                    >
                        <input 
                            type="checkbox" 
                            className="accent-cyan-500 w-4 h-4"
                            checked={selectedPlayers.includes(player.id)} 
                            onChange={() => togglePlayerSelection(player.id)} 
                        />
                        <span className="text-sm font-medium text-slate-300 truncate">{player.name}</span>
                    </label>
                ))}
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-end gap-4 mt-6">
            <div className="w-full sm:w-48">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Jugadores por Grupo</label>
                <input 
                    type="number" 
                    min="1" 
                    value={playersPerGroup} 
                    onChange={(e) => setPlayersPerGroup(parseInt(e.target.value))} 
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 focus:border-cyan-500 outline-none" 
                />
            </div>
            <button 
                onClick={handleGenerateGroups} 
                disabled={isLoading || selectedPlayers.length === 0} 
                className="w-full sm:w-auto flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-lg shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none transition-all"
            >
                {isLoading ? "Generando..." : "Mezclar y Crear Grupos"}
            </button>
        </div>
      </div>

      <div className="my-8 h-px bg-slate-800"></div>
      
      <div>
        <h4 className="font-bold text-xl text-white mb-4 uppercase italic">Grupos Activos</h4>

        {/* Formulario de Creación Manual */}
        <form onSubmit={handleCreateGroup} className="flex gap-3 mb-6">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Nombre nuevo grupo..."
            className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-2 focus:border-cyan-500 outline-none"
          disabled={isLoading}
        />
        <button
          type="submit"
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50 border border-slate-700"
          disabled={isLoading || !newGroupName.trim()}
        >
            Crear
        </button>
      </form>

      {/* Lista de Grupos */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
            <div key={group.id} className="bg-slate-900 rounded-xl p-5 shadow-lg border border-slate-800 hover:border-cyan-500/50 hover:shadow-cyan-500/10 transition-all relative group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <div className="bg-slate-800 text-cyan-400 p-2 rounded-lg">
                        <Users size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg text-white">{group.name}</h4>
                        <p className="text-xs text-slate-400 font-medium">{group.playerIds.length} Bladers</p>
                    </div>
                </div>
                <div className="flex gap-2">
                   <button
                    onClick={() => setSelectedGroupForMatches(group)}
                    className="text-slate-400 hover:text-cyan-400 transition-colors p-1"
                    title="Ver Partidas"
                   >
                       <Swords size={18} />
                   </button>
                   <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                    title="Eliminar grupo"
                   >
                    <Trash2 size={18} />
                   </button>
                </div>
              </div>
              
              {/* Mini lista de jugadores (preview) */}
              <div className="space-y-1 mt-4">
                  {group.playerIds.slice(0, 3).map((pid, idx) => {
                      // Intentamos buscar el nombre en availablePlayers si es posible, sino mostramos ID genérico
                      const player = availablePlayers.find(p => p.id === pid);
                      return (
                          <div key={idx} className="text-sm text-slate-400 flex items-center gap-2">
                              <User size={12} className="text-slate-600"/>
                              {player ? player.name : "Jugador..."}
                          </div>
                      )
                  })}
                  {group.playerIds.length > 3 && (
                      <p className="text-xs text-indigo-400 font-medium pl-5">+ {group.playerIds.length - 3} más...</p>
                  )}
                  {group.playerIds.length === 0 && <p className="text-xs text-slate-600 italic pl-5">Sin jugadores</p>}
            </div>
          </div>
        ))}
        {groups.length === 0 && (
            <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-800 rounded-xl">
                <p className="text-slate-500 font-medium">No hay grupos creados en este torneo.</p>
            </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default GroupManagement;