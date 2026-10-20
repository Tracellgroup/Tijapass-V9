# TijaPass V7 release notes

- Full-application bilingual presentation coverage broadened; customer accounting flow translated explicitly, inherited static labels covered by `v7FullLocale.js` dictionary. Dynamic/legacy labels need translation QA.
- Guided transaction entry + statement upload only; voice dictation moved under mandatory purpose description; speech read-back confirmation.
- Filtered transaction classification with visible, simple choices instead of suggested-category badge.
- Payer/purpose/direction/category consistency checks; sensitive or anomalous records enter TFL queue.
- Auto-cleared ordinary customer records posted only as unverified self-declared demo entries, never automatically treated as external bank proof.
- TFL review dashboard: risk summary, return for correction, resubmit, approve/reject, offsetting journal reversals and append-only audit demonstration.
- Finance/wallet, supplier, FI, onboarding modules remain from previous pilot for continuity; not live finance services.
- `npm test` runs inherited 29 checks + 12 V7 super-accountant checks. Full Netlify production build must still complete.
