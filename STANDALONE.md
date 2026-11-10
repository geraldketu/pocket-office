# OliverFee 360 standalone website

Branch: `standalone-oliverfee-360`. The root Next.js application now uses the OliverFee 360 Lead Desk visual system. The earlier Sites application remains preserved in `oliverfee-360/`; this root app does not require or use ChatGPT sign-in.

## Run locally

Use Node.js 24 or later. Run `npm ci`, `npm test`, `npm run build`, and `npm run start -- --hostname 127.0.0.1 --port 3001` (or `npm run dev` for development).

Public pages: `/`, `/carrier-setup`, `/plans`, `/bid-calculator`, `/login`, `/forgot-password`.

Private pages: `/admin`, `/app`, `/dashboard`, and document routes. They require a real Supabase email/password session and the existing server authorization and database row-level security rules. Missing database configuration never unlocks private pages; it redirects to the email login page.

## Enable real accounts and submissions

The current environment is not configured with a real Supabase project. Public pages and downloadable interview reviews work without it. Sign-in, reset emails, contact submissions, and carrier-request persistence remain unavailable until configured. The UI reports this directly and never reports an unsaved request as submitted.

1. Use a Supabase project and apply `supabase/migrations/0001_init.sql` once.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY` in the hosting provider. Copy `.env.example` to `.env.local` for local use; never commit secrets.
3. Set `NEXT_PUBLIC_SITE_URL` to the external website URL and allow the production URL and local development URLs in Supabase Authentication redirects.
4. Create the administrator with the documented `create-admin` script. The administrator creates carrier invitations, and carriers choose their own password.
5. Optional Resend credentials enable the existing welcome email sender; otherwise authorized administrators receive the one-time invitation link to deliver themselves.
6. Deploy the repository root to Vercel. Configure its project Root Directory to the repository root, not `oliverfee-360/`.

Carrier interviews create `new` leads with their normalized review snapshot, payment status `unpaid`, and checkout disabled. They do not create subscriptions, payments, or filing authorization. The known subtotal is separate from unconfirmed fees. Uploaded files use the existing private storage bucket and signed downloads.

Do not point an existing Sites/Cloudflare D1 database at this Supabase app: existing Sites carrier records need an explicit migration and account matching before they can appear here. No live records are copied by this build.

## Validation

`npm test` checks USDOT/KYU/NY HUT request selection, pending fee gates, unpaid status, existing/self-handled filings, the $500 / 300 mile / $2.50 / $50 bid example, and missing provider configuration. `npm run build` checks TypeScript and the production build. Real email delivery, account sessions, private file storage, and row-level isolation require the configured Supabase project and a hosted walkthrough; local checks cannot prove a provider is configured.
