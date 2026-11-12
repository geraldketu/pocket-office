# Verified owner entry

The requested owner login is felicialvrg@gmail.com, provider UUID d5f443af-ac3a-42b2-8294-6fbf51f73beb. The production Auth identity was audited and confirmed on November 12, 2026. Its existing unlinked profile was changed from carrier to admin through private operator access; no other account, password, carrier, file or setting was changed.

The retained portal is https://oliverfee360.com/admin. The server gate requires the exact audited UUID, the matching profile email, admin role, no carrier association, and a matching confirmed nonanonymous provider identity. Historical OLIVERFEE_OWNER_IDS values no longer choose the portal owner. Existing other admin accounts are preserved but cannot pass the owner gate. Preview identities cannot grant production access.

Login verifies the existing owner profile without creating accounts, automatically granting roles, transferring ownership or modifying another user. Unresolved owner identity/profile failures remain denied and do not request carrier onboarding. Future owner changes require a fresh operator audit and reviewed identity configuration.

The provider's old localhost redirect remains a separate project-management setting. A server-generated, one-time recovery token can target the existing /auth/confirm handler directly without relying on that default. Do not log or commit recovery URLs. Provider-side Site URL, redirect allowlist and email templates still require verification before claiming ordinary invitation/recovery emails work.

Validation: 141 tests passed, including owner gates, callback and account routing. Production build passed. Signed-in production verification is recorded separately after deployment.
