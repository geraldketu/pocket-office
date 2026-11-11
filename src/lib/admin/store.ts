import "server-only";
import {PreviewStorage} from "./persistence";
import {labEnabled} from "./policy";
import type {LegacySnapshot,Legacy} from "./legacy";
import {randomBytes} from "node:crypto";
import {fixtures,type FixtureData} from "./fixtures";
import {PREVIEW_ROLES,type PreviewRole,startPage} from "./policy";
export type PreviewSession={id:string;ownerId:string;role:PreviewRole;scenario:string;expires:number;data:FixtureData;legacy?:unknown;snapshot?:LegacySnapshot;invitation?:{carrierId:string;name:string;email:string}};
const globalStore=globalThis as typeof globalThis&{oliverPreviewSessions?:Map<string,PreviewSession>;oliverLabToken?:string};
const sessions=globalStore.oliverPreviewSessions??=new Map<string,PreviewSession>();
export function labToken(){return globalStore.oliverLabToken??=randomBytes(32).toString("hex");}
export function createPreview(ownerId:string,role:PreviewRole,scenario="populated"){
 if(!PREVIEW_ROLES.includes(role))throw Error("Unknown test role");
 for(const [id,s]of sessions)if(s.expires<Date.now()){closeLegacy(s);sessions.delete(id);}
 if(sessions.size>=500)throw Error("Preview capacity reached; reset or expire a session first.");
 const id=randomBytes(24).toString("hex"),s:PreviewSession={id,ownerId,role,scenario,expires:Date.now()+4*3600000,data:fixtures(role,scenario)};sessions.set(id,s);return s;
}
export function getPreview(id:string,ownerId:string){const s=sessions.get(id);return s&&s.ownerId===ownerId&&s.expires>Date.now()?s:null;}
function closeLegacy(s:PreviewSession){try{(s.legacy as {sql?:{close:()=>void}}|undefined)?.sql?.close();}catch{}s.legacy=undefined;}
export function deletePreview(id:string,ownerId:string){const s=getPreview(id,ownerId);if(!s)return false;closeLegacy(s);sessions.delete(id);return true;}
export function resetPreview(s:PreviewSession){closeLegacy(s);s.data=fixtures(s.role,s.scenario);s.invitation=undefined;s.snapshot=undefined;}
export function logPreview(s:PreviewSession,kind:string,detail:string){s.data.events.push({kind,detail,at:new Date().toISOString()});}
export function previewLocation(s:PreviewSession,path=startPage(s.role)){return `/admin/preview/${s.id}/view${path==="/"?"/":path}`;}

function durable(){return !labEnabled(process.env)&&process.env.NODE_ENV==="production";}
function storage(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY,secret=process.env.OLIVERFEE_PREVIEW_SECRET;
 if(!url||!key||!secret)throw Error("Isolated preview storage is not configured");return new PreviewStorage(url,key,secret);
}
export async function openPreview(ownerId:string,role:PreviewRole,scenario="populated"){
 const s=createPreview(ownerId,role,scenario);if(durable()){await storage().write(ownerId,s.id,s,true);sessions.delete(s.id);}return s;
}
export async function withPreviewRead<T>(id:string,ownerId:string,work:(s:PreviewSession|null)=>Promise<T>):Promise<T>{
 if(!/^[a-f0-9]{48}$/.test(id))return work(null);
 if(!durable())return work(getPreview(id,ownerId));
 const s=await storage().read(ownerId,id) as PreviewSession|null;
 return work(s&&s.id===id&&s.ownerId===ownerId&&s.expires>Date.now()?s:null);
}
export async function withPreview<T>(id:string,ownerId:string,work:(s:PreviewSession|null)=>Promise<T>):Promise<T>{
 if(!/^[a-f0-9]{48}$/.test(id))return work(null);
 if(!durable())return work(getPreview(id,ownerId));
 const db=storage();return db.locked(ownerId,id,async()=>{
  const s=await db.read(ownerId,id) as PreviewSession|null;
  if(!s||s.id!==id||s.ownerId!==ownerId||s.expires<Date.now())return work(null);
  const before=JSON.stringify(s);try{return await work(s);}finally{
   try{if(s.legacy){const {snapshotLegacy}=await import("./legacy");s.snapshot=snapshotLegacy(s.legacy as Legacy);}const {legacy,...saved}=s;void legacy;if(JSON.stringify(saved)!==before)await db.write(ownerId,id,saved);}finally{closeLegacy(s);}
  }
 });
}
export async function removePreview(id:string,ownerId:string){
 if(!durable())return deletePreview(id,ownerId);
 if(!/^[a-f0-9]{48}$/.test(id))return false;
 const db=storage();return db.locked(ownerId,id,async()=>{const s=await db.read(ownerId,id);if(!s||s.ownerId!==ownerId)return false;await db.remove(ownerId,id);return true;});
}
