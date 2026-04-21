"use client";
import { useState } from "react";
import Link from "next/link";
import { useTournament, useGroups, useMatches, usePlayers, usePendingPlayers, useUnenrolledPlayers } from "@/hooks/useTournament";
import { useAuthContext } from "@/lib/AuthContext";
import { updateTournament, advanceTournamentStatus } from "@/services/tournamentService";
import { generateGroups, addPlayerToGroupLiveWithPlayers, fillGroupWithByes, removePlayerFromGroupWithMatches, withdrawPlayerFromGroup, deleteGroup, assignJudge, removeJudge, getGroups } from "@/services/groupService";
import { buildTournamentExportSnapshot, downloadTournamentJson } from "@/services/tournamentExportService";
import { generateGroupMatches, generateKnockoutBracket } from "@/services/matchService";
import { computeGlobalStandings, getQualifiers, computeGroupStandings, autoQualifiersCount } from "@/services/standingsService";
import { getAllUsers } from "@/services/authService";
import { TournamentStepper } from "@/components/ui/TournamentStepper";
import { StatusBadge } from "@/components/ui/Badges";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { BracketView } from "@/components/bracket/BracketView";
import { MatchCard } from "@/components/ui/MatchCard";
import { Spinner } from "@/components/ui/Spinner";
import { deleteMatch } from "@/services/matchService";
import { enrollPlayerInTournament, approvePlayerEnrollment, unenrollPlayerFromTournament } from "@/services/playerService";
import type { TournamentStatus, AppUser } from "@/types";
import { useLang } from "@/lib/LangContext";
import { OPEN_REGISTRATION_STATUSES as OPEN_REG } from "@/types";
import { markCheckIn, removeCheckIn, subscribeCheckIns } from "@/services/checkInService";
import { autoAssignJudges } from "@/services/judgeService";
import type { CheckIn } from "@/services/checkInService";

import { useEffect } from "react";

type Tab = "overview" | "groups" | "matches" | "standings" | "bracket" | "checkin" | "danger";

const NEXT_STATUS: Partial<Record<TournamentStatus, TournamentStatus>> = {
  DRAFT: "REGISTRATION", REGISTRATION: "GROUP_STAGE",
  GROUP_STAGE: "KNOCKOUT", KNOCKOUT: "FINISHED",
};

