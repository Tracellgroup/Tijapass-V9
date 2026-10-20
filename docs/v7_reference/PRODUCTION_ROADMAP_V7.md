# V7 → Secure live pilot implementation priorities

**The pilot is illustrative and browser-persisted. It is not production-ready.**

1. **Design authority:** define business entity, chart of accounts, accrual/cash basis, inventory, VAT/taxes, loan schedules, financial statements, financial data-quality grading. Add account-by-account balancing and idempotency tests.
2. **Secure backend:** Supabase/PostgreSQL or comparable, identity, RLS/ABAC, tenant isolation, encryption and private document storage, immutable journal + offsetting corrections, tamper-resistant audit and backup/recovery.
3. **Accountant engine:** server-side deterministic rules, reason codes, customer follow-up questions, approval thresholds, segregation of duties and a TFL supervisor approval step for sensitive changes.
4. **Actual AI:** server-side model for Kiswahili/English transaction-language extraction and explanations. Strict JSON output schema, grounded data, no direct SQL/fund movement, confidence thresholds, human review, privacy minimisation, testing against historic anonymised transactions.
5. **Sources:** contractual/API access where offered, statement imports from supported providers and customer consents; evidence hashing; source references; duplicate linking; settlement and bank balance reconciliation. A statement uploaded by a customer proves neither ownership nor completeness.
6. **Customer UX:** accessible translation reviewed by fluent Tanzanian Kiswahili users, low-bandwidth offline sync design, voice transcript read-back and manual edit; usability testing with low-literacy MSMEs.
7. **Statements/credit limits:** accounting journal as single source of financial totals; distinguish verified, reconciled, reviewed self-declared and unreviewed data. Credit use only after policy, bias, data-quality and model validation.
8. **Actual wallets:** no real money without proper BOT/regulatory pathway, approved bank/payment partners, transaction limits, AML/KYC, complaint handling and independently audited clearing/settlement reconciliation.
9. **Reliability testing:** duplicate statement imports, cash anomalies, unbalanced journal, concurrency/race conditions, repeat network submissions, reversals, permissions, screenshots & mobile device variants, speech failures and i18n completeness.

No current code claims to have an external generative AI service, bank APIs, SMS gateway, production-identity controls or secure cash ledger. The TFL Super AI Accountant is a rules-driven workflow demonstration for discussion with developers/BOT.
