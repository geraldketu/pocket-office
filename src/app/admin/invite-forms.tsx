"use client";

import { useActionState, useState } from "react";
import { createCarrierAndInvite, resendInvite, type InviteResult } from "./actions";

function ResultBox({ state }: { state: InviteResult }) {
  const [copied, setCopied] = useState(false);
  if (!state) return null;
  return (
    <div className={`rounded-lg p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>
      <p>{state.message}</p>
      {state.link && (
        <div className="mt-2 flex gap-2">
          <input readOnly value={state.link} className="field text-xs" onFocus={(e) => e.target.select()} />
          <button
            type="button"
            className="btn-secondary shrink-0"
            onClick={() => {
              navigator.clipboard.writeText(state.link!);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}

export function NewCarrierForm() {
  const [state, action, pending] = useActionState<InviteResult, FormData>(createCarrierAndInvite, null);
  return (
    <form action={action} key={state?.ok ? state.carrierId : "form"} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="legal_name">Legal company name *</label>
        <input className="field" id="legal_name" name="legal_name" required />
      </div>
      <div>
        <label className="label" htmlFor="dba">DBA</label>
        <input className="field" id="dba" name="dba" />
      </div>
      <div>
        <label className="label" htmlFor="c-email">Login email *</label>
        <input className="field" id="c-email" name="email" type="email" required />
      </div>
      <div>
        <label className="label" htmlFor="c-usdot">USDOT #</label>
        <input className="field" id="c-usdot" name="usdot" />
      </div>
      <div>
        <label className="label" htmlFor="mc">MC #</label>
        <input className="field" id="mc" name="mc" />
      </div>
      <div>
        <label className="label" htmlFor="c-phone">Phone</label>
        <input className="field" id="c-phone" name="phone" type="tel" />
      </div>
      <div>
        <label className="label" htmlFor="tier">Service tier</label>
        <input className="field" id="tier" name="tier" placeholder="e.g. Basic" />
      </div>
      <div className="sm:col-span-2">
        <button className="btn w-full sm:w-auto" disabled={pending}>
          {pending ? "Creating..." : "Create carrier + send invite"}
        </button>
      </div>
      <div className="sm:col-span-2">
        <ResultBox state={state} />
      </div>
    </form>
  );
}

export function ResendInviteButton({ carrierId }: { carrierId: string }) {
  const [state, action, pending] = useActionState<InviteResult, FormData>(resendInvite, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="carrier_id" value={carrierId} />
      <button className="btn-secondary" disabled={pending}>{pending ? "Working..." : "New sign-in link"}</button>
      <ResultBox state={state} />
    </form>
  );
}
