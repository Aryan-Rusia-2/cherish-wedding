/**
 * Deletes ALL groups, families, and people whose `wedding_id` matches the given id.
 * Use this to undo a mistaken import (e.g. wrong wedding id or placeholder text).
 *
 * Loads GOOGLE_APPLICATION_CREDENTIALS from .env.local (same as import script).
 *
 * Usage (from repo root):
 *   npx tsx scripts/delete-guest-data-for-wedding-id.ts <weddingId> confirm
 *
 * Example — remove data imported under the literal placeholder:
 *   npx tsx scripts/delete-guest-data-for-wedding-id.ts YOUR_WEDDING_DOC_ID confirm
 */

import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const COL = {
  people: "people",
  families: "families",
  groups: "groups",
} as const;

const BATCH_MAX = 450;

async function deleteWhereWedding(
  db: ReturnType<typeof getFirestore>,
  collectionName: string,
  weddingId: string,
): Promise<number> {
  const snap = await db
    .collection(collectionName)
    .where("wedding_id", "==", weddingId)
    .get();

  if (snap.empty) return 0;

  let batch = db.batch();
  let n = 0;
  let total = 0;

  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    n++;
    total++;
    if (n >= BATCH_MAX) {
      await batch.commit();
      batch = db.batch();
      n = 0;
    }
  }
  if (n > 0) await batch.commit();
  return total;
}

async function run() {
  const weddingId = process.argv[2];
  const confirm = process.argv[3];

  if (!weddingId || confirm !== "confirm") {
    console.error(`
Usage:
  npx tsx scripts/delete-guest-data-for-wedding-id.ts <weddingId> confirm

The word "confirm" (last argument) is required so this is not run by accident.

Example (undo mistaken placeholder import):
  npx tsx scripts/delete-guest-data-for-wedding-id.ts YOUR_WEDDING_DOC_ID confirm
`);
    process.exit(1);
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      "Missing GOOGLE_APPLICATION_CREDENTIALS — add it to .env.local or your environment.",
    );
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({ credential: applicationDefault() });
  }

  const db = getFirestore();

  const people = await deleteWhereWedding(db, COL.people, weddingId);
  const families = await deleteWhereWedding(db, COL.families, weddingId);
  const groups = await deleteWhereWedding(db, COL.groups, weddingId);

  console.log("Deleted:", { people, families, groups, wedding_id: weddingId });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
