"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { usePlayers } from "@/hooks/useTournament";
import { createPlayer, deletePlayer, linkPlayerToUser } from "@/services/playerService";
import { getAllUsers } from "@/services/authService";
import { useAuthContext } from "@/lib/AuthContext";
import { Spinner } from "@/components/ui/Spinner";
import { useLang } from "@/lib/LangContext";
import type { AppUser, Player } from "@/types";

export default function AdminPlayersPage() {
  const { players, loading } = usePlayers();
  const { isAdmin } = useAuthContext();
  const { t } = useLang();
  const [name, setName] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Link modal
  const [linkTarget, setLinkTarget] = useState<Player | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [linking, setLinking] = useState(false);

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

  const openLinkModal = async (player: Player) => {
    setLinkTarget(player);
    setSelectedUser(null);
    setUserSearch("");
    setConfirming(false);
    setLoadingUsers(true);
    const allUsers = await getAllUsers();
    setUsers(allUsers);
    setLoadingUsers(false);
  };

  const closeModal = () => {
    if (linking) return;
    setLinkTarget(null);
    setConfirming(false);
  };

  const handleLink = async () => {
    if (!linkTarget || !selectedUser) return;
    setLinking(true);
    try {
      await linkPlayerToUser(linkTarget.id, selectedUser.uid, linkTarget.name);
      setLinkTarget(null);
      setConfirming(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLinking(false);
    }
  };

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const unlinkedCount = players.filter((p) => !p.userId).length;

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
            <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
              <span className="section-title mb-0">{t("players")}</span>
              {unlinkedCount > 0 && (
                <span className="text-xs font-gaming text-amber-400 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  ⚠️ {unlinkedCount} sin vincular
                </span>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5 text-left section-title">Nombre</th>
                  <th className="px-4 py-2.5 text-center section-title hidden sm:table-cell">Torneos</th>
                  <th className="px-4 py-2.5 text-center section-title hidden md:table-cell">Cuenta</th>
                  {isAdmin && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-white/3 transition-colors group">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{p.name}</p>
                      <div className="flex gap-2 mt-0.5 sm:hidden">
                        <span className="text-xs text-cyan-400 font-gaming">🏆 {p.tournamentIds?.length ?? 0}</span>
                        {p.userId
                          ? <span className="text-xs text-green-400">✓ vinculado</span>
                          : <span className="text-xs text-amber-400">sin cuenta</span>
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-gaming text-cyan-400 hidden sm:table-cell">
                      {p.tournamentIds?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      {p.userId ? (
                        <span className="text-xs text-green-400 font-gaming border border-green-500/30 bg-green-500/10 px-2 py-0.5 rounded-full">✓ Vinculado</span>
                      ) : (
                        <button
                          onClick={() => openLinkModal(p)}
                          className="text-xs font-gaming px-2.5 py-0.5 rounded-full border border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                        >
                          Vincular
                        </button>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!p.userId && (
                            <button
                              onClick={() => openLinkModal(p)}
                              className="md:hidden text-xs font-gaming px-2.5 py-0.5 rounded-full border border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                            >
                              Vincular
                            </button>
                          )}
                          <button onClick={() => handleDelete(p.id, p.name)} className="text-white/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">🗑️</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {linkTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="card w-full max-w-md p-6 space-y-5 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {!confirming ? (
              <>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-gaming text-base text-white tracking-wider">🔗 Vincular cuenta</h2>
                    <p className="text-white/50 text-xs mt-0.5">Jugador: <span className="text-cyan-400 font-semibold">{linkTarget.name}</span></p>
                  </div>
                  <button onClick={closeModal} className="text-white/30 hover:text-white transition-colors text-lg leading-none">✕</button>
                </div>

                {/* User search */}
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Buscar por nombre o email..."
                  className="input-base text-sm"
                  autoFocus
                />

                {/* User list */}
                <div className="max-h-56 overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/5">
                  {loadingUsers ? (
                    <div className="flex justify-center py-6"><Spinner size={6} /></div>
                  ) : filteredUsers.length === 0 ? (
                    <p className="text-center text-white/40 text-sm py-6">Sin resultados</p>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        key={u.uid}
                        onClick={() => setSelectedUser(u)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                          selectedUser?.uid === u.uid ? "bg-cyan-500/10 border-l-2 border-cyan-400" : ""
                        }`}
                      >
                        <div>
                          <p className="text-sm text-white font-medium">{u.displayName}</p>
                          <p className="text-xs text-white/40">{u.email}</p>
                        </div>
                        {selectedUser?.uid === u.uid && <span className="text-cyan-400 text-sm">✓</span>}
                      </button>
                    ))
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-1">
                  <button onClick={closeModal} className="btn-ghost text-sm px-4 py-2">Cancelar</button>
                  <button
                    onClick={() => setConfirming(true)}
                    disabled={!selectedUser}
                    className="btn-primary font-gaming text-xs tracking-wider px-5"
                  >
                    Siguiente →
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <h2 className="font-gaming text-base text-white tracking-wider">⚠️ Confirmar vinculación</h2>
                  <button onClick={closeModal} className="text-white/30 hover:text-white transition-colors text-lg leading-none">✕</button>
                </div>

                {/* Changes preview */}
                <div className="rounded-xl border border-white/10 overflow-hidden text-sm">
                  {/* User row */}
                  <div className="px-4 py-3 bg-white/3 border-b border-white/5">
                    <p className="text-white/40 text-xs font-gaming tracking-wider mb-2">USUARIO</p>
                    <p className="text-white/40 text-xs mb-1">{selectedUser?.email}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-white/40 line-through text-sm">{selectedUser?.displayName}</span>
                      <span className="text-white/30">→</span>
                      <span className="text-cyan-400 font-semibold">{linkTarget.name}</span>
                    </div>
                  </div>
                  {/* Player row */}
                  <div className="px-4 py-3">
                    <p className="text-white/40 text-xs font-gaming tracking-wider mb-2">JUGADOR</p>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">{linkTarget.name}</span>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <span className="text-cyan-400 font-gaming">🏆 {linkTarget.tournamentIds?.length ?? 0}</span>
                        <span>torneos conservados</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-1">
                  <button onClick={() => setConfirming(false)} className="btn-ghost text-sm px-4 py-2">← Atrás</button>
                  <button
                    onClick={handleLink}
                    disabled={linking}
                    className="btn-primary font-gaming text-xs tracking-wider px-5"
                  >
                    {linking ? "..." : "Confirmar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
