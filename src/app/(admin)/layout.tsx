"use client";
export const dynamic = "force-dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isStaff } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/auth"); return; }
    if (!isStaff) router.push("/player/tournaments");
  }, [user, loading, isStaff, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-spin-slow" />
        <div className="absolute inset-2 rounded-full border border-purple-400/40 animate-spin-reverse" />
      </div>
    </div>
  );

  if (!user || !isStaff) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#030712] bg-grid">
        {children}
      </main>
    </div>
  );
}
