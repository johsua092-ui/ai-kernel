import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  browserLocalPersistence,
  initializeAuth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);

const auth = !getApps().length
  ? initializeAuth(app, {
      persistence: browserLocalPersistence,
    })
  : getAuth(app);
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// Generate or retrieve a persistent device ID for anonymous chat history
function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('ai-kernel-device-id');
  if (!id) {
    id = 'device-' + Date.now().toString(36) + Math.random().toString(36).substring(2);
    localStorage.setItem('ai-kernel-device-id', id);
  }
  return id;
}

export { app, db, storage, auth, googleProvider, githubProvider, getDeviceId };
