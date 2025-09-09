import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Only initialize if required config is present. Otherwise, throw a friendly error
const hasConfig = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
if (!hasConfig) {
  // Give a clear hint for local dev
  console.warn('Firebase config missing. Set REACT_APP_FIREBASE_* env vars or inject window.__FIREBASE_CONFIG__.');
}

// Prevent re-initialization in HMR/dev
const app = getApps().length ? getApps()[0] : (hasConfig ? initializeApp(firebaseConfig) : (() => { throw new Error('Missing Firebase configuration'); })());

export const db = getFirestore(app);
