import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, getDocs, query, where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Tournament, TournamentStatus } from "@/types";

const col = collection(db, "tournaments");

export const createTournament = async (
  data: Pick<Tournament, "name" | "maxPlayers" | "playersPerGroup"> & { location?: string; eventType: import("@/types").EventType; leagueId?: string; communityId?: string | null },
  uid: string
) => {
  const tournamentData: Record<string, unknown> = {
    name: data.name,
    maxPlayers: data.maxPlayers,
    playersPerGroup: data.playersPerGroup,
    eventType: data.eventType,
    communityId: data.communityId ?? null,
    qualifiersCount: 0,
    status: "DRAFT" as TournamentStatus,
    createdBy: uid,
    createdAt: serverTimestamp(),
  };

  if (data.location !== undefined) {
    tournamentData.location = data.location;
  }

  if (data.leagueId !== undefined) {
    tournamentData.leagueId = data.leagueId;
  }

  await addDoc(col, tournamentData);
};

export const updateTournament = async (id: string, data: Partial<Tournament>) =>
  updateDoc(doc(db, "tournaments", id), data as Record<string, unknown>);

export const deleteTournament = async (id: string) =>
  deleteDoc(doc(db, "tournaments", id));

export const advanceTournamentStatus = async (
  id: string,
  next: TournamentStatus
) => {
  const extra: Record<string, unknown> = { status: next };
  if (next === "GROUP_STAGE") extra.startedAt = serverTimestamp();
  if (next === "FINISHED")    extra.finishedAt = serverTimestamp();
  await updateDoc(doc(db, "tournaments", id), extra);
};
