import {notFound} from "next/navigation";
import {requireOwner} from "@/lib/admin/owner";
import {withPreviewRead} from "@/lib/admin/store";
import {safePreviewPath,startPage} from "@/lib/admin/policy";
import {PreviewFrame} from "@/components/admin/preview-frame";
export default async function Preview({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{path?:string}>}){const owner=await requireOwner(),id=(await params).id;return withPreviewRead(id,owner.id,async(s)=>{if(!s)notFound();return <PreviewFrame id={s.id} initialRole={s.role} scenario={s.scenario} initialPath={safePreviewPath((await searchParams).path||startPage(s.role))}/>;});}
