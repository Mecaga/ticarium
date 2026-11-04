import { auth } from './firebase.js';
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export let uid = null;
export let userName = '';

const ready0 = new Promise(res => {
  onAuthStateChanged(auth, u => { uid = u ? u.uid : null; res(); });
});
export const authReady = () => ready0;
export const isLoggedIn = () => !!uid;
export const isLegacyAnon = () => false;

// Giriş yoksa sessizce anonim oturum açar
export async function login() {
  await ready0;
  if (!uid) { await signInAnonymously(auth); await new Promise(r => setTimeout(r, 50)); }
  if (!uid && auth.currentUser) uid = auth.currentUser.uid;
  return uid;
}

export function setUserName(n) { userName = n; }
export const doLogout = async () => {};
export const doLogin = async () => {};
export const doRegister = async () => {};
export const authError = e => (e && e.message) || 'Hata';
