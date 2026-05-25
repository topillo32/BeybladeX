"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, FormEvent } from "react";
import { useAuthContext } from "@/lib/AuthContext";
import { useLeagues } from "@/hooks/useTournament";
import { createTournament } from "@/services/tournamentService";
import { createLeague } from "@/services/leagueService";
import { createPlayer } from "@/services/playerService";
import { getCommunities } from "@/services/communityService";
import { useLang } from "@/lib/LangContext";
import type { Community, EventType } from "@/types";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const { user, isAdmin } = useAuthContext();
  const { leagues } = useLeagues();
  const { t } = useLang();
  const router = useRouter();

  if (!isAdmin) {
    if (typeof window !== "undefined") router.push("/dashboard");
    return null;
  }

  // Tournament state
  const [tName, setTName] = useState("");
  const [tLocation, setTLocation] = useState("");
  const [tMaxPlayers, setTMaxPlayers] = useState(16);
  const [tEventType, setTEventType] = useState<EventType>("tournament");
  const [tLeagueId, setTLeagueId] = useState("");
  const [tCommunityId, setTCommunityId] = useState("");
  const [tSubmitting, setTSubmitting] = useState(false);
  const [tError, setTError] = useState<string | null>(null);
  const [tSuccess, setTSuccess] = useState(false);

  // League state
  const [lName, setLName] = useState("");
  const [lDescription, setLDescription] = useState("");
  const [lCommunityId, setLCommunityId] = useState("");
  const [lSubmitting, setLSubmitting] = useState(false);
  const [lSuccess, setLSuccess] = useState(false);

  const [communities, setCommunities] = useState<Community[]>([]);

  // Player state
  const [pName, setPName] = useState("");
  const [pSubmitting, setPSubmitting] = useState(false);
  const [pError, setPError] = useState<string | null>(null);
  const [pSuccess, setPSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      const items = await getCommunities();
      setCommunities(items);
      if (items.length && !tCommunityId) setTCommunityId(items[0].id);
      if (items.length && !lCommunityId) setLCommunityId(items[0].id);
    };
    void load();
  }, []);

  const handleCreateTournament = async (e: FormEvent) => {
    e.preventDefault();
    if (!tName.trim() || !user) return;
    setTSubmitting(true);
    setTError(null);
    setTSuccess(false);
    try {
      const targetCommunity = tEventType === "league_event" && tLeagueId
        ? leagues.find((l) => l.id === tLeagueId)?.communityId
        : tCommunityId || null;

      await createTournament({
        name: tName.trim(),
        location: tLocation.trim() || undefined,
        maxPlayers: tMaxPlayers,
        playersPerGroup: 4,
        eventType: tEventType,
        communityId: targetCommunity,
        ...(tEventType === "league_event" && tLeagueId ? { leagueId: tLeagueId } : {}),
      }, user.uid);
      setTName("");
      setTLocation("");
      setTEventType("tournament");
      setTLeagueId("");
      setTSuccess(true);
      setTimeout(() => setTSuccess(false), 3000);
    } catch (err: any) {
      setTError(err.message);
    } finally {
      setTSubmitting(false);
    }
  };

  const handleCreateLeague = async (e: FormEvent) => {
    e.preventDefault();
    if (!lName.trim() || !user) return;
    setLSubmitting(true);
    setLSuccess(false);
    try {
      await createLeague(lName.trim(), lDescription.trim(), user.uid, lCommunityId || null);
      setLName(""); 
      setLDescription("");
      setLSuccess(true);
      setTimeout(() => setLSuccess(false), 3000);
    } finally {
      setLSubmitting(false);
    }
  };

  const handleCreatePlayer = async (e: FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) return;
    setPSubmitting(true);
    setPError(null);
    setPSuccess(false);
    try {
      await createPlayer(pName.trim());
      setPName("");
      setPSuccess(true);
      setTimeout(() => setPSuccess(false), 3000);
    } catch (err: any) {
      setPError(err.message);
    } finally {
      setPSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="font-gaming text-3xl font-black tracking-widest text-white">⚙️ Setup Panel</h1>
          <p className="text-gray-400 text-sm mt-1">Creación de entidades administrativas</p>
          <div className="divider-cyan mt-3" />
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-start">
          
          {/* TOURNAMENTS */}
          <div className="card card-cyan p-5">
            <p className="section-title">{t("createTournament")}</p>
            <form onSubmit={handleCreateTournament} className="space-y-3">
              <input type="text" value={tName} onChange={(e) => setTName(e.target.value)}
                placeholder={t("tournamentName")} className="input-base text-sm" required />
              <input type="text" value={tLocation} onChange={(e) => setTLocation(e.target.value)}
                placeholder="📍 Ubicación (opcional)" className="input-base text-sm" />
              <div>
                <label className="section-title block mb-1 text-xs">{t("maxPlayers")}</label>
                <input type="number" value={tMaxPlayers} onChange={(e) => setTMaxPlayers(Number(e.target.value))}
                  min={4} max={200} className="input-base text-sm" />
              </div>
              <div className="flex gap-2">
                {(["tournament", "league_event"] as EventType[]).map((et) => (
                  <button
                    key={et}
                    type="button"
                    onClick={() => { setTEventType(et); if (et === "tournament") setTLeagueId(""); }}
                    className={`flex-1 py-2 rounded-lg font-gaming text-xs tracking-wider border transition-all
                      ${tEventType === et
                        ? et === "league_event"
                          ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                          : "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                        : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"}`}
                  >
                    {et === "tournament" ? `🏆 ${t("typeTournament")}` : `🏅 ${t("typeLeagueEvent")}`}
                  </button>
                ))}
              </div>
              {tEventType === "league_event" && (
                <div>
                  <label className="section-title block mb-1 text-xs">{t("selectLeague")}</label>
                  <select
                    value={tLeagueId}
                    onChange={(e) => setTLeagueId(e.target.value)}
                    required
                    className="input-base text-sm"
                  >
                    <option value="">{t("selectLeaguePlaceholder")}</option>
                    {leagues.map((l) => (
                      <option key={l.id} value={l.id} className="bg-[#050d1a]">{l.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="section-title block mb-1 text-xs">Comunidad</label>
                <select
                  value={tCommunityId}
                  onChange={(e) => setTCommunityId(e.target.value)}
                  className="input-base text-sm"
                >
                  <option value="">Sin comunidad (global)</option>
                  {communities.map((community) => (
                    <option key={community.id} value={community.id}>{community.name}</option>
                  ))}
                </select>
              </div>
              {tError && <p className="text-red-400 text-xs">{tError}</p>}
              {tSuccess && <p className="text-green-400 text-xs font-gaming">✓ Creado</p>}
              <button type="submit" disabled={tSubmitting || (tEventType === "league_event" && !tLeagueId)} className="btn-primary w-full font-gaming text-xs tracking-wider disabled:opacity-50 mt-2">
                {tSubmitting ? t("creating") : t("createTournament")}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            {/* COMMUNITIES */}
            {/* LEAGUES */}
            <div className="card card-purple p-5">
              <p className="section-title text-purple-400">{t("createLeague")}</p>
              <form onSubmit={handleCreateLeague} className="space-y-3">
                <input type="text" value={lName} onChange={(e) => setLName(e.target.value)}
                  placeholder={t("leagueName")} className="input-base text-sm" required />
                <input type="text" value={lDescription} onChange={(e) => setLDescription(e.target.value)}
                  placeholder={t("leagueDescription")} className="input-base text-sm" />
                <div>
                  <label className="section-title block mb-1 text-xs">Comunidad</label>
                  <select
                    value={lCommunityId}
                    onChange={(e) => setLCommunityId(e.target.value)}
                    className="input-base text-sm"
                  >
                    <option value="">Sin comunidad</option>
                    {communities.map((community) => (
                      <option key={community.id} value={community.id}>{community.name}</option>
                    ))}
                  </select>
                </div>
                {lSuccess && <p className="text-green-400 text-xs font-gaming">✓ Creada</p>}
                <button type="submit" disabled={lSubmitting} className="btn-primary w-full bg-purple-600 hover:bg-purple-500 font-gaming text-xs tracking-wider border-purple-500/50 mt-2">
                  {lSubmitting ? t("creating") : t("createLeague")}
                </button>
              </form>
            </div>

            {/* PLAYERS */}
            <div className="card card-cyan p-5">
              <p className="section-title">Crear Jugador</p>
              <form onSubmit={handleCreatePlayer} className="space-y-3">
                <input
                  type="text"
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  placeholder="Nombre del jugador"
                  className="input-base text-sm"
                  required
                />
                {pError && <p className="text-red-400 text-xs">{pError}</p>}
                {pSuccess && <p className="text-green-400 text-xs font-gaming">✓ Creado</p>}
                <button type="submit" disabled={pSubmitting || !pName.trim()} className="btn-primary w-full font-gaming text-xs tracking-wider mt-2">
                  {pSubmitting ? "..." : "+ Agregar Jugador"}
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
