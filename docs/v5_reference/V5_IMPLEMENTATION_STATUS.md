# V5: What works / what does not

| Area | In downloadable source? | Correct interpretation |
|---|---|---|
| V4 role-based UI, workflows, wallets | Yes | Browser-persisted scenario; money not real |
| Simple English/Kiswahili descriptions | Yes | Transparent pattern recognition and approved-feedback memory; NOT a cloud AI model |
| CSV / TSV / basic XLSX import | Yes | Client-side; depends on browser support and statement export format; verify file mapping |
| Native PDF extraction / receipt OCR | Partial | Photo capture, visual preview, optional experimental browser TextDetector; reliable OCR/PDF extraction requires backend |
| Voice dictation | Conditional | Depends on device/browser and vendor speech engine |
| True M-Pesa / SimBanking APIs | No | Requires provider consent, contracts and secure backend |
| Manual + file sources to staging | Yes | Not authentic financial evidence until reviewed/reconciled |
| Automatic classification proposals | Yes | Explainable heuristics; confidence is a **design indicator, not calibrated probability** |
| Duplicate and running-balance checks | Yes | Basic detection, not exhaustive anti-fraud system |
| TFL review, learning from corrections | Yes | In-browser only; not multi-user secure approver identity |
| Balanced general ledger | Yes | Deterministic verified double-entry construction; browser storage only |
| Inventory buys vs COGS | Yes | Different accounts; COGS entry still needs stock/valuation evidence |
| Sales/expenses/loan/transfer accounting | Yes | With correct category and account selected by reviewer |
| Opening position and statement reconciliations | Partly | Opening manual snapshots and manually entered closing comparisons; no bank API verification |
| Management P&L / cashflow / business position | Yes | Derived from Accounting Studio journals; completeness depends on opening and all source transactions |
| Data-quality gating of finance readiness | Yes | New separate experimental checklist; V4 loan credit scenario not yet migrated to it |
| Secure production ledger / server role approvals | Schema design only | Needs transaction RPC, backend authentication, maker-checker and security tests |
| FI permission before financial evidence viewing | Demo UI check | Backend RLS/consent/access fee enforcement still required |
| Receipts securely stored | No | Photo preview is session-only and not a document repository |
| Full IFRS/accrual reporting | No | Requires stock counts, AR/AP accruals, assets, depreciation, cut-off and periodic close |
| Multi-company real-time financial integration | No | Production implementation phase |

**Conclusion:** V5 is an accounting-oriented, developer/BOT demonstration with a working transaction-import and double-entry prototype. It is NOT ready for actual customer deposits, disbursements, regulatory acceptance or reliance on financial statements without external reconciliations and backend implementation.
