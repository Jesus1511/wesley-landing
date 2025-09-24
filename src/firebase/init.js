import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBKXtCNZwAn4TH_Yr3y6fvM9qBfo6mMvGU",
  authDomain: "losideas.firebaseapp.com",
  projectId: "losideas",
  storageBucket: "losideas.firebasestorage.app",
  messagingSenderId: "804138945934",
  appId: "1:804138945934:web:02866220bb1da5fb3fe8df",
  measurementId: "G-25ZPCSQ2CM"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
