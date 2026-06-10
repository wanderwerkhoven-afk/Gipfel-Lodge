import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, orderBy, query, doc, updateDoc, setDoc, getDoc, runTransaction, where, deleteDoc, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-storage.js";

// ============================================================
// FIREBASE CONFIGURATIE — BEVEILIGINGSNOTA
// ============================================================
// De apiKey hieronder is GEEN geheim. Google heeft de Firebase
// web-SDK bewust zo ontworpen dat deze sleutel zichtbaar is in
// de browser. De apiKey identificeert alleen het project.
//
// Echte beveiliging loopt via:
//   1. HTTP-referrer restricties in Google Cloud Console:
//      https://console.cloud.google.com/apis/credentials
//      → Beperk de sleutel tot: https://gipfellodge.com/*
//
//   2. Firebase App Check (aanbevolen voor productie):
//      https://console.firebase.google.com → App Check
//
//   3. Firestore Security Rules (firestore.rules):
//      Zorg dat regels niet publiek schrijven/lezen toestaan.
//
//   4. Firebase Authentication:
//      Admin-acties vereisen altijd een ingelogde gebruiker.
// ============================================================

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDDmNAnEIGOsScRJiCQKSfY-DDHu5gKYb8",
  authDomain: "gipfel-lodge.firebaseapp.com",
  projectId: "gipfel-lodge",
  storageBucket: "gipfel-lodge.firebasestorage.app",
  messagingSenderId: "388067449391",
  appId: "1:388067449391:web:687304a8403e3d79aa84da",
  measurementId: "G-J1YG8DQ63V"
};

// Initialize Firebase
console.log("Initializing Firebase with project:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);
import { enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn("Multiple tabs open, offline persistence can only be enabled in one tab at a time.");
  } else if (err.code == 'unimplemented') {
    console.warn("The current browser does not support all of the features required to enable persistence.");
  }
});
console.log("Firestore initialized with offline persistence.");

// Initialize Firebase Auth
const auth = getAuth(app);
console.log("Firebase Auth initialized.");

// Initialize Storage
const storage = getStorage(app);
console.log("Firebase Storage initialized.");

// Export instances to use in other files
export { db, auth, storage, ref, uploadBytes, getDownloadURL, collection, addDoc, serverTimestamp, getDocs, orderBy, query, doc, updateDoc, setDoc, getDoc, runTransaction, where, deleteDoc, limit, signInWithEmailAndPassword, signOut, onAuthStateChanged, onSnapshot };
