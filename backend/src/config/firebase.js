import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

let isFirebaseConfigured = false;
let authInstance = null;
let firestoreInstance = null;

try {
  let credential = null;
  let projectId = process.env.FIREBASE_PROJECT_ID;

  // 1. Primary: JSON file path from FIREBASE_SERVICE_ACCOUNT_PATH
  const accountPathEnv = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (accountPathEnv) {
    let resolvedPath = path.isAbsolute(accountPathEnv)
      ? accountPathEnv
      : path.resolve(process.cwd(), accountPathEnv);

    if (!fs.existsSync(resolvedPath)) {
      // Also try relative to current directory if launched from backend subdir or root
      const altPath = path.resolve(process.cwd(), path.basename(accountPathEnv));
      const backendPath = path.resolve(process.cwd(), 'backend', path.basename(accountPathEnv));
      if (fs.existsSync(altPath)) {
        resolvedPath = altPath;
      } else if (fs.existsSync(backendPath)) {
        resolvedPath = backendPath;
      }
    }

    if (fs.existsSync(resolvedPath)) {
      try {
        const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
        const serviceAccount = JSON.parse(fileContent);
        credential = admin.credential.cert(serviceAccount);
        if (serviceAccount.project_id) {
          projectId = serviceAccount.project_id;
        }
      } catch (fileErr) {
        console.warn('[Firebase Admin] Error reading FIREBASE_SERVICE_ACCOUNT_PATH file:', fileErr.message);
      }
    }
  }

  // 2. Fallback 1: JSON string from FIREBASE_SERVICE_ACCOUNT_JSON
  if (!credential && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
    if (jsonStr.startsWith('{')) {
      try {
        const serviceAccount = JSON.parse(jsonStr);
        credential = admin.credential.cert(serviceAccount);
        if (serviceAccount.project_id) {
          projectId = serviceAccount.project_id;
        }
      } catch (jsonErr) {
        console.warn('[Firebase Admin] Error parsing FIREBASE_SERVICE_ACCOUNT_JSON:', jsonErr.message);
      }
    }
  }

  // 3. Fallback 2: Separate environment variables
  if (
    !credential &&
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    try {
      let cleanKey = process.env.FIREBASE_PRIVATE_KEY.trim();
      cleanKey = cleanKey.replace(/^["']/, '').replace(/["'],?\s*$/, '').trim();
      cleanKey = cleanKey.replace(/\\n/g, '\n');

      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: cleanKey,
      });
      projectId = process.env.FIREBASE_PROJECT_ID;
    } catch (certErr) {
      console.warn('[Firebase Admin] Error creating credentials from individual env vars:', certErr.message);
    }
  }

  if (credential) {
    const app = admin.initializeApp({
      credential,
      projectId,
    });
    authInstance = admin.auth(app);
    firestoreInstance = admin.firestore(app);
    isFirebaseConfigured = true;
    console.log('[Firebase Admin] Initialized successfully with credentials.');
  } else {
    console.error('[Firebase Admin] Missing Firebase credentials. Check FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_SERVICE_ACCOUNT_JSON, or FIREBASE_* variables in backend/.env.');
  }
} catch (err) {
  console.error('[Firebase Admin] Initialization failed:', err.message);
}

export { authInstance as auth, firestoreInstance as firestore, isFirebaseConfigured };
