# Accounting-first architecture — developer specification

## Layer 1. Source evidence
- TijaPass internal wallet settlement events, signed provider webhooks/API transactions, customer-authorised exported statements (CSV/XLSX/PDF), scanned receipts/invoices, manual cash events, suppliers, inventory records, owner drawings, bank/mobile money balances and loans.
- Store the encrypted original evidence or provider reference, source/time/consent and checksum; record extraction model/version and import batch ID. Separate **claim / uploaded record / verified provider data**.
- Duplicate-detect by provider transaction ID, amount, account and time; identify possible two-sided transfers between the customer's own accounts and flag uncertainty.

## Layer 2. Capture and categorisation
- For each record: date, gross amount, direction, currency, account, counterparty, unique reference, proposed category, confidence signal, source provenance, verified state.
- Rules-first deterministic mappings for known transfers, disbursements, repayment schedules, stock purchases and internal fees.
- Optional secured LLM adds only a proposed interpretation (never balance writes). Reviewer corrects with explainable history. Unknown cases remain unposted.

## Layer 3. Accounting journal
- Record approved actions as one balanced transaction header and multiple debit/credit lines, integer shilling amounts / PostgreSQL NUMERIC.
- Mandatory chart of accounts and unique source ID; maker-checker approval, idempotency and transaction-level locks; no arbitrary journal update/delete; reversing journal for correction.
- `Inventory purchase`: DR Inventory, CR Cash/bank/mobile. `Cost of sales`: DR COGS, CR Inventory (only on stock consumed/sold evidence).
- `Sales collection`: DR cash/bank/mobile, CR Sales (unless it settles an existing receivable; then CR AR).
- `Own-account transfer`: DR destination, CR source; NO revenue/profit.
- `Loan disbursement`: DR cash/asset as appropriate, CR loan payable. When a lender settles the supplier directly on behalf of MSME, recognise asset/inventory and loan liability according to underlying legal transaction (do not count it as customer cash).
- `Loan repayment`: DR principal liability, DR interest expense/payable, CR wallet/bank/mobile, with schedule allocation.
- `Owner capital`: DR cash, CR capital; owner withdrawals: DR drawings, CR cash.
- Any uncleared accounting ambiguity is an exception queue, not a guess.

## Layer 4. Reports
- Derive trial balance, P&L, gross margin, operating result, cash flow and assets/liabilities/equity from **posted source-backed journals**.
- Expose data coverage, opening balance provenance, reconciliation differences, posting exceptions, period lock and report basis (cash vs accrual). Prevent reports from claiming external audit assurance.
- Source-driven inventory perpetual/periodic valuation, receivables/payables cut-off, depreciation, multi-period profit and loss and cash-basis conversion required for production.

## Layer 5. Finance insights
- Separate source reliability, completeness and history from affordability and lender policy. In early trials require KYC, three months of activity, bank/mobile evidence and verified reconciliations; return limit ZERO if data is insufficient.
- Show model version, reason codes, data quality and customer appeal route. No final automated credit decision without FI policy and model validation.

## Security architecture
- Customer grants/revokes FI consent for specified scopes. TFL and FI views governed by API-side RLS and strict authorisation, not UI role dropdowns.
- Backend Edge Functions for provider callbacks, document encryption, OCR/ML classification, human approval workflows, immutable journal posting, reconciliation and alerts.
- Independent assurance: data protection, penetration testing, operational resilience, record retention, payment/lending permissions, fair collections and consumer recourse.
