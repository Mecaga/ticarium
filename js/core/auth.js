import { auth } from './firebase.js';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  linkWithCredential, EmailAuthProvider, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const DOMAIN = '@blokdiyar.app';
// Giriş yapmış oyuncunun kimliği. Eski misafir (anonim) oturum burada "giriş yok" sayılır.
export let uid = null;
export let userName = '';

function setUser(u) {
  if (u && !u.isAnonymous && u.email && u.email.slice(-DOMAIN.length) === DOMAIN) {
    uid = u.uid;
    userName = u.email.slice(0, -DOMAIN.length);
  } else { uid = null; userName = ''; }
}

const ready0 = new Promise(res => { onAuthStateChanged(auth, u => { setUser(u); res(); }); });
export const authReady = () => ready0;
export const isLoggedIn = () => !!uid;
export const isLegacyAnon = () => !!(auth.currentUser && auth.currentUser.isAnonymous);

// cloud.js ve rooms.js kullanır: giriş yoksa hata verir
export async function login() {
  await ready0;
  if (!uid) { const e = new Error('Önce giriş yapmalısın'); e.code = 'login-required'; throw e; }
  return uid;
}

const NAME_OK = /^[a-z0-9_]{3,16}$/;
function emailOf(name) {
  const n = String(name || '').trim().toLowerCase();
  if (!NAME_OK.test(n)) {
    const e = new Error('Kullanıcı adı 3-16 karakter olmalı: harf (a-z), rakam ve _');
    e.code = 'app/bad-username';
    throw e;
  }
  return n + DOMAIN;
}
function checkPass(p) {
  if (String(p || '').length < 6) { const e = new Error('Şifre en az 6 karakter olmalı'); e.code = 'auth/weak-password'; throw e; }
}

export async function doLogin(name, pass) {
  const email = emailOf(name);
  checkPass(pass);
  await signInWithEmailAndPassword(auth, email, pass);
  setUser(auth.currentUser);
}

// Eski misafir hesabı varsa dönüştürür (dünyalar korunur), yoksa yeni hesap açar
export async function doRegister(name, pass) {
  const email = emailOf(name);
  checkPass(pass);
  const cur = auth.currentUser;
  if (cur && cur.isAnonymous) await linkWithCredential(cur, EmailAuthProvider.credential(email, pass));
  else await createUserWithEmailAndPassword(auth, email, pass);
  setUser(auth.currentUser);
}

export async function doLogout() {
  await signOut(auth);
  setUser(null);
}

const MSG = {
  'auth/invalid-credential': 'Kullanıcı adı ya da şifre yanlış',
  'auth/invalid-login-credentials': 'Kullanıcı adı ya da şifre yanlış',
  'auth/wrong-password': 'Kullanıcı adı ya da şifre yanlış',
  'auth/user-not-found': 'Kullanıcı adı ya da şifre yanlış',
  'auth/email-already-in-use': 'Bu kullanıcı adı alınmış, başka bir tane seç',
  'auth/credential-already-in-use': 'Bu kullanıcı adı alınmış, başka bir tane seç',
  'auth/weak-password': 'Şifre en az 6 karakter olmalı',
  'auth/too-many-requests': 'Çok fazla deneme, biraz bekle',
  'auth/network-request-failed': 'İnternet bağlantısı yok',
  'auth/operation-not-allowed': 'Firebase\'de Email/Password girişi kapalı: Authentication → Sign-in method → Email/Password → Enable',
  'auth/admin-restricted-operation': 'Firebase\'de kayıt kapalı: Authentication → Settings → User actions → Enable create (sign-up)'
};
export const authError = e => MSG[e && e.code] || (e && e.message) || 'Bilinmeyen hata';
