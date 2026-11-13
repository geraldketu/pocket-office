# Owner Center and four-person remote sales readiness

November 12, 2026: LOCAL PREVIEW ONLY. No production deployment, live migration,
real representative creation, password change, invitation, phone purchase or live
charge occurred. The production build and full suite of 178 tests passed.

## Audited system and backup

Actual production repository: `geraldketu/pocket-office`, Next.js 15 / React 19,
Supabase Auth/PostgreSQL/RLS/private Storage and the existing Stripe integration.
Source baseline: `971a9de`. Worktree: `oliverfee-current/production-owner-center`,
branch `preview/owner-center-phase1`. The parent archived Worker remains separate.
Existing `/admin`, `/admin/overview`, `/admin/prospects`, `/admin/leads`, `/app`,
`/sales` and `/admin/sales` remain. No replacement or additional admin portal.

The previous read-only account audit found three verified admin profiles including
the existing owner and Gerald, zero carriers and RLS on all 25 baseline public
tables. No new live database audit or mutation was performed this task. The fixed
verified owner identity, authentication and password handlers are unchanged. Owner
sales login still redirects to `/admin/sales` without a representative account.

Source backups: `OliverFee360-before-owner-center-phase1.zip` and
`OliverFee360-before-remote-sales.zip` in the main workspace. Local commits
`c8a1417` and `f7be4c3` preserve Owner Center work; backup ref
`backup/pre-remote-sales-c8a1417` preserves the pre-sales source. Nothing pushed.

## Phase 1 - Owner Center completed first

The existing `/admin/overview` now provides:

- User/driver invitation, profile editing, company/role/access management; company
  creation, editing, approval, suspension and membership assignment. Owner
  identity is protected; changes to another admin require explicit target email
  confirmation. No admin is automatically deleted or demoted.
- Document review, approval/rejection, expiry, private download and queued reminder
  controls; lead notes, callbacks, qualification and conversion to a company.
- Private fuel receipt upload/organization/editing/download; state mileage entry
  and aggregated fuel/mileage IFTA worksheet over a date range.
- Restricted drug/alcohol record types, dates, due dates, results and assigned
  driver. Only the owner or specifically assigned driver can read clinical data.
  An ordinary admin role does not grant clinical access.
- Recorded payment history and canonical Stripe session/invoice lookup when the
  existing approved account is configured. Refund status follows verified events;
  no refund initiation or live-charge button was added.
- Owner-assisted customer intake/draft resume, membership/service needs and
  versioned itemized quotes in existing `/admin/sales`, without a fake owner rep.

Server/database permission checks, audit records and revision checks guard changes.
Suspended access is enforced on private records/storage. Issued signed download
links can remain valid for their 60-second lifetime. Invitations/reminders use an
encrypted durable outbox with retries; no existing admin password is changed.

Limitations: the IFTA worksheet is not a tax-rate calculation or filed return.
There is no automatic reminder scheduler, third-party regulatory integration,
delegated compliance role or refund initiation UI. Real provider email, private
upload and payment round trips still require staging tests.

Owner files: `src/components/admin/owner-management.tsx`, `owner-operations.tsx`,
`owner-overview.tsx`, existing overview/header/styles, management/operations API
routes, `src/lib/admin/management*.ts`, `operations-validation.ts`, `overview.ts`,
migrations 0003/0004, owner preview scripts and owner-management/operations tests.
The original audit is retained in `OWNER-CENTER-PHASE1.md`.

## Phase 2 - four remote representatives

The existing sales workspace now has four owner-managed roster positions,
individually assigned prospects, manual call outcomes, notes, callbacks/due lists,
applications, itemized quotes, verified sales and commission reporting. Individual
Auth accounts link to positions; a position is not an account or shared password.
The owner alone invites, activates, suspends, reassigns or configures commissions.
The existing `/admin/sales` displays all four positions and exports performance.

