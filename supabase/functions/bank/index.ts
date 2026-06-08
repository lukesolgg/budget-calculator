// Supabase Edge Function: "bank"
// Securely talks to GoCardless Bank Account Data (Open Banking) on behalf of an
// Orcl. user. The frontend never sees the GoCardless secrets — they live here.
//
// Actions (POST JSON { action, username, pin, ... }):
//   institutions          -> list UK banks (id, name, logo)
//   start { institutionId } -> create a consent requisition, return { link }
//   finish                -> after the user returns, fetch accounts + transactions, store
//   data                  -> return the stored accounts + transactions
//   disconnect            -> forget the connection
//
// Required function secrets (supabase secrets set ...):
//   GC_SECRET_ID, GC_SECRET_KEY   (from GoCardless Bank Account Data)
//   GC_REDIRECT                   (URL the bank sends the user back to — your live app URL)
// Auto-provided by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

const GC = "https://bankaccountdata.gocardless.com/api/v2";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const GC_SECRET_ID = Deno.env.get("GC_SECRET_ID") ?? "";
const GC_SECRET_KEY = Deno.env.get("GC_SECRET_KEY") ?? "";
const GC_REDIRECT = Deno.env.get("GC_REDIRECT") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

// --- Supabase REST helpers (service role: bypasses RLS) ---
async function sb(path: string, init: RequestInit = {}) {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SB_SERVICE, authorization: `Bearer ${SB_SERVICE}`, "content-type": "application/json", ...(init.headers || {}) },
  });
}

// Verify the anonymous user's username+PIN via the existing login RPC.
async function verify(username: string, pin: string) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/login_account`, {
    method: "POST",
    headers: { apikey: SB_ANON, authorization: `Bearer ${SB_ANON}`, "content-type": "application/json" },
    body: JSON.stringify({ p_username: username, p_pin: pin }),
  });
  if (!r.ok) return false;
  const data = await r.json();
  return data !== "BAD";
}

// --- GoCardless helpers ---
async function gcToken() {
  const r = await fetch(`${GC}/token/new/`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ secret_id: GC_SECRET_ID, secret_key: GC_SECRET_KEY }),
  });
  if (!r.ok) throw new Error(`GoCardless token failed (${r.status})`);
  return (await r.json()).access as string;
}
async function gc(token: string, path: string, init: RequestInit = {}) {
  const r = await fetch(`${GC}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json", ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`GoCardless ${path} failed (${r.status})`);
  return r.json();
}

async function getRow(username: string) {
  const r = await sb(`bank_data?username=eq.${encodeURIComponent(username)}&select=*`);
  const rows = await r.json();
  return rows[0] || null;
}
async function upsertRow(username: string, patch: Record<string, unknown>) {
  await sb(`bank_data?on_conflict=username`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ username, updated_at: new Date().toISOString(), ...patch }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!GC_SECRET_ID || !GC_SECRET_KEY) return json({ error: "not_configured", message: "Bank linking isn't switched on yet." }, 503);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const { action, username, pin } = body || {};
  if (!username || !pin) return json({ error: "auth_required" }, 401);
  if (!(await verify(username, pin))) return json({ error: "unauthorized" }, 401);

  try {
    if (action === "institutions") {
      const token = await gcToken();
      const list = await gc(token, `/institutions/?country=gb`);
      return json({ institutions: list.map((i: any) => ({ id: i.id, name: i.name, logo: i.logo })) });
    }

    if (action === "start") {
      const token = await gcToken();
      const reference = `${username}-${crypto.randomUUID().slice(0, 8)}`;
      const reqn = await gc(token, `/requisitions/`, {
        method: "POST",
        body: JSON.stringify({ redirect: GC_REDIRECT, institution_id: body.institutionId, reference, user_language: "EN" }),
      });
      await upsertRow(username, { requisition_id: reqn.id, ref: reference, accounts: null, transactions: null });
      return json({ link: reqn.link, requisitionId: reqn.id });
    }

    if (action === "finish") {
      const row = await getRow(username);
      if (!row?.requisition_id) return json({ error: "no_link" }, 400);
      const token = await gcToken();
      const reqn = await gc(token, `/requisitions/${row.requisition_id}/`);
      const accounts: any[] = [];
      const transactions: any[] = [];
      for (const id of reqn.accounts || []) {
        try {
          const [details, balances, txns] = await Promise.all([
            gc(token, `/accounts/${id}/details/`).catch(() => ({})),
            gc(token, `/accounts/${id}/balances/`).catch(() => ({})),
            gc(token, `/accounts/${id}/transactions/`).catch(() => ({ transactions: {} })),
          ]);
          accounts.push({ id, name: details?.account?.name || details?.account?.ownerName || "Account", iban: details?.account?.iban || "", balances: (balances?.balances || []).map((b: any) => ({ amount: b.balanceAmount?.amount, currency: b.balanceAmount?.currency, type: b.balanceType })) });
          for (const t of (txns?.transactions?.booked || []).slice(0, 200)) {
            transactions.push({ accountId: id, id: t.transactionId || t.internalTransactionId, date: t.bookingDate || t.valueDate, amount: t.transactionAmount?.amount, currency: t.transactionAmount?.currency, name: t.creditorName || t.debtorName || t.remittanceInformationUnstructured || "Transaction" });
          }
        } catch (_) { /* skip an account that errors */ }
      }
      await upsertRow(username, { accounts, transactions, status: reqn.status });
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
  } catch (e) {
    return json({ error: "provider_error", message: String(e?.message || e) }, 502);
  }
});
