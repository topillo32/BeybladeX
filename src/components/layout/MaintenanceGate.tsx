"use client";
import { useAuthContext } from "@/lib/AuthContext";

export const MaintenanceGate = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, maintenance, isStaff } = useAuthContext();

  if (loading) return null;

  // Modo mantenimiento activo y el usuario no es staff/admin (o no está logueado)
  if (maintenance && !isStaff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-spin-slow" />
          <div className="absolute inset-2 rounded-full border border-purple-400/40 animate-spin-reverse" />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">⚙️</div>
        </div>
        <div className="space-y-2">
          <h1 className="font-gaming text-2xl font-black tracking-widest text-white">Modo mantenimiento</h1>
          <p className="text-white/50 text-sm max-w-xs">
            La aplicación está temporalmente fuera de servicio. Volvé a intentarlo más tarde.
          </p>
        </div>
        {/* Si hay sesión activa de player, mostrar que se cerró */}
        {user && (
          <p className="text-white/30 text-xs font-gaming">Tu sesión fue cerrada automáticamente.</p>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
