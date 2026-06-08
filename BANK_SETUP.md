# Bank linking (Open Banking via Enable Banking) — setup

Connects a user's UK bank **read-only** (balances + transactions) through
**Enable Banking**, which is **free for personal / non-commercial use**. Enable
Banking is the regulated provider, so Orcl. rides their licence. Secrets live in
a **Supabase Edge Function** — never in the frontend.

Everything is coded already (`supabase/functions/bank/`, `app/src/lib/bank.js`,
the "Connected banks" card in Settings). You do the steps below.

## 1. Create an Enable Banking application
1. Sign up at **https://enablebanking.com/** → open the **Control Panel**.
2. **Applications → New application**:
   - **Environment**: start with **Sandbox** (real-bank "Production" later).
   - **Redirect URLs**: add exactly `https://lukesolgg.github.io/budget-calculator/`
   - It generates an **Application ID** and lets you **download a private key** (`.pem`). Keep that file safe.
3. Note the **Application ID** (a UUID).

## 2. Create the storage table (Supabase → SQL editor → run)
```sql
create table if not exists public.bank_data (
  username     text primary key,
  session_id   text,
  accounts     jsonb,
  transactions jsonb,
  status       text,
  updated_at   timestamptz not null default now()
);
alter table public.bank_data enable row level security;
-- No policies: only the Edge Function (service role) touches it.
```

## 3. Base64-encode the private key
The private key is multi-line, so we store it base64-encoded:
```bash
base64 -w0 your_private_key.pem      # Linux
base64 -i your_private_key.pem       # macOS
```
Copy the single-line output.

## 4. Set the function secrets
```bash
supabase secrets set \
  EB_APP_ID=your_application_id \
  EB_PRIVATE_KEY_B64=the_base64_blob_from_step_3 \
  EB_REDIRECT=https://lukesolgg.github.io/budget-calculator/
```
(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` are injected
automatically.)

## 5. Deploy the function
```bash
supabase functions deploy bank --no-verify-jwt
```
Live at `https://umhhhlfkolxzykkzvhte.supabase.co/functions/v1/bank`.
(`--no-verify-jwt` because we authenticate with our own username+PIN inside the
function, not Supabase Auth.)

## 6. Test
- Orcl. → **Settings → Connected banks → Connect a bank** → pick a **sandbox**
  bank → complete the fake consent → you're redirected back → the card finishes
  the link and shows accounts + transactions.
- Flip the app to **Production** (new app/keys) when you want real UK banks.

## Notes
- **Consent lasts ~90 days**, then the user re-links (standard Open Banking).
- The redirect comes back to the app root with `?code=…`; the app stashes it,
  opens Settings, and the Edge Function exchanges it for a session + data.
- Until steps 4–5 are done, the app shows "Bank linking isn't switched on yet"
  (`not_configured`) — nothing breaks.
- Free tier is for personal/non-commercial use; commercial use later needs their
  paid terms.
