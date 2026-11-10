import Link from "next/link";
import { Brand } from "@/components/site-shell";
type NavItem={href:string;label:string};
export function AppHeader({nav,email}:{nav:NavItem[];email:string}){return <header className="app-header"><div className="app-header-inner"><Brand/><nav aria-label="Member navigation">{nav.map(n=><Link key={n.href} href={n.href}>{n.label}</Link>)}<Link href="/carrier-setup">Carrier setup</Link><Link href="/bid-calculator">Bid calculator</Link></nav><div className="app-header-user"><span>{email}</span><form action="/auth/signout" method="post"><button className="btn-secondary">Sign out</button></form></div></div></header>}
