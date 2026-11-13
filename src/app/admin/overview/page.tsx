import {requireOwner} from '@/lib/admin/owner';
import {readOverview} from '@/lib/admin/overview';
import {OwnerOverview} from '@/components/admin/owner-overview';
import {OwnerManagement} from '@/components/admin/owner-management';
import {readManagement} from '@/lib/admin/management';
import {ownerManagementDemo,previewOwnerId} from '@/lib/admin/management-demo';
import '../owner-management.css';
export const dynamic='force-dynamic';
export default async function Overview({searchParams}:{searchParams:Promise<{page?:string}>}){const owner=await requireOwner();const page=Math.min(50000,Math.max(0,Math.floor(Number((await searchParams).page)||0)));const preview=owner.id==='local-lab-owner';let data=await readOverview(preview,page);const demo=ownerManagementDemo();if(preview)data={...data,modules:data.modules.map(m=>demo.overview.modules.find(d=>d.name===m.name)||m)};const management=preview?demo.management:await readManagement(false,page);return <OwnerOverview data={data} controls={<OwnerManagement overview={data} initial={management} ownerId={preview?previewOwnerId:owner.id}/>}/>;}
