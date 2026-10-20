# TijaPass V9 — Loan Policy, V8 Gap Analysis and Developer Handoff

## V8 audit: what had to be fixed

| V8 issue | V9 correction |
|---|---|
| V4-era 300–850 score still driving finance requests | Unified 0–100 policy engine used by credit passport, request, FI review and TFL |
| Legacy turnover-based / separate accounting-based limits | One verified journal evidence source, lender product pricing, capacity-based limit |
| Declared external loans missing from customer balance sheet / debt-to-cash check | Customer external debt declaration + repayment plan + TFL review and audit |
| Approvals could ignore an external repayment / price changes | Underwriting gate on request, FI offer and before disbursement |
| V8 product tenor months only | Daily, weekly, monthly schedules and tier-specific installment caps |
| Manual standing-order collection calculated principal reduction after updating paid | Principal delta now computed before updating each schedule row |
| Loan tracking mostly application status in a table | Customer/FI/TFL loan tracker with stages, lender, outstanding, paid, next due and schedule |
| Customer could click TFL KYC verification in V8 UI | V9 restricts button and update operations to TFL demonstration role |

## Qualification (100-point prototype policy)

First-time weights: KYC 20%, reviewed transaction coverage 35%, reviewed records 25%, operating months 20%; previous repayments not scored.
Repeat weights: KYC 15%, coverage 25%, reviewed records 15%, months 10%, repayment behaviour 35%.

Thresholds: KYC >=80% plus verified status and consent, coverage >=70%, >=30 TFL-reviewed unique records (300 for top-tier points), >=3 distinct reviewed months and >=3 months operating, score >=70, no unresolved overdue, no unreviewed external debt and positive supportable cash flow. Both business-history and accounting months must qualify.

Repayment track record: previous TijaPass loans settled on time (20 points), arrears (10 points), existing debt burden (5 points). Repayment performance for third-party debts is not verified through direct APIs; outstanding external obligations conservatively reduce capacity. Old seeded V8 instalments without `paidAt` do not count as *proven on-time*.

## Affordability and upgrades

Monthly available debt service = max(0, reviewed average monthly journal profit x 80% cash-conversion factor x allowed instalment share - existing internal and external monthly instalments).
- First loan 25%; after one fully repaid on time, 30%; after two suitably repaid with >=95% on-time and no arrears, 35%.
- Daily: first up to 90 instalments, later up to 90. Weekly: first 26 then 52. Monthly: first 12 then up to 36. These are ceilings; a lender can restrict them further.
- Annual FI rate converted per repayment cycle; exact first-payment fees shown. Every instalment must fit *its own* capacity; the largest (often including fees) is considered.
- The requested/approved amount cannot exceed the selected FI product maximum; remaining debt includes TijaPass and declared external debts. Disburse checks the stored offer schedule against today's capacity.
- A 20% cash conversion haircut is a demonstration conservative buffer, **not** a statistically calibrated stress factor; production underwriting needs seasonal cash forecasts, verified net operating cash and testable assumptions. FI credit committees retain final decision.

## Source-of-truth policy

`accountingJournal` contains confirmed posted double-entry journal entries, some still self-declared and auto-cleared. V9 **counts only TFL-reviewed** journal entries for scoring and cash flow; self-declared and V4 historical sample transactions cannot meet the qualification gate. Management statements may include other accepted journal entries but must label verification level. External declarations are **memorandum debt disclosures** until evidenced; they do not automatically create extra wallet cash or duplicate opening loan liabilities. Once a real backend exists, reconcile each external creditor, prevent duplicates against TijaPass loans and post verified liability adjustments through controlled accounting journals as applicable.

## External loan ownership

Customer can submit lender, outstanding principal, periodic installment, frequency, remaining installments, next due date, reference and note **once**. Customer cannot edit/archive that submission through V9 UI. TFL Admin may review, correct or archive after supplying 10+ character reason; revision history and a customer notification are generated. Other roles receive no edit interface. Production must enforce immutable submitter, original snapshot, administrator-only revisions and soft archive through RLS + server RPC. See `supabase/v9_credit_and_existing_debt.sql` (reference draft requiring code review before application).

### Repayment tracking and reconciliation

Internal TijaPass loans: application status → FI access/offer → customer accepts → supplier invoice → wallet disbursement → installments → full repayment; reference, rate, amount, principal balance and schedule always shown. Principal/interest/fees are allocated from the original schedule. A payment becomes on time only when `paidAt` is recorded on or before due date. TFL reviews exceptional disbursement routes.

External loans: V9 generates an **expected** schedule from user-supplied terms, not a lender-confirmed loan contract. Overdue based on unconfirmed future/past instalment dates is a risk signal pending TFL verification, not proof of non-payment. TFL must update outstanding principal, count, date and schedule against evidence when the lender confirms a payment or restructuring. Without an approved provider interface, there is no automatic external repayment deduction.

## Necessary before controlled real-money live testing

1. Central PostgreSQL data, real login, RBAC and RLS, no in-browser role switching or editable browser state as authority.
2. Read-only trusted view of verified journal profit and evidenced net cash; monthly periods and reconciliation of bank/mobile imports.
3. Admin-only, reason-bound external loan corrections with server-enforced revisions and no deletion; customers cannot spoof verification.
4. FI offer, acceptance, supplier settlement, repayment allocation, fee posting and status transitions executed as atomic idempotent server transactions.
5. Consent, customer-disclosed debt reconciliation and authorised credit-bureau access where possible; lender's final underwriting remains separate.
6. Product disclosure: nominal/effective costs, fees, interest conventions, full repayment schedule, overdue rules and complaint channel.
7. Full end-to-end UI/translation QA and user testing on Android/low-cost devices.

The ZIP remains a **browser-local demo**. We do not claim actual FI integration, BOT authorisation, statistical credit validation or live loan funds. Running `npm test` checks domain functions; full `npm run build` and deployment E2E verification must be done in an environment with the Vite packages installed.
