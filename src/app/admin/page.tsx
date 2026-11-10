import {requireOwner} from "@/lib/admin/owner";
import {SiteExplorer} from "@/components/admin/site-explorer";
export default async function AdminHome(){await requireOwner();return <SiteExplorer/>;}
