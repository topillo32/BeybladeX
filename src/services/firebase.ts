import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// WARNING: Se recomienda encarecidamente mover estas claves a variables de entorno.
// No subas tus claves de API al control de versiones.
// Ejemplo usando Vite: import.meta.env.VITE_API_KEY
const firebaseConfig = {
  // Reemplaza con tus variables de entorno
  apiKey: "AIzaSyAd8Ubm6qbohbFjha_eS2db6FjRnFxTwZM", // ej: import.meta.env.VITE_API_KEY
  authDomain: "beybladex-bb730.firebaseapp.com", // ej: import.meta.env.VITE_AUTH_DOMAIN
  projectId: "beybladex-bb730", // ej: import.meta.env.VITE_PROJECT_ID
  storageBucket: "beybladex-bb730.firebasestorage.app", // ej: import.meta.env.VITE_STORAGE_BUCKET
  messagingSenderId: "799479169943", // ej: import.meta.env.VITE_MESSAGING_SENDER_ID
  appId: "1:799479169943:web:9502cfb04294f66be33ad2", // ej: import.meta.env.VITE_APP_ID
  measurementId: "G-HE4HN3N312", // ej: import.meta.env.VITE_MEASUREMENT_ID
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
