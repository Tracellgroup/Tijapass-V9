# V8 GitHub + Netlify — 6 steps

1. Download `TijaPass_V8_Customer_Growth.zip` and extract it.
2. In GitHub make a **new repo** called `Tijapass-V8`. Keep existing V7 repository and Netlify site untouched.
3. Open the extracted `TijaPass_V8_Customer_Growth` folder and upload the **contents** (`src`, `public`, `package.json`, etc.) to the root of the new repo. Commit.
4. In Netlify **Add new project → Import from GitHub → Tijapass-V8**. Build command `npm run build`, publish directory `dist`.
5. After Netlify displays **Published**, customize its name to `tijapass-v8` if available. The exact final URL depends on availability.
6. Test: customer dashboard EN/SW → Record Sale → Record Expense → Statements → Help → submit ticket → TFL Admin Help → reply → Customer Help → Plans → request Plus → TFL Admin Plans.

Troubleshooting: if a deploy fails, open **Netlify → Deploys → failed deployment → Deploy log**. Copy the first specific error and avoid replacing the V7 files. Leave `VITE_SUPABASE_*` unset unless a real backend integration is implemented; variables alone do not connect this demo to Supabase.

**Important:** This is a demonstration with local browser data. Never enter real identity or financial data or activate real payment processing on V8 as-is.
