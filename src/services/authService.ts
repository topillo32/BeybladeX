import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, getDocs, collection, query, orderBy, where, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { AppUser, UserRole } from "@/types";

export const checkDisplayNameTaken = async (displayName: string): Promise<boolean> => {
  // Exact match — case sensitive ("Juan" !== "juan")
  const snap = await getDocs(query(collection(db, "users"), where("displayName", "==", displayName)));
  return !snap.empty;
};

export const registerUser = async (
  email: string,
  password: string,
  displayName: string,
  role: UserRole = "player"
): Promise<string> => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName });
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email,
    displayName,
    role,
    createdAt: serverTimestamp(),
  });
  if (role === "player") {
    // Check if admin already created a player with this exact name (case-insensitive)
    const existing = await getDocs(
      query(collection(db, "players"), where("name", "==", displayName))
    );
    const unlinked = existing.docs.find((d) => !d.data().userId);
    if (unlinked) {
      // Link the existing player profile to this user account
      await updateDoc(unlinked.ref, { userId: user.uid });
    } else {
      // No pre-existing profile — create a fresh one
      await setDoc(doc(db, "players", user.uid), {
        name: displayName,
        userId: user.uid,
        tournamentIds: [],
        pendingTournamentIds: [],
        createdAt: serverTimestamp(),
      });
    }
  }
  return user.uid;
};

export const loginUser = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const logoutUser = () => signOut(auth);

export const getUserData = async (uid: string): Promise<AppUser | null> => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as AppUser) : null;
};

export const onAuthChange = (cb: (user: User | null) => void) =>
  onAuthStateChanged(auth, cb);

export const updateUserRole = (uid: string, role: UserRole) =>
  setDoc(doc(db, "users", uid), { role }, { merge: true });

export const getAllUsers = async (): Promise<AppUser[]> => {
  const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => d.data() as AppUser);
};
