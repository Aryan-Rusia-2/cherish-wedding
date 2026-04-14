import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }
  return initializeApp({ credential: applicationDefault() });
}

export function getFirebaseAdminDb() {
  return getFirestore(getAdminApp());
}
