// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// REPLACE THIS with your actual Firebase config object!
const firebaseConfig = {
  apiKey: "AIzaSyCXMU95SuD58NTLpbvsvpi5j-Z7602Bljo",
  authDomain: "spms-93185.firebaseapp.com",
  projectId: "spms-93185",
  storageBucket: "spms-93185.firebasestorage.app",
  messagingSenderId: "845088629572",
  appId: "1:845088629572:web:f8782d33bfbac3d8af6d11",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
