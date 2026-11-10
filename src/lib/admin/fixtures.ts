import type {DocumentRow,DocumentType} from "../compliance.ts";
import {roleProfile,type PreviewRole} from "./policy.ts";
export const fixtureTypes:DocumentType[]=[
 {id:"type-dot",name:"USDOT / MCS-150",category:"Registration",required:true,renews_every_months:24,sort_order:1},
 {id:"type-insurance",name:"Insurance certificate",category:"Compliance",required:true,renews_every_months:12,sort_order:2},
 {id:"type-dqf",name:"Driver Qualification File",category:"Driver",required:true,renews_every_months:12,sort_order:3}
];
const relative=(days:number)=>new Date(Date.now()+days*86400000).toISOString().slice(0,10);
export function fixtures(role:PreviewRole,scenario="populated"){
 const profile=roleProfile(role);if(profile&&scenario==="unlinked-account")profile.carrier_id=null;const carrierId=profile?.carrier_id||"test-carrier-Basic";
 const docs:DocumentRow[]=[0,1,2,3,4].map((i)=>({id:`test-doc-${i}`,carrier_id:carrierId,type_id:fixtureTypes[i%3].id,file_path:`test-only/${i}`,file_name:`SAMPLE-${i}.txt`,mime_type:"text/plain",issued_on:relative(-100),expires_on:i===0?relative(100):i===1?relative(-5):i===2?relative(10):null,status:i===3?"rejected":i===4?"superseded":"active",notes:"Synthetic test document. No customer data.",created_at:new Date().toISOString()}));
 return {profile,carrier:{id:carrierId,legal_name:`Sample ${role} Transport`,dba:null,usdot:"TEST-ONLY",mc:"TEST-MC",tier:["Basic","Pro","Premium","Ultimate"].includes(role)?role:"Basic",status:role==="new-customer"?"onboarding":"active"},types:fixtureTypes,docs:scenario==="empty"||role==="new-customer"?[]:docs,leads:scenario==="empty"?[]:["new","called","quoted","paid","active","lost"].map((status,i)=>({id:`test-lead-${i}`,name:`Sample contact ${i+1}`,company:"Sample Transport",usdot:"TEST",phone:null,email:`sample${i}@example.test`,source:"preview",status,quoted_price:399,notes:"Test call notes",message:"Synthetic carrier review request",created_at:new Date().toISOString()})),events:[] as {kind:string;detail:string;at:string}[]};
}
export type FixtureData=ReturnType<typeof fixtures>;
