import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Community } from "@/types";

const col = collection(db, "communities");

export const createCommunity = async (
  name: string,
  description: string,
  createdBy: string,
  logoUrl?: string
) => {
  return await addDoc(col, {
    name,
    description,
    logoUrl: logoUrl ?? null,
    createdBy,
    createdAt: serverTimestamp(),
  });
};

export const updateCommunity = async (id: string, data: Partial<Community>) => {
  return await updateDoc(doc(db, "communities", id), data as Record<string, unknown>);
};

export const deleteCommunity = async (id: string) => {
  return await deleteDoc(doc(db, "communities", id));
};

export const getCommunity = async (id: string): Promise<Community | null> => {
  const snap = await getDoc(doc(db, "communities", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Community) : null;
};

export const getCommunities = async (): Promise<Community[]> => {
  const snap = await getDocs(query(col, orderBy("createdAt", "desc")));
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Community));
};
