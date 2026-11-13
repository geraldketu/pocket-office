# Owner Admin Center — Phase 1

## Repository and production audit

The requested `oliverfee-current` directory contains the archived Sites/Cloudflare Worker project, not the production Next.js application. Its uncommitted files have been preserved. This production-source Git worktree is nested at `oliverfee-current/production-owner-center`, on `preview/owner-center-phase1`, based on live release `971a9de` in `geraldketu/pocket-office`. It modifies the existing `/admin/overview`; it does not create another portal or merge Worker features.

Production uses Next.js 15, React 19, Supabase Auth/Postgres/private Storage, Vercel's existing GitHub integration, and the existing Resend transport. Sales Checkout and signed Stripe fulfillment already exist, but the live sales webhook reports payments disabled. No new Stripe account, price, checkout or charge was created for this phase. Production Vercel environment values could not be inspected with the saved credential (403); configuration must be verified with authorized project access before payment rollout.

A read-only production audit found three verified, unbanned admin identities: `felicialvrg@gmail.com`, `geraldketu@gmail.com`, and `oliverfee360@gmail.com`. Felicia's existing audited identity is the designated owner. All three retain their accounts and roles. Both production audits reported three Auth identities, three profiles, three admins and zero company records. All 25 public tables had RLS enabled. Worker-related Postgres tables with no policies remain inaccessible through normal client RLS; they are not imported into this feature.

Working production features preserved include owner authentication and the `/sales` owner redirect, Site Explorer, DOT prospects, existing leads page, member dashboard, public site, customer upload/download routes, sales assignments/resources, and verified Stripe fulfillment code. Existing broad legacy admin policies permit global company-data reads and some writes; the new migration specifically guards sensitive profile, company and lead writes with the verified owner check, while retaining legacy admin identities and read access. It does not silently demote anyone.

## Completed locally

The existing overview now includes mobile-friendly forms for:

- Creating individual customer/driver identities and secure invitations after selecting an existing company; editing names, roles and company access; deactivation/reactivation. Administrator changes require typing the target email. The owner identity cannot be modified through these controls. No shared passwords or password resets are used for existing admins.
- Creating/editing companies, recording business approval/rejection, suspending/resuming access, assigning approved plan metadata and viewing recent account history. Approval and plan selection do not prove payment or activate billing. An active paid plan cannot be changed through the metadata form.
- Reviewing existing uploaded documents, recording approval or a rejection reason, editing issue/expiration dates, downloading through the original short-lived signed-file route and queuing bounded reminders. A missing review is shown as pending, independently of the legacy document status.
- Adding/editing existing-schema leads, notes, statuses, follow-ups and qualification, then converting qualified quoted leads into an onboarding company. Conversion reuses matching/existing company records, does not create a login automatically and never marks an unpaid lead paid.
- Viewing append-only management history and invitation/delivery status, retrying failed delivery, resuming an already-linked interrupted invitation, and explicitly resending an invitation without creating another identity.

The additive `0003_owner_management.sql` introduces protected workflow/review/access/queue/audit tables and constrained owner-only commands. Mutations require provider-verified owner authorization, same-origin requests, bounded validated fields and current record revisions. Sensitive direct writes by other authenticated admins are also rejected at the database boundary. Deactivated accounts cannot continue accessing protected records through old sessions; active sales access is suspended explicitly and is not silently restored on reactivation. Company suspension blocks new document/receipt/mileage/compliance access and new signed file links for members. Previously issued file links can remain valid for their original short lifetime (currently 60 seconds).

Administrative history records actor, operation, entity, record, before/after values and time, including legacy sensitive table changes after migration. Auth passwords, card details and setup-link tokens are not audit data. History before this migration cannot be reconstructed retroactively. The UI displays the latest 200 events; full audit-history export and further pagination remain follow-up work.

Invitation creation first records owner intent. A newly created Auth identity is linked only through a service-only transaction that verifies the identity and refuses to overwrite an existing account. If account creation cannot be confirmed, the pending request remains for operator review; it is never retried by blindly creating another identity. Delivery uses encrypted, single-use magic-link setup callbacks on the canonical production domain, stable provider idempotency keys and durable leases. Missing email configuration leaves a queued item and does not claim delivery. Owner accounts and existing admins are excluded from these setup invitations.

## Files changed

