import "server-only";
import fs from "node:fs";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import worker from "../../../oliverfee-360/worker/index.mjs";
import type {PreviewSession} from "./store";
import {logPreview} from "./store";
type DBAdapter={prepare:(text:string)=>{bind:(...values:unknown[])=>unknown;first:()=>Promise<unknown>;all:()=>Promise<unknown>;run:()=>Promise<unknown>};batch:(statements:{run:()=>Promise<unknown>}[])=>Promise<unknown[]>};
export type Legacy={sql:DatabaseSync;env:{DB:DBAdapter;BUCKET:{put:(key:string,bytes:ArrayBuffer)=>Promise<void>;get:(key:string)=>Promise<{body:Uint8Array}|null>;delete:(key:string)=>Promise<void>};OWNER_EMAIL:string;STRIPE_CHECKOUT_ENABLED:string};user:{id:string;email:string};carrier:string;quote?:string};
export async function legacySession(s:PreviewSession):Promise<Legacy>{
 if(s.legacy)return s.legacy as Legacy;
 const sql=new DatabaseSync(":memory:");const dir=path.join(process.cwd(),"oliverfee-360/drizzle");for(const file of fs.readdirSync(dir).filter(f=>f.endsWith(".sql")).sort())sql.exec(fs.readFileSync(path.join(dir,file),"utf8"));
 const DB:DBAdapter={prepare(text){let args:unknown[]=[];return {bind(...values:unknown[]){args=values;return this;},async first(){return sql.prepare(text).get(...args as never[])||null;},async all(){return {results:sql.prepare(text).all(...args as never[])};},async run(){const result=sql.prepare(text).run(...args as never[]);return {meta:{changes:Number(result.changes)}};}};},async batch(statements){sql.exec("BEGIN");try{const results=[];for(const st of statements)results.push(await st.run());sql.exec("COMMIT");return results;}catch(e){sql.exec("ROLLBACK");throw e;}}};
 const objects=new Map<string,Uint8Array>();const env={DB,BUCKET:{async put(key:string,bytes:ArrayBuffer){objects.set(key,new Uint8Array(bytes));},async get(key:string){return objects.has(key)?{body:objects.get(key)!}:null;},async delete(key:string){objects.delete(key);}},OWNER_EMAIL:"archive-admin@example.test",STRIPE_CHECKOUT_ENABLED:"false"};
 const role=s.role==="archive-driver"?"driver":s.role==="archive-office"?"office":"owner",user={id:"test-archive-"+role,email:s.role==="owner"?env.OWNER_EMAIL:role+"@example.test"};
 const carrier="test-archive-carrier",state={profile:{name:"Sample Archive Transport",logo:""},records:[{id:"test-record-dot",type:"DOT",name:"USDOT registration",date:"2028-01-01",status:"Reviewed"},{id:"test-record-driver",type:"Medical Card",name:"Sample Driver medical card",person:"d1",date:"2026-01-01",status:"Action Needed"}],people:[{id:"d1",name:"Sample Driver",role:"Driver",state:"GA",cdlState:"GA",email:"driver@example.test"},{id:"d2",name:"Other Driver",role:"Driver",state:"CA",cdlState:"CA"},{id:"o1",name:"Sample Office",role:"Office user",state:"GA"}],docs:[],listings:[{id:"test-listing",name:"Sample Driver",city:"Atlanta",state:"GA",equipment:"Dry van",region:"Southeast",contact:"sample@example.test",sample:true}],jobs:[],orders:[],notices:[{id:"test-notice",title:"Sample agency notice",detail:"Synthetic test notice",date:"2026-11-10",status:"New"}],audit:[],requests:[],plan:"Basic",broker:"",setupTerms:{version:1},onboard:{scope:"Across state lines (interstate)",hire:"Yes, for hire",cargo:"Regulated freight",weightBand:"Over 26,000 lb",axles:"3 or more",placards:"No",units:1,base:"GA",states:"GA, KY, NY, CA",ucrYear:"2027",ucrVehicles:1,hazmat:"No",serviceChoices:{DOT:"have",KYU:"help","NY HUT":"omit"},startupServices:[],requestedServices:[],quotes:{}},application:{company:"Sample Archive Transport",filings:{DOT:{status:"have",number:"TEST-ONLY",activation:"Active"}}}};
 if(s.scenario==="empty"){state.records=[];state.people=[];state.listings=[];state.notices=[];}
 sql.prepare("INSERT INTO carriers VALUES(?,?,?)").run(carrier,"Sample Archive Transport",new Date().toISOString());sql.prepare("INSERT INTO carriers VALUES(?,?,?)").run("other-test-carrier","Other sample company",new Date().toISOString());
 sql.prepare("INSERT INTO workspaces VALUES(?,?,0)").run(carrier,JSON.stringify(s.scenario==="empty"?{...state,onboard:null,application:null,setupTerms:null}:state));sql.prepare("INSERT INTO workspaces VALUES(?,?,0)").run("other-test-carrier",JSON.stringify({...state,profile:{name:"Other sample company"}}));
 if(s.scenario!=="no-accounts")sql.prepare("INSERT INTO memberships(carrier_id,email,user_id,role,person_id) VALUES(?,?,?,?,?)").run(carrier,user.email,user.id,role,role==="driver"?"d1":null);
 sql.prepare("INSERT INTO national_diesel_rate VALUES(1,?,?)").run(4.25,"2026-11-10");
 const file="test-archive-file",bytes=new TextEncoder().encode("OLIVERFEE 360 TEST ONLY FILE");objects.set(carrier+"/"+file,bytes);
 if(s.scenario!=="empty")sql.prepare("INSERT INTO files VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(file,carrier,"d1","test-record-driver","Medical Card","SAMPLE.txt","text/plain",bytes.length,"2027-01-01",user.id,new Date().toISOString());
 const result:Legacy={sql,env,user,carrier};s.legacy=result;
 if(s.scenario.includes("quote")){
  if(s.scenario!=="pending-quote"){state.onboard.serviceChoices={DOT:"have",KYU:"omit","NY HUT":"omit"};state.application.filings={DOT:{status:"have",number:"TEST-ONLY",activation:"Active"}};sql.prepare("UPDATE workspaces SET state=? WHERE carrier_id=?").run(JSON.stringify(state),carrier);}
  const created=await legacyCall(s,"/api/carriers/"+carrier+"/quotes","POST",JSON.stringify({selection:s.scenario==="pending-quote"?{kind:"quote"}:{kind:"plan",plan:"Basic"}}));if(!created)throw Error("Test quote creation failed");const data=await created.json();result.quote=data.id;
  if(["signed-quote","paid-quote","stale-quote"].includes(s.scenario))await legacyCall(s,`/api/carriers/${carrier}/quotes/${result.quote}/sign`,"POST",JSON.stringify({signature:"Sample Carrier",acknowledged:true}));
  if(s.scenario==="paid-quote")sql.prepare("UPDATE quote_reviews SET status=?,paid_cents=? WHERE id=?").run("Ready to Process",4999,result.quote!);
  if(s.scenario==="stale-quote"){state.application.company="Changed sample company";sql.prepare("UPDATE workspaces SET state=? WHERE carrier_id=?").run(JSON.stringify(state),carrier);}
 }
 return result;
}
export async function legacyCall(s:PreviewSession,target:string,method="GET",body?:BodyInit,contentType="application/json"){
 if(target==="/api/preview-outbox"&&method==="POST"){logPreview(s,"SIMULATED NOTIFICATION","Archived driver email captured. No mail client or delivery provider was opened.");return Response.json({ok:true});}
 const instance=await legacySession(s);if(target==="/api/session"&&s.scenario==="connection-error")return Response.json({error:"Simulated secure-office connection failure"},{status:503});if(!target.startsWith("/api/")||target.includes("://")||target.includes("\\"))return Response.json({error:"External request blocked"},{status:403});
 // Never pass process.env, caller identity headers, credentials or a network adapter to the original Worker.
 const request=new Request("https://isolated-worker.test"+target,{method,headers:{Origin:"https://isolated-worker.test","oai-authenticated-user-id":instance.user.id,"oai-authenticated-user-email":instance.user.email,"Content-Type":contentType},body:["GET","HEAD"].includes(method)?undefined:body});
 if(!["GET","HEAD"].includes(method))logPreview(s,"archived test operation",method+" "+target);
 const response=(await worker.fetch(request,instance.env as never))||new Response("Not found",{status:404});
 if(method==="POST"&&/^\/api\/carriers\/[^/]+\/quotes$/.test(target)&&response.ok){
  const quote=await response.clone().json();instance.quote=quote.id;instance.carrier=target.split("/")[3];
  const path=`/archive?screen=customer-review&carrier=${instance.carrier}&quote=${quote.id}`;
  quote.path=`/admin/preview/${s.id}?path=${encodeURIComponent(path)}`;
  return Response.json(quote,{status:response.status});
 }
 if(method==="GET"&&/^\/api\/carriers\/[^/]+\/quotes\/[^/]+$/.test(target)&&response.ok){instance.quote=target.split("/")[5];instance.carrier=target.split("/")[3];}
 return response;
}
export async function archivedHTML(s:PreviewSession,screen:string,requestedCarrier?:string|null,requestedQuote?:string|null){
 const instance=await legacySession(s),base=`/admin/api/preview/${s.id}`;
 const screens=["dashboard","onboarding","compliance","documents","fleet","audit","board","bid","supplies","notices","plans","review","member","accounts","customer-review"];
 if(!screens.includes(screen))screen="member";
 if(requestedQuote){
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(requestedQuote)||!requestedCarrier||!/^[a-zA-Z0-9_-]{1,100}$/.test(requestedCarrier))throw Object.assign(Error("Invalid test review link"),{status:403});
  const access=await legacyCall(s,`/api/carriers/${requestedCarrier}/quotes/${requestedQuote}`);if(!access.ok)throw Object.assign(Error("Test quote access denied"),{status:access.status});
 }
 const bootstrap=`(()=>{const base=${JSON.stringify(base)},screen=${JSON.stringify(screen)},carrier=${JSON.stringify(instance.carrier)},quote=${JSON.stringify(instance.quote||null)};const original=window.fetch.bind(window);window.fetch=(input,options={})=>{const target=String(input);if(!target.startsWith('/api/'))return Promise.reject(Error('External request blocked in preview'));return original(base+'/legacy?path='+encodeURIComponent(target),options);};const data=new Map([['oliverfee-360-workspace-v1',JSON.stringify({records:[{id:'sample-browser-record',type:'Other',name:'Synthetic browser import',status:'New'}],docs:[]})]]);Object.defineProperty(window,'localStorage',{value:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),clear:()=>data.clear()}});window.open=()=>null;document.addEventListener('click',e=>{const a=e.target.closest?.('a[href]');if(!a)return;const href=a.getAttribute('href');if(href.startsWith('#')||href.startsWith('blob:'))return;e.preventDefault();e.stopImmediatePropagation();},true);document.addEventListener('submit',e=>{const action=e.target.getAttribute('action');if(action&& !action.startsWith('#')){e.preventDefault();e.stopImmediatePropagation();}},true);window.history.replaceState(null,'',location.pathname+'?carrier='+carrier+(quote?'&quote='+quote:'')+'#'+screen);window.addEventListener('load',()=>{let tries=0;const timer=setInterval(()=>{if(typeof activeCarrier!=='undefined'&&activeCarrier){clearInterval(timer);if(!quote){location.hash=screen;window.dispatchEvent(new Event('hashchange'));}}else if(++tries>500)clearInterval(timer);},20);});})();`;
 return fs.readFileSync(path.join(process.cwd(),"oliverfee-360/web/index.html"),"utf8").replace("<head>","<head><script>"+bootstrap+"</script>");
}
export function archiveAsset(name:string){
 if(!["index.html","style.css","landing.css","rules.js","state-workflows.js","advanced.js","app.js","brand-lock.svg"].includes(name))return null;
 const bytes=fs.readFileSync(path.join(process.cwd(),"oliverfee-360/web",name));
 if(name==="app.js"){
  const original="location.href='mailto:'+encodeURIComponent(driver.email||'')+'?subject='+subject+'&body='+body;";
  const source=bytes.toString("utf8");if(!source.includes(original))throw Error("Archived email transport changed; re-audit its preview isolation before serving it.");
  return Buffer.from(source.replace(original,"officeAPI('/api/preview-outbox',{method:'POST',body:JSON.stringify({kind:'driver-test-email'})}).then(()=>toast('Preview notification simulated. No email sent.'));"));
 }
 return bytes;
}
