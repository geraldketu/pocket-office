"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {usePreview} from "@/components/admin/preview-runtime";
export function Brand() {
  return <Link href="/" className="brand"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/></svg></span><span><b>OliverFee <em>360</em></b><small>Your Office in Your Pocket</small></span></Link>;
}
const links = [["/", "Your office", "▦"], ["/carrier-setup", "Carrier setup", "☷"], ["/plans", "Plans & services", "◇"], ["/bid-calculator", "Bid calculator", "+"], ["/login", "Member Office", "↗"], ["/signup", "Create account", "+"]];
export function SiteShell({children}: {children: React.ReactNode}) {
  const currentPath=usePathname(),preview=usePreview();
  const path=preview?currentPath.replace(`/admin/preview/${preview.id}/view`,"")||"/":currentPath;
  return <div className="office-shell"><aside className="office-sidebar"><Brand/><nav aria-label="Main navigation"><span className="eyebrow nav-label">Workspace</span>{links.map(([href,label,symbol])=><Link key={href} href={href} aria-current={path===href?"page":undefined}><span aria-hidden="true">{symbol}</span>{label}</Link>)}</nav><div className="source-box"><span className="eyebrow">Official records</span><a href="https://safer.fmcsa.dot.gov/CompanySnapshot.aspx" target="_blank" rel="noopener noreferrer">SAFER Company Snapshot ↗</a><a href="https://motus.dot.gov" target="_blank" rel="noopener noreferrer">FMCSA Motus ↗</a></div><div className="sidebar-bottom"><span className="status-dot"/>Public website · private accounts<small>Browse freely. Sign in with your email to open your carrier office.</small></div></aside><div className="office-body"><header className="office-top"><p><span className="eyebrow">Carrier workspace</span><span className="crumb"> / {links.find(([href])=>href===path)?.[1]||"Member Office"}</span></p><Link href="/carrier-setup" className="btn">Start carrier setup ＋</Link></header><main className="office-main">{children}</main><footer className="office-footer"><Brand/><span>Paperwork in place. Keep moving.</span><Link href="/login">Email sign-in ↗</Link></footer></div></div>;
}
export function PageHero({eyebrow,title,children}: {eyebrow:string;title:string;children:React.ReactNode}) {
  return <section className="page-hero"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><div className="hero-copy">{children}</div></section>;
}
