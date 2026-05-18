"use client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuthContext } from "@/lib/AuthContext";

export const MaintenanceGate = ({ children }: { children: React.ReactNode }) => {
  const { loading, maintenance, isStaff } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname === "/auth";

  useEffect(() => {
    if (!loading && maintenance && !isStaff && !isAuthPage) {
      router.replace("/auth");
    }
  }, [loading, maintenance, isStaff, isAuthPage, router]);

  if (loading) return null;

  // Permite siempre /auth y staff/admin
  if (maintenance && !isStaff && !isAuthPage) return null;

  return <>{children}</>;
};
