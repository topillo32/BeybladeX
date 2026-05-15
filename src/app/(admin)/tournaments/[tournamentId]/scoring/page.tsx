"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthContext } from "@/lib/AuthContext";
import { useTournament, useGroups, useMatches } from "@/hooks/useTournament";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/Badges";
import { JudgeMatchControl } from "@/components/judge/JudgeMatchControl";

export default function TournamentScoringPage({ params }: { params: { tournamentId: string } }) {
  const { tournamentId } = params;
  const { user, loading: authLoading, isStaff, isAdmin } = useAuthContext();
  const { tournament, loading: tLoading } = useTournament(tournamentId);
  const { groups } = useGroups(tournamentId);
  const { matches } = useMatches(tournamentId);

  const [filterGroupId, setFilterGroupId] = useState<string>("all");
  const [openMatchId, setOpenMatchId] = useState<string | null>(null);

  const uid = user?.uid;

  if (authLoading || tLoading) return <Spinner size={12} />;
  if (!tournament) return (
    <div className="page-wrapper">
      <p className="text-gray-400 font-gaming text-sm">Torneo no encontrado.</p>
    </div>
  );

  const groupMatches = matches.filter((m) => m.phase === "GROUP");
  const koMatches = matches.filter((m) => m.phase !== "GROUP" && !m.isFinished);

  // Grupos visibles según rol
  const visibleGroups = groups.filter((g) => isAdmin || g.judgeId === uid);

  // Partidos visibles según filtro de grupo, ordenados: pendientes primero, terminados al fondo
  const visibleMatches = groupMatches
    .filter((m) => {
      const g = groups.find((x) => x.id === m.groupId);
      if (!g) return false;
      if (!isAdmin && g.judgeId !== uid) return false;
      if (filterGroupId !== "all" && m.groupId !== filterGroupId) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.isFinished === b.isFinished) return 0;
      return a.isFinished ? 1 : -1;
    });

  const toggleMatch = (mId: string) =>
    setOpenMatchId((prev) => prev === mId ? null : mId);

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-lg mx-auto space-y-5 px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href={`/tournaments/${tournamentId}`} className="text-cyan-400 hover:text-cyan-300 text-xs font-gaming">
              ← Volver al torneo
            </Link>
            <h1 className="font-gaming text-xl font-black tracking-widest text-white mt-2">⚔️ Anotación</h1>
            <p className="text-white/40 text-xs font-gaming mt-1">{tournament.name}</p>
          </div>
          <StatusBadge status={tournament.status} />
        </div>

        {!isStaff && (
          <p className="text-amber-400 text-xs font-gaming">Solo staff puede anotar.</p>
        )}

        {isStaff && tournament.status === "GROUP_STAGE" && (
          <>
            {/* Filtro por grupo */}
            {visibleGroups.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { setFilterGroupId("all"); setOpenMatchId(null); }}
                  className={`text-xs font-gaming px-3 py-1.5 rounded-lg border transition-all ${
                    filterGroupId === "all"
                      ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                      : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                  }`}
                >
                  Todos
                </button>
                {visibleGroups.map((g) => {
                  const pending = groupMatches.filter((m) => m.groupId === g.id && !m.isFinished).length;
                  return (
                    <button
                      key={g.id}
                      onClick={() => { setFilterGroupId(g.id); setOpenMatchId(null); }}
                      className={`flex items-center gap-1.5 text-xs font-gaming px-3 py-1.5 rounded-lg border transition-all ${
                        filterGroupId === g.id
                          ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                          : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                      }`}
                    >
                      {g.name}
                      {pending > 0 && (
                        <span className="w-4 h-4 rounded-full bg-amber-500/30 text-amber-300 text-[10px] flex items-center justify-center">
                          {pending}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Lista de partidos */}
            {visibleMatches.length === 0 ? (
              <div className="card p-8 text-center text-white/40 text-sm">
                {visibleGroups.length === 0 ? "No tenés grupos asignados." : "No hay partidas en este grupo."}
              </div>
            ) : (
              <div className="card overflow-hidden divide-y divide-white/5">
                {visibleMatches.map((m) => {
                  const group = groups.find((g) => g.id === m.groupId);
                  const isMatchOpen = openMatchId === m.id;
                  return (
                    <div key={m.id} className={m.isFinished ? "opacity-50" : ""}>
                      <button
                        onClick={() => !m.isFinished && toggleMatch(m.id)}
                        disabled={m.isFinished}
                        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
                          m.isFinished ? "cursor-default" : "hover:bg-white/3 cursor-pointer"
                        } ${isMatchOpen ? "bg-white/3" : ""}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.isFinished ? "bg-green-400" : "bg-amber-400 animate-pulse"}`} />
                          <div className="text-left min-w-0">
                            <p className="text-[10px] text-white/30 font-gaming">{group?.name ?? ""}</p>
                            <p className="text-sm text-white truncate">
                              {m.playerA.name} <span className="text-white/30">vs</span> {m.playerB.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-gaming text-sm">
                            <span className="text-cyan-400">{m.playerAScore}</span>
                            <span className="text-white/20 mx-1">—</span>
                            <span className="text-amber-400">{m.playerBScore}</span>
                          </span>
                          {!m.isFinished && (
                            <span className={`text-white/30 text-xs transition-transform ${isMatchOpen ? "rotate-180" : ""}`}>▼</span>
                          )}
                        </div>
                      </button>

                      {isMatchOpen && (
                        <div className="border-t border-white/5 bg-black/20 px-2 py-4">
                          <JudgeMatchControl key={m.id} tournamentId={tournamentId} matchId={m.id} inline />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Knockout */}
        {tournament.status === "KNOCKOUT" && koMatches.length > 0 && (
          <div className="space-y-2">
            <p className="section-title text-purple-400">Bracket — Knockout</p>
            <div className="card overflow-hidden divide-y divide-white/5">
              {koMatches.map((m) => {
                const isMatchOpen = openMatchId === m.id;
                return (
                  <div key={m.id}>
                    <button
                      onClick={() => toggleMatch(m.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
                        <div className="text-left min-w-0">
                          <p className="text-[10px] text-white/30 font-gaming">{m.phase.replace(/_/g, " ")}</p>
                          <p className="text-sm text-white truncate">{m.playerA.name} <span className="text-white/30">vs</span> {m.playerB.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-gaming text-sm">
                          <span className="text-cyan-400">{m.playerAScore}</span>
                          <span className="text-white/20 mx-1">—</span>
                          <span className="text-amber-400">{m.playerBScore}</span>
                        </span>
                        <span className={`text-white/30 text-xs transition-transform ${isMatchOpen ? "rotate-180" : ""}`}>▼</span>
                      </div>
                    </button>
                    {isMatchOpen && (
                      <div className="border-t border-white/5 bg-black/20 px-2 py-4">
                        <JudgeMatchControl tournamentId={tournamentId} matchId={m.id} inline />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isStaff && tournament.status !== "GROUP_STAGE" && tournament.status !== "KNOCKOUT" && (
          <div className="card p-8 text-center text-white/40 text-sm">
            No hay partidas para anotar en esta fase.
          </div>
        )}
      </div>
    </div>
  );
}
