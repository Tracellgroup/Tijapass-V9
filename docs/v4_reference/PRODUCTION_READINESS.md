# TijaPass V4 Production Readiness

V4 closes the product-design and workflow gaps in the application package. The final production work is infrastructure/integration rather than business-flow redesign.

## Required before real customers / real money

1. **Supabase backend**
   - Run/review `supabase/schema.sql`.
   - Replace browser/localStorage state with database CRUD/RPC calls.
   - Use Supabase Auth and membership roles.

2. **Authentication and access**
   - Customer, TFL, FI and supplier accounts.
   - MFA/strong authentication for TFL and FI privileged roles.
   - FI detailed customer queries must require valid consent + access grant.

3. **Sensitive files**
   - Store profile photo, ID, invoices and delivery evidence in private buckets.
   - Signed URLs only; do not expose public bucket URLs for identity documents.

4. **Wallet integrity**
   - No browser-side balance updates.
   - All internal transfers through server-side atomic function/Edge Function.
   - Idempotency keys, maker-checker, transaction limits and reversal workflows.
   - Daily reconciliation of cached wallet balance against wallet entries.

5. **External cash rails**
   - Integrate approved bank/mobile-money/payment-provider APIs.
   - Secrets in server-side environment only.
   - Use callback/webhook verification, idempotency and reconciliation.
   - Do not claim a cash-in/out succeeded until provider settlement confirms it.

6. **Standing orders / reminders**
   - Scheduled server job/Edge Function checks due schedules daily.
   - Generate reminder windows and overdue alerts.
   - Execute repayment only within the signed customer mandate and permitted rules.

7. **Financial data quality**
   - Bank/mobile imports reconciled against provider IDs.
   - Supplier documents linked to transactions.
   - Manual/cash records require evidence/verification status before scoring.
   - Lock historical accounting records after reconciliation; corrections use adjustments, not silent edits.

8. **Security/operations**
   - Penetration/security testing.
   - Backups and restore test.
   - Audit-log retention.
   - Incident response and support workflow.
   - Privacy/consumer-disclosure/legal review before launch.

## Suggested low-cost stack
- GitHub: source control.
- Netlify: PWA/web deployment.
- Supabase: PostgreSQL, Auth, Storage and Edge Functions.
- Email initially for notifications; add SMS/WhatsApp only when needed.
- Mobile-money/bank APIs only when commercial/technical credentials are available.
