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
  const normalized = displayName.trim().toLowerCase();
  const snap = await getDocs(query(collection(db, "users"), where("displayNameLower", "==", normalized)));
  return !snap.empty;
};

export const registerUser = async (
  email: string,
  password: string,
  displayName: string,
  role: UserRole = "player"
): Promise<string> => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await user.getIdToken(true);
  await updateProfile(user, { displayName });

  // Write user doc — if this fails the account exists in Auth but not Firestore
  // getUserData will detect this and recreate it on next login
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email,
    displayName,
    displayNameLower: displayName.trim().toLowerCase(),
    role,
    createdAt: serverTimestamp(),
  });

  if (role === "player") {
    await linkOrCreatePlayer(user.uid, displayName);
  }

  return user.uid;
};

/** Links to an existing unlinked player by name (case-insensitive), or creates a new one. */
const linkOrCreatePlayer = async (uid: string, displayName: string): Promise<void> => {
  const normalized = displayName.trim().toLowerCase();
  const snap = await getDocs(
    query(collection(db, "players"), where("nameLower", "==", normalized))
  );
  const unlinked = snap.docs.find((d) => !d.data().userId);
  if (unlinked) {
    await updateDoc(unlinked.ref, { userId: uid });
  } else {
    await setDoc(doc(db, "players", uid), {
      name: displayName.trim(),
      nameLower: normalized,
      userId: uid,
      tournamentIds: [],
      pendingTournamentIds: [],
      createdAt: serverTimestamp(),
    });
  }
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
