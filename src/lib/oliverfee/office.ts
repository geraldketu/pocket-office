// Server-side rules for the OliverFee 360 Member Office.
// Ported from Felicia's Sites worker; behavior is kept the same.
import { buildQuote } from "./rules.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type State = Record<string, any>;

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
export const fail = (status: number, message: string): never => {
  throw new HttpError(status, message);
};

export const validId = (s: unknown): s is string =>
  typeof s === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(s);
export const ROLES = ["owner", "office", "driver"] as const;
export type Role = (typeof ROLES)[number];

export const freshState = (name: string): State => ({
  records: [], people: [], docs: [], listings: [], jobs: [], orders: [], notices: [], audit: [], requests: [],
  plan: "Basic", broker: "", onboard: null, profile: { name, logo: "" },
});

// A driver only sees their own records.
export function driverState(state: State, person: string | null): State {
  return {
    ...freshState(state.profile?.name || "Member Office"),
    profile: state.profile,
    records: (state.records || []).filter((r: any) => r.person === person),
    people: (state.people || []).filter((p: any) => p.id === person),
  };
}

// Validates a saved workspace. Payment status can never be set from the browser.
export function cleanState(input: unknown, previous: State): State {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail(400, "Invalid workspace.");
  const next: State = { ...(input as State) };
  delete next.docs;
  delete next.quoteOrders;
  for (const key of ["records", "people", "listings", "jobs", "orders", "notices", "audit", "requests"])
    if (!Array.isArray(next[key])) fail(400, "Invalid " + key + ".");
  for (const key of ["orders", "requests"]) {
    const old = new Map((previous[key] || []).map((x: any) => [x.id, x]));
    next[key] = next[key].map((item: any) => {
      const existing: any = old.get(item.id);
      const paid = existing?.paymentStatus === "paid";
      if (["Paid", "In progress", "Completed", "Ready to Process"].includes(item.status) && !paid)
        fail(409, "Payment verification is required before processing.");
      return { ...item, paymentStatus: paid ? "paid" : "unpaid" };
    });
  }
  if (next.signedQuote) {
    if (!next.signedQuote.signature?.trim() || !next.signedQuote.terms || !next.signedQuote.quote)
      fail(400, "Quote acknowledgment, signature and itemization are required.");
    next.signedQuote.status = "Signed — unpaid";
  }
  return next;
}

export const FILING_TERMS =
  "Permit and government filing fees are non-refundable once paid to the issuing agency, except where the agency allows a refund or the law requires one. OliverFee 360 processing fees for permits and authorities are non-refundable once we submit the filing, except where the law requires a refund. Third-party fees follow the provider’s refund rules.";

async function digest(text: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// The exact quote a customer signs, and a fingerprint so any later change voids the signature.
export async function canonical(state: State, selection: State) {
  const q = buildQuote(state, selection);
  const snapshot = { ...q, filingTerms: FILING_TERMS, application: state.application || null, operation: state.onboard || null };
  return { snapshot, hash: await digest(JSON.stringify(snapshot)) };
}

export function safeSelection(value: any) {
  if (!value || !["plan", "startup", "quote"].includes(value.kind)) fail(400, "Select a review type.");
  if (value.kind === "plan" && !["Basic", "Pro", "Premium", "Ultimate"].includes(value.plan)) fail(400, "Invalid plan.");
  return { kind: value.kind, ...(value.kind === "plan" ? { plan: value.plan } : {}) };
}

export const ALLOWED_MIME = [
  "application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain", "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
