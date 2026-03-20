"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { getAllUsers, updateUserRole } from "@/services/authService";
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
              <li key={u.uid} className="flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{u.displayName}</p>
                  <p className="text-gray-500 text-xs truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <RoleBadge role={u.role} />
                  <select
                    value={u.role}
                    disabled={updating === u.uid}
                    onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                    className="bg-white/5 border border-white/10 text-gray-300 text-xs font-gaming rounded-lg px-2 py-1.5 outline-none focus:border-cyan-500/50 disabled:opacity-50 cursor-pointer"
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
