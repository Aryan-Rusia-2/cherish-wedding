# Cherish — Wedding OS

Next.js + Firebase app for couples to organize a wedding and for guests to experience it through personal links.

## Setup

1. **Clone & install**

   ```bash
   npm install
   ```

2. **Firebase project**

   - Create a project in [Firebase Console](https://console.firebase.google.com).
   - Enable **Authentication** → Email/Password and Google.
   - Create a **Firestore** database in production mode, then deploy rules from this repo:

     ```bash
     firebase deploy --only firestore:rules
     ```

     (Install Firebase CLI if needed: `npm i -g firebase-tools`.)

   - Copy your web app config into `.env.local` (see `.env.local.example`).

3. **Firestore index (optional)**

   If you use `orderBy` on announcements with `wedding_id`, create the suggested composite index when the console prompts you, or add `firestore.indexes.json` later.

4. **Run**

   ```bash
   npm run dev
   ```

## Flow

1. Sign up / sign in as a couple.
2. Create a wedding from **Dashboard**.
3. Add **groups → families → people**, then **timeline** items and assignments.
4. Turn on **Guest links** on the wedding overview so invite URLs work.
5. Copy each guest’s **invite link** from the guest manager and share it.

Guest URLs look like:

`/w/{weddingId}/guest/{personId}`

Guests do not need an account; they can RSVP while guest links are enabled.

## Tech

- Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui
- Firebase Auth + Firestore (+ Storage ready for later)
- Deploy frontend to [Vercel](https://vercel.com)

## Security notes

- Firestore rules restrict guest reads until `visibility == "guest_link"` on the wedding.
- Guest updates are limited to `rsvp_status`, `phone`, and `arrival_date` on `people` documents.

## Troubleshooting (console errors)

### `net::ERR_BLOCKED_BY_CLIENT` on `firestore.googleapis.com`

A **browser extension** (uBlock Origin, AdGuard, Privacy Badger, “ad blocker”, some antivirus web shields) is blocking Firestore. The app cannot read or write data while those requests are blocked.

**Fix:** Disable the extension for `http://localhost:3000` (and your production domain), or add an allowlist rule for `firestore.googleapis.com` and `*.googleapis.com` used by Firebase.

### `Database '(default)' not found`

Usually one of:

1. **Firestore is not created** in the Firebase project. In [Firebase Console](https://console.firebase.google.com) → your project → **Build → Firestore Database** → **Create database** (pick a region, start in production or test mode, then deploy this repo’s `firestore.rules`).
2. **Wrong `NEXT_PUBLIC_FIREBASE_PROJECT_ID`** in `.env.local` (must match the project where Firestore exists).
3. **Requests blocked** (see above): blocked traffic can surface as misleading “database not found” logs.

### `Cross-Origin-Opener-Policy would block the window.closed call`

Comes from **Google sign-in in a popup** when COOP is too strict. This repo sets **`Cross-Origin-Opener-Policy: same-origin-allow-popups`** in [`next.config.mjs`](next.config.mjs) to align with Firebase’s popup flow. Restart `npm run dev` after config changes.
