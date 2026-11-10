# OliverFee 360

DOT compliance "office in your pocket" for owner-operator truckers and small fleets, plus an admin dashboard for the compliance service that runs it. Live at https://oliverfee360.com. See [CLAUDE.md](CLAUDE.md) for the original product brief and [docs/oliverfee-360.md](docs/oliverfee-360.md) for how Felicia's OliverFee 360 app is wired in, plus its fee decisions.

**Stack:** Next.js 15 (TypeScript, App Router, Tailwind) · Supabase (Postgres, Auth, Storage) · Vercel · Resend (email, optional)

## What works today

- **OliverFee 360 Member Office** (Felicia's design and features):
  - Public landing page, plus a demo with sample data that works without signing in.
  - Carrier Setup interview, compliance records, documents, drivers and office users, and new entrant audit.
  - Quotes with plans, the Startup Bundle and permit fees. Customers sign versioned quotes, and any change voids the signature.
  - Driver board, bid calculator and supplies.
- **Contact form** on the landing page: each submission becomes a lead.
- **Accounts:** email and password login.
  - Gail (admin) sees every carrier office.
  - Carrier owners invite office users and drivers. New people get a one-time link to choose their own password.
  - Drivers only see their own records.
- **Files:** uploaded from a phone camera or file (up to 20 MB) straight to private storage. Downloads use 60-second signed links.
- **Admin dashboard** at `/admin`: carriers with overdue and due-soon counts, create carrier + invite, and a leads list with status, quote and call notes.
- **Stripe checkout** is built but switched off until keys are added and it has been tested.

## First-time setup

1. **Create a Supabase project** at https://supabase.com (free tier is fine; it pauses after a week without activity).
2. In the Supabase **SQL Editor**, run [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql), then [0002_oliverfee_office.sql](supabase/migrations/0002_oliverfee_office.sql).
3. Copy `.env.example` to `.env.local` and fill in the Supabase values from **Project Settings → API Keys**.
4. In Supabase **Authentication → URL Configuration**, set **Site URL** to the live URL and add `http://localhost:3000/**` and the live URL with `/**` to **Redirect URLs**.
5. Install, create the admin login and start the app:
   ```bash
   npm install
   npm run create-admin -- you@example.com "a-long-password"
   npm run dev
   ```
6. `npm test` runs Felicia's pricing-rule and form tests.

## Deploying (Vercel)

The project lives in the SturdiHome Vercel team. Deploy from this folder with `npx vercel deploy --prod`. Automatic deploys from GitHub are currently blocked because commit authors aren't linked to the Vercel team.

## Security

- Every Member Office request goes through `/api/...` on the server, which checks the signed-in user's membership and role. The office tables are only reachable with the server's service-role key.
- Files live in a private storage bucket under `<carrier_id>/...`.
- The service-role key is used only on the server.
