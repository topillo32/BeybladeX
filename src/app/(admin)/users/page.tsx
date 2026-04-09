"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { getAllUsers, updateUserRole } from "@/services/authService";
import { setJudgeAvailability } from "@/services/judgeService";
import { useAuthContext } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { RoleBadge } from "@/components/ui/Badges";
import { Spinner } from "@/components/ui/Spinner";
import { useLang } from "@/lib/LangContext";
import type { AppUser, UserRole } from "@/types";

const ROLES: UserRole[] = ["admin", "staff", "player"];

export default function UsersPage() {
  const { isAdmin } = useAuthContext();
  const { t } = useLang();
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) { router.push("/dashboard"); return; }
    getAllUsers().then((u) => { setUsers(u); setLoading(false); });
  }, [isAdmin, router]);

  const handleRoleChange = async (uid: string, role: UserRole) => {
    setUpdating(uid);
    await updateUserRole(uid, role);
    setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, role } : u));
    setUpdating(null);
  };

  const handleJudgeAvailability = async (uid: string, available: boolean) => {
    setUpdating(uid);
    await setJudgeAvailability(uid, available);
    setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, availableAsJudge: available } : u));
    setUpdating(null);
  };

  if (loading) return <Spinner size={12} />;

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="font-gaming text-3xl font-black tracking-widest text-white">👥 {t("users")}</h1>
          <div className="divider-cyan mt-3" />
        </div>

        <div className="card overflow-hidden">
          <ul className="divide-y divide-white/5">
            {users.map((u) => (
              <li key={u.uid} className="flex items-center justify-between px-4 py-3.5 hover:bg-white/3 transition-colors gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate text-sm">{u.displayName}</p>
                  <p className="text-white/50 text-xs truncate hidden sm:block">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Disponibilidad como juez — solo staff/admin */}
                  {(u.role === "staff" || u.role === "admin") && (
                    <button
                      onClick={() => handleJudgeAvailability(u.uid, !u.availableAsJudge)}
                      disabled={updating === u.uid}
                      title={u.availableAsJudge ? "Disponible como juez" : "No disponible como juez"}
                      className={`text-xs font-gaming px-2 py-1 rounded-lg border transition-all ${
                        u.availableAsJudge
                          ? "text-green-400 border-green-500/30 bg-green-500/10 hover:bg-green-500/20"
                          : "text-white/30 border-white/10 bg-white/5 hover:bg-white/10"
                      }`}>
                      ⚖️
                    </button>
                  )}
                  <RoleBadge role={u.role} />
                  <select
                    value={u.role}
                    disabled={updating === u.uid}
                    onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                    className="bg-white/5 border border-white/10 text-white text-xs font-gaming rounded-lg px-2 py-1.5 outline-none focus:border-cyan-500/50 disabled:opacity-50 cursor-pointer"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r} className="bg-[#050d1a]">{r}</option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
