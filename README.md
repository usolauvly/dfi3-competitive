# Internship Race Tracker

Simple static UI with two Vercel Functions backed by Vercel Blob storage so everyone shares the same application data.

## Getting Started

1. Install dependencies (needed for the serverless functions):  
   ```bash
   npm install
   ```
2. Link a Vercel **Blob Storage** bucket (only once per project). Either run:
   ```bash
   vercel storage link
   ```
   and choose **Blob**, or create one from the Vercel dashboard under **Storage → Blob**. The command (or dashboard) will provision the bucket and inject the required `BLOB_*` environment variables locally and on Vercel.
3. Add an `AUTH_SECRET` environment variable (used to sign session tokens):
   ```bash
   vercel env add AUTH_SECRET
   ```
   Use any random string (e.g., output of `openssl rand -hex 32`). Pull the updated env vars for local dev if needed:
   ```bash
   vercel env pull .env.local
   ```
4. Run locally with the Vercel CLI to exercise the API routes:  
   ```bash
   vercel dev
   ```

## Deploying

1. Push the repo to GitHub.
2. Import the project into Vercel (or push if already connected).
3. Ensure the Blob integration is enabled in the Vercel dashboard and that the project has the `BLOB_READ_WRITE_TOKEN` (or use Vercel’s automatic integration). The deployed `/api/state` and `/api/log` routes will then read/write the shared tracker state automatically.

## Restoring data from a backup

If the live blob ever gets wiped, you can push a known-good snapshot back into `internship-tracker/state.json`:

1. Save the JSON you want to restore into `state.backup.json` (or another file).
2. Make sure your shell has the blob env vars available (e.g., `source .env.local` after `vc env pull`).
3. Run:
   ```bash
   npm run restore-state             # uses state.backup.json by default
   # or target another file
   npm run restore-state -- my-file.json
   ```
   The script normalizes the payload and overwrites the blob via the same `@vercel/blob` SDK the API uses.

## Removing an account

When you need to delete a user (and their tracker lane):

```bash
npm run remove-user -- <username>
```

The script pulls `internship-tracker/users.json`, removes the matching record, deletes their person entry from `state.json`, and writes both blobs back. As with the other scripts, make sure `BLOB_*` env vars are available in your shell (e.g., `source .env.local`) before running it.

## Authentication & permissions

- The `/api/auth/register`, `/api/auth/login`, and `/api/auth/me` routes manage accounts, backed by a second blob (`internship-tracker/users.json`). Passwords are hashed via PBKDF2 before they leave the server.
- Default accounts are pre-created for the original trio. Their usernames are `lmatador`, `delorche`, and `delmundo`, and—for the very first login only—their password is their space-separated name (e.g., `De Lorche`). To rotate one of those passwords later, edit `internship-tracker/users.json` (or create a management route) with a new hash.
- Visitors must authenticate before the tracker renders. Each session gets a signed token (HMAC using `AUTH_SECRET`) that the frontend stores locally; `/api/log` will only accept requests that present a valid token matching the person they own.
- Registering a new account automatically provisions a new tracker lane inside `state.json`, so everyone can only increment their own feed while still seeing the global leaderboard.
