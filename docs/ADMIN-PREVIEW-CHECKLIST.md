# Admin Site Explorer preview coverage

Verified 2026-11-10T21:32:25.600Z. All 109 inventory entries have a tested HTTP preview or guided state path. See [setup and test-account instructions](ADMIN-PORTAL.md). Open http://localhost:3004/admin after local lab login, search the path or title below, and press Open working preview.

97 root unit/DOM tests, 123 isolated integration tests and 35 original Worker tests passed. The integration run also rendered all 15 original archived screens and exercised the real archived action forms, quote signing, copied review links, file transport, failure states and permission checks. Mobile/desktop DOM tests cover navigation confinement and 390px/full-width frame controls. These results distinguish reachable implemented screens from missing live features; missing features have explicit guides and are not reported as implemented.

| Check | Screen / workflow | Actual path | Test role | Scenario | Guided test path |
| --- | --- | --- | --- | --- | --- |
| PASS | Carrier record | `/admin/carriers/[id]` | owner | populated | Open preview and follow the real screen navigation. |
| PASS | Lead desk | `/admin/leads` | owner | populated | Open preview and follow the real screen navigation. |
| PASS | Owner overview | `/admin/overview` | owner | populated | Open preview and follow the real screen navigation. |
| PASS | Site Explorer | `/admin` | owner | populated | Open preview and follow the real screen navigation. |
| PASS | Local test-owner login | `/admin-lab` | owner | populated | Open preview and follow the real screen navigation. |
| PASS | Customer / driver document vault | `/app` | Basic | populated | Open preview and follow the real screen navigation. |
| PASS | Invite / recovery confirmation | `/auth/confirm` | new-customer | populated | Open preview and follow the real screen navigation. |
| PASS | Sign out | `/auth/signout` | Basic | populated | Open the customer vault and press Sign out (POST is simulated). |
| PASS | Bid calculator | `/bid-calculator` | visitor | populated | Open preview and follow the real screen navigation. |
| PASS | Carrier checklist and permit estimator | `/carrier-setup` | visitor | populated | Open preview and follow the real screen navigation. |
| PASS | Role starting-page redirect | `/dashboard` | Basic | populated | The preview redirects using the test identity, not the owner identity. |
| PASS | Document view / download | `/documents/[id]/file` | Basic | populated | Open preview and follow the real screen navigation. |
| PASS | Password reset | `/forgot-password` | visitor | populated | Open preview and follow the real screen navigation. |
| PASS | Email sign-in | `/login` | visitor | populated | Open preview and follow the real screen navigation. |
| PASS | Homepage | `/` | visitor | populated | Open preview and follow the real screen navigation. |
| PASS | Plans and services | `/plans` | visitor | populated | Open preview and follow the real screen navigation. |
| PASS | Invite / password setup | `/set-password` | new-customer | populated | Open preview and follow the real screen navigation. |
| PASS | Contact submission success | `/#contact` | visitor | contact-success | Submit the real contact form; only a synthetic lead is saved. |
| PASS | Contact validation / save failure | `/#contact` | visitor | save-error | Submit with missing contact information, then valid details to see the simulated save error. |
| PASS | Contact requests unavailable | `/#contact` | visitor | unavailable | Requests are disabled; no submit button can send data. |
| PASS | Startup bundle / pending estimate | `/carrier-setup?package=startup` | visitor | populated | Select needs help; use ?; download and submit an unpaid review. |
| PASS | Carrier interview submitted / unpaid | `/carrier-setup` | visitor | populated | Complete company and contact details, request a service and submit. |
| PASS | Carrier interview save error | `/carrier-setup` | visitor | save-error | Request a service, fill contact details and submit to the failure simulator. |
| PASS | Carrier checklist unavailable state | `/carrier-setup` | visitor | unavailable | Build and download a review; live submission is disabled. |
| PASS | Bid results / errors / high-rate acknowledgement | `/bid-calculator` | visitor | populated | Enter offer, mileage and costs; try zero mileage and a rate above $25, then acknowledge. |
| PASS | Sign-in error: unavailable | `/login?error=unavailable` | visitor | unavailable | Open the actual sign-in error state. |
| PASS | Sign-in error: no-carrier | `/login?error=no-carrier` | visitor | no-carrier | Open the actual sign-in error state. |
| PASS | Sign-in error: link-expired | `/login?error=link-expired` | visitor | link-expired | Open the actual sign-in error state. |
| PASS | Wrong credentials and role redirect | `/login` | visitor | populated | Use a listed synthetic test email and test password; try a wrong password first. |
| PASS | Password reset unavailable | `/forgot-password` | visitor | unavailable | The actual disabled reset form is displayed; no auth call is possible. |
| PASS | Password update error | `/set-password` | new-customer | password-error | Enter a valid matching password to see the simulated authentication update error. |
| PASS | Password reset sent confirmation | `/forgot-password` | visitor | populated | Submit a sample email. Open the synthetic recovery link from the preview activity panel. |
| PASS | Password mismatch / short password / success | `/set-password` | new-customer | populated | Try fewer than 10 characters, mismatched passwords, then a valid match; continue to the test dashboard. |
| PASS | Valid invite confirmation | `/auth/confirm?token_hash=test-invite&type=invite&next=/set-password` | new-customer | populated | Synthetic token is accepted only in this isolated preview; continue to choose password. |
| PASS | Expired invitation | `/auth/confirm?token_hash=invalid&type=invite` | visitor | populated | The real error destination is displayed; no real token is exchanged. |
| PASS | Empty/new customer vault | `/app` | new-customer | empty | No documents are seeded. Upload a sample file. |
| PASS | Valid / expiring / expired / rejected / superseded documents | `/app` | Basic | populated | Review badges and checklist; view and download the sample documents. |
| PASS | Upload storage failure | `/app` | Basic | storage-error | Choose a document type and a sample file, then upload. |
| PASS | Upload database failure | `/app` | Basic | save-error | Choose a document type and a sample file, then upload. |
| PASS (expected 404) | Document not found | `/documents/missing/file` | Basic | populated | Open the missing test document handler. |
| PASS (expected 500) | Document storage error | `/documents/test-doc-0/file` | Basic | storage-error | Open the sample file to reach the safe storage failure. |
| PASS | Document download | `/documents/test-doc-0/file?download=1` | Basic | populated | Downloads only the generated SAMPLE text file. |
| PASS | Authenticated account without company link | `/app` | Basic | unlinked-account | The actual customer guard redirects to the no-carrier sign-in error. |
| PASS | Owner module read error | `/admin/overview` | owner | database-error | The real overview error renderer displays schema/access failures; it does not label failed reads as empty success. |
| PASS | Empty owner overview | `/admin/overview` | owner | empty | Every existing module shows its real empty state. |
| PASS (expected 404) | Missing carrier 404 | `/admin/carriers/missing` | owner | populated | Open an unknown test carrier. |
| PASS | Create carrier and invite / resend | `/admin/overview` | owner | populated | Use the test-only invitation form, then open the generated invite from Activity. No email is sent. |
| PASS | Invitation failure / duplicate account | `/admin/overview` | owner | invite-error | Submit a test invite to see the failure. |
| PASS | Empty lead desk | `/admin/leads` | owner | empty | No sample leads are seeded. Add a sample lead. |
| PASS | Lead filter: new | `/admin/leads?status=new` | owner | populated | Inspect the filter, update test notes/status, and follow record links. |
| PASS | Lead filter: called | `/admin/leads?status=called` | owner | populated | Inspect the filter, update test notes/status, and follow record links. |
| PASS | Lead filter: quoted | `/admin/leads?status=quoted` | owner | populated | Inspect the filter, update test notes/status, and follow record links. |
| PASS | Lead filter: paid | `/admin/leads?status=paid` | owner | populated | Inspect the filter, update test notes/status, and follow record links. |
| PASS | Lead filter: active | `/admin/leads?status=active` | owner | populated | Inspect the filter, update test notes/status, and follow record links. |
| PASS | Lead filter: lost | `/admin/leads?status=lost` | owner | populated | Inspect the filter, update test notes/status, and follow record links. |
| PASS | Actual driver vault permissions | `/app` | driver | populated | Driver shares carrier vault permissions in the current live app; individual scoping exists only in the archived Worker. |
| PASS | Basic active customer | `/app` | Basic | populated | Tier metadata is seeded. The live app has no tier-specific permission gates. |
| PASS | Pro active customer | `/app` | Pro | populated | Tier metadata is seeded. The live app has no tier-specific permission gates. |
| PASS | Premium active customer | `/app` | Premium | populated | Tier metadata is seeded. The live app has no tier-specific permission gates. |
| PASS | Ultimate active customer | `/app` | Ultimate | populated | Tier metadata is seeded. The live app has no tier-specific permission gates. |
| PASS (expected 404) | Unmatched URL / 404 | `/does-not-exist` | visitor | populated | Open the actual not-found fallback. |
| PASS | Self-service signup | `/signup` | visitor | populated | Missing in the live app. Follow homepage â†’ carrier checklist â†’ owner invitation â†’ choose password instead. |
| PASS | Live checkout | `/checkout` | visitor | populated | Missing/disabled in the live app. Use the labelled integration simulator; it cannot connect to Stripe. |
| PASS | Live payment confirmation | `/checkout/confirmation` | visitor | populated | No live confirmation page exists. Inspect archived customer quote review and the safe simulated receipt. |
| PASS | Salesperson dashboard | `/sales` | salesperson | populated | No salesperson role or dashboard exists. The actual lead desk is owner-only. |
| PASS | Archived Worker: dashboard | `/archive#dashboard` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | Archived Worker: onboarding | `/archive#onboarding` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | Archived Worker: compliance | `/archive#compliance` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | Archived Worker: documents | `/archive#documents` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | Archived Worker: fleet | `/archive#fleet` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | Archived Worker: audit | `/archive#audit` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | Archived Worker: board | `/archive#board` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | Archived Worker: bid | `/archive#bid` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | Archived Worker: supplies | `/archive#supplies` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | Archived Worker: notices | `/archive#notices` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | Archived Worker: plans | `/archive#plans` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | Archived Worker: review | `/archive#review` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | Archived Worker: member | `/archive#member` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | Archived Worker: accounts | `/archive#accounts` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | Archived Worker: customer-review | `/archive#customer-review` | archive-owner | signed-quote | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | Add/edit/fix compliance record | `/archive#compliance` | archive-owner | populated | Use Add record, then open a seeded record and Fix issue. |
| PASS | Upload/open/download/delete sample file | `/archive#documents` | archive-owner | populated | Use Add document and the test document actions. |
| PASS | Team, DQF and driver hazmat checklist | `/archive#fleet` | archive-owner | populated | Open seeded driver â†’ DQF / Hazmat test; add and edit a team member. |
| PASS | Audit checklist and support request | `/archive#audit` | archive-owner | populated | Toggle checklist items, then request audit support (unpaid). |
| PASS | Driver availability and broker job posts | `/archive#board` | archive-owner | populated | Post availability, create a sample job, then remove it. |
| PASS | Supplies order request | `/archive#supplies` | archive-owner | populated | Select products/quantities and request the order; payment remains unpaid. |
| PASS | Agency notices | `/archive#notices` | archive-owner | populated | Create and edit a synthetic notice. |
| PASS | Membership/bundle/broker review | `/archive#plans` | archive-owner | populated | Choose any plan or startup bundle, then review and sign the test quote. |
| PASS | Quote signature and payment states | `/archive#customer-review` | archive-owner | unsigned-quote | Review pending/unsigned/signed/stale test quote scenarios. Checkout is disabled; use integration simulator for a receipt. |
| PASS | Carrier creation/invitation/import | `/archive#accounts` | archive-owner | populated | Create a test carrier; invite a test office/driver; import test-only browser data. |
| PASS | Application, terms, mixed fleet/state/hazmat follow-ups | `/archive#onboarding` | archive-owner | populated | Acknowledge filing terms, complete the actual application and follow conditional questions. |
| PASS | Archived quote: pending-quote | `/archive#customer-review` | archive-owner | pending-quote | Open the original customer quote review; use the activity/simulator panel to inspect a simulated receipt. |
| PASS | Archived quote: unsigned-quote | `/archive#customer-review` | archive-owner | unsigned-quote | Open the original customer quote review; use the activity/simulator panel to inspect a simulated receipt. |
| PASS | Archived quote: signed-quote | `/archive#customer-review` | archive-owner | signed-quote | Open the original customer quote review; use the activity/simulator panel to inspect a simulated receipt. |
| PASS | Archived quote: stale-quote | `/archive#customer-review` | archive-owner | stale-quote | Open the original customer quote review; use the activity/simulator panel to inspect a simulated receipt. |
| PASS | Archived quote: paid-quote | `/archive#customer-review` | archive-owner | paid-quote | Open the original customer quote review; use the activity/simulator panel to inspect a simulated receipt. |
| PASS | Users and drivers | `/admin/overview#profiles` | owner | populated | Open the overview module and follow company/document links. |
| PASS | Companies and plan metadata | `/admin/overview#carriers` | owner | populated | Open the overview module and follow company/document links. |
| PASS | Document / DQF records | `/admin/overview#documents` | owner | populated | Open the overview module and follow company/document links. |
| PASS | Sales leads | `/admin/overview#leads` | owner | populated | Open the overview module and follow company/document links. |
| PASS | Recorded payments | `/admin/overview#payments` | owner | populated | Open the overview module and follow company/document links. |
| PASS | Fuel receipt database records | `/admin/overview#fuel_receipts` | owner | populated | Open the overview module and follow company/document links. |
| PASS | Mileage database records | `/admin/overview#mileage_entries` | owner | populated | Open the overview module and follow company/document links. |
| PASS | Drug and alcohol database records | `/admin/overview#dat_records` | owner | populated | Open the overview module and follow company/document links. |
| PASS | archive-office original permissions | `/archive#member` | archive-office | populated | Follow navigation; test restricted carrier administration and another carrier ID. Driver sees only assigned records in this archived runtime. |
| PASS | archive-driver original permissions | `/archive#member` | archive-driver | populated | Follow navigation; test restricted carrier administration and another carrier ID. Driver sees only assigned records in this archived runtime. |
| PASS | Empty archived document vault | `/archive#documents` | archive-owner | empty | No sample files or records are seeded; upload a sample file. |
| PASS | Archived user with no carrier memberships | `/archive#accounts` | archive-owner | no-accounts | Create a test carrier to continue; no live account is made. |
| PASS | Archived connection error | `/archive#member` | archive-owner | connection-error | The original connection-error screen and retry control are shown; the ChatGPT sign-in link is blocked by the preview boundary. |

No live records or external payment/filing/notification providers were used. Signup, live checkout, checkout confirmation and a salesperson dashboard are absent from the standalone application; their guide rows identify the alternative invite/customer path and safe test integrations. Archived screens are available only through their clearly labelled isolated runtime, not deployed into the public website.

Native browser acceptance remains open: Chrome rendered the local lab, but Computer Use twice reported `user input was detected in this window` during entry/submission. Complete a visual desktop/mobile walkthrough of Explorer, role changes, continuous internal navigation and Exit Preview before accepting native-browser coverage. All PASS entries above refer to the isolated automated preview/guided-path checks, not a claim that every page received a native visual review.
