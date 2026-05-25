import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import type { AppUser } from "@/types";

/**
 * Obtiene jueces disponibles:
 * - staff/admin deben tener availableAsJudge=true
 * - leader está siempre disponible dentro de su comunidad
 * que no tengan ya un grupo activo asignado.
 * Un juez puede ser jugador en el torneo pero se filtra por grupo.
 */
const belongsToCommunity = (user: AppUser, communityId?: string) => {
  if (!communityId) return true;
  if (!user.communityId) return false;
  const userCommunityIds = Array.isArray(user.communityId)
    ? user.communityId
    : [user.communityId];
  return userCommunityIds.includes(communityId);
};

export const getAvailableJudges = async (
  alreadyAssignedJudgeIds: string[], // judgeIds ya asignados a otros grupos activos
  communityId?: string
): Promise<AppUser[]> => {
  const snap = await getDocs(
    query(collection(db, "users"),
      where("availableAsJudge", "==", true)
    )
  );
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() } as AppUser))
    .filter((u) =>
      (u.role === "staff" || u.role === "admin" || u.role === "leader") &&
      (u.role === "leader" || u.availableAsJudge === true) &&
      !alreadyAssignedJudgeIds.includes(u.uid) &&
      belongsToCommunity(u, communityId)
    );
};

/**
 * Asigna automáticamente jueces disponibles a grupos sin juez.
 * Respeta: no puede ser jugador del grupo, máximo 1 grupo activo por juez.
 */
export const autoAssignJudges = async (
  tournamentId: string,
  groups: { id: string; playerIds: string[]; judgeId?: string | null }[],
  players: { id: string; userId?: string }[],
  communityId?: string
): Promise<void> => {
  const activeJudgeIds = groups
    .filter((g) => g.judgeId)
    .map((g) => g.judgeId as string);

  const available = await getAvailableJudges(activeJudgeIds, communityId);
  if (available.length === 0) return;

  const groupsWithoutJudge = groups.filter((g) => !g.judgeId);

  for (const group of groupsWithoutJudge) {
    // Mapear los playerIds del grupo a userIds para comparar con el juez
    const groupPlayerUserIds = group.playerIds
      .map((pid) => players.find((p) => p.id === pid)?.userId)
      .filter(Boolean) as string[];

    const judge = available.find((j) => !groupPlayerUserIds.includes(j.uid));
    if (!judge) continue;

    await updateDoc(doc(db, "tournaments", tournamentId, "groups", group.id), {
      judgeId: judge.uid,
      judgeName: judge.displayName,
    });

    // Marcar como asignado para no reutilizarlo
    activeJudgeIds.push(judge.uid);
    // Quitar de disponibles localmente para no asignarlo a otro grupo en el mismo proceso
    available.splice(available.indexOf(judge), 1);
  }
};

/**
 * Cuando un grupo termina, libera al juez y lo reasigna al siguiente grupo sin juez.
 */
export const reassignJudgeOnGroupComplete = async (
  tournamentId: string,
  completedGroupId: string,
  players: { id: string; userId?: string }[]
): Promise<void> => {
  const groupsSnap = await getDocs(
    collection(db, "tournaments", tournamentId, "groups")
  );
  const allGroups = groupsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
  const completedGroup = allGroups.find((g: any) => g.id === completedGroupId);
  if (!completedGroup?.judgeId) return;

  const freedJudgeId   = completedGroup.judgeId;
  const freedJudgeName = completedGroup.judgeName;

  // Quitar juez del grupo completado
  await updateDoc(doc(db, "tournaments", tournamentId, "groups", completedGroupId), {
    judgeId: null, judgeName: null,
  });

  // Buscar siguiente grupo sin juez
  const nextGroup = allGroups.find((g: any) => {
    if (g.id === completedGroupId || g.judgeId) return false;
    const groupPlayerUserIds = (g.playerIds as string[])
      .map((pid: string) => players.find((p) => p.id === pid)?.userId)
      .filter(Boolean) as string[];
    return !groupPlayerUserIds.includes(freedJudgeId);
  });

  if (nextGroup) {
    await updateDoc(doc(db, "tournaments", tournamentId, "groups", nextGroup.id), {
      judgeId: freedJudgeId,
      judgeName: freedJudgeName,
    });
  }
};

export const setJudgeAvailability = (uid: string, available: boolean) =>
  updateDoc(doc(db, "users", uid), { availableAsJudge: available });
