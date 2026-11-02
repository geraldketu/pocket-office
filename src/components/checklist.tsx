import { DocStatusBadge } from "@/components/badges";
import { checklist, type DocumentRow, type DocumentType } from "@/lib/compliance";

// Required documents and whether each one is on file and current.
export function Checklist({ types, docs }: { types: DocumentType[]; docs: DocumentRow[] }) {
  const items = checklist(types, docs);
  const missing = items.filter((i) => i.state === "missing" || i.state === "expired").length;
  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">
        {missing === 0 ? "Everything required is on file." : `${missing} of ${items.length} required documents need attention.`}
      </p>
      <ul className="divide-y divide-slate-100">
        {items.map((i) => (
          <li key={i.type.id} className="flex items-center justify-between gap-3 py-2">
            <span className="text-sm text-slate-800">{i.type.name}</span>
            <DocStatusBadge state={i.state} />
          </li>
        ))}
      </ul>
    </div>
  );
}
