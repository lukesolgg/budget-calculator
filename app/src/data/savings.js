// ===========================================================================
// REFERENCE DATA — UK savings accounts. Shared by all users, read-only.
// NOT part of any user profile. Update `LAST_UPDATED` + rows when rates change.
// (Later this can move to a Supabase table read the same way; for now it's
// bundled so the app works offline and with zero backend cost.)
// All listed accounts are FSCS protected up to £85,000.
// ===========================================================================

export const SAVINGS_LAST_UPDATED = "2026-05-31";

// type: "Easy Access" | "Regular Saver" | "Fixed Rate" | "Cash ISA"
export const SAVINGS_ACCOUNTS = [
  {
    provider: "Cahoot", name: "Sunny Day Saver", type: "Easy Access",
    aer: 5.0, min: 1, max: 3000, access: "Unlimited withdrawals",
    bonus: false, termMonths: 12,
    notes: "12-month term, then the rate drops.",
  },
  {
    provider: "Chase", name: "Saver", type: "Easy Access",
    aer: 4.5, min: 1, max: 3000000, access: "Unlimited access",
    bonus: true, termMonths: 12,
    notes: "Bonus rate for new customers. Requires a Chase current account.",
  },
  {
    provider: "Tembo", name: "HomeSaver", type: "Easy Access",
    aer: 4.55, min: 10, max: 25000, access: "Easy access via app",
    bonus: true, termMonths: 12,
    notes: "Includes a 12-month bonus. Max around £20k–£25k.",
  },
  {
    provider: "Zopa", name: "Regular Saver", type: "Regular Saver",
    aer: 7.1, min: 0, max: 300, access: "Withdraw anytime",
    bonus: false, termMonths: 6, perMonthCap: 300,
    notes: "7.1% for 6 months, up to £300 paid in per month.",
  },
  {
    provider: "MBNA", name: "Fixed Saver", type: "Fixed Rate",
    aer: 4.85, min: 1000, max: 750000, access: "No withdrawals until maturity",
    bonus: false, termMonths: 12,
    notes: "1-year fix. Locked until maturity.",
  },
  {
    provider: "Trading 212", name: "Cash ISA", type: "Cash ISA",
    aer: 4.76, min: 1, max: null, access: "Unlimited withdrawals",
    bonus: true, termMonths: 12, taxFree: true, flexible: true,
    notes: "Tax-free. 12-month bonus for new money. Flexible ISA.",
  },
];
