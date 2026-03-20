import type { Combo, Part } from "@/types/combos";

export function validateAssistBlade(blade: Part, assistBladeId: string | null): string | null {
  if (blade.bladeSystem === "CX") return null;
  if (assistBladeId !== null) return "Assist Blade solo está permitido para Blades de sistema CX.";
  return null;
}

export function validateComboIntegrity(
  combo: Omit<Combo, "id" | "createdAt" | "isActive">,
  blade: Part
): string | null {
  if (blade.type !== "Blade") return "La pieza seleccionada no es un Blade.";
  return validateAssistBlade(blade, combo.assistBladeId);
}

export function validatePlayerHasAllCombos(combos: Combo[]): string | null {
  const slots = combos.filter((c) => c.isActive).map((c) => c.slot);
  const missing = ([1, 2, 3] as const).filter((s) => !slots.includes(s));
  if (missing.length > 0) return `Faltan combos en los slots: ${missing.join(", ")}`;
  return null;
}
