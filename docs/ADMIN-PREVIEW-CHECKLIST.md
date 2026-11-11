# Admin preview coverage

Verified 2026-11-11T10:36:38.565Z in the isolated local lab. Signup confirmation also has a dedicated simulated workflow test. No live email or payment was sent.

| Result | Entry | Path | Role | Scenario | Guided path |
|---|---|---|---|---|---|
| PASS | route:/account | `/account` | Basic | populated | Open preview and follow the real screen navigation. |
| PASS | route:/admin/carriers/[id] | `/admin/carriers/[id]` | owner | populated | Open preview and follow the real screen navigation. |
| PASS | route:/admin/leads | `/admin/leads` | owner | populated | Open preview and follow the real screen navigation. |
| PASS | route:/admin/overview | `/admin/overview` | owner | populated | Open preview and follow the real screen navigation. |
| PASS | route:/admin | `/admin` | owner | populated | Open preview and follow the real screen navigation. |
| PASS | route:/admin-lab | `/admin-lab` | owner | populated | Open preview and follow the real screen navigation. |
| PASS | route:/app | `/app` | Basic | populated | Open preview and follow the real screen navigation. |
| PASS | route:/auth/confirm | `/auth/confirm` | new-customer | populated | Open preview and follow the real screen navigation. |
| PASS | route:/auth/signout | `/auth/signout` | Basic | populated | Open the customer vault and press Sign out (POST is simulated). |
| PASS | route:/bid-calculator | `/bid-calculator` | visitor | populated | Open preview and follow the real screen navigation. |
| PASS | route:/carrier-setup | `/carrier-setup` | visitor | populated | Open preview and follow the real screen navigation. |
| PASS | route:/dashboard | `/dashboard` | Basic | populated | The preview redirects using the test identity, not the owner identity. |
| PASS | route:/documents/[id]/file | `/documents/[id]/file` | Basic | populated | Open preview and follow the real screen navigation. |
| PASS | route:/forgot-password | `/forgot-password` | visitor | populated | Open preview and follow the real screen navigation. |
| PASS | route:/login | `/login` | visitor | populated | Open preview and follow the real screen navigation. |
| PASS | route:/ | `/` | visitor | populated | Open preview and follow the real screen navigation. |
| PASS | route:/plans | `/plans` | visitor | populated | Open preview and follow the real screen navigation. |
| PASS | route:/set-password | `/set-password` | new-customer | populated | Open preview and follow the real screen navigation. |
| PASS | route:/signup | `/signup` | visitor | populated | Open preview and follow the real screen navigation. |
| PASS | state:contact-success | `/#contact` | visitor | contact-success | Submit the real contact form; only a synthetic lead is saved. |
| PASS | state:contact-error | `/#contact` | visitor | save-error | Submit with missing contact information, then valid details to see the simulated save error. |
| PASS | state:contact-unavailable | `/#contact` | visitor | unavailable | Requests are disabled; no submit button can send data. |
| PASS | state:startup | `/carrier-setup?package=startup` | visitor | populated | Select needs help; use ?; download and submit an unpaid review. |
| PASS | state:interview-success | `/carrier-setup` | visitor | populated | Complete company and contact details, request a service and submit. |
| PASS | state:interview-failure | `/carrier-setup` | visitor | save-error | Request a service, fill contact details and submit to the failure simulator. |
| PASS | state:interview-unavailable | `/carrier-setup` | visitor | unavailable | Build and download a review; live submission is disabled. |
| PASS | state:bid-invalid | `/bid-calculator` | visitor | populated | Enter offer, mileage and costs; try zero mileage and a rate above $25, then acknowledge. |
| PASS | state:login-unavailable | `/login?error=unavailable` | visitor | unavailable | Open the actual sign-in error state. |
| PASS | state:login-no-carrier | `/login?error=no-carrier` | visitor | no-carrier | Open the actual sign-in error state. |
| PASS | state:login-link-expired | `/login?error=link-expired` | visitor | link-expired | Open the actual sign-in error state. |
| PASS | state:login-invalid | `/login` | visitor | populated | Use a listed synthetic test email and test password; try a wrong password first. |
| PASS | state:signup-confirmation | `/signup` | visitor | populated | Complete the signup form with synthetic details; open its test confirmation link, then view Account status. |
| PASS | state:signup-error | `/signup` | visitor | signup-error | Submit valid test details; no live account or email is created. Retry remains available. |
| PASS | state:signup-unavailable | `/signup` | visitor | unavailable | Account creation is disabled and no provider can be reached. |
| PASS | state:account-pending | `/account` | Basic | unlinked-account | Review the account status and checklist link; no other company record is accessible. |
| PASS | state:reset-unavailable | `/forgot-password` | visitor | unavailable | The actual disabled reset form is displayed; no auth call is possible. |
| PASS | state:password-error | `/set-password` | new-customer | password-error | Enter a valid matching password to see the simulated authentication update error. |
| PASS | state:reset-sent | `/forgot-password` | visitor | populated | Submit a sample email. Open the synthetic recovery link from the preview activity panel. |
| PASS | state:password-validation | `/set-password` | new-customer | populated | Try fewer than 10 characters, mismatched passwords, then a valid match; continue to the test dashboard. |
| PASS | state:confirm-valid | `/auth/confirm?token_hash=test-invite&type=invite&next=/set-password` | new-customer | populated | Synthetic token is accepted only in this isolated preview; continue to choose password. |
| PASS | state:confirm-invalid | `/auth/confirm?token_hash=invalid&type=invite` | visitor | populated | The real error destination is displayed; no real token is exchanged. |
| PASS | state:vault-empty | `/app` | new-customer | empty | No documents are seeded. Upload a sample file. |
| PASS | state:vault-states | `/app` | Basic | populated | Review badges and checklist; view and download the sample documents. |
| PASS | state:upload-storage-error | `/app` | Basic | storage-error | Choose a document type and a sample file, then upload. |
| PASS | state:upload-save-error | `/app` | Basic | save-error | Choose a document type and a sample file, then upload. |
| PASS | state:doc-missing | `/documents/missing/file` | Basic | populated | Open the missing test document handler. |
| PASS | state:doc-error | `/documents/test-doc-0/file` | Basic | storage-error | Open the sample file to reach the safe storage failure. |
| PASS | state:doc-download | `/documents/test-doc-0/file?download=1` | Basic | populated | Downloads only the generated SAMPLE text file. |
| PASS | state:unlinked-account | `/app` | Basic | unlinked-account | The actual customer guard opens the account status page; no company records are exposed. |
| PASS | state:admin-read-error | `/admin/overview` | owner | database-error | The real overview error renderer displays schema/access failures; it does not label failed reads as empty success. |
| PASS | state:admin-empty | `/admin/overview` | owner | empty | Every existing module shows its real empty state. |
| PASS | state:carrier-missing | `/admin/carriers/missing` | owner | populated | Open an unknown test carrier. |
| PASS | state:invite-success | `/admin/overview` | owner | populated | Use the test-only invitation form, then open the generated invite from Activity. No email is sent. |
| PASS | state:invite-error | `/admin/overview` | owner | invite-error | Submit a test invite to see the failure. |
| PASS | state:lead-empty | `/admin/leads` | owner | empty | No sample leads are seeded. Add a sample lead. |
| PASS | state:leads-new | `/admin/leads?status=new` | owner | populated | Inspect the filter, update test notes/status, and follow record links. |
| PASS | state:leads-called | `/admin/leads?status=called` | owner | populated | Inspect the filter, update test notes/status, and follow record links. |
| PASS | state:leads-quoted | `/admin/leads?status=quoted` | owner | populated | Inspect the filter, update test notes/status, and follow record links. |
| PASS | state:leads-paid | `/admin/leads?status=paid` | owner | populated | Inspect the filter, update test notes/status, and follow record links. |
| PASS | state:leads-active | `/admin/leads?status=active` | owner | populated | Inspect the filter, update test notes/status, and follow record links. |
| PASS | state:leads-lost | `/admin/leads?status=lost` | owner | populated | Inspect the filter, update test notes/status, and follow record links. |
| PASS | state:driver | `/app` | driver | populated | Driver shares carrier vault permissions in the current live app; individual scoping exists only in the archived Worker. |
| PASS | state:tier-Basic | `/app` | Basic | populated | Tier metadata is seeded. The live app has no tier-specific permission gates. |
| PASS | state:tier-Pro | `/app` | Pro | populated | Tier metadata is seeded. The live app has no tier-specific permission gates. |
| PASS | state:tier-Premium | `/app` | Premium | populated | Tier metadata is seeded. The live app has no tier-specific permission gates. |
| PASS | state:tier-Ultimate | `/app` | Ultimate | populated | Tier metadata is seeded. The live app has no tier-specific permission gates. |
| PASS | state:unknown-route | `/does-not-exist` | visitor | populated | Open the actual not-found fallback. |
| PASS | missing:/checkout | `/checkout` | visitor | populated | Missing/disabled in the live app. Use the labelled integration simulator; it cannot connect to Stripe. |
| PASS | missing:/checkout/confirmation | `/checkout/confirmation` | visitor | populated | No live confirmation page exists. Inspect archived customer quote review and the safe simulated receipt. |
| PASS | missing:/sales | `/sales` | salesperson | populated | No salesperson role or dashboard exists. The actual lead desk is owner-only. |
| PASS | archive:dashboard | `/archive#dashboard` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | archive:onboarding | `/archive#onboarding` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | archive:compliance | `/archive#compliance` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | archive:documents | `/archive#documents` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | archive:fleet | `/archive#fleet` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | archive:audit | `/archive#audit` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | archive:board | `/archive#board` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | archive:bid | `/archive#bid` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | archive:supplies | `/archive#supplies` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | archive:notices | `/archive#notices` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | archive:plans | `/archive#plans` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | archive:review | `/archive#review` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | archive:member | `/archive#member` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | archive:accounts | `/archive#accounts` | archive-owner | populated | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | archive:customer-review | `/archive#customer-review` | archive-owner | signed-quote | Open the original screen and follow its real links/buttons. All backend calls go to the isolated Worker; checkout stays disabled. |
| PASS | workflow:archive-records | `/archive#compliance` | archive-owner | populated | Use Add record, then open a seeded record and Fix issue. |
| PASS | workflow:archive-files | `/archive#documents` | archive-owner | populated | Use Add document and the test document actions. |
| PASS | workflow:archive-people | `/archive#fleet` | archive-owner | populated | Open seeded driver → DQF / Hazmat test; add and edit a team member. |
| PASS | workflow:archive-audit | `/archive#audit` | archive-owner | populated | Toggle checklist items, then request audit support (unpaid). |
| PASS | workflow:archive-market | `/archive#board` | archive-owner | populated | Post availability, create a sample job, then remove it. |
| PASS | workflow:archive-orders | `/archive#supplies` | archive-owner | populated | Select products/quantities and request the order; payment remains unpaid. |
| PASS | workflow:archive-notices | `/archive#notices` | archive-owner | populated | Create and edit a synthetic notice. |
| PASS | workflow:archive-plan | `/archive#plans` | archive-owner | populated | Choose any plan or startup bundle, then review and sign the test quote. |
| PASS | workflow:archive-quote | `/archive#customer-review` | archive-owner | unsigned-quote | Review pending/unsigned/signed/stale test quote scenarios. Checkout is disabled; use integration simulator for a receipt. |
| PASS | workflow:archive-access | `/archive#accounts` | archive-owner | populated | Create a test carrier; invite a test office/driver; import test-only browser data. |
| PASS | workflow:archive-application | `/archive#onboarding` | archive-owner | populated | Acknowledge filing terms, complete the actual application and follow conditional questions. |
| PASS | state:archive-pending-quote | `/archive#customer-review` | archive-owner | pending-quote | Open the original customer quote review; use the activity/simulator panel to inspect a simulated receipt. |
| PASS | state:archive-unsigned-quote | `/archive#customer-review` | archive-owner | unsigned-quote | Open the original customer quote review; use the activity/simulator panel to inspect a simulated receipt. |
| PASS | state:archive-signed-quote | `/archive#customer-review` | archive-owner | signed-quote | Open the original customer quote review; use the activity/simulator panel to inspect a simulated receipt. |
| PASS | state:archive-stale-quote | `/archive#customer-review` | archive-owner | stale-quote | Open the original customer quote review; use the activity/simulator panel to inspect a simulated receipt. |
| PASS | state:archive-paid-quote | `/archive#customer-review` | archive-owner | paid-quote | Open the original customer quote review; use the activity/simulator panel to inspect a simulated receipt. |
| PASS | module:profiles | `/admin/overview#profiles` | owner | populated | Open the overview module and follow company/document links. |
| PASS | module:carriers | `/admin/overview#carriers` | owner | populated | Open the overview module and follow company/document links. |
| PASS | module:documents | `/admin/overview#documents` | owner | populated | Open the overview module and follow company/document links. |
| PASS | module:leads | `/admin/overview#leads` | owner | populated | Open the overview module and follow company/document links. |
| PASS | module:payments | `/admin/overview#payments` | owner | populated | Open the overview module and follow company/document links. |
| PASS | module:fuel_receipts | `/admin/overview#fuel_receipts` | owner | populated | Open the overview module and follow company/document links. |
| PASS | module:mileage_entries | `/admin/overview#mileage_entries` | owner | populated | Open the overview module and follow company/document links. |
| PASS | module:dat_records | `/admin/overview#dat_records` | owner | populated | Open the overview module and follow company/document links. |
| PASS | role:archive-office | `/archive#member` | archive-office | populated | Follow navigation; test restricted carrier administration and another carrier ID. Driver sees only assigned records in this archived runtime. |
| PASS | role:archive-driver | `/archive#member` | archive-driver | populated | Follow navigation; test restricted carrier administration and another carrier ID. Driver sees only assigned records in this archived runtime. |
| PASS | state:archive-empty | `/archive#documents` | archive-owner | empty | No sample files or records are seeded; upload a sample file. |
| PASS | state:archive-no-accounts | `/archive#accounts` | archive-owner | no-accounts | Create a test carrier to continue; no live account is made. |
| PASS | state:archive-connection-error | `/archive#member` | archive-owner | connection-error | The original connection-error screen and retry control are shown; the ChatGPT sign-in link is blocked by the preview boundary. |
