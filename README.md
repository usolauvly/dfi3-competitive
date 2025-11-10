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
3. Pull the env vars for local dev if needed:
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
