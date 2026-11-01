import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.authDomain
);

let app = null;
let auth = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch (err) {
    console.warn('[Firebase Client] Init warning:', err);
  }
} else {
  console.info('[Firebase Client] Running in local demo/dev mode. Real Firebase credentials not provided in .env');
}

export { auth, googleProvider };

// Helper auth functions
export async function loginWithGoogle() {
  if (isFirebaseConfigured && auth && googleProvider) {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  }
  // Local development guest/demo fallback
  const mockUser = {
    uid: 'google_user_demo_' + Math.random().toString(36).substring(2, 9),
    email: 'student@campus.ac.bd',
    displayName: 'Demo Student',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    isAnonymous: false,
    getIdToken: async () => 'dev-user:demo_google_student'
  };
  localStorage.setItem('unimate_dev_user', JSON.stringify(mockUser));
  return mockUser;
}

export async function loginAsGuest() {
  if (isFirebaseConfigured && auth) {
    const res = await signInAnonymously(auth);
    return res.user;
  }
  // Local development guest fallback
  const guestUid = 'guest_' + Math.random().toString(36).substring(2, 9);
  const mockGuest = {
    uid: guestUid,
    email: null,
    displayName: 'Guest Student',
    photoURL: null,
    isAnonymous: true,
    getIdToken: async () => `dev-guest:${guestUid}`
  };
  localStorage.setItem('unimate_dev_user', JSON.stringify(mockGuest));
  return mockGuest;
}

export async function logoutUser() {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  }
  localStorage.removeItem('unimate_dev_user');
}

