import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAjfT1BaT1fAd9uFWdF4FJMnMoFX1I33C8",
  authDomain: "luctfacultyapp-8edb0.firebaseapp.com",
  projectId: "luctfacultyapp-8edb0",
  storageBucket: "luctfacultyapp-8edb0.firebasestorage.app",
  messagingSenderId: "1060393100364",
  appId: "1:1060393100364:web:422f6321467c660fb040e9",
  measurementId: "G-WGRTRNX1ME"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);