Four synthetic representatives are available for review. **Actual logins have not
been created:** names, login email addresses and IDs for the four people are still
needed. Existing owner, Gerald, admin and member accounts remain unchanged.

Assignment RLS/server checks deny cross-agent records, admin actions and team
exports. Verified sales derive from payment records, not a manual Closed Sale.
Percentage commissions use monthly membership revenue, excluding service fees.
Partial refunds prorate this base; full refunds void commission. Existing owner
approval remains; no automatic commission payout or transfer was introduced.

English / Español switches presentations, membership/service/permit explanations,
customer questions, objections, pricing explanations and closing scripts. Owner
resources support both languages; missing Spanish text is marked pending. Initial
scripts require owner review. Official USDOT/FMCSA/MC/IFTA/UCR/DQF terminology is
retained. Some operational/status labels remain English.

Existing monthly prices are unchanged. Known service fees mirror production
`src/lib/interview-rules.ts`: standalone USDOT assistance $25, UCR/IFTA assistance
$0 (outside fees separate), DQF preparation $99.99 per driver and Startup Bundle
$1,250. Bundle scope and outside fees require review. Unknown charges remain
unpriced until owner review; fixed prices cannot be overridden by representatives.

### Personal cellphone / DNC

No VICIdial, phone service, autodialer, call recording or representative personal
cellphone field exists. Prospect/customer phones display normally. A calling link
uses an authenticated route to recheck assignment/current screening/internal
opt-outs before returning standard `tel:` navigation. Tapping does not fabricate
a call record; representatives manually record actual outcomes.

Internal opt-outs immediately block normalized matching numbers across the team,
clear callbacks and work even when a form revision is stale. Other agents' notes
are not exposed. Invalid, unscreened, unknown, restricted, expired or incomplete
results block calling and outbound call logging; inbound calls may be recorded.

**No live screening service is connected.** The generic HTTPS JSON adapter is
disabled by default. Before use, match it to a licensed authorized provider and
configure server-only `DNC_INTEGRATION_APPROVED`, `DNC_SCREENING_ENDPOINT`, exact
`DNC_SCREENING_HOST`, token, provider ID and authorization reference. See
`.env.example`. There is no unconfigured outbound screening request.

Request JSON: +1 `phone`, `country: US`, company `state` hint, `federal: true`,
`state_screening: true`, `authorization_ref`. Response must match identity fields,
include `federal_result`/aggregate `state_result` (clear/restricted/unknown),
evidence `reference`, ISO `verified_at`/`valid_until`, nonempty `applicable_states`,
per-state `state_results` and `jurisdiction_basis`. Every applicable state must be
covered, rather than assuming the company's address establishes jurisdiction.
Only clear federal AND state evidence enables a call; internal opt-outs override
it. Evidence expires within 30 days. Only service role can record proof. Owner
provider disabling invalidates proof. Integration approval is not legal clearance.

