# V8 Developer Handoff — Production Build Checklist

## Architecture priorities
1. React/Vite PWA on Netlify, immutable build, GitHub CI. Eliminate role-switching as an authorization mechanism before real customer use.
2. Supabase Auth + organizations/memberships/RLS; secure server routes for all cross-party operations, with rate limits, session protections, automated backups and audit logs.
3. Keep the V7 accounting double-entry engine deterministic. Validate customer evidence, verify bank/mobile statements, stage, match duplicates, reconcile and require TFL review for anomalies. Avoid misrepresenting self-declared entries as independently verified.
4. Migrate support conversations from localStorage into Postgres (`supabase/v8_support_and_subscriptions.sql` reference). Control ticket visibility by authenticated organization, apply retention policies, anti-spam checks, escalation priority and staff queue workflows. Push/email notifications require real server integrations and customer preferences.
5. **AI help:** optional low-cost API-backed LLM behind authenticated Edge Functions (never a browser-embedded secret), grounded in approved TijaPass FAQs and user-authorized account summaries. Restrict tools: read-only for customers; no automatic credit approvals, ledger postings, refunds or sensitive data export. Prompt-injection testing, human handover, confidence/abstention and incident logging required.
6. **Pricing:** listed packages are MARKET TEST proposals. Basic transaction capture must remain free and without per-entry penalty. Build consented subscription activation, receipts, cancellation, renewal notifications, refund policies and opt-in recurring payments only through approved payment rails. FI institution-level fees remain separately contracted.
7. **WhatsApp:** use the official TFL number in Help configuration. Direct wa.me link is a low-cost first step; optional WhatsApp Business Platform API needs provider approval, consent, template rules and usage costs. Never send private bank records into an open link.
8. Test EN/SW with actual Tanzanian MSME users; ensure readable typography, accessible controls, voice-readback, data costs and poor connectivity. Measure first-record completion rate, 7/30 day retention, support resolution, free-to-paid conversion, and accounting reconciliations.

## Minimum acceptance criteria
- Authenticated customer cannot read any other customer's tickets, financial records or package enquiries, even if an endpoint is called directly.
- TFL staff sees assigned support cases, customer sees replies across devices; event notifications work after logout/login.
- Inadequate questions safely escalate; no invented fee/interest/approval/credit claims; no AI secret in browser.
- Accounting capture and report equivalence preserved from V7; no double counted imports.
- Failed payment never upgrades entitlements; duplicate webhook never double charges; cancellation reflected correctly.
- PWA installs on supported devices; keyboard/touch support and 320px width work; all EN/SW labels verified.

## Never present as already integrated
External LLM, WhatsApp API, bank/MNO APIs, actual wallet settlements, secure multi-user ticketing, automatically paid plans, server transaction ledger, licensed payment services.
