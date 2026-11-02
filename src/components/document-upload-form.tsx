"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DocumentType } from "@/lib/compliance";

const MAX_BYTES = 25 * 1024 * 1024;

function addMonths(isoDate: string, months: number): string {
  const d = new Date(isoDate + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

// Uploads straight from the phone/browser to private storage, then records the document.
export function DocumentUploadForm({
  carrierId,
  types,
  defaultTypeId,
}: {
  carrierId: string;
  types: DocumentType[];
  defaultTypeId?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [typeId, setTypeId] = useState(defaultTypeId ?? "");
  const [issued, setIssued] = useState("");
  const [expires, setExpires] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selected = types.find((t) => t.id === typeId);

  function onIssuedChange(value: string) {
    setIssued(value);
    // Suggest an expiration date from the renewal cycle if none entered yet.
    if (value && !expires && selected?.renews_every_months) {
      setExpires(addMonths(value, selected.renews_every_months));
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setDone(null);
    const form = new FormData(e.currentTarget);
    const file = form.get("file") as File | null;
    if (!typeId) return setError("Pick what kind of document this is.");
    if (!file || file.size === 0) return setError("Choose a photo or file to upload.");
    if (file.size > MAX_BYTES) return setError("That file is over 25 MB.");

    setPending(true);
    const supabase = createClient();
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${carrierId}/documents/${crypto.randomUUID()}.${ext}`;

    const upload = await supabase.storage
      .from("carrier-files")
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (upload.error) {
      setPending(false);
      return setError("Upload failed: " + upload.error.message);
    }

    const { data: auth } = await supabase.auth.getUser();
    const insert = await supabase.from("documents").insert({
      carrier_id: carrierId,
      type_id: typeId,
      file_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      issued_on: issued || null,
      expires_on: expires || null,
      notes: String(form.get("notes") || "").trim() || null,
      uploaded_by: auth.user?.id,
    });
    if (insert.error) {
      await supabase.storage.from("carrier-files").remove([path]);
      setPending(false);
      return setError("Couldn't save the document: " + insert.error.message);
    }

    formRef.current?.reset();
    setIssued("");
    setExpires("");
    setPending(false);
    setDone(`Saved ${selected?.name ?? "document"}.`);
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="type">Document type</label>
        <select
          className="field"
          id="type"
          value={typeId}
          onChange={(e) => {
            setTypeId(e.target.value);
            setDone(null);
          }}
          required
        >
          <option value="">Choose one...</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="file">Photo or file</label>
        <input
          className="field file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-blue-800"
          id="file"
          name="file"
          type="file"
          accept="image/*,application/pdf"
          required
        />
        <p className="mt-1 text-xs text-slate-500">On a phone you can take a picture or pick a file.</p>
      </div>
      <div>
        <label className="label" htmlFor="issued">Issue date</label>
        <input className="field" id="issued" type="date" value={issued} onChange={(e) => onIssuedChange(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="expires">Expiration date</label>
        <input className="field" id="expires" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="notes">Notes</label>
        <input className="field" id="notes" name="notes" placeholder="Optional" />
      </div>
      {error && <p className="text-sm text-red-700 sm:col-span-2">{error}</p>}
      {done && <p className="text-sm text-emerald-700 sm:col-span-2">{done}</p>}
      <div className="sm:col-span-2">
        <button className="btn w-full sm:w-auto" disabled={pending}>{pending ? "Uploading..." : "Upload document"}</button>
      </div>
    </form>
  );
}
