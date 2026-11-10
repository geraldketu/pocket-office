import "server-only";
import {randomBytes} from "node:crypto";
import {fixtures,type FixtureData} from "./fixtures";
import {PREVIEW_ROLES,type PreviewRole,startPage} from "./policy";
export type PreviewSession={id:string;ownerId:string;role:PreviewRole;scenario:string;expires:number;data:FixtureData;legacy?:unknown;invitation?:{carrierId:string;name:string;email:string}};
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
export function resetPreview(s:PreviewSession){closeLegacy(s);s.data=fixtures(s.role,s.scenario);s.invitation=undefined;}
export function logPreview(s:PreviewSession,kind:string,detail:string){s.data.events.push({kind,detail,at:new Date().toISOString()});}
export function previewLocation(s:PreviewSession,path=startPage(s.role)){return `/admin/preview/${s.id}/view${path==="/"?"/":path}`;}