No blanket trucking-business exemption is assumed. Review the
[FTC TSR guidance](https://www.ftc.gov/business-guidance/resources/complying-telemarketing-sales-rule)
and [FTC DNC questions](https://www.ftc.gov/business-guidance/resources/qa-telemarketers-sellers-about-dnc-provisions-tsr-0)
with the provider for the intended campaign and applicable jurisdictions.

### Enrollment / Stripe boundary

The existing prospect/application/checkout/fulfillment tables are reused. The
owner resolves unknown fees, records source/date for nonzero outside fees and
approves the exact quote revision. New checkout fails closed without that quote,
including if migration is missing. Existing pending checkout URLs remain intact.

Existing monthly Stripe Price IDs are reused with approved one-time initial fees.
Server verification binds account, signature, canonical paid session, complete
line items, amount and quote metadata before account activation. Redirect success
does not activate services. This follows Stripe's
[Checkout API](https://docs.stripe.com/api/checkout/sessions/create) and
[line-item API](https://docs.stripe.com/api/checkout/sessions/line_items).
Customers enter cards only at Stripe; no card data/secret reaches representatives.
Existing identity lookup, idempotent fulfillment and encrypted outbox handle account
reuse, welcome/setup and owner notification. Existing linked-company/admin/rep
email conflicts require owner review before checkout.

Payments remain disabled. Actual test account/Price IDs/webhook/sender round trips
must pass first. Live keys additionally require separately approved
`SALES_LIVE_CHARGES_APPROVED=true`. No approval flag was enabled.

Sales files: existing workspace/CSS/admin sales/sales preview routes; new
`assistance.tsx`, `remote-team.tsx`, `enrollment.tsx`; sales assistance,
service-pricing and DNC modules; existing API/server/demo/types/validation/payments/
Stripe verification; authenticated call routes; migrations 0005/0006; sales,
DNC/remote-database/quote/commission tests, preview scripts, package scripts,
`.env.example` and generated admin inventory.

## Phase 3 - tests and review

Full suite: **178 passed, zero failed**. Optimized production build passed.
Tests include isolated PostgreSQL-compatible migrations/RLS, protected owner and
legacy admin identities, cross-agent denials, four slots, DNC proof/expiry/internal
opt-outs, bilingual UI at 390/1280px, owner intake, immutable quotes, webhook
failures, fulfillment retries and mixed-charge commissions/refunds. Transport is
mocked: this does not establish real provider connectivity or delivery.

Offline artifacts bundle actual React components with synthetic records and a
network-blocking CSP. All four rep variants and owner management rendered without
script errors/network requests or callable telephone links while disconnected.
Edits reset on reload. Native-browser screenshot QA is still required.

- `../../OliverFee360-owner-center-phase1-preview.html`
- `../../OliverFee360-remote-sales-preview.html` (four reps and owner selector)

Generate using `npm run owner:preview:html` and `npm run remote:preview:html`.
Actual Next preview: `npm run owner:preview`, then
`http://127.0.0.1:3012/admin-lab`, using only the printed preview password. Existing
`/admin/overview` and `/admin/sales` provide owner views. Development-only
`/sales-preview?rep=0` through `rep=3` provide sample agent views. The launcher
strips Supabase/Stripe/Resend/DNC credentials and disables payment/screening flags.
Keep the server running to prevent localhost connection refusal.

## Required approval and remaining rollout

1. Review Owner Center first, then sales preview; approve release and additive
   migrations. Supply four actual account names, emails and representative IDs.
2. Take a fresh encrypted database/schema backup; confirm the existing project.
   Review/apply migrations 0003 through 0006 in staging, in order. None applied
   live here. Verify Auth, storage and RLS using authorized disposable staging data.
3. Test actual invitation/recovery/delivery, upload/download, assignment/suspension,
   Stripe test-mode checkout/signed webhook retries/failures/refunds/onboarding.
   Approve bilingual materials, service scope, fee sources and commission policy.
   Complete native mobile/browser QA.
4. Separately approve/configure licensed DNC screening and validate jurisdiction
   coverage. No calling should be enabled before then. No purchase was made.
   Separately approve live charges after successful test-mode results.
5. Only after tests and owner release approval deploy to the existing production
   project and invite the four specified individuals through existing secure flow.

Rollback before rollout is a source revert. After activity retain Auth/customer,
audit, opt-out, screening, quote and payment records. Do not drop data, erase
opt-outs or remove suspension/privacy gates as an automatic rollback.

Final local checks: TypeScript passed; affected quote/commission SQL tests passed again after the outside-fee date guard. Production-mode HTTP checks returned 200 for sales login, 307 for anonymous private pages, 403 for private APIs/call links and 404 for development-only lab/sample pages. Original owner/Auth/member source paths have no changes from baseline.

Local development HTTP checks also passed: existing owner overview and sales management plus all four representative sample views returned 200; synthetic lab sessions were denied all three live management mutation APIs with 403. The isolated preview is running on port 3012.
