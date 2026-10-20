# TijaPass V4 Release Notes

V4 is a full functional redesign around the TijaPass ecosystem concept rather than a simple loan/wallet interface.

Major changes from V3:
- Complete TFL-led onboarding/KYC/training/monitoring workflow.
- Mobile camera/profile photo and ID capture inputs.
- NIDA, DOB, phone, addresses and consent controls.
- Ability to register new MSMEs, FIs and suppliers.
- Multiple FI architecture with separate institution wallets and finance products.
- TFL also operates as an FI.
- Compulsory FI information-view fee and TFL billing ledger.
- FI-specific interest rates, fees, terms and transparent customer offers.
- Reducing-balance repayment schedule with interest/fee breakdown.
- Supplier-direct default disbursement; controlled customer-wallet exception.
- Full supplier quotation → PO → invoice → payment → delivery lifecycle.
- Delivered asset/inventory values update the monitored business position.
- Business Ledger separated correctly from internal wallet balance to avoid double-counting linked bank/mobile transactions.
- Financial statements generated from reliable records, with source provenance.
- Manual/cash entries require TFL verification before statement/score use.
- Credit limit is gated by verified identity, data coverage, transaction volume and operating history.
- Customer business wallet supports business income/expense settlement, cash-in/out, repayment and linked-channel workflows.
- Supplier wallet supports supplier-to-supplier transfers and finance-linked FI refunds only.
- FI wallet must be funded before disbursement.
- Repayment reserve protects only due/overdue amount instead of blanket wallet freezing.
- Standing-order repayment processing, TFL collection fee and automatic alerts.
- Automated due/overdue, low funding-wallet and pending-data warnings.
- Supabase normalized production schema, Auth/RLS baseline and server-only atomic wallet transfer function.
- Netlify/PWA deployment retained.
