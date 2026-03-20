import { collection, doc, getDoc, getDocs, addDoc, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase";
import type { Part, PartType, BladeSystem } from "@/types/combos";

const col = collection(db, "parts");

export const createPart = async (data: Omit<Part, "id" | "createdAt">): Promise<string> => {
  const payload: Record<string, unknown> = {
    name: data.name,
    type: data.type,
    isActive: true,
    createdAt: serverTimestamp(),
  };
  if (data.bladeSystem) payload.bladeSystem = data.bladeSystem;
  if (data.imageUrl)    payload.imageUrl    = data.imageUrl;
  const ref = await addDoc(col, payload);
  return ref.id;
};

export const getPartsByType = async (type: PartType, bladeSystem?: BladeSystem): Promise<Part[]> => {
  const snap = await getDocs(query(col, where("type", "==", type)));
  let parts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Part));
  parts = parts.filter((p) => p.isActive !== false); // incluye si isActive es true o undefined
  if (bladeSystem) parts = parts.filter((p) => p.bladeSystem === bladeSystem);
  return parts;
};

export const getPartById = async (id: string): Promise<Part | null> => {
  const snap = await getDoc(doc(db, "parts", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Part) : null;
};
