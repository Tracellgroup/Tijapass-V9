# V9 GitHub → Netlify (keep V8 unchanged)

1. Download and extract `TijaPass_V9_Unified_Credit.zip`.
2. Create **new** GitHub repo `Tijapass-V9`.
3. Upload the contents INSIDE the extracted `TijaPass_V9_Unified_Credit` folder to repository root.
4. Click **Commit changes**.
5. Netlify → Add new project → Import an existing project → GitHub → choose `Tijapass-V9`.
6. Build command `npm run build`; publish directory `dist` (already in `netlify.toml`).
7. Name the site `tijapass-v9` if available, then publish. Verify on browser and phone.
8. To test: choose Customer → Finance → Existing external debts. Submit sample loan; change role to TFL Admin → Finance → select same customer → TFL review, edit with reason → return to Customer. Confirm same debt reduces shown capacity, and review the tracker and instalment schedule.
9. For a positive scoring example, have TFL review sufficient authentic-like test journal entries in three distinct months from Smart Accounting; V4 seed transactions alone intentionally do NOT produce finance eligibility.
10. Keep V7/V8 sites separate. V9 uses a separate localStorage key and does not change those projects.

**Important:** This is not yet a secure multi-user system. The role selector is a demonstration. The Supabase migration is a reference, not a deployed database integration. No real money may flow through this demo.
