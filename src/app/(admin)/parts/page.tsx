"use client";
export const dynamic = "force-dynamic";
import { useState, useRef } from "react";
import { useAuthContext } from "@/lib/AuthContext";
import { useParts } from "@/hooks/useParts";
import { createPart } from "@/lib/repositories/partsRepository";
import { Spinner } from "@/components/ui/Spinner";
import type { PartType, BladeSystem } from "@/types/combos";

const PART_TYPES: PartType[] = ["Blade", "Ratchet", "Bit"];
const BLADE_SYSTEMS: BladeSystem[] = ["BX", "CX", "UX"];

// Formato esperado del JSON/TXT:
// [{"name":"Dran Sword","type":"Blade","bladeSystem":"BX"}, ...]
type RawPart = { name: string; type: PartType; bladeSystem?: BladeSystem };

function parseParts(text: string): RawPart[] {
  const trimmed = text.trim();
  // Intentar JSON
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  }
  // Formato plano: una pieza por línea → "Dran Sword,Blade,BX"
  return trimmed.split("\n").filter(Boolean).map((line) => {
    const [name, type, bladeSystem] = line.split(",").map((s) => s.trim());
    return { name, type: type as PartType, bladeSystem: bladeSystem as BladeSystem | undefined };
  });
}

export default function PartsPage() {
  const { isAdmin } = useAuthContext();
  const [activeType, setActiveType] = useState<PartType>("Blade");
  const { parts, loading, refresh } = useParts(activeType);

  // Formulario individual
  const [name, setName] = useState("");
  const [bladeSystem, setBladeSystem] = useState<BladeSystem>("BX");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Importación masiva
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: number; fail: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createPart({
        name: name.trim(),
        type: activeType,
        bladeSystem: activeType === "Blade" ? bladeSystem : undefined,
        isActive: true,
      });
      setName("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setImportError(null);
    try {
      const text = await file.text();
      const rows = parseParts(text);
      if (rows.length === 0) throw new Error("El archivo no contiene piezas válidas.");

      let ok = 0, fail = 0;
      await Promise.all(
        rows.map(async (row) => {
          try {
            if (!row.name || !row.type) { fail++; return; }
            await createPart({
              name: row.name.trim(),
              type: row.type,
              bladeSystem: row.type === "Blade" ? row.bladeSystem : undefined,
              isActive: true,
            });
            ok++;
          } catch { fail++; }
        })
      );
      setImportResult({ ok, fail });
      refresh();
    } catch (e: any) {
      setImportError(e.message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="page-wrapper">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="font-gaming text-3xl font-black tracking-widest text-white">⚙️ Piezas</h1>
          <div className="divider-cyan mt-3" />
        </div>

        {/* Tabs por tipo */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
          {PART_TYPES.map((type) => (
            <button key={type} onClick={() => setActiveType(type)}
              className={`flex-1 py-2 rounded-lg font-gaming text-xs tracking-widest transition-all
                ${activeType === type ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "text-gray-500 hover:text-gray-300"}`}>
              {type}
            </button>
          ))}
        </div>

        {isAdmin && (
          <>
            {/* Formulario individual */}
            <form onSubmit={handleCreate} className="card p-4 flex gap-3 flex-wrap items-end">
              <div className="flex-1 min-w-40">
                <label className="section-title block mb-1">Nombre</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  placeholder={`Nueva pieza ${activeType}`} className="input-base text-sm" required />
              </div>
              {activeType === "Blade" && (
                <div>
                  <label className="section-title block mb-1">Sistema</label>
                  <select value={bladeSystem} onChange={(e) => setBladeSystem(e.target.value as BladeSystem)}
                    className="input-base text-sm">
                    {BLADE_SYSTEMS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              {error && <p className="text-red-400 text-xs w-full">{error}</p>}
              <button type="submit" disabled={submitting} className="btn-primary font-gaming text-xs tracking-wider">
                {submitting ? "..." : "+ Agregar"}
              </button>
            </form>

            {/* Importación masiva */}
            <div className="card overflow-hidden">
              <button onClick={() => setShowImport(!showImport)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/3 transition-colors">
                <span className="font-gaming text-xs tracking-widest text-cyan-300">📥 Importar desde archivo</span>
                <span className="text-gray-500 text-xs">{showImport ? "▲" : "▼"}</span>
              </button>

              {showImport && (
                <div className="px-5 pb-5 space-y-4 border-t border-white/5">
                  {/* Formato esperado */}
                  <div className="mt-4 space-y-2">
                    <p className="section-title">Formato aceptado</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-white/3 rounded-lg p-3 space-y-1">
                        <p className="text-cyan-400 font-gaming text-xs tracking-widest">JSON</p>
                        <pre className="text-gray-400 text-xs leading-relaxed">{`[
  {"name":"Dran Sword",
   "type":"Blade",
   "bladeSystem":"BX"},
  {"name":"Cobalt Dragoon",
   "type":"Blade",
   "bladeSystem":"CX"},
  {"name":"3-60","type":"Ratchet"},
  {"name":"Flat","type":"Bit"}
]`}</pre>
                      </div>
                      <div className="bg-white/3 rounded-lg p-3 space-y-1">
                        <p className="text-purple-400 font-gaming text-xs tracking-widest">TXT (CSV)</p>
                        <pre className="text-gray-400 text-xs leading-relaxed">{`Dran Sword,Blade,BX
Cobalt Dragoon,Blade,CX
3-60,Ratchet
Flat,Bit`}</pre>
                      </div>
                    </div>
                  </div>

                  {/* Input de archivo */}
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-white/10 hover:border-cyan-500/40 rounded-xl p-8 text-center cursor-pointer transition-all group">
                    <p className="text-3xl mb-2">📂</p>
                    <p className="text-white font-semibold group-hover:text-cyan-300 transition-colors">
                      {importing ? "Importando..." : "Haz clic para seleccionar archivo"}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">.json o .txt</p>
                    <input ref={fileRef} type="file" accept=".json,.txt,.csv"
                      onChange={handleImport} className="hidden" disabled={importing} />
                  </div>

                  {/* Resultado */}
                  {importing && <Spinner />}
                  {importResult && (
                    <div className={`flex gap-4 p-4 rounded-xl border ${
                      importResult.fail === 0
                        ? "border-green-500/30 bg-green-500/10"
                        : "border-amber-500/30 bg-amber-500/10"
                    }`}>
                      <p className="text-green-400 font-gaming text-sm">✓ {importResult.ok} importadas</p>
                      {importResult.fail > 0 && (
                        <p className="text-red-400 font-gaming text-sm">✗ {importResult.fail} fallidas</p>
                      )}
                    </div>
                  )}
                  {importError && <p className="text-red-400 text-sm">{importError}</p>}
                </div>
              )}
            </div>
          </>
        )}

        {/* Lista de piezas */}
        {loading ? <Spinner /> : parts.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-4xl mb-3">⚙️</p>
            <p className="text-white font-semibold">No hay piezas de tipo {activeType}</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <p className="section-title mb-0">{activeType}s</p>
              <span className="font-gaming text-xs text-gray-500">{parts.length} piezas</span>
            </div>
            <ul className="divide-y divide-white/5">
              {parts.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-white">{p.name}</span>
                    {p.bladeSystem && (
                      <span className={`text-xs font-gaming border px-2 py-0.5 rounded-full
                        ${p.bladeSystem === "CX" ? "text-purple-300 border-purple-500/30 bg-purple-500/10"
                        : p.bladeSystem === "UX" ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
                        : "text-cyan-300 border-cyan-500/30 bg-cyan-500/10"}`}>
                        {p.bladeSystem}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-green-400 font-gaming border border-green-500/30 bg-green-500/10 px-2 py-0.5 rounded-full">
                    Activa
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
