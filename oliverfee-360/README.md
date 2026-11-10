# OliverFee 360

Private Sites project: `appgprj_6aee27445a288191acbdab251ca2d12b`.

The existing black, gold, hot-pink and silver interface is preserved under `web/`. `worker/` supplies carrier-scoped D1 records, R2 documents, versioned quotes and server-side authorization. `worker/rules.mjs` is shared with the browser through the deterministic build.

## Development and checks

- `npm ci` installs development-only DOM test dependencies.
- `npm test` checks quote rules, tenant/driver isolation, secure signatures, payment gates and form interactions with 390px and 1280px DOM viewport settings. DOM tests do not replace visual browser testing.
- `npm run build` embeds the existing web assets into `dist/server/index.js`.
- `npm run dev` serves a loopback-only preview with a synthetic identity and in-memory test database. This mock identity is never deployed.

Preserve `.openai/hosting.json` and append database migrations; do not reset carrier storage. The source/package/deploy lifecycle is managed by the Sites skill.

## Hosted access and records

`OWNER_EMAIL` is a Sites runtime secret identifying the service owner. Sites supplies authenticated visitor identities. Every carrier, quote and file operation checks server-side membership. Owners manage invitations, office users manage carrier records, and drivers can only see their assigned documents and records. An invitation does not change private Site sharing or send email; recipients also need access to the Site.

Earlier browser records are retained. The account screen offers an explicit merge/import into a selected secure carrier office without deleting the original browser data. Browser files can be imported only if their original IndexedDB blobs remain available.

Secure review links require sign-in and carrier membership. Immutable quote snapshots include operation answers, application entries, charges and refund terms. Changes invalidate the prior signature. Pending payable charges prevent signing/finalization.

## Fees and decisions

- Ultimate is $199/month; Startup Bundle is $399 one time, plus separately listed government and third-party fees. The full total is due before processing begins.
- Basic remains $49.99/month. UCR assistance is included in all plans with no OliverFee service charge; UCR registration charges remain separate.
- DQF preparation remains $99.99 per driver. Audit support remains $499.99 with the Gold Binder.
- IFTA setup assistance is free; other agency fees require verification. Georgia decal ordering is one item at $5 service plus $3 per qualifying truck, only for a Georgia IFTA base jurisdiction.
- The standard hazmat flat service price and plan coverage remain unconfirmed. PHMSA categories and material applicability require verified facts. TSA starting rates are $88.25 or $41 for verified reduced-rate eligibility. The TSA page returned 403 during verification; confirm its rates before live use. The older Georgia manual lists $20, while current DDS terms vary by transaction; staff must confirm the actual licensing fee.
- The proposed 30-day membership trial is disabled. No delayed/free billing offer is enabled.
- New Mexico declared weight must exceed 26,000 lb and the vehicle must travel there to trigger the WDT review. Tax projections require verified rate/source/period and estimated New Mexico miles, including pass-through miles; projections never enter checkout. Actual quarterly miles are required for reporting.

## Stripe

Live checkout is disabled. Do not enter keys into source or chat. Future connection requires a Sites runtime `STRIPE_SECRET_KEY` and explicit `STRIPE_CHECKOUT_ENABLED=true` after end-to-end validation. Hosted checkout uses server-calculated charges; no success URL or client state can mark payment complete. A private, authenticated confirmation action retrieves the Checkout Session directly from Stripe and verifies its paid status, full amount, currency and quote metadata. Direct-pay agency receipts remain a separate processing gate. Optional signed webhooks require `STRIPE_WEBHOOK_SECRET` and a supported delivery route; private Site access must not be weakened to receive them.
