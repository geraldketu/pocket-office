import { NextResponse, type NextRequest } from "next/server";
import { requireOwner } from "@/lib/admin/owner";
import { exportProspects, parseFilters } from "@/lib/prospects";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Quote every cell; neutralize spreadsheet formulas.
  return '"' + (/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""') + '"';
};

// Downloads the current Prospects filters as a spreadsheet (CSV).
export async function GET(req: NextRequest) {
  await requireOwner();
  const f = parseFilters(Object.fromEntries(req.nextUrl.searchParams));
  try {
    const rows = await exportProspects(f);
    const header = ["USDOT", "Legal name", "DBA", "Officer", "Street", "City", "State", "ZIP", "Phone", "Cell", "Email", "MC", "D&B number", "Trucks", "Drivers", "Registered", "Last MCS-150", "MCS-150 overdue", "Operation"];
    const lines = rows.map((p) => [p.dot, p.legalName, p.dba, p.officer, p.street, p.city, p.state, p.zip, p.phone, p.cell, p.email, p.mc, p.dunBradstreet, p.powerUnits, p.drivers, p.registered, p.mcs150, p.mcs150Overdue ? "yes" : "no", p.operation].map(cell).join(","));
    const name = `oliverfee-prospects-${f.state || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse([header.map(cell).join(","), ...lines].join("\r\n"), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "DOT data unavailable" }, { status: 502 });
  }
}
