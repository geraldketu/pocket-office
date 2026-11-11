# Owner entry without carrier onboarding

Designated owner: `oliverfee360@gmail.com` (the user explicitly selected this account).

The shared `/login` form authenticates through Supabase email/password first. A server action then retrieves the real provider user using `auth.getUser()`. Other emails cannot request a role, UUID or company assignment. Only the designated provider-verified, non-anonymous email can complete initial owner setup.

The action checks the private owner UUID allowlist, the matching profile, absence of linked carrier records, and the existing administrators. It refuses conflicting or multiple owners, mismatched UUIDs, missing profiles, drivers, or linked carrier accounts. With no conflicting administrator, it updates only this authenticated user's unlinked default carrier profile to `admin`, using server-only credentials and conditional filters. Existing correctly configured ownership is idempotent. It does not create a login, set a password, send an email, change a company, or grant anyone else's account access.

Successful owner login routes directly to `/admin`. The existing owner server gate still protects every admin page and API. Owner setup does not replace or bypass that gate.

For an already signed-in designated owner at `/account`, the account screen uses the provider email rather than a stale profile email. It displays an admin entry screen and performs the same authenticated server action. No carrier checklist or carrier-plan link is displayed. Unresolved conflicts display an admin-specific review message, with a retry button and sign-out. Other customers retain their existing onboarding.

The owner-specific screen is also available through Site Explorer's isolated `owner-access-pending` state. Its simulator never calls live authentication or changes production roles; a simulated non-owner remains denied.

Verification covers actual server action guards, rejected forged metadata and arguments, unverified email, anonymous sessions, role conflicts, stale owner UUIDs, linked companies, idempotent ownership, server account routing, and real mobile/desktop controls. No real user's password or production session is used by automated tests.

Production remains on Gerald's existing repository, main branch and Vercel project. Broker plans and existing prices are preserved.