export default function TournamentDetailPage({ params }: { params: { tournamentId: string } }) {
  const { tournamentId } = params;
  const { tournament, loading } = useTournament(tournamentId);
  const { groups } = useGroups(tournamentId);
  const { matches } = useMatches(tournamentId);
  const { players } = usePlayers(tournamentId);
  const { players: pendingPlayers } = usePendingPlayers(tournamentId);
  const { players: unenrolledPlayers } = useUnenrolledPlayers(tournamentId);
  const { user, isAdmin, isStaff } = useAuthContext();
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("overview");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [enrollSearch, setEnrollSearch] = useState("");
  const [staffUsers, setStaffUsers] = useState<AppUser[]>([]);
  const [showStepper, setShowStepper] = useState(false);
  const [showAddPlayers, setShowAddPlayers] = useState(false);
  const [checkIns, setCheckIns] = useState<Record<string, CheckIn>>({});
  const [selectedQualifiers, setSelectedQualifiers] = useState<number>(0);

  useEffect(() => {
    if (!isAdmin) return;
    getAllUsers().then((all) => setStaffUsers(all.filter((u) => u.role === "staff" || u.role === "admin")));
  }, [isAdmin]);

  useEffect(() => {
    if (!tournamentId) return;
    return subscribeCheckIns(tournamentId, setCheckIns);
  }, [tournamentId]);

  if (loading) return <Spinner size={12} />;
  if (!tournament) return <div className="page-wrapper"><p className="text-gray-400">{t("tournamentNotFound")}</p></div>;

  const groupMatches = matches.filter((m) => m.phase === "GROUP");
  const knockoutMatches = matches.filter((m) => m.phase !== "GROUP");
  const globalStandings = computeGlobalStandings(groups, matches, players);
  const autoCount = autoQualifiersCount(globalStandings.length);

  const run = async (fn: () => Promise<void>) => {
    setWorking(true);
    setError(null);
    try { await fn(); }
    catch (e: any) { setError(e.message ?? "Error inesperado. Intenta de nuevo."); }
    finally { setWorking(false); }
  };

  const handleAdvance = async () => {
    const next = NEXT_STATUS[tournament.status];
    if (!next) return;
    if (!confirm(`¿Avanzar a la siguiente fase? Esta acción no se puede deshacer.`)) return;
    setWorking(true);
    setError(null);
    try {
      if (next === "GROUP_STAGE") {
        // Solo entran jugadores con check-in (pago confirmado)
        const paidPlayers = players.filter((p) => !!checkIns[p.id]);
        if (paidPlayers.length < 2) throw new Error("Se necesitan al menos 2 jugadores con pago confirmado para iniciar grupos.");
        const freshGroups = await generateGroups(tournamentId, paidPlayers, tournament.playersPerGroup);
        for (const g of freshGroups) {
          const gPlayers = paidPlayers.filter((p) => g.playerIds.includes(p.id));
          await generateGroupMatches(tournamentId, g, gPlayers);
        }
        // Asignar jueces disponibles automáticamente
        await autoAssignJudges(tournamentId, freshGroups, paidPlayers);
        const groupsAfter = await getGroups(tournamentId);
        const withoutJudge = groupsAfter.filter((g) => !g.judgeId).length;
        if (withoutJudge > 0) {
          setNotice(
            `${withoutJudge} grupo(s) quedaron sin juez. Revisa Usuarios (⚖️ disponible) o asigna manualmente en Grupos.`
          );
        } else {
          setNotice(null);
        }
      }
      if (next === "KNOCKOUT") {
        const qualifyCount = selectedQualifiers || autoQualifiersCount(globalStandings.length);
        await updateTournament(tournamentId, { qualifiersCount: qualifyCount });
        const qualifiers = getQualifiers(globalStandings, qualifyCount, players);
        await generateKnockoutBracket(tournamentId, qualifiers);
      }
      await advanceTournamentStatus(tournamentId, next);
    } catch (e: any) {
      setError(e.message ?? "Error al avanzar fase.");
    } finally {
      setWorking(false);
    }
  };

  const handleEnroll = async (playerId: string) => {
    await enrollPlayerInTournament(playerId, tournamentId, tournament.status);
  };

  const handleExportJson = () =>
    run(async () => {
      const snap = await buildTournamentExportSnapshot(tournamentId);
      downloadTournamentJson(snap, tournament.name);
    });

  const handleApprove = (player: import("@/types").Player) =>
    run(async () => {
      // Marcar pago automáticamente al aprobar en GROUP_STAGE
      if (!checkIns[player.id])
        await markCheckIn(tournamentId, player.id, player.name, user!.uid);
      await addPlayerToGroupLiveWithPlayers(tournamentId, player, groups, [...players, player], tournament.playersPerGroup);
      await approvePlayerEnrollment(player.id, tournamentId);
    });

  const handleReject = (playerId: string) => {
    if (!confirm("¿Rechazar a este jugador?")) return;
    run(() => unenrollPlayerFromTournament(playerId, tournamentId));
  };

  const handleAssignJudge = async (groupId: string, judgeUid: string) => {
    if (!judgeUid) { run(() => removeJudge(tournamentId, groupId)); return; }
    const group = groups.find((g) => g.id === groupId);
    const judgeAsPlayer = players.find((p) => p.userId === judgeUid);
    if (group && judgeAsPlayer && group.playerIds.includes(judgeAsPlayer.id)) {
      setError(t("judgeCannotBePlayer")); return;
    }
    const judgeUser = staffUsers.find((u) => u.uid === judgeUid);
    if (judgeUser) run(() => assignJudge(tournamentId, groupId, judgeUid, judgeUser.displayName));
  };

  const NEXT_LABEL_T = () => ({
    DRAFT: t("openRegistration"),
    REGISTRATION: t("startGroupStage"),
    GROUP_STAGE: t("startKnockout"),
    KNOCKOUT: t("finishTournament"),
  } as Partial<Record<TournamentStatus, string>>);

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "overview",  label: t("overview"),  icon: "📊" },
    { key: "groups",    label: t("groups"),    icon: "👥" },
    { key: "matches",   label: t("matches"),   icon: "⚔️" },
    { key: "standings", label: t("standings"), icon: "📈" },
    { key: "bracket",   label: t("bracket"),   icon: "🏆" },
    ...(isAdmin ? [{ key: "checkin" as Tab, label: "Check-In", icon: "✅" }] : []),
    ...(isAdmin ? [{ key: "danger" as Tab, label: "Admin", icon: "⚠️" }] : []),
  ];

  return (
    <div className="page-wrapper">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-500/50 text-red-300 font-gaming text-xs px-5 py-3 rounded-xl shadow-xl flex items-center gap-3">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white leading-none">✕</button>
        </div>
      )}

      {notice && (
        <div className="fixed top-4 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-xl border border-amber-500/40 bg-amber-950/95 px-5 py-3 font-gaming text-xs text-amber-100 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <span>ℹ️ {notice}</span>
            <button type="button" onClick={() => setNotice(null)} className="shrink-0 text-amber-300 hover:text-white leading-none">
              ✕
            </button>
          </div>
        </div>
      )}

      {working && (
        <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50 gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/60 animate-spin-slow" />
            <div className="absolute inset-2 rounded-full border border-purple-400/60 animate-spin-reverse" />
          </div>
          <p className="font-gaming text-cyan-400 text-sm tracking-widest animate-pulse">{t("processing")}</p>
        </div>
      )}

      <div className="w-full flex flex-col lg:flex-row gap-6 items-start px-2 sm:px-4 py-6 max-w-screen-2xl mx-auto">

        {/* ── Sidebar izquierdo ── */}
        <aside className="w-full lg:w-72 lg:shrink-0 space-y-4 lg:sticky lg:top-6">
          <div>
            <Link href="/tournaments" className="text-white hover:text-cyan-400 text-sm transition-colors">{t("back")}</Link>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <h1 className="font-gaming text-lg font-black tracking-widest text-white flex-1 leading-tight min-w-[8rem]">{tournament.name}</h1>
              <StatusBadge status={tournament.status} />
              {isStaff && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/t/${tournamentId}`);
                    setNotice("🔗 Link copiado al portapapeles");
                    setTimeout(() => setNotice(null), 3000);
                  }}
                  className="shrink-0 text-xs font-gaming tracking-wider px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-all"
                  title="Copiar link de inscripción pública"
                >
                  🔗 Link
                </button>
              )}
              {isStaff && (
                <Link
                  href={`/tournaments/${tournamentId}/scoring`}
                  className="shrink-0 text-xs font-gaming tracking-wider px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-all"
                >
                  ⚔️ Anotación
                </Link>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleExportJson}
                  disabled={working}
                  className="shrink-0 text-xs font-gaming tracking-wider px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-gray-200 hover:bg-white/10 transition-all disabled:opacity-50"
                  title="Respaldo JSON del torneo (grupos, partidas, jugadores relacionados)"
                >
                  ⬇️ Exportar
                </button>
              )}
            </div>
          </div>

          {/* Stepper — acordeón en móvil, siempre visible en desktop */}
          <div className="card overflow-hidden">
            <button onClick={() => setShowStepper(!showStepper)}
              className="w-full flex items-center justify-between px-4 py-3 lg:hidden">
              <span className="font-gaming text-xs tracking-widest text-white">📋 Fase del torneo</span>
              <span className="text-white text-xs">{showStepper ? "▲" : "▼"}</span>
            </button>
            <div className={`p-3 ${showStepper ? "block" : "hidden"} lg:block`}>
              <TournamentStepper status={tournament.status} />
            </div>
          </div>

          {isStaff && tournament.status === "GROUP_STAGE" && pendingPlayers.length > 0 && (
            <div className="card p-4 space-y-3 border border-amber-500/30">
              <p className="section-title text-amber-400 text-xs">⏳ {t("pendingApproval")} ({pendingPlayers.length})</p>
              <ul className="divide-y divide-white/5">
                {pendingPlayers.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2 gap-2">
                    <span className="text-white text-xs font-medium truncate">{p.name}</span>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleApprove(p)} className="btn-primary text-xs py-1 px-2 font-gaming">✓</button>
                      <button onClick={() => handleReject(p.id)} className="btn-danger text-xs py-1 px-2">✗</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Añadir jugadores — acordeón en móvil */}
          {isStaff && OPEN_REG.includes(tournament.status) && (
            <div className="card overflow-hidden">
              <button onClick={() => setShowAddPlayers(!showAddPlayers)}
                className="w-full flex items-center justify-between px-4 py-3">
                <span className="font-gaming text-xs tracking-widest text-white">➕ {t("addPlayers")}</span>
                <span className="text-white text-xs">{showAddPlayers ? "▲" : "▼"}</span>
              </button>
              {showAddPlayers && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                  <input type="text" value={enrollSearch} onChange={(e) => setEnrollSearch(e.target.value)}
                    placeholder={t("searchPlayer")} className="input-base text-xs mt-3" />
                  {(() => {
                    const filtered = unenrolledPlayers.filter((p) =>
                      p.name.toLowerCase().includes(enrollSearch.toLowerCase())
                    );
                    if (filtered.length === 0) return <p className="text-white text-xs text-center py-1">{t("noPlayersAvailable")}</p>;
                    return (
                      <ul className="divide-y divide-white/5 max-h-52 overflow-y-auto">
                        {filtered.map((p) => (
                          <li key={p.id} className="flex items-center justify-between py-1.5 gap-2">
                            <span className="text-white text-xs truncate">{p.name}</span>
                            <button onClick={() => handleEnroll(p.id)}
                              className="btn-primary text-xs py-1 px-2 font-gaming shrink-0">+</button>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {isAdmin && tournament.status === "GROUP_STAGE" && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="section-title mb-0 text-xs">🏆 Clasificados al Knockout</p>
                <span className="text-xs text-white/50 font-gaming">{globalStandings.length} en ranking</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {[4, 8, 16, 32, 64, 128].filter((n) => n <= globalStandings.length).map((n) => (
                  <button key={n} onClick={() => setSelectedQualifiers(n)}
                    className={`flex-1 py-1.5 rounded-lg font-gaming text-xs border transition-all min-w-fit px-2
                      ${(selectedQualifiers || autoQualifiersCount(globalStandings.length)) === n
                        ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                        : "bg-white/5 border-white/10 text-white hover:bg-white/10"}`}>
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/50 text-center">
                Clasifican los top <span className="text-cyan-400 font-gaming font-bold">{selectedQualifiers || autoQualifiersCount(globalStandings.length)}</span> del ranking global
              </p>
            </div>
          )}

          {isAdmin && NEXT_STATUS[tournament.status] && (
            <div className="space-y-2">
              {tournament.status === "REGISTRATION" && players.length > 0 && (
                <div className="card p-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-white">✅ Pagos confirmados</p>
                  <span className={`font-gaming text-sm font-black ${
                    Object.keys(checkIns).length === players.length ? "text-green-400" : "text-amber-400"
                  }`}>
                    {Object.keys(checkIns).length} / {players.length}
                  </span>
                </div>
              )}
              <button onClick={handleAdvance} disabled={working}
                className="btn-primary w-full font-gaming text-xs tracking-wider py-3">
                {working ? t("processing") : `👉 ${NEXT_LABEL_T()[tournament.status]}`}
              </button>
            </div>
          )}
        </aside>

        {/* ── Contenido principal ── */}
        <div className="w-full min-w-0 space-y-4">
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
            {TABS.map((tb) => (
              <button key={tb.key} onClick={() => setTab(tb.key)}
                className={`flex-1 py-2.5 rounded-lg font-gaming text-xs tracking-wider transition-all
                  ${tab === tb.key ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "text-white hover:bg-white/5"}`}>
                <span className="text-base">{tb.icon}</span>
                <span className="hidden sm:inline ml-1">{tb.label}</span>
              </button>
            ))}
          </div>

          <div className="animate-fade-in" key={tab}>
            {tab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: t("players"),    value: players.length,    icon: "👤" },
                    { label: t("groups"),     value: groups.length,     icon: "👥" },
                    { label: t("matches"),    value: matches.length,    icon: "⚔️" },
                    { label: t("qualifiers"), value: tournament.status === "GROUP_STAGE" ? (selectedQualifiers || autoQualifiersCount(globalStandings.length)) : (tournament.qualifiersCount || t("tbd")), icon: "🏆" },
                  ].map((s) => (
                    <div key={s.label} className="card card-cyan p-4 text-center space-y-1">
                      <p className="text-2xl">{s.icon}</p>
                      <p className="font-gaming text-3xl font-black text-cyan-400">{s.value}</p>
                      <p className="text-gray-400 text-xs">{s.label}</p>
                    </div>
                  ))}
                </div>

                {tournament.status === "GROUP_STAGE" && groups.length > 0 && (
                  <div className="card card-cyan p-4 space-y-3">
                    <p className="section-title mb-0 text-xs">⚖️ Checklist de jueces</p>
                    <p className="text-gray-500 text-[11px] leading-snug">
                      Solo quienes tienen ⚖️ activo en Usuarios aparecen para asignación automática. Un juez no puede estar en dos grupos a la vez ni arbitrar un grupo en el que juega.
                    </p>
                    <ul className="divide-y divide-white/5">
                      {groups.map((g) => {
                        const assigned = !!g.judgeId;
                        return (
                          <li key={g.id} className="flex items-center justify-between py-2 gap-2 text-xs">
                            <span className="text-white font-medium truncate">{g.name}</span>
                            <span className={`shrink-0 font-gaming px-2 py-0.5 rounded-full border ${assigned ? "text-green-400 border-green-500/30 bg-green-500/10" : "text-amber-400 border-amber-500/30 bg-amber-500/10"}`}>
                              {assigned ? `✓ ${g.judgeName ?? "Juez"}` : "Sin juez"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {tournament.status === "REGISTRATION" && (
                  <div className="card overflow-hidden">
                    <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                      <p className="section-title mb-0">👤 Jugadores inscritos</p>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <span className="font-gaming text-xs text-green-400">
                            ✅ {Object.keys(checkIns).length} pagaron
                          </span>
                        )}
                        <span className="font-gaming text-xs text-cyan-400">{players.length} / {tournament.maxPlayers}</span>
                      </div>
                    </div>
                    {players.length === 0 ? (
                      <div className="px-5 py-8 text-center">
                        <p className="text-white text-sm">Aún no hay jugadores inscritos</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-white/5">
                        {players.map((p, i) => {
                          const paid = !!checkIns[p.id];
                          return (
                            <li key={p.id} className={`flex items-center justify-between px-5 py-3 transition-colors ${paid ? "bg-green-500/5" : "hover:bg-white/3"}`}>
                              <div className="flex items-center gap-3">
                                <span className="font-gaming text-xs text-white w-5 text-right">{i + 1}</span>
                                <span className="font-medium text-white">{p.name}</span>
                                {isAdmin && (
                                  paid
                                    ? <span className="text-xs text-green-400 font-gaming border border-green-500/30 bg-green-500/10 px-2 py-0.5 rounded-full">✅ Pagado</span>
                                    : <span className="text-xs text-amber-400 font-gaming border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded-full">⏳ Pendiente</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {isAdmin && (
                                  <button
                                    onClick={() => paid
                                      ? removeCheckIn(tournamentId, p.id)
                                      : markCheckIn(tournamentId, p.id, p.name, user!.uid)
                                    }
                                    className={`font-gaming text-xs px-3 py-1 rounded-lg border transition-all ${
                                      paid
                                        ? "border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20"
                                        : "border-green-500/30 text-green-400 bg-green-500/10 hover:bg-green-500/20"
                                    }`}>
                                    {paid ? "✕" : "✓ Pago"}
                                  </button>
                                )}
                                {isStaff && (
                                  <button
                                    onClick={() => { if (confirm(`¿Desinscribir a ${p.name}?`)) run(() => unenrollPlayerFromTournament(p.id, tournamentId)); }}
                                    className="text-white/40 hover:text-red-400 transition-colors text-sm">
                                    🗑️
                                  </button>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {tab === "groups" && (
              <div className="space-y-6">
                {groups.length === 0 ? (
                  <div className="card p-10 text-center">
                    <p className="text-4xl mb-3">👥</p>
                    <p className="text-white font-semibold">{t("noGroupsYet")}</p>
                    <p className="text-gray-400 text-sm mt-1">{t("groupsAutoGenerated")}</p>
                  </div>
                ) : groups.map((g) => {
                  const gPlayers = players.filter((p) => g.playerIds.includes(p.id));
                  const standings = computeGroupStandings(matches, gPlayers, g.id, g.withdrawnPlayerIds ?? []);
                  const byeCount = g.playerIds.filter((id) => id.startsWith("bye-")).length;
                  const slots = tournament.playersPerGroup - g.playerIds.length;
                  const realPlayerCount = g.playerIds.filter((id) => !id.startsWith("bye-")).length;
                  const canDelete = isAdmin && realPlayerCount === 0;
                  const canFill = isAdmin && slots > 0 && byeCount < 3;
                  const eligibleJudges = staffUsers.filter((u) => {
                    if (u.availableAsJudge !== true) return false;
                    const asPlayer = players.find((p) => p.userId === u.uid);
                    return !asPlayer || !g.playerIds.includes(asPlayer.id);
                  });

                  return (
                    <div key={g.id} className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="font-gaming text-sm font-bold text-cyan-300 tracking-widest">{g.name}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {isAdmin && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-gaming">⚖️ {t("judge")}:</span>
                              <select
                                value={g.judgeId ?? ""}
                                onChange={(e) => handleAssignJudge(g.id, e.target.value)}
                                className="bg-white/5 border border-white/10 text-gray-300 text-xs font-gaming rounded-lg px-2 py-1 outline-none focus:border-cyan-500/50 cursor-pointer"
                              >
                                <option value="" className="bg-[#050d1a]">{t("noJudge")}</option>
                                {eligibleJudges.map((u) => (
                                  <option key={u.uid} value={u.uid} className="bg-[#050d1a]">{u.displayName}</option>
                                ))}
                              </select>
                              {g.judgeId && (
                                <button onClick={() => removeJudge(tournamentId, g.id)}
                                  className="text-xs text-red-400 hover:text-red-300 font-gaming" title={t("removeJudge")}>✕</button>
                              )}
                            </div>
                          )}
                          {!isAdmin && g.judgeName && (
                            <span className="text-xs text-purple-300 font-gaming border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 rounded-full">
                              ⚖️ {g.judgeName}
                            </span>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => { if (confirm("¿Eliminar este grupo?")) run(() => deleteGroup(tournamentId, g.id)); }}
                              className="btn-ghost text-xs py-1 px-3 border border-red-500/30 text-red-400 hover:bg-red-500/10"
                            >🗑 Eliminar grupo</button>
                          )}
                          {canFill && (
                            <button
                              onClick={() => run(() => fillGroupWithByes(tournamentId, g, gPlayers.filter((p) => !p.id.startsWith("bye-"))))}
                              className="btn-ghost text-xs py-1 px-3 border border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                            >🃏 Rellenar con byes ({slots})</button>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex flex-wrap gap-2">
                          {g.playerIds.map((pid) => {
                            const p = players.find((pl) => pl.id === pid);
                            const isBye = pid.startsWith("bye-");
                            const isWithdrawn = (g.withdrawnPlayerIds ?? []).includes(pid);
                            const name = isBye ? "BYE" : (p?.name ?? pid);
                            const hasFinished = matches.some(
                              (m) => m.groupId === g.id && m.isFinished && (m.playerA.id === pid || m.playerB.id === pid)
                            );
                            return (
                              <span key={pid} className={`flex items-center gap-1 border text-xs px-2.5 py-1 rounded-full ${
                                isWithdrawn ? "bg-red-500/10 border-red-500/30 text-red-400 line-through"
                                : isBye ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                : "bg-white/5 border-white/10 text-gray-300"
                              }`}>
                                {name}
                                {!isWithdrawn && (
                                  <button
                                    onClick={() => {
                                      const msg = hasFinished
                                        ? "¿Retirar jugador? Sus resultados se conservan pero queda excluido de la clasificación."
                                        : "¿Quitar jugador? Se eliminarán sus partidas pendientes.";
                                      if (!confirm(msg)) return;
                                      run(() => hasFinished
                                        ? withdrawPlayerFromGroup(tournamentId, g.id, pid)
                                        : removePlayerFromGroupWithMatches(tournamentId, g.id, pid)
                                      );
                                    }}
                                    className="ml-1 text-red-400 hover:text-red-300 leading-none"
                                    title={hasFinished ? "Retirar (conserva resultados)" : "Quitar jugador"}
                                  >✕</button>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <StandingsTable standings={standings} highlightTop={2} />
                    </div>
                  );
                })}
              </div>
            )}

            {tab === "matches" && (
              <div className="space-y-4">
                {groupMatches.length === 0 ? (
                  <div className="card p-10 text-center">
                    <p className="text-4xl mb-3">⚔️</p>
                    <p className="text-white font-semibold">{t("noMatchesYet")}</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {groupMatches.map((m) => {
                      const group = groups.find((g) => g.id === m.groupId);
                      return (
                        <MatchCard
                          key={m.id}
                          match={m}
                          tournamentId={tournamentId}
                          tournamentStatus={tournament.status}
                          allMatches={matches}
                          editable={isStaff}
                          judgeId={group?.judgeId}
                          callerUid={user?.uid}
                          isAdmin={isAdmin}
                          onDelete={isAdmin ? (id) => deleteMatch(tournamentId, id) : undefined}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === "standings" && (
              <div className="space-y-4">
                <p className="section-title">{t("globalRanking")}</p>
                <StandingsTable standings={globalStandings} highlightTop={tournament.qualifiersCount} />
              </div>
            )}

            {tab === "bracket" && (
              <BracketView
                matches={knockoutMatches}
                tournamentId={tournamentId}
                editable={isStaff}
                callerUid={user?.uid}
                isAdmin={isAdmin}
              />
            )}

            {tab === "checkin" && isAdmin && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                  <p className="section-title mb-0">✅ Check-In — Pago de inscripción</p>
                  <span className="font-gaming text-xs text-cyan-400">
                    {Object.keys(checkIns).length} / {players.length} pagaron
                  </span>
                </div>
                {players.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-white text-sm">No hay jugadores inscritos</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {players.map((p) => {
                      const paid = !!checkIns[p.id];
                      return (
                        <li key={p.id} className={`flex items-center justify-between px-5 py-3.5 transition-colors ${
                          paid ? "bg-green-500/5" : "hover:bg-white/3"
                        }`}>
                          <div className="flex items-center gap-3">
                            <span className={`text-lg ${paid ? "" : "opacity-30"}`}>✅</span>
                            <div>
                              <p className="font-medium text-white text-sm">{p.name}</p>
                              {paid && (
                                <p className="text-green-400 text-xs font-gaming">
                                  Pagado • {new Date(checkIns[p.id].paidAt).toLocaleDateString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => paid
                              ? removeCheckIn(tournamentId, p.id)
                              : markCheckIn(tournamentId, p.id, p.name, user!.uid)
                            }
                            className={`font-gaming text-xs px-4 py-2 rounded-lg border transition-all ${
                              paid
                                ? "border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20"
                                : "border-green-500/30 text-green-400 bg-green-500/10 hover:bg-green-500/20"
                            }`}>
                            {paid ? "Desmarcar" : "Marcar pago"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

                    {tab === "danger" && isAdmin && (
                    <div className="card space-y-6 border-red-500/20">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <span className="text-2xl">⚠️</span>
                    <div>
                    <h2 className="font-gaming text-lg text-red-400">Zona de Peligro</h2>
                    <p className="text-white/50 text-xs">Acciones administrativas avanzadas.</p>
                    </div>
                    </div>

                    {tournament.status === "FINISHED" ? (
                    <div className="p-4 bg-red-950/30 rounded-xl border border-red-500/20 space-y-3">
                    <div>
                      <p className="text-sm text-white font-bold">Reabrir Torneo</p>
                      <p className="text-xs text-white/60 mt-1">Si finalizaste el torneo por error y necesitas modificar resultados (ej. la final), puedes reabrir el torneo. Volverá a la fase de Eliminatoria.</p>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm("¿Estás seguro de reabrir este torneo? Volverá al estado 'KNOCKOUT'.")) {
                          run(() => updateTournament(tournamentId, { status: "KNOCKOUT", finishedAt: null as any }));
                        }
                      }}
                      disabled={working}
                      className="btn-danger w-full sm:w-auto text-xs py-2 px-4"
                    >
                      Reabrir Torneo
                    </button>
                    </div>
                    ) : (
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-xs text-white/60">No hay acciones de peligro disponibles para el estado actual del torneo ({tournament.status}).</p>
                    </div>
                    )}
                    </div>
                    )}
                    </div>
                    </div>
                    </div>
                    </div>
                    );
                    }
