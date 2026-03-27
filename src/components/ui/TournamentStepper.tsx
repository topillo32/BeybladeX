import type { TournamentStatus } from "@/types";
import { TOURNAMENT_STEPS } from "@/types";

const ORDER: TournamentStatus[] = ["DRAFT", "REGISTRATION", "GROUP_STAGE", "KNOCKOUT", "FINISHED"];

export const TournamentStepper = ({ status }: { status: TournamentStatus }) => {
  const current = ORDER.indexOf(status);
  return (
    <div className="flex flex-col gap-0">
      {TOURNAMENT_STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.status} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm border-2 shrink-0 transition-all
                ${done   ? "bg-cyan-500/20 border-cyan-400 text-cyan-300" : ""}
                ${active ? "bg-cyan-500/30 border-cyan-400 text-white ring-2 ring-cyan-400/30" : ""}
                ${!done && !active ? "bg-white/5 border-white/10 text-gray-600" : ""}
              `}>
                {done ? "✓" : step.icon}
              </div>
              {i < TOURNAMENT_STEPS.length - 1 && (
                <div className={`w-px h-5 ${i < current ? "bg-cyan-500/40" : "bg-white/10"}`} />
              )}
            </div>
            <span className={`text-xs font-gaming tracking-wider pt-1 ${active ? "text-cyan-300" : done ? "text-gray-400" : "text-gray-600"}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
