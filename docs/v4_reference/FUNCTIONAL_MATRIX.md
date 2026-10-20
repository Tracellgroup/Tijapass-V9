# TijaPass V4 Functional Matrix

| Requirement | V4 implementation |
|---|---|
| TFL manages MSME recruitment, training, accuracy and monitoring | Onboarding/KYC workflow, assigned TFL officer, training status, monitoring score, verification and audit trail |
| TFL compulsory FI information-view fee | FI cannot unlock a customer profile until view fee is posted from FI wallet to TFL wallet; TFL exempt internally |
| TFL % disbursement fee | Separate FI → TFL wallet fee posted at successful disbursement |
| Optional collection fee | Loan can use TFL collection service; collection fee posted when standing-order collection runs |
| TFL can act as FI | TFL is registered as FI-TFL with product and TFL treasury wallet |
| Customer must operate through app to qualify | Limit becomes zero unless KYC, reliable data coverage, minimum verified transactions and operating history thresholds are satisfied |
| Customer sees limit and full loan economics | Dynamic limit + rate + interest amount + fees + total repayment + installment + schedule |
| Reliable financial statements | Statements use completed reliable ledger sources; unverified manual records are excluded |
| Multiple financial institutions | Separate FI records, wallets, products, customer access grants and portfolio views |
| FI sets rate/fees and funds wallet | Product/pricing screen + offer pricing + funding wallet controls |
| Normal loan disbursement to supplier | Enforced supplier-direct route with invoice requirement |
| Special customer-wallet disbursement | Product must allow it and TFL must explicitly approve exception |
| Supplier quotation/order/invoice/delivery | Full linked workflow in Supplier Operations |
| Supplier wallet | Deposit, withdraw, supplier-to-supplier transfer; finance-linked refund to FI only |
| Customer business income/expenses | Transaction ledger supports income/expense categories and wallet-linked data sources |
| Bank/mobile-money linkage | Channel profiles and cash-in/out workflow; production API credentials deliberately externalized |
| Standing repayment instruction | Loan schedule + standing-order processing + due-date logic |
| Restrict withdrawal if overdue | Due/overdue amount reserved; available balance remains withdrawable instead of blanket freeze |
| Deposits/withdrawals for each entity | Customer, supplier, FI and TFL wallet screens support cash-in/out workflow |
| Reminders/warnings | Automatic in-app due/overdue, low-FI-wallet and pending-data alerts plus event-driven notifications |
| Auditability | Audit trail, wallet references, finance IDs, supplier IDs and customer IDs link major actions |
| Production security | Supabase Auth/RLS baseline, server-only wallet transfer RPC, no direct client balance update design |
