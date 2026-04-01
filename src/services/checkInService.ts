import { doc, setDoc, deleteDoc, onSnapshot, collection } from "firebase/firestore";
import { db } from "./firebase";

export interface CheckIn {
  playerId: string;
  playerName: string;
  paidAt: string; // ISO string
  markedBy: string; // uid del admin
}

const col = (tournamentId: string) =>
  collection(db, "tournaments", tournamentId, "checkins");

export const markCheckIn = (tournamentId: string, playerId: string, playerName: string, markedBy: string) =>
  setDoc(doc(db, "tournaments", tournamentId, "checkins", playerId), {
    playerId,
    playerName,
    paidAt: new Date().toISOString(),
    markedBy,
  });

export const removeCheckIn = (tournamentId: string, playerId: string) =>
  deleteDoc(doc(db, "tournaments", tournamentId, "checkins", playerId));

export const subscribeCheckIns = (
  tournamentId: string,
  cb: (checkins: Record<string, CheckIn>) => void
) =>
  onSnapshot(col(tournamentId), (snap) => {
    const map: Record<string, CheckIn> = {};
    snap.docs.forEach((d) => { map[d.id] = d.data() as CheckIn; });
    cb(map);
  });
