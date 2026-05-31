# Enabling real cross-device accounts (Supabase)

The app works right now in **local mode** (accounts saved in the visitor's
browser). To turn on **real accounts that sync across devices** for you and your
friends, do the following one-time setup. Free tier is plenty.

## 1. Create a Supabase project
1. Go to https://supabase.com → sign up (free) → **New project**.
2. Pick a name + a database password (you won't need the password in the app).
3. Wait ~2 minutes for it to provision.

## 2. Run the database setup
In the Supabase dashboard → **SQL Editor** → **New query** → paste all of the
below → **Run**. This creates the accounts table, locks it down so nobody can
read it directly, and adds three secure functions the app calls.

```sql
-- PIN hashing (Supabase keeps extensions in the "extensions" schema)
create extension if not exists pgcrypto with schema extensions;

-- Accounts table: username + hashed PIN + their saved plan (JSON)
create table if not exists public.accounts (
  username   text primary key,
  pin_hash   text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Lock the table: no direct access from the public/anon key.
alter table public.accounts enable row level security;
-- (No policies = no direct select/insert/update/delete. Only the
--  SECURITY DEFINER functions below can touch the table.)

-- Sign up: returns 'OK' or 'EXISTS'
create or replace function public.signup_account(p_username text, p_pin text, p_data jsonb)
returns text language plpgsql security definer set search_path = public, extensions as $$
begin
  if exists (select 1 from accounts where username = lower(p_username)) then
    return 'EXISTS';
  end if;
  insert into accounts(username, pin_hash, data)
  values (lower(p_username), crypt(p_pin, gen_salt('bf')), coalesce(p_data, '{}'::jsonb));
  return 'OK';
end; $$;

-- Log in: returns the saved data (jsonb) or 'BAD' if wrong username/PIN
create or replace function public.login_account(p_username text, p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare rec accounts;
begin
  select * into rec from accounts where username = lower(p_username);
  if not found or rec.pin_hash <> crypt(p_pin, rec.pin_hash) then
    return '"BAD"'::jsonb;
  end if;
  return rec.data;
end; $$;

-- Save: returns 'OK' or 'BAD'
create or replace function public.save_data(p_username text, p_pin text, p_data jsonb)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare rec accounts;
begin
  select * into rec from accounts where username = lower(p_username);
  if not found or rec.pin_hash <> crypt(p_pin, rec.pin_hash) then
    return 'BAD';
  end if;
  update accounts set data = p_data, updated_at = now() where username = lower(p_username);
  return 'OK';
end; $$;

-- Allow the public (anon) key to CALL the functions (but not the table).
grant execute on function public.signup_account(text, text, jsonb) to anon;
grant execute on function public.login_account(text, text)         to anon;
grant execute on function public.save_data(text, text, jsonb)      to anon;
```

## 3. Paste your keys into the app
In the Supabase dashboard → **Project Settings → API**, copy:
- **Project URL** (e.g. `https://abcd1234.supabase.co`)
- **anon public** key

Open `index.html`, find this near the bottom of the script:

```js
const SUPABASE_URL = "";       // <-- paste Project URL here
const SUPABASE_ANON_KEY = "";  // <-- paste anon public key here
```

Fill both in, save, commit & push. Done — accounts now sync across devices.

## Notes
- The anon key is *safe* to ship in the frontend — that's what it's for. Row-
  level security means it can only call the three functions, never read the
  table directly, and PINs are stored only as bcrypt hashes.
- This is an anonymous model (username + PIN, no email). If someone forgets
  their PIN there's no automated reset — that's the trade-off for no email.
