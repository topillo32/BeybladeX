"use client";

import { useLang } from "@/lib/LangContext";
import type { StandingEntry } from "@/types";

interface Props {
  standings: StandingEntry[];
  highlightTop?: number;
  highlightPlayerId?: string;
}

export const StandingsTable = ({ standings, highlightTop = 2, highlightPlayerId }: Props) => {
  const { t } = useLang();

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5">
            <th className="px-3 py-2 text-left section-title">#</th>
            <th className="px-3 py-2 text-left section-title">{t("player")}</th>
            <th className="px-3 py-2 text-center section-title">{t("w")}</th>
            <th className="px-3 py-2 text-center section-title">{t("l")}</th>
            <th className="px-3 py-2 text-center section-title">{t("pf")}</th>
            <th className="px-3 py-2 text-center section-title">{t("pa")}</th>
            <th className="px-3 py-2 text-center section-title">{t("diff")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {standings.map((s, i) => {
            const qualified = i < highlightTop;
            const isMe = s.playerId === highlightPlayerId;
            return (
              <tr key={s.playerId} className={`transition-colors ${
                isMe ? "bg-yellow-500/10 border-l-2 border-yellow-400" : qualified ? "bg-cyan-500/5" : "hover:bg-white/3"
              }`}>
                <td className="px-3 py-2">
                  <span className={`font-gaming text-xs font-bold ${qualified ? "text-cyan-400" : "text-gray-500"}`}>
                    {qualified ? "★" : String(i + 1).padStart(2, "0")}
                  </span>
                </td>
                <td className={`px-3 py-2 font-medium ${isMe ? "text-yellow-300" : "text-white"}`}>
                  {s.playerName}{isMe && <span className="ml-1 text-xs text-yellow-400 font-gaming">← tú</span>}
                </td>
                <td className="px-3 py-2 text-center text-green-400 font-bold font-gaming">{s.wins}</td>
                <td className="px-3 py-2 text-center text-red-400 font-gaming">{s.losses}</td>
                <td className="px-3 py-2 text-center text-gray-300 font-gaming">{s.pointsFor}</td>
                <td className="px-3 py-2 text-center text-gray-500 font-gaming">{s.pointsAgainst}</td>
                <td className={`px-3 py-2 text-center font-gaming font-bold ${s.diff >= 0 ? "text-cyan-400" : "text-red-400"}`}>
                  {s.diff > 0 ? "+" : ""}{s.diff}
                </td>
              </tr>
            );
          })}
          {standings.length === 0 && (
            <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500 text-sm">{t("noMatchesYet")}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
