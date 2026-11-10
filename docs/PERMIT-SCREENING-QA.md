# Permit screening QA

Run from the root standalone application:

- `npm test` runs pricing, rule-boundary, all-state coverage and React/jsdom interaction tests.
- `npm run build` creates the Next.js production build and checks TypeScript.
- `npm start -- -p 3003` serves the built local preview.

The interaction tests use DOM viewport settings of 390 and 1280 pixels. They exercise individual California selection, Select All 50 States, Clear All, shared answer edits, question panels from selected estimate items, and both help-button locations for every rule across all 50 states. Native dialog methods are stubbed in jsdom: this does not verify actual rendering, native focus trapping, Escape behavior, scroll/overflow or physical touch targets in a browser.

The pure tests cover IFTA/UCR differences, private passenger and private-property operations, member-jurisdiction travel, 26,000 lb boundaries, California pass-through emissions versus MCP review, emissions weight/fuel alternatives, hazmat OR/AND conditions, NY gross/unloaded methods, KY/NM/OR tax thresholds, CT class-and-weight conditions, exemption/unknown outcomes, personal-use guards, server input normalization and separate fee totals. Checkout is never enabled; tests do not submit real carrier requests or collect money.

Remaining walkthrough: open Carrier Setup at mobile and desktop sizes, confirm readable layouts and native dialog keyboard/focus/scroll behavior; run a sample through the live authenticated request-save and office-review workflow using approved test accounts. No real carrier account or paid transaction was used in this change.

Coverage is incomplete by design. See [PERMIT-SCREENING-COVERAGE.md](PERMIT-SCREENING-COVERAGE.md) for the exact verified rules and all 50 state manual-review boundaries. A passed test verifies the implemented behavior, not that every state law or exemption has been researched.
