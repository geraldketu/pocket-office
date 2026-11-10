import Link from "next/link";

type NavItem = { href: string; label: string };

export function AppHeader({ nav, email }: { nav: NavItem[]; email: string }) {
  return (
    <header className="bg-[#17171a] text-[#c5c2c8]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/admin" className="text-lg font-extrabold tracking-tight text-white">
          OliverFee <b className="text-[#ff9ec7]">360</b>
        </Link>
        <nav className="flex gap-4 text-sm font-semibold">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-[#ffda8c]">{n.label}</Link>
          ))}
          <a href="/#member" className="hover:text-[#ffda8c]">Member Office</a>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">{email}</span>
          <form action="/auth/signout" method="post">
            <button className="font-semibold hover:text-[#ffda8c]">Sign out</button>
          </form>
        </div>
      </div>
    </header>
  );
}
