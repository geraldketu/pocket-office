import Link from "next/link";
import { ContactForm } from "@/components/contact-form";

const services = [
  ["New authority setup", "USDOT, MC number, BOC-3 and UCR filed correctly the first time."],
  ["Fuel tax and permits", "IFTA, IRP, Form 2290, plus NY HUT, KYU, Oregon and New Mexico permits."],
  ["Drug and alcohol program", "Consortium enrollment, random testing and Clearinghouse queries."],
  ["Paperwork vault", "Every document on your phone. Download or print a bundle for any date range."],
  ["Expiration reminders", "We watch every renewal date and remind you before anything lapses."],
  ["Receipt and mileage tracking", "Snap fuel receipts and log miles by state for your IFTA return."],
];

export default function Home() {
  return (
    <main>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="text-lg font-bold text-blue-800">Pocket Office</span>
        <Link href="/login" className="text-sm font-semibold text-blue-700 hover:underline">
          Customer login
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-4 pt-10 pb-16">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Your trucking office, in your pocket.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-slate-600">
          New owner-operators lose time and money on DOT paperwork. We find what you&apos;re missing,
          file it, and keep every document on your phone, so you stay legal and keep driving.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#contact" className="btn">Get a free compliance check</a>
          <Link href="/login" className="btn-secondary">I&apos;m already a customer</Link>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-bold text-slate-900">What we handle for you</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map(([title, body]) => (
              <div key={title} className="card">
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-2xl font-bold text-slate-900">Get a free compliance check</h2>
        <p className="mt-2 text-slate-600">
          Tell us how to reach you. We&apos;ll look up your DOT record and tell you exactly what&apos;s
          missing, with no obligation.
        </p>
        <div className="card mt-6">
          <ContactForm />
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Pocket Office
      </footer>
    </main>
  );
}
