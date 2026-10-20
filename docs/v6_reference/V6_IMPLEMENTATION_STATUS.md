# TijaPass V6 — implemented versus pending

| Feature | Actual position in this ZIP |
|---|---|
| Role-based product ecosystem | Existing V4/V5 browser demo retained. Role selector is not secure login. |
| Brand | Two cropped original user-provided logo variants, layout CSS and icon assets updated. |
| Language | Header/nav + core accounting functions support English and Kiswahili. Remaining older feature screens still need complete translations. |
| Three methods | Functional guided form / plain-English-or-Kiswahili entry / CSV-TSV-basic XLSX statement upload. |
| Cash and self-reported bank/mobile | Recorded as customer-declared evidence; not bank authenticated. |
| Payer/receiver & purpose | Mandatory before submitting new entries and before customer confirmation of imports. |
| Abnormality detection | Relative amount anomaly based on posted history; TFL reason and approval required. This is a baseline heuristic, NOT financial-crime detection. |
| Duplicates | Exact same-source fingerprints skipped; cross-source potential matches flagged; TFL can link evidence without creating a second journal. Heuristic not perfect. |
| Import verification | Each imported entry requires customer or recorded TFL-assisted confirmation. TFL approval is separate. |
| Accounting logic | Rule-assist classification plus deterministic double entry for core categories. No LLM / bank API / true continuous learning model. |
| Statements | Generated from TFL-posted journal with illustrative, separately configured opening balances. Not audited, not fully IFRS-accrual compliant. |
| Stock and cost of sales | Separate in the journal; production needs invoice/inventory count and costing systems. |
| Repayments and transfers | Principal/interest split and own-account transfers in the general ledger, not new revenue. |
| Cash reconciliation | Manual comparison & negative-account warnings; not connected to external provider confirmation. |
| Identity, privacy, real bank import APIs | Requires secure production backend, provider agreements, customer consent, encryption, role-based policies. |
| V6 ↔ V4 finance/wallet linkage | Not complete. Finance workflows and wallet events remain demo scenario logic, not server-posted real ledger events. |
| Full installation build | Requires Netlify/npm; source parsed and unit tests run, dependency installation unavailable in authoring environment. |

**For BOT:** Demonstrate the flows as a strong interaction and accounting-control prototype. Do not claim that the model is independently certified, handles real money, automatically imports from banks, or autonomously produces audited statements.
