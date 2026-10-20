# TijaPass V9 — Unified Loan Qualification, External Debt & End-to-End Repayment Tracking

**V9 is an updated browser demonstration, rebuilt on V8, for GitHub → Netlify.** It retains V8 customer growth, help/pricing, V7 accounting, wallet, FI and supplier modules.

## V9 changes

1. One 0–100 qualification engine in `src/creditV9.js`. The score is driven by **TFL-reviewed accounting journal entries**, verified KYC, transaction coverage, operating history and (where applicable) prior on-time loan repayment—not the historic synthetic V4 turnover-based score. The old 300–850 and separate accounting-only rules no longer approve finance.
2. Customer and financial institution **loan affordability** based on conservative observed business profit available for repayment, after including all recorded internal and declared external instalments. A combined 25/30/35% repayment ceiling depends on prior satisfactory repayment; no automatic credit approval.
3. Repayment frequency: daily, weekly or monthly, with tier limits (first-time: 90 daily / 26 weekly / 12 monthly; mature: 90 / 52 / 36). FI interest, fees, amount and tenure are assessed on **actual per-installment** payment schedule, not just amount/turnover.
4. Product-specific max financing, with gates **before request, FI offer and disbursement**. Loans can be submitted, reviewed, rejected, offered, accepted/declined, supplier-funded, tracked, repaid and closed.
5. Customer declares existing external loan(s): lender, balance, instalment size, frequency, remaining instalments and next due date. Customer cannot edit the submitted record through the UI. TFL Admin verifies/edits/archives with mandatory reason, revision history, audit log and notification; archived records are excluded from active assessment.
6. Full application and repayment tracker across Customer, FI (access gated) and TFL, with schedule, dues, amounts paid, next due and arrears. Corrected V8 standing-order principal allocation bug and record the `paidAt` date on completed instalments.
7. TFL verification is no longer displayed/allowed in the Customer onboarding role, and customer updates cannot overwrite TFL-only monitoring fields in the UI.
8. External debt shown as a separately disclosed obligation on the accounting reporting view, not fictitious wallet cash or automatically duplicated accounting liabilities.

## Where to start

- **V9_DEPLOYMENT.md** — beginner-friendly GitHub and Netlify procedure.
- **V9_POLICY_AND_AUDIT.md** — assessment thresholds, V8 gap audit, data provenance, FI affordability, acceptance risks, controls and production developer handoff.
- `supabase/v9_credit_and_existing_debt.sql` — reference migration for customer-declared external debt and immutable TFL revisions; requires developer-led integration and review.
- `npm test` — inherited V5–V8 tests plus new V9 scoring, debt and loan tests.
- `npm run build` — React/Vite production build; requires `npm install` with accessible registry first.

## Demo route

1. Open Customer → Finance. Observe V9 100-point eligibility, affordability ceiling, loan tracker and external-loan declaration.
2. Submit an external debt and see its liability and monthly instalments included in the TijaPass assessment immediately; an unreviewed external debt blocks fresh offers.
3. Switch to TFL Admin → Finance → select the same MSME and open the TFL review on the declaration. Change details or archive with a reason. Return to Customer to see the revised debt; revision history is preserved in the local demo state.
4. Demonstrate FI review, term pricing, offer preview and lender-specific repayment schedules. **The seeded historical V4 records are NOT accepted as trustworthy accounting evidence**; use sufficient TFL-reviewed V7 journal entries across at least three months for eligibility testing. A borrower with genuine verified activity can be scored and assessed using the same rules in all screens.
5. Test in English/Kiswahili. Existing V8/V7 inherited views still require full professional translation QA.

## Hard boundary

**Not a live lending/payments app.** Role selection and data persistence are in the local browser. No real user login, server-side admin authority, Supabase integration, autonomous AI underwriting, external lender API, real wallet balances or BOT authorisation are implied. Do not use the seeded figures as real underwriting or actual funds. The score and affordability policy are transparent hypotheses that require calibration and governance against real MSME repayment and cash-flow data.
