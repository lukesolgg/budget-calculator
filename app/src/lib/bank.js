// Frontend client for the "bank" Edge Function (GoCardless Open Banking).
// All requests carry the user's username+PIN; the function verifies them.
import { SUPABASE_FN } from "./accounts.js";

const FN = `${SUPABASE_FN}/bank`;

async function call(action, session, extra = {}) {
  if (!session) return { ok: false, error: "auth_required" };
  let res, data;
  try {
    res = await fetch(FN, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, username: session.username, pin: session.pin, ...extra }),
    });
    data = await res.json().catch(() => ({}));
  } catch (e) {
    return { ok: false, error: "network", message: String(e) };
  }
  return { ok: res.ok, status: res.status, ...data };
}

export const bank = {
  institutions: (s) => call("institutions", s),
  start: (s, name, country) => call("start", s, { name, country }),
  finish: (s, code) => call("finish", s, { code }),
  data: (s) => call("data", s),
  disconnect: (s) => call("disconnect", s),
};
