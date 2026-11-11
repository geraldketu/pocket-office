"use client";
import {useEffect,useState,useRef,useCallback} from "react";
import {useRouter} from "next/navigation";
import {ensureOwnerAccess} from "@/app/actions/owner-access";
import {usePreview} from "@/components/admin/preview-runtime";
export function OwnerAccountAccess(){
 const router=useRouter(),preview=usePreview(),started=useRef(false);
 const [pending,setPending]=useState(true),[message,setMessage]=useState("Checking your owner access…");
 const open=useCallback(async()=>{
  setPending(true);
  try{
   const result=preview?await preview.call("ownerAccess"):await ensureOwnerAccess();
   if(result.owner){if(preview)preview.navigate("/admin");else{router.replace("/admin");router.refresh();}return;}
   setMessage(typeof result.message==="string"?result.message:"This login does not have owner permissions. Sign in with your verified owner account.");
  }catch{setMessage("Owner access could not be checked. Please retry.");}
  finally{setPending(false);}
 },[preview,router]);
 useEffect(()=>{if(!started.current){started.current=true;void open();}},[open]);
 return <><p role="status">{message}</p><button className="btn" onClick={open} disabled={pending}>{pending?"Opening Admin Center…":"Open Admin Center"}</button></>;
}
