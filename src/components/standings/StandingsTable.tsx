import type { StandingEntry } from "@/types";

interface Props {
  standings: StandingEntry[];
  highlightTop?: number;
}

export const StandingsTable = ({ standings, highlightTop = 2 }: Props) => (
  <div className="card overflow-hidden">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-white/5">
          <th className="px-4 py-2.5 text-left section-title">#</th>
          <th className="px-4 py-2.5 text-left section-title">Player</th>
          <th className="px-4 py-2.5 text-center section-title">W</th>
          <th className="px-4 py-2.5 text-center section-title">L</th>
          <th className="px-4 py-2.5 text-center section-title">PF</th>
          <th className="px-4 py-2.5 text-center section-title">PA</th>
          <th className="px-4 py-2.5 text-center section-title">+/-</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {standings.map((s, i) => {
          const qualified = i < highlightTop;
          return (
            <tr key={s.playerId} className={`transition-colors ${qualified ? "bg-cyan-500/5" : "hover:bg-white/3"}`}>
              <td className="px-4 py-3">
                <span className={`font-gaming text-xs font-bold ${qualified ? "text-cyan-400" : "text-gray-500"}`}>
                  {qualified ? "★" : String(i + 1).padStart(2, "0")}
                </span>
              </td>
              <td className="px-4 py-3 font-medium text-white">{s.playerName}</td>
              <td className="px-4 py-3 text-center text-green-400 font-bold font-gaming">{s.wins}</td>
              <td className="px-4 py-3 text-center text-red-400 font-gaming">{s.losses}</td>
              <td className="px-4 py-3 text-center text-gray-300 font-gaming">{s.pointsFor}</td>
              <td className="px-4 py-3 text-center text-gray-500 font-gaming">{s.pointsAgainst}</td>
              <td className={`px-4 py-3 text-center font-gaming font-bold ${s.diff >= 0 ? "text-cyan-400" : "text-red-400"}`}>
                {s.diff > 0 ? "+" : ""}{s.diff}
              </td>
            </tr>
          );
        })}
        {standings.length === 0 && (
          <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">No results yet</td></tr>
        )}
      </tbody>
    </table>
  </div>
);
