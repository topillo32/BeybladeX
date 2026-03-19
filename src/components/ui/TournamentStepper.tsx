import type { TournamentStatus } from "@/types";
import { TOURNAMENT_STEPS } from "@/types";

const ORDER: TournamentStatus[] = ["DRAFT", "REGISTRATION", "GROUP_STAGE", "KNOCKOUT", "FINISHED"];

export const TournamentStepper = ({ status }: { status: TournamentStatus }) => {
  const current = ORDER.indexOf(status);
  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto pb-1">
      {TOURNAMENT_STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.status} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base border-2 transition-all
                ${done   ? "bg-cyan-500/20 border-cyan-400 text-cyan-300" : ""}
                ${active ? "bg-cyan-500/30 border-cyan-400 text-white ring-2 ring-cyan-400/30" : ""}
                ${!done && !active ? "bg-white/5 border-white/10 text-gray-600" : ""}
              `}>
                {done ? "✓" : step.icon}
              </div>
              <span className={`text-xs font-gaming tracking-wider whitespace-nowrap ${active ? "text-cyan-300" : done ? "text-gray-400" : "text-gray-600"}`}>
                {step.label}
              </span>
            </div>
            {i < TOURNAMENT_STEPS.length - 1 && (
              <div className={`h-px flex-1 mx-1 mb-5 ${i < current ? "bg-cyan-500/40" : "bg-white/5"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};
