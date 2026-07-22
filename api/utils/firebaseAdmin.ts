import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable");
}

function parseServiceAccount(key: string) {
  // Try normal parse
  try {
    return JSON.parse(key);
  } catch (err) {
    // Try common fallback: replace literal "\\n" with real newlines
    try {
      return JSON.parse(key.replace(/\\\\n/g, "\\n").replace(/\\n/g, "\n"));
    } catch (err2) {
      // Try stripping outer quotes if the whole JSON was quoted
      try {
        let alt = key;
        if ((alt.startsWith('"') && alt.endsWith('"')) || (alt.startsWith("'") && alt.endsWith("'"))) {
          alt = alt.slice(1, -1).replace(/\\\"/g, '"').replace(/\\\\n/g, "\\n").replace(/\\n/g, "\n");
        }
        return JSON.parse(alt);
      } catch (err3) {
        // Try base64 decode
        try {
          const decoded = Buffer.from(key, 'base64').toString('utf8');
          return JSON.parse(decoded);
        } catch (err4) {
          throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON: ${err4 instanceof Error ? err4.message : String(err4)}`);
        }
      }
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
