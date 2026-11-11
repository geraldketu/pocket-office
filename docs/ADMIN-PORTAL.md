# OliverFee 360 — owner Admin Portal

Branch: `admin-portal-site-explorer`. No deployment, database migration, account reset, production configuration change or domain change is part of this branch.

## Open the isolated local portal

Use **Node 24** (the archived Worker simulator uses native in-memory SQLite).

```powershell
npm run admin:lab
```

Open **http://localhost:3004/admin-lab**, enter **Preview-Only-2026!**, then open **http://localhost:3004/admin**. This is a synthetic local owner login, not a production account. The process binds to loopback only. The lab cookie is HTTP-only, random, owner-scoped and expires in four hours. Lab authentication cannot run with `NODE_ENV=production`.

Site Explorer is the first screen. Search by path, feature, role or state; filter by area. Each entry lists its actual source, access, status, test setup and steps. “Live” means implemented in this checkout, not deployed. Open a working preview or the explicit missing-feature guide. Dynamic carrier, document and quote paths use seeded test records.

Inside preview, Desktop and Mobile (390px) resize the real application iframe. The persistent banner shows the test role. Exit Preview returns to Site Explorer. Ordinary internal links remain inside that session. **Changing role starts a fresh seeded session.** To follow one continuous journey, use the actual test login/invitation/password screens rather than the role picker. Test records survive navigation within a session and disappear when the server restarts, the session expires, or you reset the test data.

## Test identities and records

All customer test sign-ins use **Preview-Only-2026!**. These accounts exist only in the simulator; no Supabase Auth users are created and no email is delivered.

| Selected role | Test email | Starting page / real permissions |
| --- | --- | --- |
| Public visitor | none | `/`; public routes only |
| Invited new customer | `new-customer@example.test` | `/app`; onboarding company and empty vault |
| Basic | `basic@example.test` | `/app`; Basic tier metadata |
| Pro | `pro@example.test` | `/app`; Pro tier metadata |
| Premium | `premium@example.test` | `/app`; Premium tier metadata |
| Ultimate | `ultimate@example.test` | `/app`; Ultimate tier metadata |
| Driver | `driver@example.test` | `/app`; the live app currently allows this role to see its company's shared vault |
| Owner | `owner@example.test` | `/admin`; test owner of the synthetic environment |
| Salesperson | no account | `/admin/leads` is denied; no such live role exists |
| Archived owner | membership fixture | original Worker `#member`; owner membership |
| Archived office | membership fixture | original Worker `#member`; office permissions, no access grants |
| Archived driver | membership fixture | original Worker `#member`; only assigned driver records/files |

The live app has no tier-specific permission gates. The preview preserves that fact. Individual driver scoping exists in the archived Worker, not in the live root app; this branch does not silently change customer permissions.

The sandbox seeds companies, users, document types, valid/expiring/expired/rejected/superseded documents, leads at every status, and module sample rows. Explicit scenarios seed empty data, read/storage/auth failures, unlinked accounts, expired invitations, pending/unsigned/signed/stale/paid quote reviews, no memberships and archive connection errors. Rejected/superseded rows are real seeded records; the existing customer list primarily displays expiration badges, while the owner overview exposes the stored status.

## Continuous journey

1. Launch Public visitor at `/`.
2. Follow Carrier setup, complete the actual interview, open the item-specific `?` questions, select assistance and submit an unpaid review. Download remains available.
3. The standalone application has **no self-service signup or live checkout**. Open the test invitation from the preview tools, or separately inspect the owner invitation form through the owner overview preview.
4. Follow `/auth/confirm` → choose password → `/dashboard` → `/app`. The preview uses test authentication and preserves the owner's outer login.
5. Upload a sample document, inspect checklist/badges, and view/download the generated sample file. Test another-company ID to verify denial.
6. Use the labelled safe integration tools to simulate successful/declined payment, filing and notification. Filing simulation requires a prior simulated payment. The receipt/outbox is visible under Activity. Nothing calls Stripe, a government agency, email, SMS or a customer.
7. For the existing archived quote workflow, open its unsigned quote scenario, sign the real itemized quote, then simulate payment. Pending/stale/unsigned quotes cannot be simulated paid. The actual archived checkout remains disabled; no Stripe-hosted checkout is opened. A seeded paid review exposes the original screen's current status display, including its existing disabled-checkout wording.

The archived Worker renders its original HTML, CSS, rules, advanced forms and application script. Its original authorization code runs against SQLite `:memory:` and an in-memory R2 substitute. It receives only synthetic identity headers and explicitly constructed test bindings, never `process.env` provider credentials. Its copied review URLs stay within the owner-bound preview. Email-draft actions are adapted to the test outbox; original screens and qualification logic remain visible. Browser storage is replaced with a per-frame synthetic map, so browser-import testing cannot import a user's real saved records.

## Owner overview / production access

