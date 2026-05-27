// Firebase Configuration - Shared Module
// Used by both consumer-site (app.js) and admin-panel (admin.js)

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, onSnapshot, setDoc, query, where, getDoc, deleteDoc, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBQ8AYVL7JLE45WpIJeaQEzQea6pRJOcbw",
  authDomain: "pakistan-launch.firebaseapp.com",
  projectId: "pakistan-launch",
  storageBucket: "pakistan-launch.firebasestorage.app",
  messagingSenderId: "557611745807",
  appId: "1:557611745807:web:3e6ebfbb1819373e1f597a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Re-export all Firestore utilities for convenience
export { collection, getDocs, addDoc, updateDoc, doc, onSnapshot, setDoc, query, where, getDoc, deleteDoc, orderBy, limit, serverTimestamp };

// Re-export all Auth utilities for convenience
export { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut };

// Helper: Generate a synthetic email from phone number for Firebase Auth
// Firebase Auth requires email+password, so we create a deterministic email from the phone
export function phoneToEmail(phone) {
  // Strip all spaces, dashes, and the leading + to create a clean numeric string
  const cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '');
  return `${cleanPhone}@pakistan-launch.firebaseapp.com`;
}
