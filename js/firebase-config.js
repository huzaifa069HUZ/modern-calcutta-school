// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC7YANc-tSA_Raf7fEtsrZJgJDlN5AZ8ZY",
  authDomain: "modern-calcutta.firebaseapp.com",
  projectId: "modern-calcutta",
  storageBucket: "modern-calcutta.firebasestorage.app",
  messagingSenderId: "365214700250",
  appId: "1:365214700250:web:ee9d108eb741fcb5938be3",
  measurementId: "G-845CFD714B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // Optional: Analytics initialized
const db = getFirestore(app);



export { db, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, limit };
