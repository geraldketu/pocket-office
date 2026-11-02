import { DocStatusBadge } from "@/components/badges";
import { documentStatus, type DocumentRow, type DocumentType } from "@/lib/compliance";

const fmt = (d: string | null) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-";

export function DocumentList({ docs, types }: { docs: DocumentRow[]; types: DocumentType[] }) {
  const typeName = new Map(types.map((t) => [t.id, t.name]));
  if (docs.length === 0) {
    return <p className="text-sm text-slate-500">No documents uploaded yet.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {docs.map((d) => (
        <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900">{typeName.get(d.type_id) ?? "Document"}</p>
            <p className="truncate text-xs text-slate-500">
              {d.file_name} · Issued {fmt(d.issued_on)} · Expires {fmt(d.expires_on)}
            </p>
            {d.notes && <p className="text-xs text-slate-500">{d.notes}</p>}
          </div>
          <DocStatusBadge state={documentStatus(d)} />
          <div className="flex gap-3 text-sm font-medium">
            <a href={`/documents/${d.id}/file`} target="_blank" rel="noopener" className="text-blue-700 hover:underline">View</a>
            <a href={`/documents/${d.id}/file?download=1`} className="text-blue-700 hover:underline">Download</a>
          </div>
        </li>
      ))}
    </ul>
  );
}
