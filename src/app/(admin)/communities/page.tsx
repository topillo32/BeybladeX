"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/AuthContext";
import { createCommunity, deleteCommunity, getCommunities } from "@/services/communityService";
import { Spinner } from "@/components/ui/Spinner";
import type { Community } from "@/types";

export default function CommunitiesPage() {
  const { isAdmin, user } = useAuthContext();
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }

    const load = async () => {
      setLoading(true);
      const items = await getCommunities();
      setCommunities(items);
      setLoading(false);
    };

    void load();
  }, [isAdmin, router]);

  const refreshCommunities = async () => {
    const items = await getCommunities();
    setCommunities(items);
  };

  const handleCreateCommunity = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !user) return;

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await createCommunity(name.trim(), description.trim(), user.uid, logoUrl.trim() || undefined);
      setName("");
      setDescription("");
      setLogoUrl("");
      setSuccessMessage("Comunidad creada");
      await refreshCommunities();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setErrorMessage(error?.message || "No se pudo crear la comunidad");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCommunity = async (id: string) => {
    if (!window.confirm("¿Eliminar esta comunidad? Esta acción no se puede deshacer.")) return;
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await deleteCommunity(id);
      setSuccessMessage("Comunidad eliminada");
      await refreshCommunities();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setErrorMessage(error?.message || "No se pudo eliminar la comunidad");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin) return null;
  if (loading) return <Spinner size={12} />;

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center">
          <h1 className="font-gaming text-3xl font-black tracking-widest text-white">🏘️ Comunidades</h1>
          <p className="text-gray-400 text-sm mt-1">Gestiona las comunidades de tu plataforma</p>
          <div className="divider-cyan mt-3" />
        </div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="card overflow-hidden">
            <div className="p-5">
              <p className="section-title">Comunidades existentes</p>
            </div>
            <div className="divide-y divide-white/5">
              {communities.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">No hay comunidades creadas aún.</div>
              ) : (
                communities.map((community) => (
                  <div key={community.id} className="flex flex-col gap-3 px-5 py-4 hover:bg-white/5 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white text-lg truncate">{community.name}</p>
                        {community.description && <p className="text-gray-400 text-sm mt-1">{community.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {community.logoUrl && (
                          <img src={community.logoUrl} alt={`${community.name} logo`} className="h-10 w-10 rounded-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => void handleDeleteCommunity(community.id)}
                          className="btn-primary bg-red-600 hover:bg-red-500 text-xs px-3 py-2"
                          disabled={submitting}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Creada por {community.createdBy}</span>
                      <span>{community.createdAt?.toDate ? community.createdAt.toDate().toLocaleDateString() : "-"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card card-cyan p-5">
            <p className="section-title">Crear nueva comunidad</p>
            <form onSubmit={handleCreateCommunity} className="space-y-4 mt-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre de la comunidad"
                className="input-base text-sm"
                required
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción opcional"
                className="input-base text-sm"
              />
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="URL del logo (opcional)"
                className="input-base text-sm"
              />
              {errorMessage && <p className="text-red-400 text-xs">{errorMessage}</p>}
              {successMessage && <p className="text-green-400 text-xs">✓ {successMessage}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full font-gaming text-xs tracking-wider disabled:opacity-50 mt-2"
              >
                {submitting ? "Guardando..." : "Crear comunidad"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
