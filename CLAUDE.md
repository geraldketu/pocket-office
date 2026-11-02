# Project Brief: Pocket Office for Owner-Operators (working name)

> Save this file as `CLAUDE.md` in the root of a new empty folder, open the folder in VS Code,
> and start Claude Code. It reads this file automatically, so every session starts with full context.

## Goal for Friday
An **initial setup**, not a finished product:
1. GitHub repo created and pushed
2. App skeleton running locally and deployed to a live URL
3. Login working (admin + trucker accounts)
4. Database tables for everything listed below
5. Document upload + list + download working for one document type
6. One public landing page with a contact/sign-up form

Everything else is roadmap.

---

## 1. The business (who uses it and why)

**The operator (admin):** She runs a compliance service for owner-operator trucking companies.
- She registered with FMCSA/DOT and receives notices of new carrier registrations, which become her lead list.
- She calls carriers, finds out what they're missing, quotes them, and charges her fee on top of the actual government/vendor costs.
- She can also set them up with a drug & alcohol testing consortium.
- Carriers today spend roughly $3–4k/month on this and are lost. She knows how to assemble their paperwork and spot what's missing.

**The customer (trucker / carrier):** A one-truck or small-fleet owner-operator.
- "Their office is in their pocket": phone-first app.
- Snaps photos of fuel receipts and documents; the app reads and stores them.
- Can save, download, and print anything, individually or as a bundle for a date range (6 / 8 / 12 months, or custom).

---

## 2. Core features (MVP order)

### A. Accounts and access
- Roles: `admin` (her), `carrier` (the trucking company), optionally `driver` later.
- She creates a carrier account after the call → the carrier gets a welcome email.
- **Do not email a generic shared password.** Use an invite link or a one-time temporary password that forces a reset on first login. Same result for her, much safer for the customer.

### B. Document vault ("all their paperwork")
Each document has: type, file (photo/PDF), issue date, expiration date, status, notes.
Starter document types (admin can add more):
- USDOT number / MCS-150 (biennial update)
- MC number / operating authority
- **BOC-3** (process agent filing)
- **UCR** (Unified Carrier Registration, annual)
- **DOT medical card** (driver medical certificate)
- CDL
- Driver Qualification (DQ) file items
- **IFTA** license + quarterly returns
- **IRP** apportioned registration / cab card
- **Form 2290** (Heavy Vehicle Use Tax)
- State weight-distance tax permits: **NY HUT**, KY KYU, OR, NM
- Insurance certificates (COI)
- Annual vehicle inspection
- Drug & alcohol consortium enrollment, test results, FMCSA Clearinghouse queries
- Trailer interchange, lease agreements, misc. permits

Must-haves:
- Upload from phone camera or file
- Expiration reminders (email/SMS at 60 / 30 / 7 days)
- "Missing documents" checklist per carrier, so she can see gaps at a glance
- Download single file, or **export bundle by date range (6/8/12 months/custom) as one PDF or ZIP, print-ready**

### C. Fuel receipts + mileage (IFTA tracking)
- Trucker photographs a fuel receipt → OCR/AI extracts: date, station, city/state, gallons, price, total, tax.
- Trucker logs miles per state per trip (e.g., "20 miles in CT"). Later: automatic via phone GPS or ELD integration.
- Quarterly summary: miles and gallons by jurisdiction, ready for the IFTA return.
- Keep original receipt images (IFTA requires keeping records for years).

### D. Drug & alcohol testing setup
- Track consortium enrollment, random-selection notices, test results, Clearinghouse pre-employment and annual queries.
- Admin can record which partner consortium a carrier uses. (Integrations with specific vendors come later.)

### E. Admin dashboard (her side)
- Lead list (from DOT notices): name, DOT#, phone, status (new → called → quoted → paid → active)
- Call notes and quoted price per lead
- Carrier list with compliance status (green / yellow / red)
- Create carrier account + send invite in one click
- Record payments and which tier they bought

### F. Pricing tiers + payments
- Several service tiers (names/prices TBD by her), plus government/vendor fees billed separately.
- Use **Stripe** (payment links or Checkout) so she can take payment by phone or send a link.

### G. Landing pages
- Main marketing page for her service.
- A per-carrier mini landing page (`/c/{carrier-slug}`) she can send to prospects or customers.
- Simple contact form that creates a lead in the admin dashboard.

---

## 3. Tech stack (to confirm on first session)
Undecided. Two options:

| | Option 1: Same as ABS-Capital | Option 2: Recommended for this app |
|---|---|---|
| Code | PHP + MySQL | Next.js (TypeScript) |
| Hosting | Hostinger, deployed from GitHub via hPanel | Vercel, deployed from GitHub |
| Database / auth / file storage | MySQL + hand-built login + server folder | Supabase (Postgres, Auth, Storage) |
| Receipt OCR | API call to a vision model | Same |
| Payments | Stripe | Stripe |
| Email | Resend or Hostinger mail | Resend |

Option 2 gets logins, secure file storage, and invite emails mostly for free, which matters for Friday.
**First thing Claude Code should do: ask which option, then scaffold.**

### Security notes (this app holds sensitive data)
- Files are private per carrier; only that carrier and admin can access them.
- Secrets (API keys, DB passwords) go in `.env`, never committed. Add `.env` to `.gitignore` before the first commit.
- Use HTTPS everywhere; signed, expiring URLs for file downloads.

---

## 4. Suggested data model
- `users` (id, email, role, carrier_id)
- `carriers` (id, legal_name, dba, usdot, mc, phone, email, address, tier, status, slug)
- `leads` (id, name, usdot, phone, source, status, quoted_price, notes, created_at)
- `document_types` (id, name, renews_every_months, required)
- `documents` (id, carrier_id, type_id, file_path, issued_on, expires_on, status, notes)
- `fuel_receipts` (id, carrier_id, image_path, date, state, gallons, total, extracted_json)
- `mileage_entries` (id, carrier_id, date, state, miles, truck_unit, trip_note)
- `dat_records` (id, carrier_id, consortium, test_type, date, result, file_path)
- `payments` (id, carrier_id, amount, tier, stripe_id, paid_at)

---

## 5. First prompts to paste into Claude Code
1. "Read CLAUDE.md. Ask me which stack option, then scaffold the project, initialize git, and create the GitHub repo."
2. "Set up auth with admin and carrier roles, and an invite-email flow."
3. "Create the database tables from section 4 and seed the document types from section 2B."
4. "Build document upload, list, download for carriers, plus the admin view of all carriers."
5. "Deploy to a live URL and give me the link."

---

## 6. Later projects (separate repos; do not build now)

### Speak-to-Build (AI website service)
- People describe the site/app they want by voice; it's turned into instructions for an AI coding tool (Codex / Claude Code).
- Offer guided scripts: "exactly what to say to the AI," plus tutorials.
- Revenue: build fee + monthly maintenance.
- First real client: a website for a flooring company (a surprise from her boyfriend), so this doubles as the portfolio piece.

### "Accept My Price" (event marketplace / party planner)
- Customer plans an event (e.g., mom's birthday), picks items/services, and names their price.
- AI reviews the selections and matches them with vendors (photographers, decor, catering).
- Offer board: requests with a dollar amount that vendors can accept or counter.
- In-app messaging between customer and vendor; built-in party-planner checklist.
- Working tagline: "Pocket to Rocket."
