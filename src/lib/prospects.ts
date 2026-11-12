import "server-only";

// Prospect search over FMCSA's public Company Census File (data.transportation.gov, updated daily).
// https://data.transportation.gov/Trucking-and-Motorcoaches/Company-Census-File/az4n-8mr2
// We query the official open-data API live instead of copying rows into our database.

const ENDPOINT = "https://data.transportation.gov/resource/az4n-8mr2.json";
export const PAGE_SIZE = 50;
export const EXPORT_LIMIT = 5000;

export type ProspectFilters = {
  state: string; // two-letter physical state, or "" for all
  minYears: number; // registered at least this many years ago
  mcs150: "overdue" | "any"; // MCS-150 must be updated every 24 months
  trucks: "1" | "1-2";
  hire: "any" | "for-hire";
  q: string; // company name or DOT number
  sort: "mcs150" | "oldest" | "newest";
  page: number;
};

export type Prospect = {
  dot: string;
  legalName: string;
  dba: string | null;
  officer: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  cell: string | null;
  email: string | null;
  mc: string | null;
  dunBradstreet: string | null;
  powerUnits: number;
  drivers: number | null;
  operation: string | null;
  registered: string | null; // YYYY-MM-DD
  mcs150: string | null; // YYYY-MM-DD
  mcs150Overdue: boolean;
  mileageYear: string | null;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseFilters(sp: Record<string, string | string[] | undefined>): ProspectFilters {
  const state = one(sp.state).toUpperCase();
  const years = Number(one(sp.minYears));
  const page = Number(one(sp.page));
  return {
    state: /^[A-Z]{2}$/.test(state) ? state : "",
    minYears: Number.isInteger(years) && years >= 0 && years <= 60 ? years : 3,
    mcs150: one(sp.mcs150) === "any" ? "any" : "overdue",
    trucks: one(sp.trucks) === "1-2" ? "1-2" : "1",
    hire: one(sp.hire) === "for-hire" ? "for-hire" : "any",
    // Company names only need letters, numbers and a little punctuation. Other characters
    // (quotes, "=", "--") can trip the data site's firewall, so they become spaces.
    q: one(sp.q).replace(/[^A-Za-z0-9 &'.,-]/g, " ").replace(/-{2,}/g, "-").replace(/\s+/g, " ").trim().slice(0, 80),
    sort: (["oldest", "newest"] as const).find((s) => s === one(sp.sort)) ?? "mcs150",
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 200) : 1,
  };
}

// Dates in the census file are text like "20190305".
const ymd = (d: Date) => d.toISOString().slice(0, 10).replaceAll("-", "");
const yearsAgo = (n: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return ymd(d);
};
const toIso = (s?: string) => (s && /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null);
// Quote a value for a SoQL string literal.
const lit = (s: string) => "'" + s.replace(/'/g, "''") + "'";

function where(f: ProspectFilters) {
  const parts = [
    "status_code='A'", // active
    "carrier_operation='A'", // interstate (crosses state lines)
    f.trucks === "1" ? "power_units='1'" : "power_units in('1','2')",
    `add_date < ${lit(yearsAgo(f.minYears))}`,
  ];
  if (f.state) parts.push(`phy_state=${lit(f.state)}`);
  if (f.mcs150 === "overdue") parts.push(`(mcs150_date < ${lit(yearsAgo(2))} OR mcs150_date IS NULL)`);
  if (f.hire === "for-hire") parts.push("classdef like '%AUTHORIZED FOR HIRE%'");
  if (f.q) {
    const name = f.q.toUpperCase().replace(/[%_]/g, " ");
    const byName = `(upper(legal_name) like ${lit("%" + name + "%")} OR upper(dba_name) like ${lit("%" + name + "%")})`;
    parts.push(/^\d{1,9}$/.test(f.q) ? `(dot_number=${Number(f.q)} OR ${byName})` : byName);
  }
  return parts.join(" AND ");
}

const ORDER: Record<ProspectFilters["sort"], string> = {
  mcs150: "mcs150_date ASC, add_date ASC", // longest without an MCS-150 update first
  oldest: "add_date ASC",
  newest: "add_date DESC",
};

const FIELDS = [
  "dot_number", "legal_name", "dba_name", "company_officer_1", "phy_street", "phy_city", "phy_state", "phy_zip",
  "phone", "cell_phone", "email_address", "docket1prefix", "docket1", "dun_bradstreet_no", "power_units",
  "total_drivers", "classdef", "add_date", "mcs150_date", "mcs150_mileage_year",
].join(",");

async function soql(params: Record<string, string>, revalidate = 3600) {
  const url = ENDPOINT + "?" + new URLSearchParams(params);
  const res = await fetch(url, {
    headers: process.env.SOCRATA_APP_TOKEN ? { "X-App-Token": process.env.SOCRATA_APP_TOKEN } : {},
    next: { revalidate },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`DOT data request failed (${res.status})`);
  return (await res.json()) as Record<string, string>[];
}

const clean = (v?: string) => (v && v.trim() && v.trim() !== "0" ? v.trim() : null);

function toProspect(r: Record<string, string>): Prospect {
  const mcs150 = toIso(r.mcs150_date);
  return {
    dot: r.dot_number,
    legalName: r.legal_name ?? "(no name on file)",
    dba: clean(r.dba_name),
    officer: clean(r.company_officer_1),
    street: clean(r.phy_street),
    city: clean(r.phy_city),
    state: clean(r.phy_state),
    zip: clean(r.phy_zip),
    phone: clean(r.phone),
    cell: clean(r.cell_phone),
    email: clean(r.email_address)?.toLowerCase() ?? null,
    mc: r.docket1 ? `${r.docket1prefix ?? "MC"}-${r.docket1}` : null,
    dunBradstreet: clean(r.dun_bradstreet_no),
    powerUnits: Number(r.power_units) || 0,
    drivers: r.total_drivers ? Number(r.total_drivers) : null,
    operation: clean(r.classdef),
    registered: toIso(r.add_date),
    mcs150,
    mcs150Overdue: !r.mcs150_date || r.mcs150_date < yearsAgo(2),
    mileageYear: clean(r.mcs150_mileage_year),
  };
}

export async function searchProspects(f: ProspectFilters) {
  const w = where(f);
  const [rows, count] = await Promise.all([
    soql({ $select: FIELDS, $where: w, $order: ORDER[f.sort], $limit: String(PAGE_SIZE), $offset: String((f.page - 1) * PAGE_SIZE) }),
    soql({ $select: "count(*) as n", $where: w }),
  ]);
  return { prospects: rows.map(toProspect), total: Number(count[0]?.n ?? 0) };
}

export async function exportProspects(f: ProspectFilters) {
  const rows = await soql({ $select: FIELDS, $where: where(f), $order: ORDER[f.sort], $limit: String(EXPORT_LIMIT) }, 0);
  return rows.map(toProspect);
}

export const formatPhone = (p: string | null) =>
  p && /^\d{10}$/.test(p) ? `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}` : p;

export const saferUrl = (dot: string) =>
  `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${encodeURIComponent(dot)}`;
