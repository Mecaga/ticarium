import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase, ref, set, get, update, remove, push, onValue, onDisconnect, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Firebase Console'daki firebaseConfig bloğunu buraya yapıştır.
export const firebaseConfig = {
  apiKey: "AIzaSyDBqq-KjCuhwsXLLWbfICps4YFzotAOTv8",
  authDomain: "ticarium-c352c.firebaseapp.com",
  databaseURL: "https://ticarium-c352c-default-rtdb.firebaseio.com",
  projectId: "ticarium-c352c",
  storageBucket: "ticarium-c352c.firebasestorage.app",
  messagingSenderId: "527594429663",
  appId: "1:527594429663:web:dd1ffb82249264bebbdd6a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export let uid = null;

// Anonim giriş yapar, oyuncu kimliğini (uid) döndürür
export function login() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, user => {
      if (user) { uid = user.uid; resolve(uid); }
    });
    signInAnonymously(auth).catch(reject);
  });
}

// Diğer dosyalar bunları buradan alacak
export { ref, set, get, update, remove, push, onValue, onDisconnect, serverTimestamp };
