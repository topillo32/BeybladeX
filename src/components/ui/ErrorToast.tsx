"use client";
import { useAuthContext } from "@/lib/AuthContext";

interface Props {
  error: string | null;
  onClose: () => void;
}

export const ErrorToast = ({ error, onClose }: Props) => {
  const { isStaff } = useAuthContext();
  if (!error || !isStaff) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
      <span className="shrink-0 mt-0.5">⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="font-gaming tracking-wide text-amber-300 mb-0.5">Algo salió mal</p>
        <p className="text-amber-200/70 break-words">{error}</p>
      </div>
      <button onClick={onClose} className="shrink-0 text-amber-400/60 hover:text-amber-200 transition-colors leading-none">✕</button>
    </div>
  );
};
