import {headers} from "next/headers";
import {OwnerHeader} from "@/components/admin/owner-header";
import {requireOwner} from "@/lib/admin/owner";
export const dynamic="force-dynamic";
export default async function AdminLayout({children}:{children:React.ReactNode}){
 const owner=await requireOwner();
 if((await headers()).get("x-oliver-preview-view")==="1")return <>{children}</>;
 return <div className="owner-portal"><OwnerHeader email={owner.email} lab={owner.id==="local-lab-owner"}/><main className="owner-content">{children}</main></div>;
}
