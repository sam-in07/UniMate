import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let isFirebaseConfigured = false;
let authInstance = null;
let firestoreInstance = null;

try {
  let credential = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    let serviceAccount;
    const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
    if (jsonStr.startsWith('{')) {
      serviceAccount = JSON.parse(jsonStr);
    } else if (fs.existsSync(jsonStr)) {
      serviceAccount = JSON.parse(fs.readFileSync(jsonStr, 'utf-8'));
    }
    if (serviceAccount) {
      credential = admin.credential.cert(serviceAccount);
    }
  } else if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }

  if (credential) {
    const app = admin.initializeApp({
      credential,
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    authInstance = admin.auth(app);
    firestoreInstance = admin.firestore(app);
    isFirebaseConfigured = true;
    console.log('[Firebase Admin] Initialized successfully with credentials.');
  } else {
    console.warn('[Firebase Admin] Credentials not found in .env. Running in local fallback developer mode.');
  }
} catch (err) {
  console.warn('[Firebase Admin] Initialization notice:', err.message);
  console.warn('[Firebase Admin] Running in local fallback developer mode.');
}

export { authInstance as auth, firestoreInstance as firestore, isFirebaseConfigured };
