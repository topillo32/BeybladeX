import type { Match } from "@/types";

interface Props {
  matches: Match[];
}

const PHASE_ORDER = ["ROUND_OF_64", "ROUND_OF_32", "QUARTERFINAL", "SEMIFINAL", "FINAL"];
const PHASE_LABELS: Record<string, string> = {
  ROUND_OF_64: "Round of 64", ROUND_OF_32: "Round of 32",
  QUARTERFINAL: "Quarterfinals", SEMIFINAL: "Semifinals", FINAL: "Final",
};

export const BracketView = ({ matches }: Props) => {
  const phases = PHASE_ORDER.filter((p) => matches.some((m) => m.phase === p));

  if (phases.length === 0) return (
    <div className="card p-10 text-center">
      <p className="text-4xl mb-3">⚔️</p>
      <p className="text-white font-semibold">Bracket not generated yet</p>
    </div>
  );

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max">
        {phases.map((phase) => {
          const phaseMatches = matches.filter((m) => m.phase === phase).sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));
          return (
            <div key={phase} className="flex flex-col gap-4 w-52">
              <p className="section-title text-center">{PHASE_LABELS[phase]}</p>
              <div className="flex flex-col gap-3">
                {phaseMatches.map((m) => {
                  const winner = m.isFinished ? (m.winnerId === m.playerA.id ? m.playerA : m.playerB) : null;
                  return (
                    <div key={m.id} className={`card p-3 space-y-2 ${m.isFinished ? "opacity-80" : "card-cyan"}`}>
                      {[m.playerA, m.playerB].map((p, i) => {
                        const score = i === 0 ? m.playerAScore : m.playerBScore;
                        const isWinner = winner?.id === p.id;
                        return (
                          <div key={p.id} className={`flex items-center justify-between px-2 py-1.5 rounded-lg ${isWinner ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-white/3"}`}>
                            <span className={`text-sm font-medium truncate ${isWinner ? "text-yellow-300" : "text-gray-300"}`}>{p.name}</span>
                            <span className={`font-gaming font-black text-sm ml-2 ${isWinner ? "text-yellow-400" : "text-gray-500"}`}>{score}</span>
                          </div>
                        );
                      })}
                      {!m.isFinished && (
                        <div className="flex justify-center">
                          <span className="flex items-center gap-1 text-xs font-gaming text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />LIVE
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
