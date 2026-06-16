"use client";

import { useEffect, useState } from "react";
import { 
  getIntercommunalGroups, 
  generateIntercommunalGroups, 
  createEmptyGroups,
  updateAllIntercommunalGroups 
} from "@/services/intercommunalGroupService";
import { getIntercommunalTeams, getIntercommunalMembersByTournament } from "@/services/intercommunalTeamService";
import { generateGroupMatches } from "@/services/intercommunalMatchService";
import type { IntercommunalGroup, IntercommunalTeam, IntercommunalMember } from "@/types/intercommunal";

export default function IntercommunalGroupsPage({
  params,
}: {
  params: { id: string };
}) {
  const [groups, setGroups] = useState<IntercommunalGroup[]>([]);
  const [teams, setTeams] = useState<Record<string, IntercommunalTeam>>({});
  const [members, setMembers] = useState<Record<string, IntercommunalMember>>({});
  
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Unassigned members for manual mode
  const [unassignedMembers, setUnassignedMembers] = useState<IntercommunalMember[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedGroups, fetchedTeams, fetchedMembers] = await Promise.all([
        getIntercommunalGroups(params.id),
        getIntercommunalTeams(params.id),
        getIntercommunalMembersByTournament(params.id),
      ]);

      setGroups(fetchedGroups.sort((a, b) => a.name.localeCompare(b.name)));
      
      const teamMap: Record<string, IntercommunalTeam> = {};
      fetchedTeams.forEach(t => teamMap[t.id] = t);
      setTeams(teamMap);

      const memberMap: Record<string, IntercommunalMember> = {};
      fetchedMembers.forEach(m => memberMap[m.id] = m);
      setMembers(memberMap);

      // Find unassigned members
      const assignedIds = new Set<string>();
      fetchedGroups.forEach(g => g.memberIds.forEach(id => assignedIds.add(id)));
      
      const unassigned = fetchedMembers.filter(m => !assignedIds.has(m.id));
      setUnassignedMembers(unassigned);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  const handleGenerateGroups = async () => {
    if (!confirm("¿Generar nuevos grupos al azar? Esto sobreescribirá los grupos actuales.")) return;
    setIsGenerating(true);
    try {
      await generateIntercommunalGroups(params.id);
      await loadData();
      alert("Grupos generados exitosamente.");
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Error al generar grupos.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateEmptyGroups = async () => {
    if (!confirm("¿Crear grupos vacíos para asignación manual? Esto borrará la distribución actual.")) return;
    setIsGenerating(true);
    try {
      await createEmptyGroups(params.id);
      await loadData();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Error al crear grupos vacíos.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMatches = async () => {
    // Check if there are any unassigned members
    if (unassignedMembers.length > 0) {
      if (!confirm("Hay integrantes sin asignar a un grupo. ¿Deseas generar los combates de todos modos con los grupos incompletos?")) return;
    }

    setIsGenerating(true);
    try {
      await generateGroupMatches(params.id, groups);
      alert("Enfrentamientos generados exitosamente. Ahora puedes ir a la pestaña 'Juez'.");
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Error al generar enfrentamientos.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Drag and drop logic
  const handleDragStart = (e: React.DragEvent, memberId: string, sourceGroupId: string | "unassigned") => {
    e.dataTransfer.setData("memberId", memberId);
    e.dataTransfer.setData("sourceGroupId", sourceGroupId);
  };

  const handleDrop = (e: React.DragEvent, targetGroupId: string | "unassigned") => {
    e.preventDefault();
    const memberId = e.dataTransfer.getData("memberId");
    const sourceGroupId = e.dataTransfer.getData("sourceGroupId");

    if (!memberId || sourceGroupId === targetGroupId) return;

    const member = members[memberId];
    if (!member) return;

    // Validate: no two members from same team in the target group (unless moving to unassigned)
    if (targetGroupId !== "unassigned") {
      const targetGroup = groups.find(g => g.id === targetGroupId);
      if (targetGroup) {
        const hasTeamConflict = targetGroup.memberIds.some(id => {
          const existingMember = members[id];
          return existingMember && existingMember.teamId === member.teamId;
        });

        if (hasTeamConflict) {
          alert(`No puedes agregar a este jugador porque ya hay un miembro de la comuna "${teams[member.teamId]?.name}" en este grupo.`);
          return;
        }

        if (targetGroup.memberIds.length >= 4) {
          alert("Este grupo ya tiene 4 integrantes.");
          return;
        }
      }
    }

    // Move logic
    if (sourceGroupId === "unassigned") {
      setUnassignedMembers(prev => prev.filter(m => m.id !== memberId));
    } else {
      setGroups(prev => prev.map(g => 
        g.id === sourceGroupId ? { ...g, memberIds: g.memberIds.filter(id => id !== memberId) } : g
      ));
    }

    if (targetGroupId === "unassigned") {
      setUnassignedMembers(prev => [...prev, member]);
    } else {
      setGroups(prev => prev.map(g => 
        g.id === targetGroupId ? { ...g, memberIds: [...g.memberIds, memberId] } : g
      ));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const saveManualGroups = async () => {
    setIsSaving(true);
    try {
      await updateAllIntercommunalGroups(groups);
      alert("Grupos guardados correctamente.");
    } catch (error) {
      console.error(error);
      alert("Error al guardar grupos.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Fase de Grupos</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCreateEmptyGroups}
            disabled={isGenerating || isSaving}
            className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-3 py-2 rounded text-sm transition"
          >
            Vaciar Grupos
          </button>
          <button
            onClick={handleGenerateGroups}
            disabled={isGenerating || isSaving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded text-sm transition"
          >
            Sorteo Automático
          </button>
          <button
            onClick={saveManualGroups}
            disabled={isGenerating || isSaving}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-2 rounded text-sm font-semibold transition"
          >
            {isSaving ? "Guardando..." : "Guardar Distribución"}
          </button>
          <button
            onClick={handleGenerateMatches}
            disabled={isGenerating || isSaving || groups.length === 0}
            className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-3 py-2 rounded text-sm font-semibold transition"
          >
            Generar Enfrentamientos
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-white">Cargando grupos...</div>
      ) : groups.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center text-gray-400">
          No hay grupos. Utiliza el "Sorteo Automático" o crea grupos vacíos para asignarlos manualmente.
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Main Groups Area */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group) => (
              <div 
                key={group.id} 
                className="bg-slate-800 rounded-lg p-4 border border-slate-700 flex flex-col min-h-[12rem]"
                onDrop={(e) => handleDrop(e, group.id)}
                onDragOver={handleDragOver}
              >
                <h3 className="text-xl font-bold text-white mb-4 border-b border-slate-700 pb-2">
                  {group.name} <span className="text-sm font-normal text-gray-400 ml-2">({group.memberIds.length}/4)</span>
                </h3>
                <ul className="space-y-2 flex-1">
                  {group.memberIds.map(memberId => {
                    const member = members[memberId];
                    if (!member) return null;
                    const team = teams[member.teamId];
                    return (
                      <li 
                        key={memberId} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, memberId, group.id)}
                        className="flex justify-between items-center bg-slate-900 p-2 rounded cursor-grab active:cursor-grabbing border border-slate-700/50 hover:border-blue-500/50 transition"
                      >
                        <span className="text-white font-medium text-sm">{member.name}</span>
                        <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded truncate max-w-[100px]" title={team?.name}>
                          {team ? team.name : "Sin Comuna"}
                        </span>
                      </li>
                    );
                  })}
                  {group.memberIds.length === 0 && (
                    <div className="h-full flex items-center justify-center text-gray-500 text-sm italic border-2 border-dashed border-slate-700 rounded py-8">
                      Arrastra jugadores aquí
                    </div>
                  )}
                </ul>
              </div>
            ))}
          </div>

          {/* Unassigned Area Sidebar */}
          <div className="w-full lg:w-72 shrink-0">
            <div 
              className="bg-slate-800 rounded-lg p-4 border border-slate-700 flex flex-col"
              onDrop={(e) => handleDrop(e, "unassigned")}
              onDragOver={handleDragOver}
            >
              <h3 className="text-lg font-bold text-red-400 mb-4 border-b border-slate-700 pb-2">
                Sin Asignar ({unassignedMembers.length})
              </h3>
              <ul className="space-y-2 flex-1 pr-2">
                {unassignedMembers.map(member => {
                  const team = teams[member.teamId];
                  return (
                    <li 
                      key={member.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, member.id, "unassigned")}
                      className="flex justify-between items-center bg-slate-900 p-2 rounded cursor-grab active:cursor-grabbing border border-slate-700 hover:border-red-500/50 transition"
                    >
                      <span className="text-white font-medium text-sm">{member.name}</span>
                      <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded truncate max-w-[80px]" title={team?.name}>
                        {team ? team.name : "?"}
                      </span>
                    </li>
                  );
                })}
                {unassignedMembers.length === 0 && (
                  <div className="text-center text-gray-500 text-sm mt-8">
                    Todos los jugadores han sido asignados.
                  </div>
                )}
              </ul>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
