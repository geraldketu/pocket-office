"use server";
import { requestsConfigured } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewInterview,type Interview,type Choice } from "@/lib/interview-rules";
import {normalizeScreening,allRules,STATE_CODES,screen} from "@/lib/screening";
export async function submitInterview(raw:unknown,email:string,phone:string) {
  if(!requestsConfigured())return {ok:false,message:"Online requests are not open yet. Your review has not been submitted; you can download a copy below."};
  if(!raw||typeof raw!=="object")return {ok:false,message:"Complete the carrier interview."};
  const input=raw as Interview;
  if(typeof input.company!=="string"||!input.company.trim()||input.company.length>120||!Array.isArray(input.states)||input.states.length>50||!input.states.every(s=>STATE_CODES.includes(s)))return {ok:false,message:"Check your company name and operating states."};
  if(typeof email!=="string"||email.length>254||!/^\S+@\S+\.\S+$/.test(email)||typeof phone!=="string"||phone.length>40)return {ok:false,message:"Enter a valid email and phone number."};
  const filings:Record<string,Choice>={};for(const {id} of allRules(input.states)){const value=input.filings?.[id];if(value&&["help","have","self","process"].includes(value))filings[id]=value;}
  const text=(value:unknown)=>typeof value==="string"?value.slice(0,120):"";
  const data:Interview={...normalizeScreening(input),packageSelection:input.packageSelection==="startup"?"startup":"services",company:input.company.trim(),states:[...new Set(input.states)],filings,scope:text(input.scope),base:text(input.base),weight:text(input.weight),kyWeight:text(input.kyWeight),nyWeight:text(input.nyWeight)};
  const review=reviewInterview(data);if(!review.services.length&&!review.bundleCents)return {ok:false,message:"Choose at least one service you need help with."};
  const screening=screen({states:data.states,base:data.base,scope:data.scope,answers:data.answers||{},vehicles:data.vehicles||[]}).map(({rule,...decision})=>({id:rule.id,label:rule.label,verifiedOn:rule.verifiedOn,sources:rule.sources,...decision}));
  try{const {error}=await createAdminClient().from("leads").insert({name:data.company,company:data.company,email,phone:phone||null,source:"carrier-interview",status:"new",message:JSON.stringify({interview:data,review,screening})});if(error)throw error;return {ok:true,message:"Your carrier request was submitted for review. It is unpaid. No payment or filing has been submitted."};}catch{return {ok:false,message:"Your request could not be saved. Download your review and try again later."};}
}
