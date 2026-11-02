import Link from "next/link";

type NavItem = { href: string; label: string };

export function AppHeader({ nav, email }: { nav: NavItem[]; email: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/dashboard" className="font-bold text-blue-800">Pocket Office</Link>
        <nav className="flex gap-4 text-sm font-medium">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="text-slate-700 hover:text-blue-700">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm text-slate-500">
          <span className="hidden sm:inline">{email}</span>
          <form action="/auth/signout" method="post">
            <button className="font-medium text-slate-700 hover:text-blue-700">Sign out</button>
          </form>
        </div>
      </div>
    </header>
  );
}
