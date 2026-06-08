# Bank linking (Open Banking via GoCardless) — setup

This connects a user's UK bank **read-only** (balances + transactions) through
**GoCardless Bank Account Data**. GoCardless is the FCA-regulated provider, so
Orcl. rides their licence — you don't need your own FCA authorisation for
read-only account info. Secrets live in a **Supabase Edge Function**, never in
the frontend.

Everything is already coded (`supabase/functions/bank/`, `app/src/lib/bank.js`,
the "Connected banks" card in Settings). You just need to do the 5 steps below.

## 1. Get GoCardless Bank Account Data keys
1. Sign up: https://bankaccountdata.gocardless.com/ (free).
2. **Developers → User secrets → Create** → copy the **Secret ID** and **Secret Key**.
3. There's a built-in **sandbox bank** ("Sandbox Finance" / `SANDBOXFINANCE_SFIN0000`) to test with before real banks.

## 2. Create the storage table (Supabase → SQL editor → run)
```sql
create table if not exists public.bank_data (
  username       text primary key,
  requisition_id text,
  ref            text,
  accounts       jsonb,
  transactions   jsonb,
  status         text,
  updated_at     timestamptz not null default now()
);
alter table public.bank_data enable row level security;
-- No policies: only the Edge Function (service role) can read/write it.
```

## 3. Set the function secrets
In the repo root (with the Supabase CLI, `supabase login` + `supabase link` done):
```bash
supabase secrets set \
  GC_SECRET_ID=your_secret_id \
  GC_SECRET_KEY=your_secret_key \
  GC_REDIRECT=https://lukesolgg.github.io/budget-calculator/
```
(`GC_REDIRECT` is where the bank sends the user back — your live app URL.
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` are injected
automatically.)

## 4. Deploy the function
```bash
supabase functions deploy bank --no-verify-jwt
```
(`--no-verify-jwt` because we authenticate with our own username+PIN inside the
function via the existing `login_account` RPC, not Supabase Auth JWTs.)

It will be live at:
`https://umhhhlfkolxzykkzvhte.supabase.co/functions/v1/bank`

## 5. Test
- Open Orcl. → **Settings → Connected banks → Connect a bank** → pick
  **Sandbox Finance** → complete the fake consent → you'll be redirected back →
  it pulls accounts + transactions.
- Once happy, real UK banks appear in the same picker (GoCardless free tier).

## Notes
- **Consent lasts ~90 days**, then the user re-links (standard Open Banking).
- The frontend (`bank.js`) calls the function with the user's username+PIN; the
  function verifies them before doing anything, then mints a short-lived
  GoCardless token per request from your secrets.
- Until step 3/4 are done, the app shows "Bank linking isn't switched on yet"
  (the function returns `not_configured`) — nothing breaks.
- Free tier has rate limits (a few transaction pulls per account per day) — fine
  for personal use; we can add caching later.
