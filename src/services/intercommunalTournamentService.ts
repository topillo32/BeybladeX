import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
  getDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import type { IntercommunalTournament } from "@/types/intercommunal";

const COLLECTION_NAME = "intercommunal_tournaments";
const col = collection(db, COLLECTION_NAME);

export const createIntercommunalTournament = async (
  data: Pick<IntercommunalTournament, "name" | "maxTeams" | "qualifiersCount">
) => {
  const tournamentData = {
    name: data.name,
    maxTeams: data.maxTeams,
    qualifiersCount: data.qualifiersCount,
    status: "DRAFT",
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(col, tournamentData);
  return docRef.id;
};

export const updateIntercommunalTournament = async (
  id: string,
  data: Partial<IntercommunalTournament>
) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, data as Record<string, unknown>);
};

export const deleteIntercommunalTournament = async (id: string) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
};

export const getIntercommunalTournaments = async (): Promise<IntercommunalTournament[]> => {
  const q = query(col, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as IntercommunalTournament[];
};

export const getIntercommunalTournament = async (
  id: string
): Promise<IntercommunalTournament | null> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as IntercommunalTournament;
};

export const advanceIntercommunalTournamentStatus = async (
  id: string,
  nextStatus: IntercommunalTournament["status"]
) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  const updateData: Record<string, any> = { status: nextStatus };
  if (nextStatus === "GROUPS") {
    updateData.startedAt = serverTimestamp();
  } else if (nextStatus === "FINISHED") {
    updateData.finishedAt = serverTimestamp();
  }
  await updateDoc(docRef, updateData);
};
