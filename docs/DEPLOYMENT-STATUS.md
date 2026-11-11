# OliverFee360 release status

Release destination remains Gerald's https://github.com/geraldketu/pocket-office (main), Vercel sturdi-home/pocket-office, and https://oliverfee360.com. No project or domain is migrated.

Gerald's existing Vercel GitHub integration successfully built branch commit 926410a in the same production project (deployment 64UeMdBgmUbS8GqfwxMqA4FHb28o). This integration remains the publishing path. The unrelated local felicialvrg login does not control or replace it. The optional explicit CLI path retains strict target verification and can be used only with a credential authorized for the existing project.

The portal now reuses existing production credentials. Server-side owner verification requires the explicit allowlist when present; otherwise it requires the sole existing verified administrator. Ambiguous or unavailable identity denies access. Production previews create only their own private encrypted test bucket upon an owner-authorized request. No account is promoted, reset or recreated; no customer records or existing bucket settings are modified.

Unit/control/security tests: 117 passed. Archived Worker tests: 35 passed. Final preview integration: 123 passed across all 109 inventory entries. Production rebuild passed without errors. Production publication through Gerald's existing integration is the next step. /api/release will identify the live release commit after deployment. Native visual acceptance and signed-in production owner walkthrough remain separate verification limits.

Functional fixes: bid midpoint overflow and password-reset failure recovery. Full automated coverage and remaining signed-in/native walkthrough limits are in FUNCTIONAL-VERIFICATION.md and ADMIN-PREVIEW-CHECKLIST.md.
