# OliverFee 360

Felicia's OliverFee 360 app (Sites version 30), merged into this Next.js + Supabase app and served at oliverfee360.com.

## Where things live

- **Screens and styling:** `public/office.html` plus `public/app.js`, `advanced.js`, `state-workflows.js`, `rules.js`, `style.css` and `landing.css`. The home page `/` is rewritten to `office.html` in `next.config.ts`. The black, gold, hot-pink and silver interface is unchanged.
- **Server:** `src/app/api/[...path]/route.ts` is a port of the Sites worker. It has the same endpoints and checks. Identity comes from the Supabase login instead of Sites headers, and the service owner is any profile with role `admin` (this replaces `OWNER_EMAIL`).
- **Rules:** `src/lib/oliverfee/rules.mjs` (server copy) and `public/rules.js` (browser copy). Keep them in step.
- **Database:** `supabase/migrations/0002_oliverfee_office.sql` (carrier_members, workspaces, office_files, quote_reviews, office_audit, stripe_events, national_diesel_rate). Files are in the private `carrier-files` bucket under `<carrier_id>/office/<file id>`.
- **Uploads** go straight from the browser to storage through a one-time signed upload link (Vercel limits request bodies to about 4.5 MB), then the server records them.
- **Admin dashboard** for the service owner is at `/admin` (carriers, leads, create carrier + invite).

## Checks

- `npm test` runs Felicia's quote-rule and form-interaction tests against the files above. DOM tests do not replace visual browser testing.

## Accounts and records

Sign-in is email and password. Every carrier, quote and file request checks membership on the server. Owners manage invitations, office users manage carrier records, and drivers can only see their assigned documents and records. Inviting someone who has no login creates one and gives a one-time link to choose a password (emailed when Resend is configured, otherwise shown to copy). Visitors who are not signed in can explore the demo with sample data stored only in their browser.

Earlier browser records are retained. The account screen offers an explicit merge/import into a selected secure carrier office without deleting the original browser data. Browser files can be imported only if their original IndexedDB blobs remain available.

Secure review links require sign-in and carrier membership. Immutable quote snapshots include operation answers, application entries, charges and refund terms. Changes invalidate the prior signature. Pending payable charges prevent signing/finalization.

## Fees and decisions

- Ultimate is $199/month; Startup Bundle is $199 one time.
- Existing Basic UCR assistance remains $25 because it was already priced, not Pending. The owner was asked whether to replace it with $10. Pro, Premium and Ultimate assistance is included; registration charges remain separate.
- DQF preparation remains $99.99 per driver. Audit support remains $499.99 with the Gold Binder.
- IFTA setup assistance is free; other agency fees require verification. Georgia decal ordering is one item at $5 service plus $3 per qualifying truck, only for a Georgia IFTA base jurisdiction.
- The standard hazmat flat service price and plan coverage remain unconfirmed. PHMSA categories and material applicability require verified facts. TSA starting rates are $88.25 or $41 for verified reduced-rate eligibility. The TSA page returned 403 during verification; confirm its rates before live use. The older Georgia manual lists $20, while current DDS terms vary by transaction; staff must confirm the actual licensing fee.
- The proposed 30-day membership trial is disabled. No delayed/free billing offer is enabled.
- New Mexico declared weight must exceed 26,000 lb and the vehicle must travel there to trigger the WDT review. Tax projections require verified rate/source/period and estimated New Mexico miles, including pass-through miles; projections never enter checkout. Actual quarterly miles are required for reporting.

## Stripe

Live checkout is disabled. Do not enter keys into source or chat. Future connection requires a Vercel environment variable `STRIPE_SECRET_KEY` and explicit `STRIPE_CHECKOUT_ENABLED=true` after end-to-end validation. Hosted checkout uses server-calculated charges; no success URL or client state can mark payment complete. A private, authenticated confirmation action retrieves the Checkout Session directly from Stripe and verifies its paid status, full amount, currency and quote metadata. Direct-pay agency receipts remain a separate processing gate. The optional Stripe webhook from the Sites worker was not ported yet; payment is confirmed through the authenticated confirmation action.
