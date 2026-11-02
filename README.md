# Pocket Office

DOT compliance "office in your pocket" for owner-operator truckers, plus an admin dashboard for the compliance service that runs it. See [CLAUDE.md](CLAUDE.md) for the full product brief.

**Stack:** Next.js 15 (TypeScript, App Router, Tailwind) · Supabase (Postgres, Auth, Storage) · Vercel · Resend (email, optional)

## What works today

- Public landing page with a contact form; each submission becomes a lead.
- Email + password login with two roles: `admin` and `carrier`.
- Admin creates a carrier and its login in one step. The carrier gets a one-time link to choose their own password (no shared passwords).
- Document vault: upload from phone camera or file, list, view and download through short-lived signed links.
- Required-documents checklist per carrier, with green / yellow / red compliance status.
- Leads list with status, quoted price and call notes.
- Database tables for everything in the brief (fuel receipts, mileage, drug & alcohol records, payments), all with row-level security.

## First-time setup

1. **Create a Supabase project** at https://supabase.com (free tier is fine).
2. In the Supabase dashboard, open **SQL Editor**, paste the contents of [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql), and run it.
3. Copy `.env.example` to `.env.local` and fill in the three Supabase values from **Project Settings → API**.
4. In Supabase, go to **Authentication → URL Configuration** and set **Site URL** to your live URL (and add `http://localhost:3000/**` and your live URL with `/**` to **Redirect URLs**).
5. Install and create the admin login:
   ```bash
   npm install
   npm run create-admin -- you@example.com "a-long-password"
   npm run dev
   ```
6. Open http://localhost:3000, sign in, and add a carrier.

## Deploying (Vercel)

Import the GitHub repo in Vercel, add the same environment variables (set `NEXT_PUBLIC_SITE_URL` to the Vercel URL), and deploy. Every push to `main` redeploys.

## Security

- Files are in a private storage bucket under `<carrier_id>/...`. Database and storage rules only let that carrier and the admin read them.
- Downloads use signed links that expire after 60 seconds.
- The service-role key is used only on the server, and only after checking the caller is the admin.
