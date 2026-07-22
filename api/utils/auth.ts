import { adminAuth } from "./firebaseAdmin.js";

export async function verifyFirebaseToken(authorization?: string) {
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const idToken = authorization.split(" ")[1];
  const decoded = await adminAuth.verifyIdToken(idToken);
  return decoded.uid;
}