The existing authentication remains Supabase. Production owner access requires **both** a server-validated `profiles.role = 'admin'` and an exact UUID in the server-only **`OLIVERFEE_OWNER_IDS`** allowlist (comma-separated if needed). The allowlist fails closed when unset; an admin email or a preview-selected role is never sufficient. Configure the owner's existing profile UUID during a separate deployment/setup step. This branch does not promote any account or alter production environment settings.

Owner pages, dynamic records and data APIs all check the owner server-side. Live overview queries use the signed-in client's existing RLS and SELECT only. Companies, users/drivers, documents/DQFs, leads, recorded payments, fuel receipts, mileage and drug/alcohol database modules can be browsed. Large modules have 200-record pagination and error/empty states. Record links open their existing company or document routes. Live invitation, lead-update and upload controls are unavailable in this first admin version; the old admin mutation exports also fail closed.

Subscriptions are currently company tier metadata. Standalone subscription management, service orders and permit-processing UI do not exist in the root application. Carrier interview/estimate requests are stored as unpaid lead snapshots. The overview and Explorer state these limitations instead of fabricating live records or screens.

## Isolation and checks

The local lab disables public live mutation routes, production service-role clients, and live browser authentication/storage even if credentials are present in the environment. Preview-referred requests to live routes/APIs are rejected; preview frames have a same-origin network CSP. The owner identity, preview actor and carrier/driver scope are checked independently. The original archived driver/office checks remain enforced on server requests. The test Stripe binding is permanently disabled and no live keys are passed to the Worker.

Run:

```powershell
npm run admin:inventory
npm test
# With npm run admin:lab running in another terminal:
npm run test:admin
# Stop the dev server before building into the same .next directory:
npm run build
```

`npm run test:admin` verifies every generated inventory entry, original archived screens, real form/action flows, owner denial, cross-company restrictions, safe signing/payment states and isolation. It writes [ADMIN-PREVIEW-COVERAGE.json](ADMIN-PREVIEW-COVERAGE.json); Site Explorer links to the owner-only coverage endpoint. The generated checklist records the path, role, scenario, HTTP outcome and guided steps for every entry. Unit/DOM tests check link rewriting, actual upload transport, desktop/mobile viewport controls and Exit Preview. DOM viewport tests do not by themselves establish visual rendering or native browser focus behavior.

Missing live pages—signup, checkout, checkout confirmation and salesperson dashboard—have working explanatory guides with the real alternative path. Database-only modules have owner browsing previews, rather than invented customer editing screens. Archived pages are all accessible in the isolated original runtime and clearly labelled as not deployed in the standalone app. Production Supabase account authentication/RLS and real provider deliveries are intentionally not invoked by this test environment; their deployment verification is a separate step.

## Final verification and remaining walkthrough

The production build passed (two non-blocking unused-import lint warnings in the lead page). All 97 root unit/DOM tests and 35 archived Worker tests passed. The final isolated integration run covers all 109 inventory entries and the real archived action forms. See the coverage JSON for per-entry results.

Native Chrome loaded the branded local lab at http://127.0.0.1:3004/admin-lab. Subsequent password entry and form submission were interrupted twice by Computer Use reporting `user input was detected in this window; call get_window_state before continuing`. A refreshed capture confirmed the lab screen, but a full native Explorer/role/customer-journey walkthrough on desktop and mobile was not completed. Automated HTTP, DOM, original form-handler and server permission coverage is complete; it does not replace that remaining visual walkthrough. This branch is ready for that walkthrough, not a claim that all native-browser acceptance is finished.

No production authentication, live RLS data, provider charge, filing or notification was exercised. The owner allowlist must be configured and live read-only access verified in the separate deployment step. No deployment was performed.


## Production persistence release fix

Production previews now store authenticated encrypted snapshots in a dedicated private `oliverfee-admin-preview` bucket. Each request loads its owner-bound snapshot, acquires a distributed insert-only lock, runs the original test screens/Worker, and saves before releasing. A fresh Vercel instance restores the synthetic SQLite tables, quote identity and test file bytes. No production carrier tables or carrier-files objects are mutated. Interrupted locks are not stolen: start a new preview if a test request crashes. Sessions are inaccessible after four hours; expired encrypted objects remain until test-storage cleanup. The local lab continues using memory and never accesses production storage.

Node 24 is pinned and archived assets/migrations are explicitly included in the server bundle. The deployment setup script verifies the existing owner profile and Auth identity, creates only the private test bucket if absent, verifies encrypted storage/concurrent writes, and configures only the owner UUID allowlist and preview encryption key. It does not reset/promote accounts or change domains. A sole verified existing admin may be selected automatically; multiple admins require the explicit OLIVERFEE_OWNER_IDS repository variable. The setup fails before deployment if any required credential or verification is missing.

Current local checks: 101 unit/DOM/persistence tests and 123 isolated integration tests pass. Persistence tests cover encryption tampering, distinct server instances, concurrent writes, company/owner isolation, and restoring archived SQLite/quote/file state. The existing GitHub Actions release run 42895911411 failed at Check the Vercel token is set because VERCEL_TOKEN is absent. Live setup and deployment are not claimed until that credential is available and the release succeeds. Native Chrome still reported concurrent user input during the lab walkthrough.
