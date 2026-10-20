# TijaPass V4 Architecture — Key Design Decisions

## 1. Wallet and Business Ledger are related but not identical

The **TijaPass Wallet** holds/settles internal TijaPass balances. The **Business Ledger** is the complete source of business activity used for statements and scoring.

A sale paid directly into the TijaPass Wallet changes the wallet balance and the business ledger.

A sale received into a linked bank or mobile-money account is **imported into the Business Ledger but does not automatically increase the TijaPass Wallet**. If the customer later transfers that money into TijaPass, the cash-in is a balance transfer, not a second sale. This prevents double counting.

Likewise, a rent payment imported from a linked bank is an expense in the Business Ledger but does not reduce the TijaPass Wallet unless it was actually paid from that wallet.

## 2. Statement source hierarchy

1. TijaPass internal wallet transactions — automatically reliable.
2. Linked bank transactions — reliable after provider import/reconciliation.
3. Linked mobile-money transactions — reliable after provider import/reconciliation.
4. Supplier workflow — quotation/order/invoice/delivery evidence.
5. Manual/cash entries — excluded until TFL verification.

## 3. Financial statements

The V4 operating statement is transaction-based for practicality with informal MSMEs. Current inventory, receivables, payables and business assets are separately monitored and included in the business-position statement.

For statutory/accrual financial reporting, additional period-end adjustments (inventory counts, depreciation, accruals, tax, ECL, etc.) should be made outside the automated credit-management statement or added as a controlled accounting module.

## 4. Credit score and limit

The credit profile uses verified identity, reliable transaction coverage, repayment behaviour, operating profitability, operating history and TFL monitoring quality. A customer with inadequate KYC/data/operating history receives a zero indicative limit even if self-declared business values appear strong.

## 5. Wallet integrity

Browser state is only the functional V4 test environment. Production wallets require server-side atomic transactions, immutable transaction references, double-entry wallet entries, idempotency, reconciliation and no direct browser balance updates. The Supabase schema provides this baseline.

## 6. External cash

Bank/mobile-money connections are external settlement rails. Provider confirmation must occur before cash-in/out is marked successful in production. API keys/secrets belong only on the server/Edge Function side.
