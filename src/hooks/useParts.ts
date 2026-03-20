"use client";
import { useEffect, useState, useCallback } from "react";
import { getPartsByType } from "@/lib/repositories/partsRepository";
import type { Part, PartType, BladeSystem } from "@/types/combos";

export const useParts = (type: PartType, bladeSystem?: BladeSystem) => {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    getPartsByType(type, bladeSystem)
      .then(setParts)
      .finally(() => setLoading(false));
  }, [type, bladeSystem ?? ""]);

  useEffect(() => { refresh(); }, [refresh]);

  return { parts, loading, refresh };
};
