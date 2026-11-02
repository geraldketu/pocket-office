import type { Compliance, DocStatus } from "@/lib/compliance";

const docStyles: Record<DocStatus | "missing", [string, string]> = {
  valid: ["Valid", "bg-emerald-100 text-emerald-800"],
  "no-expiry": ["On file", "bg-slate-100 text-slate-700"],
  expiring: ["Expiring soon", "bg-amber-100 text-amber-800"],
  expired: ["Expired", "bg-red-100 text-red-800"],
  missing: ["Missing", "bg-red-100 text-red-800"],
};

export function DocStatusBadge({ state }: { state: DocStatus | "missing" }) {
  const [label, cls] = docStyles[state];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

const compStyles: Record<Compliance, [string, string]> = {
  green: ["Compliant", "bg-emerald-500"],
  yellow: ["Attention", "bg-amber-400"],
  red: ["Action needed", "bg-red-500"],
};

export function ComplianceBadge({ value }: { value: Compliance }) {
  const [label, dot] = compStyles[value];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
