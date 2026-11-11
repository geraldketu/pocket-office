# Create account

Open /signup directly, or choose Create account beside Sign in or in the public navigation. Signup uses existing Supabase email/password authentication and confirmation. The existing database trigger creates only a carrier profile; signup does not accept role or company identifiers. Unlinked accounts reach /account while the office reviews and links carrier records. Existing linked accounts retain their normal dashboard. No subscription, payment, or admin access is created.

Owner preview includes confirmation, error, unavailable and pending-account states using synthetic records. No real confirmation emails are sent during automated verification. Actual email delivery and a real inbox confirmation still require an authorized walkthrough.
