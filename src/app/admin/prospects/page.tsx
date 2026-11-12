import { requireOwner } from "@/lib/admin/owner";
import {
  PAGE_SIZE, EXPORT_LIMIT, formatPhone, parseFilters, saferUrl, searchProspects, type ProspectFilters,
} from "@/lib/prospects";

export const dynamic = "force-dynamic";

const STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");

const date = (iso: string | null) =>
  iso ? new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never filed";
const yearsSince = (iso: string | null) =>
  iso ? Math.floor((Date.now() - Date.parse(iso + "T12:00:00")) / (365.25 * 86400000)) : null;

function query(f: ProspectFilters, changes: Partial<ProspectFilters> = {}) {
  const v = { ...f, ...changes };
  const p = new URLSearchParams();
  if (v.state) p.set("state", v.state);
  p.set("minYears", String(v.minYears));
  p.set("mcs150", v.mcs150);
  p.set("trucks", v.trucks);
  p.set("hire", v.hire);
  if (v.q) p.set("q", v.q);
  p.set("sort", v.sort);
  if (v.page > 1) p.set("page", String(v.page));
  return p.toString();
}

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireOwner();
  const f = parseFilters(await searchParams);
  let result: Awaited<ReturnType<typeof searchProspects>> | null = null;
  let error = "";
  try {
    result = await searchProspects(f);
  } catch (e) {
    error = e instanceof Error ? e.message : "The DOT data service did not respond.";
  }
  const pages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;

  return (
    <>
      <section className="page-hero">
        <span className="eyebrow">FMCSA Company Census · updated daily</span>
        <h1>Carrier Prospects</h1>
        <p className="hero-copy">
          Active interstate carriers with one truck that have been registered for a while. Carriers that haven&apos;t
          filed their required MCS-150 update in the last 2 years are listed first.
        </p>
      </section>

      <form className="card prospect-filters" method="get">
        <label><span className="label">State</span>
          <select className="field" name="state" defaultValue={f.state}>
            <option value="">All states</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label><span className="label">Registered at least</span>
          <select className="field" name="minYears" defaultValue={String(f.minYears)}>
            {[0, 1, 2, 3, 5, 10, 15, 20].map((y) => <option key={y} value={y}>{y === 0 ? "Any age" : `${y}+ years ago`}</option>)}
          </select>
        </label>
        <label><span className="label">MCS-150 update</span>
          <select className="field" name="mcs150" defaultValue={f.mcs150}>
            <option value="overdue">Overdue (2+ years)</option>
            <option value="any">Any</option>
          </select>
        </label>
        <label><span className="label">Trucks</span>
          <select className="field" name="trucks" defaultValue={f.trucks}>
            <option value="1">1 truck</option>
            <option value="1-2">1–2 trucks</option>
          </select>
        </label>
        <label><span className="label">Operation</span>
          <select className="field" name="hire" defaultValue={f.hire}>
            <option value="any">Any interstate</option>
            <option value="for-hire">For-hire only</option>
          </select>
        </label>
        <label><span className="label">Sort</span>
          <select className="field" name="sort" defaultValue={f.sort}>
            <option value="mcs150">MCS-150 most overdue</option>
            <option value="oldest">Oldest registration</option>
            <option value="newest">Newest registration</option>
          </select>
        </label>
        <label className="prospect-search"><span className="label">Company name or DOT #</span>
          <input className="field" name="q" defaultValue={f.q} placeholder="e.g. Smith Trucking or 1234567" />
        </label>
        <div className="prospect-actions">
          <button className="btn">Search</button>
          <a className="btn-secondary" href={`/admin/prospects/export?${query(f, { page: 1 })}`}>Download CSV</a>
          <a className="text-link" href="/admin/prospects">Reset</a>
        </div>
      </form>

      {error ? (
        <p className="notice error">Couldn&apos;t reach the DOT data service: {error}. Try again in a minute.</p>
      ) : result && (
        <>
          <p className="muted">
            <strong className="text-[var(--foreground)]">{result.total.toLocaleString("en-US")}</strong> carriers match.
            Showing {((f.page - 1) * PAGE_SIZE + 1).toLocaleString("en-US")}–{Math.min(f.page * PAGE_SIZE, result.total).toLocaleString("en-US")}.
            {" "}The CSV download includes up to {EXPORT_LIMIT.toLocaleString("en-US")} rows with these filters.
          </p>

          {result.prospects.length === 0 ? (
            <p className="notice">No carriers match these filters. Try another state or fewer years.</p>
          ) : (
            <div className="prospect-list">
              {result.prospects.map((p) => {
                const age = yearsSince(p.registered);
                return (
                  <article key={p.dot} className="card prospect">
                    <div className="prospect-head">
                      <div className="min-w-0">
                        <h2>{p.legalName}</h2>
                        {p.dba && <p className="muted">DBA {p.dba}</p>}
                        {p.officer && <p className="muted">Officer: {p.officer}</p>}
                      </div>
                      <div className="prospect-tags">
                        {p.mcs150Overdue && <span className="tag pink-tag">MCS-150 overdue</span>}
                        {age !== null && <span className="tag">{age} yr{age === 1 ? "" : "s"} registered</span>}
                      </div>
                    </div>
                    <dl className="prospect-facts">
                      <div><dt>USDOT</dt><dd><a className="text-link" href={saferUrl(p.dot)} target="_blank" rel="noopener">{p.dot} ↗</a></dd></div>
                      <div><dt>MC</dt><dd>{p.mc ?? "—"}</dd></div>
                      <div><dt>D&amp;B #</dt><dd>{p.dunBradstreet ?? "—"}</dd></div>
                      <div><dt>Last MCS-150</dt><dd>{date(p.mcs150)}</dd></div>
                      <div><dt>Registered</dt><dd>{date(p.registered)}</dd></div>
                      <div><dt>Trucks · drivers</dt><dd>{p.powerUnits} · {p.drivers ?? "—"}</dd></div>
                      <div className="wide"><dt>Address</dt><dd>{[p.street, p.city, [p.state, p.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—"}</dd></div>
                      <div className="wide"><dt>Contact</dt><dd className="prospect-contact">
                        {p.phone && <a className="text-link" href={`tel:${p.phone}`}>{formatPhone(p.phone)}</a>}
                        {p.cell && p.cell !== p.phone && <a className="text-link" href={`tel:${p.cell}`}>Cell {formatPhone(p.cell)}</a>}
                        {p.email && <a className="text-link" href={`mailto:${p.email}`}>{p.email}</a>}
                        {!p.phone && !p.cell && !p.email && "—"}
                      </dd></div>
                      {p.operation && <div className="wide"><dt>Operation</dt><dd>{p.operation.toLowerCase()}</dd></div>}
                    </dl>
                  </article>
                );
              })}
            </div>
          )}

          {pages > 1 && (
            <nav className="prospect-pages" aria-label="Pages">
              {f.page > 1 && <a className="btn-secondary" href={`?${query(f, { page: f.page - 1 })}`}>← Previous</a>}
              <span className="muted">Page {f.page} of {Math.min(pages, 200).toLocaleString("en-US")}</span>
              {f.page < Math.min(pages, 200) && <a className="btn-secondary" href={`?${query(f, { page: f.page + 1 })}`}>Next →</a>}
            </nav>
          )}
        </>
      )}

      <p className="notice">
        Source: FMCSA Company Census File on data.transportation.gov (public record). Before calling, check numbers
        against the National Do Not Call Registry for any cell phones, and verify details on SAFER.
      </p>
    </>
  );
}
