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
  await user.getIdToken(true); // force token refresh so Firestore rules see auth
  console.log("[register] auth created:", user.uid);
  await updateProfile(user, { displayName });
  console.log("[register] profile updated");
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email,
    displayName,
    role,
    createdAt: serverTimestamp(),
  });
  console.log("[register] users doc created");
  if (role === "player") {
    const existing = await getDocs(
      query(collection(db, "players"), where("name", "==", displayName))
    );
    console.log("[register] players query done, found:", existing.size);
    const unlinked = existing.docs.find((d) => !d.data().userId);
    if (unlinked) {
      await updateDoc(unlinked.ref, { userId: user.uid });
      console.log("[register] linked existing player");
    } else {
      await setDoc(doc(db, "players", user.uid), {
        name: displayName,
        userId: user.uid,
        tournamentIds: [],
        pendingTournamentIds: [],
        createdAt: serverTimestamp(),
      });
      console.log("[register] new player doc created");
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
