import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, orderBy, query, doc, updateDoc, setDoc, getDoc, runTransaction, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-storage.js";

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
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Initialize Firebase Auth
const auth = getAuth(app);

// Initialize Storage
const storage = getStorage(app);

// Export instances to use in other files
export { db, auth, storage, ref, uploadBytes, getDownloadURL, collection, addDoc, serverTimestamp, getDocs, orderBy, query, doc, updateDoc, setDoc, getDoc, runTransaction, where, deleteDoc, signInWithEmailAndPassword, signOut, onAuthStateChanged };
