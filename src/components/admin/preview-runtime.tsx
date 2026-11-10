"use client";
import {createContext,useContext,useEffect,useRef,useState} from "react";
import type {PreviewRole} from "@/lib/admin/policy";
type Runtime={id:string;role:PreviewRole;scenario:string;call:(op:string,data?:Record<string,unknown>)=>Promise<Record<string,unknown>>;navigate:(path:string)=>void;path:(path:string)=>string};
const PreviewContext=createContext<Runtime|null>(null);
export const usePreview=()=>useContext(PreviewContext);
export function PreviewRuntime({id,role,scenario,children}:{id:string;role:PreviewRole;scenario:string;children:React.ReactNode}){
 const container=useRef<HTMLDivElement>(null),[message,setMessage]=useState("");
 const prefix=`/admin/preview/${id}/view`;
 const path=(value:string)=>prefix+(value==="/"?"/":value);
 const navigate=(value:string)=>{if(!value.startsWith("/")||value.startsWith("//")||value.includes("\\"))return;window.location.assign(path(value));};
 const call=async(op:string,data:Record<string,unknown>={})=>{const response=await fetch(`/admin/api/preview/${id}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({op,...data})});const body=await response.json();if(!response.ok)throw Error(body.error||"Test action failed");return body;};
 useEffect(()=>{
  const root=container.current;if(!root)return;
  const rewrite=()=>{root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(a=>{const raw=a.getAttribute("href")||"";if(raw.startsWith("blob:")||raw.startsWith("#"))return;try{const url=new URL(raw,location.origin);if(url.origin!==location.origin)return;if(url.pathname.startsWith(prefix)||url.pathname.startsWith(`/admin/api/preview/${id}/`))return;const original=url.pathname+url.search+url.hash;a.dataset.previewPath=original;a.href=path(original);a.target="_self";}catch{}});};
  const click=(event:MouseEvent)=>{const a=(event.target as Element)?.closest<HTMLAnchorElement>("a[href]");if(!a||!root.contains(a))return;const href=a.getAttribute("href")||"";if(href.startsWith("blob:")||href.startsWith("#"))return;event.preventDefault();event.stopImmediatePropagation();if(href.startsWith(prefix)){window.location.assign(href);return;}try{const url=new URL(href,location.origin);if(url.origin===location.origin){navigate(a.dataset.previewPath||url.pathname+url.search+url.hash);return;}}catch{}setMessage("External navigation / contact blocked in preview. Inspect the destination in the link; no message or call was made.");void call("external",{destination:href});};
  const submit=(event:SubmitEvent)=>{const form=event.target as HTMLFormElement;if(form.getAttribute("action")==="/auth/signout"){event.preventDefault();event.stopImmediatePropagation();void call("signout").then(()=>navigate("/login"));}};
  rewrite();const observer=new MutationObserver(rewrite);observer.observe(root,{childList:true,subtree:true});document.addEventListener("click",click,true);document.addEventListener("submit",submit,true);return()=>{observer.disconnect();document.removeEventListener("click",click,true);document.removeEventListener("submit",submit,true);};
 // Navigation is a full request within this session; no preview cookie replaces the owner's authentication.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[id]);
 return <PreviewContext.Provider value={{id,role,scenario,call,navigate,path}}><div ref={container} data-preview-session={id}>{message&&<p className="notice" role="status">{message}</p>}{children}</div></PreviewContext.Provider>;
}
