import { SiteShell,PageHero } from "@/components/site-shell";
import { CarrierInterview } from "@/components/carrier-interview";
import { requestsConfigured } from "@/lib/config";
export default function CarrierSetup(){return <SiteShell><PageHero eyebrow="Get started" title="Build your carrier checklist."><p>Your operation. Your routes. Only the help you request. Start a preliminary review without an account or a payment.</p></PageHero><CarrierInterview available={requestsConfigured()}/></SiteShell>}
