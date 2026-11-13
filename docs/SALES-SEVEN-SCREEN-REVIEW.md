# OliverFe 360: seven-screen sales review

Reviewed November 13, 2026 (America/New_York). Production baseline:
`cfdf3569ffab238e7a16295ea1dcb2b0c73f90b4`, `geraldketu/pocket-office`.
The existing Next.js/Supabase sales dashboard was extended in place on local
branch `preview/sales-seven-screen-review`. No second dashboard/admin portal,
new authentication system, database migration or production account was created.

## Findings and fixes

The original sales workspace had overview, calling-list, DNC, resources,
application and activity tabs. Manual call outcomes and callback scheduling were
combined within Calling List. Tabs had no direct links. The existing server and
database already implement assigned-record access, call logging, draft/submitted
applications, notes/callbacks, internal DNC, verified payments and commission rules.

Added representative-only Call Outcome Recording and Follow-up Scheduler views,
using the existing `call` and `prospect-notes` APIs. Added stable hash links to the
seven views, a DNC lead selector, and an optional side-by-side English/Spanish
introduction. Fixed stale notes/callback dates in Calling List after saving from
another sales view, and replaced the missing-USDOT `null` text with Not recorded.
The Owner Portal routes, role checks, management tabs, database and Stripe handlers
were not changed. Shared script content gets an optional bilingual comparison.

## Exact screen URLs and operational limits

These are **working local test URLs**, not deployed production fixes. Run
`npm run owner:preview` from the production-owner-center checkout. This uses
the existing development preview route and real application components, not a
separate built dashboard. The preview strips provider credentials. No real login
or password is needed for the representative sample route.

| Screen | Working local URL | Verified behavior and limits |
| --- | --- | --- |
| Sales Dashboard | http://127.0.0.1:3012/sales-preview?training=1#dashboard | Activity/assignment/follow-up/application/payment metrics render. Verified sales are not fabricated. Production metrics come from existing role-scoped SQL. |
| Assigned Leads | http://127.0.0.1:3012/sales-preview?training=1#assigned-leads | Assigned contacts, company, phone/state, status, notes, search/filter and application access. RLS tests deny another representative's private records. |
| Do Not Call Checker | http://127.0.0.1:3012/sales-preview?training=1#dnc | Internal opt-out and unscreened/restricted/expired blocking work. **Live federal/state screening is not operational:** no authorized provider is connected in this test. |
| English / Spanish Sales Scripts | http://127.0.0.1:3012/sales-preview?training=1#scripts | Both language choices render presentations/questions/service/pricing/closing assistance; comparison shows both introductions together. Training assistance remains labeled for owner review. |
| Customer Application | http://127.0.0.1:3012/sales-preview?training=1#application | Draft save/resume, validation, completion and owner quote-review gates tested. **Paid activation/payment links are not operational** without approved Stripe configuration and provider tests. |
| Call Outcome Recording | http://127.0.0.1:3012/sales-preview?training=1#call-outcome | Manual actual-call recording works; a synthetic inbound conversation was saved. Unscreened outbound logging remains disabled. No actual phone call, dialer or call recording. |
| Follow-up Scheduler | http://127.0.0.1:3012/sales-preview?training=1#follow-ups | Appointment and notes save without adding a call, chronological schedule and due status, and cross-view refresh work. **No automatic email/SMS/push reminders.** Scheduling does not authorize an unscreened call. |

After owner approval and deployment, these representative screens will use the
same hashes under `https://oliverfee360.com/sales`, e.g.
`https://oliverfee360.com/sales#follow-ups`. **Those new hash links are not yet
deployed.** The current production workspace remains at
https://oliverfee360.com/sales with representative authentication. An owner is
intentionally redirected to the existing https://oliverfee360.com/admin/sales.
No owner permission or authentication change is part of this review.

## Test data and screenshots

Exactly one clearly labeled synthetic lead is included by `salesTrainingDemo()`:
`TEST ONLY - OliverFe Training Carrier`, `Test Customer`, `customer@example.test`,
reserved fictional phone `202-555-0199`, no asserted USDOT registration. The
representative is `TEST Representative`, ID `TEST-ONLY`. They are local fixtures,
not Supabase accounts or production customer rows. No real contact was called,
screened, emailed, enrolled, charged or modified.

Seven PNG files are captured from the **running local Next application using the
installed Google Chrome headless browser**, not generated slides or image mockups:

1. `01_Sales_Dashboard.png`
2. `02_Assigned_Leads.png`
3. `03_Do_Not_Call_Checker.png`
4. `04_English_Spanish_Scripts.png`
5. `05_Customer_Application.png`
6. `06_Call_Outcome_Recording.png`
7. `07_Follow_Up_Scheduler.png`

Files are in `../../OliverFe360-Sales-Review-2026-11-13`. The isolated preview/test
banner is intentionally retained. Images are 1920px wide; the lead/application
screens use full-page height so the controls are not cut off. Other views use
1920x1080. `screenshots-manifest.json` records exact captured URLs/dimensions.
The browser capture performs real DOM interactions: bilingual toggle, form fill,
draft save, synthetic inbound outcome and callback save. It asserts blocked
outbound controls. No overlays were added and no screenshot content was edited.

Preview saves are in browser memory and reset on a full reload. They are not proof
that production invitations, payments, screening or automated messages work. The
existing backend is tested separately in isolated PostgreSQL-compatible fixtures.
Do not narrate these test captures as a completed live registry/payment service.

## Validation and changed files

Full suite: 180 tests passed. Includes existing owner/auth/RLS regressions, both
390px/1280px component tests, all seven direct-link restores, draft completion,
manual inbound call, scheduler/assigned-list state consistency, no false call
count, DNC opt-out blocking and private record denials. Production build and final
HTTP/browser checks are recorded in the completion section below.

Application changes: `src/components/sales/workspace.tsx`, new
`call-workflows.tsx`, `assistance.tsx`, `src/app/sales/sales.css`,
`src/lib/sales/demo.ts`, existing `src/app/sales-preview/page.tsx` and
`tests/sales-ui.test.mjs`. No files under `src/app/admin`, `src/components/admin`,
`src/lib/admin`, Supabase migrations, Auth or member routes were changed.
Source was placed on a reversible review branch before edits.

## Approval / remaining work

No production changes were deployed during this review. Owner approval is needed
to publish the new direct navigation and separate call/follow-up views. Existing
provider/real-representative onboarding prerequisites remain: four actual account
details, authorized DNC service, staging email and Stripe test-mode round trips,
and separate approval before live charges. None is claimed complete here.

## Completion checks

The production build passed with no lint warnings; TypeScript and diff checks passed. After the final state-effect adjustment, all nine sales UI tests passed again. The complete 180-test suite passed after the functional callback synchronization fix. Production-mode local HTTP checks confirmed sales login 200, protected sales/owner pages 307, private APIs 403 and development-only sample/lab routes 404.

The final real-browser run captured all seven screenshots and verified all seven direct links at both 1920px and 390px widths without horizontal page overflow. It reported zero browser script errors and zero external requests. Captures were inspected visually; lead and application images include the complete page. Preview is running on port 3012. No production customer data or owner identity was accessed or changed.
