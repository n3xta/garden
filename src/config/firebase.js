import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAE4Mz-TnXmX42YSfXdb_zLs-hhW7P_7qI",
  authDomain: "garden-289a1.firebaseapp.com",
  projectId: "garden-289a1",
  storageBucket: "garden-289a1.firebasestorage.app",
  messagingSenderId: "884785091642",
  appId: "1:884785091642:web:f13dec072c314990ce5103",
  measurementId: "G-LYR5HF2HZP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };


