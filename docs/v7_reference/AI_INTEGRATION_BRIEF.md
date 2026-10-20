# V7 AI Accountant integration contract (developer handoff)

The included `src/superAccountant.js` is **explainable deterministic JavaScript**, NOT an external generative AI. It is useful for demonstration and acceptance-rule design only.

## Suggested production backend

Capture: direction, date, amount, currency, account/channel, counterparty, purpose, statement source IDs, original media hash, user identity and consent. External source text, speech transcription and AI explanations are untrusted.

Extraction service: model returns {direction, amount, category_candidate, counterparty_candidate, purpose, suggested_questions, confidence, evidence_spans}. Validate JSON shape and reconcile with original input. Do not fabricate missing counterparty names. Escalate contradictions.

Decision service: deterministic business constraints, idempotency fingerprint, duplicate candidate matching, running-balance checks, source identity, declared-vs-verified tier, expected-value and historical anomaly checks, role and approval limits. Model recommendations must never directly change postings or customer funds.

Human review: TFL accountant receives concise findings, confidence and evidence, can request customer clarification, approve, reject, and initiate a contra journal and corrected reposting. Supervisor authorisation for material/high-risk adjustments. All actions server-audited.

Model governance: English/Kiswahili evaluations on anonymised genuine examples, class-based precision/recall, false-positive study, drift monitoring, override logs, red-team prompts, deterministic ledger reconciliation, Tanzanian accounting/regulatory/legal review.

**No production API, AI key, provider credential or genuine money transfer is included.**
