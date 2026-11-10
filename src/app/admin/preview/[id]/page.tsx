import {notFound} from "next/navigation";
import {requireOwner} from "@/lib/admin/owner";
import {getPreview} from "@/lib/admin/store";
import {safePreviewPath,startPage} from "@/lib/admin/policy";
import {PreviewFrame} from "@/components/admin/preview-frame";
export default async function Preview({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{path?:string}>}){const owner=await requireOwner(),s=getPreview((await params).id,owner.id);if(!s)notFound();return <PreviewFrame id={s.id} initialRole={s.role} scenario={s.scenario} initialPath={safePreviewPath((await searchParams).path||startPage(s.role))}/>;}
