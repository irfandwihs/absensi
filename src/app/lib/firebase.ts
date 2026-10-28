import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyChtHqI5cpCNBg1BxB0F-dyCRA9H49B9To",
  authDomain: "absensi-74c04.firebaseapp.com",
  projectId: "absensi-74c04",
  storageBucket: "absensi-74c04.firebasestorage.app",
  messagingSenderId: "728060400430",
  appId: "1:728060400430:web:bdc3eeb46e19ef094860bf",
  measurementId: "G-BD7WX705WH",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
