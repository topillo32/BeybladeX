"use client";
import { useState, useEffect } from "react";
import { useParts } from "@/hooks/useParts";
import { getPartById } from "@/lib/repositories/partsRepository";
import type { Combo, BladeSystem } from "@/types/combos";

interface Props {
  slot: 1 | 2 | 3;
  playerId: string;
  tournamentId: string;
  initial?: Partial<Combo>;
  onSave: (data: Omit<Combo, "id" | "createdAt" | "isActive">) => Promise<void>;
}

export const ComboSelector = ({ slot, playerId, tournamentId, initial, onSave }: Props) => {
  const { parts: blades }   = useParts("Blade");
  const { parts: ratchets } = useParts("Ratchet");
  const { parts: bits }     = useParts("Bit");

  const [bladeId, setBladeId]           = useState(initial?.bladeId ?? "");
  const [assistBladeId, setAssistBladeId] = useState<string | null>(initial?.assistBladeId ?? null);
  const [ratchetId, setRatchetId]       = useState(initial?.ratchetId ?? "");
  const [bitId, setBitId]               = useState(initial?.bitId ?? "");
  const [bladeSystem, setBladeSystem]   = useState<BladeSystem | null>(null);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    if (!bladeId) { setBladeSystem(null); setAssistBladeId(null); return; }
    getPartById(bladeId).then((p) => {
      const sys = p?.bladeSystem ?? null;
      setBladeSystem(sys);
      if (sys !== "CX") setAssistBladeId(null);
    });
  }, [bladeId]);

  const handleSave = async () => {
    if (!bladeId || !ratchetId || !bitId) { setError("Selecciona Blade, Ratchet y Bit."); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({ playerId, tournamentId, slot, bladeId, assistBladeId, ratchetId, bitId });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-4 space-y-3">
      <p className="section-title">Combo {slot}</p>

      <select value={bladeId} onChange={(e) => setBladeId(e.target.value)} className="input-base text-sm">
        <option value="">— Blade —</option>
        {blades.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.bladeSystem})</option>)}
      </select>

      {bladeSystem === "CX" && (
        <select value={assistBladeId ?? ""} onChange={(e) => setAssistBladeId(e.target.value || null)} className="input-base text-sm">
          <option value="">— Assist Blade (opcional) —</option>
          {blades.filter((b) => b.bladeSystem === "CX").map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      <select value={ratchetId} onChange={(e) => setRatchetId(e.target.value)} className="input-base text-sm">
        <option value="">— Ratchet —</option>
        {ratchets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      <select value={bitId} onChange={(e) => setBitId(e.target.value)} className="input-base text-sm">
        <option value="">— Bit —</option>
        {bits.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full font-gaming text-xs tracking-wider">
        {saving ? "Guardando..." : "Guardar Combo"}
      </button>
    </div>
  );
};
