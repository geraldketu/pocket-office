# Owner login preview — not approved for production

Repository: `geraldketu/pocket-office`. Branch: `feature/owner-login-preview`.
Keep production branch `main`, Vercel `sturdi-home/pocket-office`, and `oliverfee360.com` unchanged.

Designated owner email: **oliverfee360@gmail.com**. Earlier email selections are superseded.

## Preview walkthrough

Use the exact branch deployment URL, followed by `/login`. “Owner & Staff Login” in the public navigation and footer opens this page. The application uses Supabase email/password authentication; no ChatGPT account, OAuth identity, or matching ChatGPT email is required.

1. Open the provider's one-time invitation email. Verify the email and choose your own password on `/set-password`.
2. Sign out and sign in at `/login` with the same email and chosen password.
3. `/dashboard` routes the owner to `/admin`, whose first screen is Site Explorer.
4. Signed-out requests to admin pages redirect to sign-in; private admin APIs return 403. Authenticated staff without the designated owner's permissions also fail the server owner gate.

This branch has no new public role-assignment endpoint, shared password, login bypass, or automatic owner promotion through signup. Existing carrier accounts and data are preserved. Stripe remains disabled.

## Invitation status

**Not sent.** This checkout has no production Supabase service credential, and Supabase administration is not connected. The operator command was attempted and stopped before making any provider request. No real account was created or changed. Synthetic tests do not prove real inbox delivery or production owner access.

Connect the **existing** Supabase project `dgjqwnewuhpwitadppkv` in Apps, not a new project or hosting account. The app uses this project today. The Vercel preview must also have the existing server authentication configuration scoped to Preview. Do not paste credentials in chat or commit them.

## Secure operator workflow after connection

First audit the existing authentication user and `profiles` records. `scripts/owner-invitation.mjs` is private operator tooling, not an application route. Audit is read-only by default. It pins the existing Supabase host and owner email and stops for competing administrators, mismatched identities, linked carrier records, or a stale owner UUID allowlist. Reconcile conflicting existing records with the owner before running a send; do not silently demote users.

In the existing Supabase dashboard:

1. Under **Authentication → URL Configuration**, add the exact preview origin followed by `/auth/confirm` to the redirect allowlist. Preserve the production Site URL and existing redirects.
2. Under **Authentication → Email Templates**, ensure Invite and Reset Password use server token-hash links. The invitation template's link target is:

   ```html
   <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=invite&amp;next=/set-password">Verify email and choose password</a>
   ```

   The Reset Password template uses the same form with `type=recovery`. Keep all other template content. Check other invitation callers before changing a shared template. These callback parameters are supported by the existing `/auth/confirm` route. Do not use a browser fragment token in a server-only callback.
3. Confirm provider mail delivery configuration permits this recipient. Provider success means accepted for sending, not confirmed inbox delivery.

With server credentials loaded securely into the operator environment, set `OWNER_PREVIEW_ORIGIN` to the exact deployment origin. Include the existing `OLIVERFEE_OWNER_IDS` setting if configured. Then:

```text
npm run owner:invite
```

This reports email, existence, verification and role status without passwords, tokens, or invitation URLs. After the templates and redirect allowlist have been verified, set `OWNER_EMAIL_TEMPLATES_VERIFIED=true` and run:

```text
npm run owner:invite -- --send
```

The provider sends an invitation for a missing account or recovery for an existing account. No password is generated or supplied. A new profile is assigned the admin role; its email must be verified before the existing sole-owner fallback grants access. An existing nonempty owner allowlist must match this account. Never substitute an email comparison in a public request for the server's role/UUID checks.

The owner subsequently authorized publishing these login pages through the same existing production workflow used for the broker plans. Actual owner account verification and email delivery remain pending provider administration access.

Official references: [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [admin invitations](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail), [SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

For production invitations use `OWNER_LOGIN_ORIGIN=https://oliverfee360.com`. The production `/auth/confirm` URL must be allowed in the existing provider redirect settings. `OWNER_PREVIEW_ORIGIN` remains supported for preview setup. The same email, project, sole-owner audit, and template checks apply to either origin.
