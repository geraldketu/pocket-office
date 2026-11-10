import {requireOwner} from "@/lib/admin/owner";
import {readOverview} from "@/lib/admin/overview";
import {OwnerOverview} from "@/components/admin/owner-overview";
export default async function Overview({searchParams}:{searchParams:Promise<{page?:string}>}){const owner=await requireOwner();return <OwnerOverview data={await readOverview(owner.id==="local-lab-owner",Math.min(50000,Math.max(0,Math.floor(Number((await searchParams).page)||0))))}/>;}
