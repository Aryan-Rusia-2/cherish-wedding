/**
 * One-shot import: backup JSON → Firestore (groups, families, people).
 *
 * Prereq: Firebase Admin credentials
 *   Set GOOGLE_APPLICATION_CREDENTIALS to the path of your service account JSON
 *   (Firebase console → Project settings → Service accounts → Generate new private key).
 *
 * Usage (from repo root):
 *   npx tsx scripts/import-guestlist-backup.ts <path-to-backup.json> <weddingId>
 *
 * Or:
 *   npm run import-guestlist -- <path-to-backup.json> <weddingId>
 *
 * Credentials: set GOOGLE_APPLICATION_CREDENTIALS in .env.local (gitignored) to
 * your service account JSON path, or export it in the shell before running.
 */

import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { normalizeGuestlistBackup } from "../lib/guestlist-backup/normalize";

const COL = {
  groups: "groups",
  families: "families",
  people: "people",
} as const;

const BATCH_MAX = 450;

function inviteToken(): string {
  return randomBytes(16).toString("hex");
}

function printUsage() {
  console.error(`
Usage:
  npx tsx scripts/import-guestlist-backup.ts <backup.json> <weddingId>
  npm run import-guestlist -- <backup.json> <weddingId>

Put GOOGLE_APPLICATION_CREDENTIALS in .env.local pointing at your service account .json,
  or set it in the shell.

Only group names, family names, and member lines are imported; beds/rooms/kids are ignored.
`);
}

async function run() {
  const jsonPath = process.argv[2];
  const weddingId = process.argv[3];

  if (!jsonPath || !weddingId) {
    printUsage();
    process.exit(1);
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      "Missing GOOGLE_APPLICATION_CREDENTIALS (path to your service account JSON).",
    );
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({ credential: applicationDefault() });
  }

  const db = getFirestore();
  const absoluteJson = resolve(process.cwd(), jsonPath);
  const raw = JSON.parse(readFileSync(absoluteJson, "utf8")) as unknown;
  const groups = normalizeGuestlistBackup(raw);

  if (groups.length === 0) {
    console.error("Nothing to import after parsing (no groups with families).");
    process.exit(1);
  }

  let batch = db.batch();
  let opCount = 0;
  const stats = { groups: 0, families: 0, people: 0 };

  async function flush() {
    if (opCount === 0) return;
    await batch.commit();
    batch = db.batch();
    opCount = 0;
  }

  async function beforeWrite() {
    if (opCount >= BATCH_MAX) await flush();
  }

  for (const g of groups) {
    await beforeWrite();
    const groupRef = db.collection(COL.groups).doc();
    batch.set(groupRef, { wedding_id: weddingId, name: g.name });
    opCount++;
    stats.groups++;
    const groupId = groupRef.id;

    for (const fam of g.families) {
      await beforeWrite();
      const familyRef = db.collection(COL.families).doc();
      batch.set(familyRef, {
        wedding_id: weddingId,
        group_id: groupId,
        family_name: fam.family_name,
      });
      opCount++;
      stats.families++;
      const familyId = familyRef.id;

      let memberOrder = 0;
      for (const memberName of fam.members) {
        await beforeWrite();
        const personRef = db.collection(COL.people).doc();
        batch.set(personRef, {
          wedding_id: weddingId,
          name: memberName,
          group_id: groupId,
          family_id: familyId,
          role: "guest",
          rsvp_status: "pending",
          invite_token: inviteToken(),
          created_at: FieldValue.serverTimestamp(),
          sort_key: memberOrder++,
        });
        opCount++;
        stats.people++;
      }
    }
  }

  await flush();
  console.log("Done:", stats);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
