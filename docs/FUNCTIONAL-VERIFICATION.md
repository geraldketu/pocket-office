# OliverFee360 functional verification

## Scope and release destination

Gerald's existing geraldketu/pocket-office repository and sturdi-home/pocket-office Vercel integration are retained. The production domain is oliverfee360.com. Production publication and live smoke-check results are recorded in DEPLOYMENT-STATUS.md; this document does not treat a local pass as proof of live deployment.

## Automated checks

- Root suite: 117 unit, React DOM, persistence, pricing, screening, access and release-target tests passed.
- Archived Worker suite: 35 tests passed, including original bid/diesel form, onboarding follow-ups, all original action forms, pricing and owner/office/driver isolation.
- Preview integration: 123 tests over 109 directory entries; the final release run is recorded in ADMIN-PREVIEW-COVERAGE.json and ADMIN-PREVIEW-CHECKLIST.md.
- Production build is required before publication; its outcome is recorded in DEPLOYMENT-STATUS.md.

| Area | Exercised behavior |
| --- | --- |
| Bid Calculator | Actual Calculate button at 390px and 1280px; editable Total trip mileage (miles); current offer, rate, tolls and other costs; known expected minimum/middle/goal; changing inputs and recalculating; above-$25 confirmation; zero/negative inputs; finite large amounts. Fixed the midpoint overflow case. |
| Existing archived Bid | Original rendered form, editable trip fields, official diesel-source link, diesel-rate input and expected cost/quote result. |
| Public/contact | Actual contact submit button and success state at both widths; only test adapter is invoked; request remains unpaid. Public page routing and missing-provider states are included in the directory coverage. |
| Carrier interview | Actual follow-up controls, state selection, Select All/Clear All, pass-through-state screening, per-item question controls, estimate/service pricing, upload choice and unpaid review behavior. Unknown rules remain Needs review; this is not a claim that every state rule is legally verified. |
| Sign-in/password | Actual email sign-in failure/retry/success; password length/mismatch and save; password reset failure/retry/success; no live auth SDK reached in preview. Fixed reset-button failure recovery. |
| Site Explorer | All inventory entries render; search and area filters; role picker, Start role preview, entry-specific launch payload, retry state; every directory path/state has a tested HTTP preview or explicit guide. |
| Preview frame | Persistent actor banner; desktop and 390px frame controls; Exit Preview; internal public/private/dynamic/query/hash links stay in the test session; external contact is blocked. |
| Document vault | Real upload component uses the test adapter; type/file selection; synthetic view/download; expired/rejected/superseded and storage/save errors; cross-company denial. |
| Leads/owner overview | Actual Add lead and Save test record buttons at both widths; correct test operation/record data; status/filter links; live controls read-only; module rows, pagination/error/empty states and record guides. |
| Archived workflows | All 15 original screens render; team/DQF/compliance/hazmat/audit/supplies/notices/market/import/invitation forms; company membership, assigned driver files, copied quote links, signing and stale/pending quote restrictions. |
| Payments/filings/notifications | Test success/failure states and unpaid requests; processing/payment prerequisites; Stripe disabled; test-only receipts/outbox; no live provider call. |
| Access/storage | Owner-only pages/APIs; forged lab cookies rejected; preview actor independent of real owner; carrier isolation; verified sole-owner fallback with explicit allowlist precedence; encryption/tampering, cross-instance state, locks, private-bucket restriction and snapshot restore. |

## Limits requiring a real walkthrough

These automated checks execute real components and original Worker handlers but are not a visual tap-through of every control on physical devices. Native Windows browser automation was stopped because it could not reliably determine the active browser URL. It will not be retried during this release. Signed-in production owner/customer/driver access, actual production RLS/module contents and first private-preview storage creation need an owner walkthrough; no account password is reset to enable testing. Live payment, filing and customer notification delivery are intentionally not performed.

The standalone app does not implement self-service signup, live checkout, checkout confirmation or a salesperson dashboard. Explorer labels those as missing and provides the available guided route rather than claiming those features work. Current standalone driver access shares its company vault; per-driver file scope exists in the archived Worker. These existing permission differences are preserved and visible in preview.
