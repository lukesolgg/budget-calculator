// Anonymous accounts (username + PIN) via Supabase, with a local-browser
// fallback so the app works even before keys are configured.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://umhhhlfkolxzykkzvhte.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KTqjrDktSE7Ns6IhSE7gbQ_pcrHBrzT";

export const useSupabase = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
const sb = useSupabase ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// --- local fallback helpers ---
const lsAccounts = () => { try { return JSON.parse(localStorage.getItem("dfp_accounts") || "{}"); } catch { return {}; } };
const lsSave = (a) => localStorage.setItem("dfp_accounts", JSON.stringify(a));
const lsHash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return "h" + h; };

export const backend = {
  async signup(username, pin, data) {
    if (useSupabase) {
      const { data: r, error } = await sb.rpc("signup_account", { p_username: username, p_pin: pin, p_data: data });
      if (error) return { ok: false, error: error.message };
      if (r === "EXISTS") return { ok: false, error: "That username is taken — try another or sign in." };
      return { ok: true };
    }
    const accts = lsAccounts();
    if (accts[username]) return { ok: false, error: "That username is taken — try another or sign in." };
    accts[username] = { pin: lsHash(pin), data }; lsSave(accts);
    return { ok: true };
  },
  async login(username, pin) {
    if (useSupabase) {
      const { data: r, error } = await sb.rpc("login_account", { p_username: username, p_pin: pin });
      if (error) return { ok: false, error: error.message };
      if (r === "BAD") return { ok: false, error: "Wrong username or PIN." };
      return { ok: true, data: r };
    }
    const a = lsAccounts()[username];
    if (!a || a.pin !== lsHash(pin)) return { ok: false, error: "Wrong username or PIN." };
    return { ok: true, data: a.data };
  },
  async changePin(username, oldPin, newPin) {
    if (useSupabase) {
      const { data: r, error } = await sb.rpc("change_pin", { p_username: username, p_old_pin: oldPin, p_new_pin: newPin });
      if (error) return { ok: false, error: error.message };
      if (r === "BAD") return { ok: false, error: "Current PIN is wrong." };
      return { ok: true };
    }
    const accts = lsAccounts(); const a = accts[username];
    if (!a || a.pin !== lsHash(oldPin)) return { ok: false, error: "Current PIN is wrong." };
    a.pin = lsHash(newPin); lsSave(accts);
    return { ok: true };
  },
  async save(username, pin, data) {
    if (useSupabase) {
      const { data: r, error } = await sb.rpc("save_data", { p_username: username, p_pin: pin, p_data: data });
      if (error) return { ok: false, error: error.message };
      if (r === "BAD") return { ok: false, error: "Session expired — please sign in again." };
      return { ok: true };
    }
    const accts = lsAccounts(); const a = accts[username];
    if (!a || a.pin !== lsHash(pin)) return { ok: false, error: "Session expired — please sign in again." };
    a.data = data; lsSave(accts);
    return { ok: true };
  },
};
