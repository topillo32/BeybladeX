"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { usePlayers } from "@/hooks/useTournament";
import { createPlayer, deletePlayer } from "@/services/playerService";
import { useAuthContext } from "@/lib/AuthContext";
import { Spinner } from "@/components/ui/Spinner";
import { useLang } from "@/lib/LangContext";

export default function AdminPlayersPage() {
  const { players, loading } = usePlayers();
  const { isAdmin } = useAuthContext();
  const { t } = useLang();
  const [name, setName] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setWorking(true);
    setError(null);
    try {
      await createPlayer(name.trim());
      setName("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = async (id: string, playerName: string) => {
    if (!confirm(`¿Eliminar a "${playerName}" permanentemente?`)) return;
    await deletePlayer(id);
  };

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spinner size={12} />;

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-3xl space-y-6">
        <div>
          <h1 className="font-gaming text-2xl font-black tracking-widest text-white">👤 {t("players")}</h1>
          <div className="divider-cyan mt-2" />
        </div>

        {isAdmin && (
          <form onSubmit={handleCreate} className="card p-4 flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del jugador"
              className="input-base flex-1 text-sm"
            />
            <button type="submit" disabled={working || !name.trim()} className="btn-primary font-gaming text-xs tracking-wider px-5 shrink-0">
              {working ? "..." : "+ Agregar"}
            </button>
          </form>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar jugador..."
          className="input-base text-sm w-full"
        />

        {filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-4xl mb-3">👤</p>
            <p className="text-white font-semibold">No hay jugadores</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5 text-left section-title">{t("players")}</th>
                  <th className="px-4 py-2.5 text-center section-title hidden sm:table-cell">Torneos</th>
                  <th className="px-4 py-2.5 text-center section-title hidden sm:table-cell">Pendientes</th>
                  <th className="px-4 py-2.5 text-center section-title hidden md:table-cell">Cuenta</th>
                  {isAdmin && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{p.name}</p>
                      {/* En móvil muestra los datos secundarios debajo del nombre */}
                      <div className="flex gap-2 mt-0.5 sm:hidden">
                        <span className="text-xs text-cyan-400 font-gaming">🏆 {p.tournamentIds?.length ?? 0}</span>
                        {(p.pendingTournamentIds?.length ?? 0) > 0 && (
                          <span className="text-xs text-amber-400 font-gaming">⏳ {p.pendingTournamentIds.length}</span>
                        )}
                        {p.userId
                          ? <span className="text-xs text-green-400">✓</span>
                          : <span className="text-xs text-white/40">—</span>
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-gaming text-cyan-400 hidden sm:table-cell">{p.tournamentIds?.length ?? 0}</td>
                    <td className="px-4 py-3 text-center font-gaming text-amber-400 hidden sm:table-cell">{p.pendingTournamentIds?.length ?? 0}</td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      {p.userId
                        ? <span className="text-xs text-green-400 font-gaming border border-green-500/30 bg-green-500/10 px-2 py-0.5 rounded-full">✓ Vinculado</span>
                        : <span className="text-xs text-white/50 font-gaming border border-white/10 px-2 py-0.5 rounded-full">Sin cuenta</span>
                      }
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete(p.id, p.name)} className="text-white/40 hover:text-red-400 transition-colors text-sm">🗑️</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