- Existing integration: `src/app/admin/overview/page.tsx`, `src/components/admin/owner-overview.tsx`, `src/components/admin/owner-header.tsx`, `src/lib/admin/overview.ts`, inventory generator/generated inventory, `next.config.ts`, and package scripts.
- Management implementation: `src/components/admin/owner-management.tsx`, `src/app/admin/owner-management.css`, `src/app/admin/api/management/route.ts`, and `src/lib/admin/management{,-validation,-notifications,-demo}.ts`.
- Data/security: `supabase/migrations/0003_owner_management.sql`.
- Review/test tooling: `scripts/owner-center-preview.mjs`, `scripts/build-owner-preview.mjs`, four `tests/owner-management-*.test.mjs` files and this report.

The original owner-account and owner-authorization modules, member implementation, login/password handlers, Stripe integration, archived Worker and migrations 0001/0002 are unchanged.

## Preview and verification

Source backup: `OliverFee360-before-owner-center-phase1.zip` in the main workspace. No production schema or data migration has been applied, and the branch has not been pushed.

Run `npm run owner:preview` from this checkout. Open `http://127.0.0.1:3012/admin-lab`, use the preview-only password printed on that page, then open **Owner Admin Center**. Do not enter your real account password into the isolated lab. The preview strips provider credentials, binds to loopback, uses synthetic records and blocks live mutations. It must remain running for the localhost URL to work. Stop with Ctrl+C and restart with the same command if the terminal closes.

An offline interactive artifact is also available at `../../OliverFee360-owner-center-phase1-preview.html`; regenerate with `npm run owner:preview:html`. It bundles the actual management component, synthetic data and a network-blocking CSP. Changes stay in browser memory and reset on reload. This is a review artifact, not a second deployed portal.

Validation includes the full existing regression suite, production build/type checking, real isolated PostgreSQL-compatible migration/RLS/transaction tests, owner-vs-legacy-admin denials, protected owner identity, stale updates, account/company suspension, customer document access, private notification columns, duplicate-safe conversion/invitations, encrypted delivery retries, input/CSRF failures and forms at 390px/1280px. Provider calls are mocked; actual test-mode Stripe and real invitation delivery have not been performed for this unapproved phase. JSDOM interaction tests do not replace native-browser screenshot QA.

## Incomplete and next phases

Fuel-receipt organization/editing, mileage entry controls and IFTA calculations, structured drug/alcohol workflows and restricted driver-specific records, detailed service/permit applications, versioned itemized quotes, invoice retrieval/refund administration, and the complete quote-to-payment-to-invitation workflow remain incomplete. Their existing routes, records and read views are retained. Existing legacy admin access to sensitive compliance data requires a separate permissions review before adding delegated compliance roles. No claim is made that this phase implements regulatory compliance or an IFTA filing calculation.

Payments remain disabled. Existing public pricing and Stripe plans are not changed. Test-mode provider setup, signed webhook round trips, refunds, onboarding/email delivery and explicit owner approval are required before enabling live sales charges. The separate pending landing redesign is excluded.

## Approval required before production

Review the Phase 1 preview and approve its release and database migration. Before rollout, create a fresh encrypted database/schema backup, verify the exact production project and apply 0003 transactionally. Configure the existing Resend sender/canonical site URL plus `OWNER_MANAGEMENT_EMAIL_KEY` (64 hex characters) or the purpose-separated existing preview secret. Then test a specifically authorized disposable customer/driver and invitation in staging, including suspended access and a real private upload/download. Do not create test customers in production without authorization.

Rollback before rollout is a local source revert. After real management activity, retain audit, access, review and invitation tables and all Auth/customer identities; do not drop them or apply a destructive down migration. Reverting routes alone must not reopen suspended access. Restoring legacy database write permissions or removing access gates requires owner-reviewed SQL, not an automatic rollback.

## Final Phase 1 check results

The full regression suite passed 166 tests. After the last invitation-resend changes, all eight Phase 1 tests passed again; the optimized production build and TypeScript checks passed. The compiled offline artifact rendered with zero network requests. Local HTTP checks returned 200 for /admin-lab, 303 for synthetic lab sign-in, and 200 for the existing /admin/overview with the real management component and synthetic records; attempted management API writes from the lab returned 403. The preview is running on port 3012 and can be restarted with npm run owner:preview. No native-browser screenshot QA or real provider test-mode/email round trip was completed.
