# Sales workspace preview

This implementation is on `preview/sales-representative`, based on production commit `d303938`. It excludes the separately pending landing-page redesign. Nothing has been deployed and migration `0002_sales.sql` has not been applied to the live database. Source backups are `backup/pre-sales-live-d303938`, `backup/pre-sales-5e41eb0`, and the workspace's `OliverFee360-before-sales.zip`.

## Review

Open `../OliverFee360-sales-preview.html` in a browser. It contains the compiled workspace with synthetic contacts and in-memory changes. Switch to management preview to inspect owner controls. Its content security policy blocks network requests; payment and email buttons explain their preview limitations. Regenerate with `npm run sales:preview`.

Production routes are `/sales`, `/sales/login`, `/sales/payment-result`, `/admin/sales`, `/api/sales`, `/admin/api/sales`, and `/api/stripe/sales-webhook`. `/sales-preview` works only in development. Sales Management is an additional section inside the existing owner portal.

## Access and data

Representatives use existing Supabase Auth identities. A separate sales representative record supplies their employee ID, activation status and sales permissions. Their underlying profile must remain an unlinked carrier profile, preventing access to existing customer-company data. Existing admin ownership, member tools and original database policies are preserved.

Server checks and database RLS enforce active accounts and prospect assignment. Representatives cannot manage accounts, prices, commissions, resources or other representatives' records. Owner-only commands reuse the existing verified owner gate. Database writes use constrained transactional commands, with append-only activity records. Assignment changes remove the former representative's access. Concurrent drafts use revision checks; pending checkout locks enrollment details. Do Not Contact blocks outbound enrollment actions.

Follow-up dates appear in due filters and reminders in the workspace; no background SMS campaign is configured. Reports paginate all matching records, escape spreadsheet formulas, use UTC date boundaries and reject exports above 10,000 rows rather than silently truncating them. Daily call metrics use America/New_York.

## Approval and configuration before live rollout

1. Obtain approval of the preview. Back up the existing database before applying the additive `supabase/migrations/0002_sales.sql` to that same project. Do not replace the original migration, database, dashboard or portal.
2. Configure the existing Supabase server credentials and canonical `NEXT_PUBLIC_SITE_URL=https://oliverfee360.com` through deployment secrets. Do not commit credentials.
3. Connect only the existing Stripe account. Set `SALES_STRIPE_ACCOUNT_ID` to its account ID, and map the existing approved monthly price IDs with `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PREMIUM`, and `STRIPE_PRICE_ULTIMATE`. Amounts remain $49.99, $69.99, $99.99, and $199.00. No Stripe account or price is created by this feature. Configure the server-only Stripe key and webhook signing secret.
4. Register the sales webhook for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `customer.subscription.updated`, and `customer.subscription.deleted`. Exercise these with test-mode credentials before enabling live payments. `SALES_PAYMENTS_ENABLED=false` is the default and must remain false until configuration is verified.
5. Configure the existing Resend transport with a verified sender and `SALES_EMAIL_ENCRYPTION_KEY` containing 64 hexadecimal characters. The existing purpose-separated preview secret can serve as a fallback, but a dedicated key is preferable. Missing email configuration leaves invitations and welcome messages queued, with owner-visible status; no successful-send claim is made.
6. Verify an owner-created employee's real login, assignment boundaries, test checkout, signed webhook, customer account setup, owner notification and membership access in the approved preview environment before production rollout.

Checkout validates the configured account, approved price, amount, customer email and reservation identity. Only a signature-verified, freshly retrieved paid Stripe session can trigger atomic fulfillment. Existing unlinked Auth accounts are reused. Existing linked customer/company conflicts require owner review to avoid duplicate billing or customer accounts. Payment replays cannot duplicate membership, revenue or commissions.

Welcome and invitation messages use secure token-hash links to the existing `/auth/confirm` and `/set-password` flow, avoiding the project's earlier localhost redirect problem. Links are encrypted in the delivery queue and excluded from authenticated reads. Durable queue leases and stable email idempotency keys support retries; Next.js `after` processes deliveries after webhook responses, and the owner can retry pending notifications. No external cron service is created.

Revenue and commissions cover the initial membership payment. Refunds adjust net revenue and commissions, with full refunds voiding the commission. Subscription lifecycle events update corresponding carrier status. Commission approval records approval only; it does not transfer money. No representative sees card details or server secrets.

## Verification and limits

The full test suite passed 157 tests; the final sales-specific suite passed 16 tests. These include actual PostgreSQL-compatible migration, RLS and transactional tests using isolated PGlite, server access tests, payment replay/mismatch/signature tests, encrypted email retries, CSV pagination and injection protection, and UI workflows at 390px and 1280px. Stripe and email tests use controlled provider mocks. No live customer account, payment or email was created for this preview.

Production build and local route smoke checks cover public login/result pages, protected sales and admin routes, denied APIs, disabled payments and the production-only exclusion of the demo. UI tests use JSDOM; native browser screenshot verification was unavailable in this environment. Real provider end-to-end verification remains a rollout prerequisite.

## Rollback

Before rollout, reverting the local feature commit restores the source. After rollout, disable sales payments and suspend employee access through owner controls before reverting routes. Preserve sales tables, Auth identities, enrollment attribution and audit records after any real customer enrollment. Do not run a destructive down migration or delete customer/company records. Member/admin systems must remain intact.
