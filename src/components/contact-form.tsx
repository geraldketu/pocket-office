"use client";

import { useActionState } from "react";
import { submitContact, type ContactState } from "@/app/actions/leads";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, null);

  if (state?.ok) {
    return <p className="rounded-lg bg-emerald-50 p-4 text-emerald-800">{state.message}</p>;
  }

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="name">Your name *</label>
        <input className="field" id="name" name="name" required autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor="company">Company name</label>
        <input className="field" id="company" name="company" autoComplete="organization" />
      </div>
      <div>
        <label className="label" htmlFor="phone">Phone</label>
        <input className="field" id="phone" name="phone" type="tel" autoComplete="tel" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="field" id="email" name="email" type="email" autoComplete="email" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="usdot">USDOT number (if you have one)</label>
        <input className="field" id="usdot" name="usdot" inputMode="numeric" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="message">What do you need help with?</label>
        <textarea className="field" id="message" name="message" rows={3} />
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state && !state.ok && <p className="text-sm text-red-700 sm:col-span-2">{state.message}</p>}
      <div className="sm:col-span-2">
        <button className="btn w-full sm:w-auto" disabled={pending}>
          {pending ? "Sending..." : "Get my free compliance check"}
        </button>
      </div>
    </form>
  );
}
