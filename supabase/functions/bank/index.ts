// Supabase Edge Function: "bank"  (Enable Banking — Open Banking, free for personal use)
// Secrets never reach the frontend. Auth = an RS256 JWT signed with your app's
// private key.
//
// Actions (POST JSON { action, username, pin, ... }):
//   institutions            -> list UK banks (name, country, logo)
//   start { name, country }  -> begin consent, return { link }
//   finish { code }          -> after the bank redirect, fetch accounts + transactions, store
//   data                     -> return the stored accounts + transactions
//   disconnect               -> forget the connection
//
// Required function secrets:
//   EB_APP_ID            (Enable Banking application id — used as the JWT `kid`)
//   EB_PRIVATE_KEY_B64   (base64 of your downloaded PEM private key)
//   EB_REDIRECT          (a redirect URL registered in the EB app — your live app URL)
// Auto-provided by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

const EB = "https://api.enablebanking.com";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const EB_APP_ID = Deno.env.get("EB_APP_ID") ?? "";
const EB_PRIVATE_KEY_B64 = Deno.env.get("EB_PRIVATE_KEY_B64") ?? "";
const EB_REDIRECT = Deno.env.get("EB_REDIRECT") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "content-type": "application/json" } });

// --- base64url + key helpers ---
const b64url = (bytes: Uint8Array) => {
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
function pemToDer(pem: string) {
  const body = pem.replace(/-----BEGIN [^-]+-----/, "").replace(/-----END [^-]+-----/, "").replace(/\s+/g, "");
  const bin = atob(body); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
let keyPromise: Promise<CryptoKey> | null = null;
function privateKey() {
  if (!keyPromise) {
    const pem = atob(EB_PRIVATE_KEY_B64);
    keyPromise = crypto.subtle.importKey("pkcs8", pemToDer(pem), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  }
  return keyPromise;
}
async function ebJwt() {
  const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const now = Math.floor(Date.now() / 1000);
  const head = enc({ typ: "JWT", alg: "RS256", kid: EB_APP_ID });
  const body = enc({ iss: "enablebanking.com", aud: "api.enablebanking.com", iat: now, exp: now + 3600 });
  const sig = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, await privateKey(), new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(new Uint8Array(sig))}`;
}
async function eb(path: string, init: RequestInit = {}) {
  const jwt = await ebJwt();
  const r = await fetch(`${EB}${path}`, { ...init, headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json", ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`Enable Banking ${path} (${r.status}): ${await r.text().catch(() => "")}`.slice(0, 300));
  return r.json();
}

// --- Supabase + auth ---
async function sb(path: string, init: RequestInit = {}) {
  return fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SB_SERVICE, authorization: `Bearer ${SB_SERVICE}`, "content-type": "application/json", ...(init.headers || {}) } });
}
async function verify(username: string, pin: string) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/login_account`, {
    method: "POST", headers: { apikey: SB_ANON, authorization: `Bearer ${SB_ANON}`, "content-type": "application/json" },
    body: JSON.stringify({ p_username: username, p_pin: pin }),
  });
  if (!r.ok) return false;
  return (await r.json()) !== "BAD";
}
async function getRow(u: string) { const r = await sb(`bank_data?username=eq.${encodeURIComponent(u)}&select=*`); return (await r.json())[0] || null; }
async function upsertRow(u: string, patch: Record<string, unknown>) {
  await sb(`bank_data?on_conflict=username`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ username: u, updated_at: new Date().toISOString(), ...patch }) });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!EB_APP_ID || !EB_PRIVATE_KEY_B64) return json({ error: "not_configured", message: "Bank linking isn't switched on yet." }, 503);

  let body: any; try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const { action, username, pin } = body || {};
  if (!username || !pin) return json({ error: "auth_required" }, 401);
  if (!(await verify(username, pin))) return json({ error: "unauthorized" }, 401);

  try {
    if (action === "institutions") {
      // We're a UK app: show GB + Ireland banks. We filter client-side on the
      // full list (the API's country filter proved unreliable). Any sandbox
      // "mock/test" bank is always kept so testing works before going live.
      const r = await eb(`/aspsps`);
      const wanted = new Set(["GB", "IE"]);
      const list = (r.aspsps || [])
        .filter((a: any) => wanted.has(a.country) || /mock|sandbox|test|fake/i.test(a.name || ""))
        .map((a: any) => ({ name: a.name, country: a.country, logo: a.logo }))
        .sort((a: any, b: any) => (a.country === b.country ? a.name.localeCompare(b.name) : a.country.localeCompare(b.country)));
      return json({ institutions: list });
    }

    if (action === "start") {
      const validUntil = new Date(Date.now() + 89 * 864e5).toISOString();
      const r = await eb(`/auth`, {
        method: "POST",
        body: JSON.stringify({ access: { valid_until: validUntil }, aspsp: { name: body.name, country: body.country || "GB" }, state: crypto.randomUUID(), redirect_url: EB_REDIRECT, psu_type: "personal" }),
      });
      return json({ link: r.url });
    }

    if (action === "finish") {
      if (!body.code) return json({ error: "no_code" }, 400);
      const session = await eb(`/sessions`, { method: "POST", body: JSON.stringify({ code: body.code }) });
      const accs = session.accounts || [];
      const accounts: any[] = [];
      const transactions: any[] = [];
      const dateFrom = new Date(Date.now() - 89 * 864e5).toISOString().slice(0, 10);
      for (const a of accs) {
        const uid = typeof a === "string" ? a : a.uid;
        const meta = typeof a === "string" ? {} : a;
        try {
          const [bal, txns] = await Promise.all([
            eb(`/accounts/${uid}/balances`).catch(() => ({})),
            eb(`/accounts/${uid}/transactions?date_from=${dateFrom}`).catch(() => ({ transactions: [] })),
          ]);
          accounts.push({ id: uid, name: meta.name || meta.product || meta.account_id?.iban || "Account", iban: meta.account_id?.iban || "", balances: (bal?.balances || []).map((b: any) => ({ amount: b.balance_amount?.amount, currency: b.balance_amount?.currency, type: b.balance_type })) });
          for (const t of (txns?.transactions || []).slice(0, 200)) {
            const amt = parseFloat(t.transaction_amount?.amount || "0");
            const signed = t.credit_debit_indicator === "DBIT" ? -Math.abs(amt) : Math.abs(amt);
            transactions.push({ accountId: uid, id: t.entry_reference || t.transaction_id || crypto.randomUUID(), date: t.booking_date || t.value_date, amount: signed, currency: t.transaction_amount?.currency, name: t.creditor?.name || t.debtor?.name || (t.remittance_information || [])[0] || "Transaction" });
          }
        } catch (_) { /* skip a failing account */ }
      }
      await upsertRow(username, { session_id: session.session_id || null, accounts, transactions, status: "linked" });
      return json({ accounts, count: transactions.length });
    }

    if (action === "data") {
      const row = await getRow(username);
      return json({ accounts: row?.accounts || null, transactions: row?.transactions || null, updatedAt: row?.updated_at || null });
    }

    if (action === "disconnect") {
      await sb(`bank_data?username=eq.${encodeURIComponent(username)}`, { method: "DELETE" });
      return json({ ok: true });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e: any) {
    return json({ error: "provider_error", message: String(e?.message || e) }, 502);
  }
});
