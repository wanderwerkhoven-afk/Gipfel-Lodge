import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, orderBy, query, doc, updateDoc, where } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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

// Export instances to use in other files
export { db, collection, addDoc, serverTimestamp, getDocs, orderBy, query, doc, updateDoc, where };
