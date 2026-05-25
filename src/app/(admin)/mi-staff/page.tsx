"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllUsers, assignUserToStaffInCommunity } from "@/services/authService";
import { setJudgeAvailability } from "@/services/judgeService";
import { useAuthContext } from "@/lib/AuthContext";
import { Spinner } from "@/components/ui/Spinner";
import { RoleBadge } from "@/components/ui/Badges";
import { useLang } from "@/lib/LangContext";
import type { AppUser } from "@/types";

export default function MyStaffPage() {
  const { user, loading, isAdmin } = useAuthContext();
  const router = useRouter();
  const { t } = useLang();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [judgeUpdatingUid, setJudgeUpdatingUid] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/auth");
      return;
    }
    if (!isAdmin && user.role !== "leader") {
      router.push("/dashboard");
    }
  }, [user, loading, isAdmin, router]);

  useEffect(() => {
    if (!user) return;

    const loadUsers = async () => {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
      setLoadingUsers(false);
    };

    void loadUsers();
  }, [user]);

  const leaderCommunityIds = useMemo(() => {
    if (!user?.communityId) return [];
    return Array.isArray(user.communityId) ? user.communityId : [user.communityId];
  }, [user?.communityId]);

  const currentCommunityId = leaderCommunityIds[0] ?? null;

  const communityStaff = useMemo(
    () => users.filter(
      (u) => u.role === "staff" && u.communityId && (
        Array.isArray(u.communityId)
          ? u.communityId.some((cid) => leaderCommunityIds.includes(cid))
          : leaderCommunityIds.includes(u.communityId)
      )
    ),
    [users, leaderCommunityIds]
  );

  const candidateUsers = useMemo(
    () => users
      .filter((u) => u.uid !== user?.uid && u.role !== "admin" && u.role !== "leader")
      .filter((u) => u.displayName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())),
    [users, search, user?.uid]
  );

  const handleAssignStaff = async (uid: string) => {
    if (!currentCommunityId) {
      setMessage("No tienes una comunidad asignada.");
      return;
    }

    setUpdatingUid(uid);
    setMessage(null);
    try {
      await assignUserToStaffInCommunity(uid, currentCommunityId);
      setUsers((prev) => prev.map((u) => {
        if (u.uid !== uid) return u;
        const existing = u.communityId;
        let nextCommunityId: string | string[] | null = currentCommunityId;

        if (Array.isArray(existing)) {
          nextCommunityId = Array.from(new Set([...existing, currentCommunityId]));
        } else if (existing && existing !== currentCommunityId) {
          nextCommunityId = Array.from(new Set([existing, currentCommunityId]));
        }

        return { ...u, role: "staff", communityId: nextCommunityId };
      }));
      setMessage("Usuario asignado como staff en tu comunidad.");
    } catch (error: any) {
      setMessage(error?.message || "No se pudo asignar el usuario.");
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleJudgeAvailability = async (uid: string, available: boolean) => {
    setJudgeUpdatingUid(uid);
    setMessage(null);
    try {
      await setJudgeAvailability(uid, available);
      setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, availableAsJudge: available } : u));
      setMessage(available ? "Usuario marcado como disponible para juzgar." : "Usuario marcado como no disponible para juzgar.");
    } catch (error: any) {
      setMessage(error?.message || "No se pudo actualizar la disponibilidad.");
    } finally {
      setJudgeUpdatingUid(null);
    }
  };

  if (loading || loadingUsers) {
    return (
      <div className="page-wrapper flex items-center justify-center min-h-[60vh]">
        <Spinner size={14} />
      </div>
    );
  }

  if (!currentCommunityId) {
    return (
      <div className="page-wrapper">
        <div className="card card-cyan p-8">
          <h1 className="font-gaming text-2xl text-white">Mi Staff</h1>
          <p className="text-gray-400 mt-3">Tu cuenta no está asignada a ninguna comunidad. Contacta a un admin para asignarte una comunidad antes de agregar staff.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-5xl space-y-6">
        <div className="text-center">
          <h1 className="font-gaming text-3xl font-black tracking-widest text-white">Mi Staff</h1>
          <p className="text-gray-400 text-sm mt-1">Lista global de usuarios; asigna staff dentro de tu comunidad.</p>
          <div className="divider-cyan mt-3" />
        </div>

        {message && (
          <div className="card p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
            {message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <div className="card card-cyan p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="section-title">Staff en mi comunidad</p>
              <span className="text-xs text-gray-400">{communityStaff.length} usuarios</span>
            </div>
            {communityStaff.length === 0 ? (
              <p className="text-white/50 text-sm">No hay staff asignado en tu comunidad.</p>
            ) : (
              <ul className="space-y-3">
                {communityStaff.map((staff) => (
                  <li key={staff.uid} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-white">{staff.displayName}</p>
                        <p className="text-xs text-white/50 mt-1">
                          {staff.availableAsJudge
                            ? "⚖️ Disponible para juzgar"
                            : "⚖️ No disponible para juzgar"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => void handleJudgeAvailability(staff.uid, !staff.availableAsJudge)}
                          disabled={judgeUpdatingUid === staff.uid}
                          className={`text-xs font-gaming px-3 py-1 rounded-lg border transition-all ${
                            staff.availableAsJudge
                              ? "text-green-400 border-green-500/30 bg-green-500/10 hover:bg-green-500/20"
                              : "text-white/30 border-white/10 bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          {staff.availableAsJudge ? "Desactivar juez" : "Marcar como juez"}
                        </button>
                        <RoleBadge role={staff.role} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card card-cyan p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <p className="section-title">Usuarios</p>
                <p className="text-xs text-gray-400">Busca usuarios para asignar como staff en tu comunidad.</p>
              </div>
              <span className="text-xs text-gray-400">{candidateUsers.length} usuarios</span>
            </div>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar usuario..."
              className="input-base text-sm w-full mb-4"
            />

            {candidateUsers.length === 0 ? (
              <p className="text-white/50 text-sm">No hay usuarios disponibles para esta búsqueda.</p>
            ) : (
              <ul className="space-y-3">
                {candidateUsers.map((candidate) => {
                  const candidateCommunityIds = Array.isArray(candidate.communityId)
                    ? candidate.communityId
                    : candidate.communityId
                      ? [candidate.communityId]
                      : [];

                  const alreadyMember = candidateCommunityIds.includes(currentCommunityId);
                  const alreadyStaffInCommunity = candidate.role === "staff" && alreadyMember;

                  return (
                    <li key={candidate.uid} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-white">{candidate.displayName}</p>
                          <p className="text-xs text-white/50">
                            {candidate.role === "staff" ? "Staff" : "Player"}
                            {alreadyMember ? " · Pertenece a tu comunidad" : " · No pertenece a tu comunidad"}
                          </p>
                        </div>
                        <button
                          onClick={() => void handleAssignStaff(candidate.uid)}
                          disabled={updatingUid === candidate.uid || alreadyStaffInCommunity}
                          className="btn-primary text-xs px-4 py-2 rounded-lg disabled:opacity-50"
                        >
                          {alreadyStaffInCommunity
                            ? "Ya es staff"
                            : updatingUid === candidate.uid
                              ? "Asignando..."
                              : "Asignar staff"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
