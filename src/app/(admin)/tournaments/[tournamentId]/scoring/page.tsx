"use client";

import Link from "next/link";
import { useAuthContext } from "@/lib/AuthContext";
import { useTournament, useGroups, useMatches } from "@/hooks/useTournament";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/Badges";

export default function TournamentScoringPage({ params }: { params: { tournamentId: string } }) {
  const { tournamentId } = params;
  const { user, loading: authLoading, isStaff, isAdmin } = useAuthContext();
  const { tournament, loading: tLoading } = useTournament(tournamentId);
  const { groups } = useGroups(tournamentId);
  const { matches } = useMatches(tournamentId);

  const uid = user?.uid;

  if (authLoading || tLoading) return <Spinner size={12} />;
  if (!tournament) {
    return (
      <div className="page-wrapper">
        <p className="text-gray-400 font-gaming text-sm">Torneo no encontrado.</p>
      </div>
    );
  }

  const groupMatches = matches.filter((m) => m.phase === "GROUP");
  const koMatches = matches.filter((m) => m.phase !== "GROUP");

  const myOpenGroupMatches = uid
    ? groupMatches.filter((m) => {
        if (m.isFinished) return false;
        const g = groups.find((x) => x.id === m.groupId);
        return !!g?.judgeId && g.judgeId === uid;
      })
    : [];

  const otherOpenGroupMatches =
    isAdmin
      ? groupMatches.filter((m) => !m.isFinished)
      : groupMatches.filter((m) => {
          if (m.isFinished) return false;
          const g = groups.find((x) => x.id === m.groupId);
          return !g?.judgeId || g.judgeId !== uid;
        });

  const openKo = koMatches.filter((m) => !m.isFinished);

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-lg mx-auto space-y-6 px-4 py-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href={`/tournaments/${tournamentId}`} className="text-cyan-400 hover:text-cyan-300 text-xs font-gaming">
              ← Volver al torneo
            </Link>
            <h1 className="font-gaming text-xl font-black tracking-widest text-white mt-2">⚔️ Anotación</h1>
            <p className="text-gray-500 text-xs font-gaming mt-1">{tournament.name}</p>
          </div>
          <StatusBadge status={tournament.status} />
        </div>

        <p className="text-gray-400 text-xs leading-relaxed">
          Un solo dispositivo puede tener la partida abierta a la vez. Al tocar «Anotar partida» se toma el bloqueo hasta
          terminar o cerrar.
        </p>

        {!isStaff && (
          <p className="text-amber-400 text-xs font-gaming">Solo staff puede anotar.</p>
        )}

        {isStaff && (
          <>
            {myOpenGroupMatches.length > 0 && (
              <section className="space-y-2">
                <p className="section-title text-cyan-400 text-xs">Mis grupos (juez asignado)</p>
                <ul className="space-y-2">
                  {myOpenGroupMatches.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/judge/${tournamentId}/${m.id}`}
                        className="card card-cyan p-4 flex flex-col gap-1 hover:border-cyan-400/40 transition-all"
                      >
                        <span className="font-gaming text-xs text-gray-500">
                          {groups.find((g) => g.id === m.groupId)?.name ?? "Grupo"}
                        </span>
                        <span className="text-white text-sm font-medium">
                          {m.playerA.name} <span className="text-gray-500">vs</span> {m.playerB.name}
                        </span>
                        <span className="text-cyan-400 font-gaming text-xs">Anotar partida →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {isAdmin && otherOpenGroupMatches.length > 0 && (
              <section className="space-y-2">
                <p className="section-title text-amber-400 text-xs">Otros partidos de grupo</p>
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {otherOpenGroupMatches.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/judge/${tournamentId}/${m.id}`}
                        className="card p-3 flex flex-col gap-0.5 border border-white/10 hover:border-amber-500/30 transition-all"
                      >
                        <span className="text-white text-xs">
                          {m.playerA.name} vs {m.playerB.name}
                        </span>
                        <span className="text-amber-400/80 font-gaming text-[10px]">Admin →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {tournament.status === "KNOCKOUT" && openKo.length > 0 && (
              <section className="space-y-2">
                <p className="section-title text-purple-400 text-xs">Bracket — knockout</p>
                <ul className="space-y-2 max-h-72 overflow-y-auto">
                  {openKo.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/judge/${tournamentId}/${m.id}`}
                        className="card p-3 flex flex-col gap-0.5 border border-purple-500/20 hover:border-purple-400/40 transition-all"
                      >
                        <span className="font-gaming text-[10px] text-gray-500">{m.phase.replace(/_/g, " ")}</span>
                        <span className="text-white text-xs">
                          {m.playerA.name} vs {m.playerB.name}
                        </span>
                        <span className="text-purple-300 font-gaming text-[10px]">Anotar →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {myOpenGroupMatches.length === 0 && !(isAdmin && otherOpenGroupMatches.length > 0) && !(tournament.status === "KNOCKOUT" && openKo.length > 0) && (
              <div className="card p-8 text-center text-gray-400 text-sm">
                No hay partidas pendientes que puedas anotar aquí, o el torneo está en otra fase.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
