# V8 Release Notes — Customer Growth & Commercial Experience

## Added
- Bilingual MSME-first customer landing page, quick sale/expense capture and first-use hints.
- Profit summary derived from actually posted V7 journal entries where available; no invented sales or profit number displayed when journal is empty.
- Proposed pricing: Basic free, Weekly TZS 1,000, Plus TZS 3,000/month, Business Pro TZS 8,000/month and optional TZS 500 single-day premium pass. No transaction-recording fee.
- TFL price-setting **demo** and subscription request queue. Does not charge, activate, renew or cancel real subscriptions.
- In-app FAQ-like TijaPass Msaidizi in English/Kiswahili with safe uncertainty handoff to TFL.
- In-browser support ticket, reply/status and notification records for customer, FI and supplier roles and TFL admin review.
- TFL-configurable official WhatsApp / call number links; no invented number, no automated transfer of financial details.
- New V8 RLS support/subscription SQL **reference migration** (not yet deployed).
- Existing V7 accounting and review controls retained, with entry direction preselected by sale/expense home buttons.

## Known limits / not live
- Not a connected AI/LLM chatbot. FAQ responses are deterministic; serious issues escalate to a browser-only TFL case.
- No Supabase or cross-device persistence; UI role switch is insecure outside demo and must be replaced with authentication/authorisation.
- No integrated bank, payment provider, real wallet cash-in/out or paid billing.
- Plan features/prices are proposals, not tested subscriptions. Pricing does not enforce entitlements.
- V7 FI charging and finance flows remain simulated. Existing translations may need full professional QA.

## Test evidence
- `npm test` includes inherited accounting/V6/V7 rules plus V8 pricing/support/JSX integration tests.
- CSS parsed successfully with PostCSS and the ZIP archive passed CRC integrity validation.
- A local `npm run build` could not be completed without dependencies: npm registry unavailable in this environment. Netlify must run a real build and interactive smoke tests before presentation.
