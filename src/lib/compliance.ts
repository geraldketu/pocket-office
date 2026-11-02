// Works out document and carrier status from expiration dates.

export type DocumentType = {
  id: string;
  name: string;
  category: string;
  renews_every_months: number | null;
  required: boolean;
  sort_order: number;
};

export type DocumentRow = {
  id: string;
  carrier_id: string;
  type_id: string;
  file_path: string;
  file_name: string | null;
  mime_type: string | null;
  issued_on: string | null;
  expires_on: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

export type DocStatus = "valid" | "expiring" | "expired" | "no-expiry";
export type Compliance = "green" | "yellow" | "red";

export const EXPIRING_SOON_DAYS = 30;

export function daysUntil(date: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function documentStatus(doc: Pick<DocumentRow, "expires_on">): DocStatus {
  if (!doc.expires_on) return "no-expiry";
  const days = daysUntil(doc.expires_on);
  if (days < 0) return "expired";
  if (days <= EXPIRING_SOON_DAYS) return "expiring";
  return "valid";
}

// For each document type, the newest active document (if any).
export function latestByType(docs: DocumentRow[]): Map<string, DocumentRow> {
  const map = new Map<string, DocumentRow>();
  for (const d of docs) {
    if (d.status !== "active") continue;
    const cur = map.get(d.type_id);
    const newer =
      !cur ||
      (d.expires_on ?? "") > (cur.expires_on ?? "") ||
      ((d.expires_on ?? "") === (cur.expires_on ?? "") && d.created_at > cur.created_at);
    if (newer) map.set(d.type_id, d);
  }
  return map;
}

export type ChecklistItem = {
  type: DocumentType;
  doc: DocumentRow | null;
  state: DocStatus | "missing";
};

export function checklist(types: DocumentType[], docs: DocumentRow[]): ChecklistItem[] {
  const latest = latestByType(docs);
  return types
    .filter((t) => t.required)
    .map((type) => {
      const doc = latest.get(type.id) ?? null;
      return { type, doc, state: doc ? documentStatus(doc) : "missing" };
    });
}

export function carrierCompliance(types: DocumentType[], docs: DocumentRow[]): Compliance {
  const items = checklist(types, docs);
  if (items.some((i) => i.state === "missing" || i.state === "expired")) return "red";
  if (items.some((i) => i.state === "expiring")) return "yellow";
  return "green";
}
