import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable");
}

function parseServiceAccount(key: string) {
  try {
    return JSON.parse(key);
  } catch (err) {
    // try replacing literal "\\n" sequences with real newlines
    try {
      return JSON.parse(key.replace(/\\\\n/g, "\\n").replace(/\\n/g, "\n"));
    } catch (err2) {
      throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON: ${err2 instanceof Error ? err2.message : String(err2)}`);
    }
  }
}

if (!getApps().length) {
  const parsed = parseServiceAccount(serviceAccountKey);
  initializeApp({
    credential: cert(parsed),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();
