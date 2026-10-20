# TijaPass V4 Supabase implementation notes

The React V4 package runs immediately with browser persistence so every workflow can be demonstrated and tested without credentials. For production, replace browser state with the normalized Supabase schema in `schema.sql`.

Minimum production implementation:
1. Supabase Auth for customer, TFL, FI and supplier users.
2. Organization membership + role-based RLS.
3. Private Storage buckets for customer photographs, IDs, invoices and delivery evidence.
4. Use the atomic `post_wallet_transfer` RPC (or an equivalent Edge Function) for internal transfers. Never update wallet balances directly from browser code.
5. Create server-side jobs/Edge Functions for due-date standing instructions, reminders, arrears warnings, fee charging and reconciliation.
6. Connect actual cash-in/out only through approved bank/mobile-money/payment-provider APIs. Keep provider secrets server-side.
7. Add maker-checker approval for sensitive TFL/FI actions and transaction limits.
8. Encrypt/limit sensitive identity fields and maintain audit logs/retention rules.

The provided RLS policies are a safe baseline, not a substitute for a final security review. FI customer access should additionally be filtered through valid consent + `fi_access_grants` before detailed finance information is returned.
