# Publish V7 without touching existing V6

1. Download and unzip. Open `TijaPass_V7_AI_Accounting`.
2. Create a **new** GitHub repo, e.g. `Tijapass-V7`, and upload its contents at repository root (`src`, `public`, `package.json`, `netlify.toml`, etc.). Commit.
3. Netlify → Add new project → Import from GitHub → select `Tijapass-V7`.
4. Netlify build settings `npm run build`; publish directory `dist`. Choose an available site name, e.g. `tfltijapass7`.
5. Once Netlify says **Published**, open the new URL and hard-refresh. Test Customer (EN/SW), TFL Admin, Accounting, and statements; keep V6 intact.
6. If deploy fails, open Deploys → Failed deploy → Deploy log; copy the red error. Do not upload real customer data.

Adding Supabase environment variables alone does NOT make this browser demo production-connected. Database migration and frontend/backend adapters must be implemented separately.
