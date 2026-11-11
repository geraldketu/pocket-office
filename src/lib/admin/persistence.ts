import {createCipheriv,createDecipheriv,createHmac,randomBytes} from "node:crypto";

// Only synthetic preview state is persisted. Neither customer tables nor carrier-files are used.
export const PREVIEW_BUCKET="oliverfee-admin-preview";
export function previewSecret(env:Record<string,string|undefined>){
 if(env.OLIVERFEE_PREVIEW_SECRET){if(!/^[a-f0-9]{64}$/.test(env.OLIVERFEE_PREVIEW_SECRET))throw Error("Preview encryption is not configured");return env.OLIVERFEE_PREVIEW_SECRET;}
 const key=env.SUPABASE_SERVICE_ROLE_KEY,url=env.NEXT_PUBLIC_SUPABASE_URL;
 if(!key||key.length<30||!url)throw Error("Isolated preview storage is not configured");
 // Purpose-separated server-only key. Existing deployments need no new env var.
 // Rotating the service key invalidates only temporary preview snapshots.
 return createHmac("sha256",key).update("oliverfee360/admin-preview/v1|"+url).digest("hex");
}
export function seal(value:unknown,secret:string){
 const key=Buffer.from(secret,"hex");if(key.length!==32)throw Error("Preview encryption is not configured");
 const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key,iv);
 const bytes=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);
 return Buffer.concat([iv,cipher.getAuthTag(),bytes]);
}
export function unseal(bytes:Uint8Array,secret:string){
 const key=Buffer.from(secret,"hex");if(key.length!==32)throw Error("Preview encryption is not configured");
 const data=Buffer.from(bytes),decipher=createDecipheriv("aes-256-gcm",key,data.subarray(0,12));
 decipher.setAuthTag(data.subarray(12,28));return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)),decipher.final()]).toString());
}
export class PreviewStorage {
 private url:string;private key:string;private secret:string;private transport:typeof fetch;
 constructor(url:string,key:string,secret:string,transport:typeof fetch=fetch){this.url=url;this.key=key;this.secret=secret;this.transport=transport;}
 private async request(path:string,init:RequestInit={}){
  const r=await this.transport(`${this.url}/storage/v1/${path}`,{...init,cache:"no-store",headers:{apikey:this.key,Authorization:`Bearer ${this.key}`,...init.headers},signal:AbortSignal.timeout(15000)});
  return r;
 }
 private name(owner:string,id:string){if(!/^[a-zA-Z0-9_-]{1,80}$/.test(owner)||! /^(?:[a-f0-9]{48})$/.test(id))throw Error("Invalid preview identity");return `${owner}/${id}`;}
 async ensurePrivateBucket(){
  const inspect=async()=>this.request(`bucket/${PREVIEW_BUCKET}`);
  let r=await inspect();
  if(!r.ok){const message=await r.text();if(r.status!==404&&!/not.?found/i.test(message))throw Error("Could not verify isolated preview storage");
   const created=await this.request("bucket",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:PREVIEW_BUCKET,name:PREVIEW_BUCKET,public:false,file_size_limit:10_000_000,allowed_mime_types:["application/octet-stream"]})});
   if(!created.ok&&!/already exists|duplicate/i.test(await created.text()))throw Error("Could not create private preview storage");r=await inspect();
  }
  if(!r.ok||(await r.json()).public!==false)throw Error("Preview storage must be private. Existing bucket settings were not changed.");
 }
 async read(owner:string,id:string){
  const r=await this.request(`object/${PREVIEW_BUCKET}/${this.name(owner,id)}.bin`);if(r.status===404||r.status===400&&/not.?found/i.test(await r.clone().text()))return null;
  if(!r.ok)throw Error("Private preview storage is unavailable");return unseal(new Uint8Array(await r.arrayBuffer()),this.secret);
 }
 async write(owner:string,id:string,value:unknown,create=false){
  const body=seal(value,this.secret);if(body.length>10_000_000)throw Error("Preview is too large. Reset test data to continue.");
  const r=await this.request(`object/${PREVIEW_BUCKET}/${this.name(owner,id)}.bin`,{method:"POST",headers:{"Content-Type":"application/octet-stream","x-upsert":String(!create)},body:new Uint8Array(body)});
  if(!r.ok)throw Error("Could not save isolated preview state");
 }
 async remove(owner:string,id:string){const r=await this.request(`object/${PREVIEW_BUCKET}`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({prefixes:[this.name(owner,id)+".bin"]})});if(!r.ok)throw Error("Could not remove test session");}
 async locked<T>(owner:string,id:string,work:()=>Promise<T>):Promise<T>{
  const name=this.name(owner,id)+".lock";let acquired=false;
  // Storage INSERT uniqueness is the distributed mutex. Never steal a lock: a crashed
  // request leaves only this test session unavailable; starting a new preview is safe.
  for(let i=0;i<40;i++){
   const r=await this.request(`object/${PREVIEW_BUCKET}/${name}`,{method:"POST",headers:{"Content-Type":"application/octet-stream","x-upsert":"false"},body:new Uint8Array([1])});
   if(r.ok){acquired=true;break;}
   const error=await r.text();if(r.status!==409&&!/duplicate|already exists/i.test(error))throw Error("Could not lock isolated preview");
   await new Promise(resolve=>setTimeout(resolve,150));
  }
  if(!acquired)throw Error("This preview is busy. Retry, or start a new preview if a prior request was interrupted.");
  try{return await work();}finally{
   const r=await this.request(`object/${PREVIEW_BUCKET}`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({prefixes:[name]})});if(!r.ok)throw Error("Could not release test session. Start a new preview.");
  }
 }
}
