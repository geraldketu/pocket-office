"use server";
import { requestsConfigured } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewInterview,serviceNames,type Interview,type Service,type Choice } from "@/lib/interview-rules";
export async function submitInterview(raw:unknown,email:string,phone:string) {
  if(!requestsConfigured())return {ok:false,message:"Online requests are not open yet. Your review has not been submitted; you can download a copy below."};
  if(!raw||typeof raw!=="object")return {ok:false,message:"Complete the carrier interview."};
  const input=raw as Interview;
  if(typeof input.company!=="string"||!input.company.trim()||input.company.length>120||!Array.isArray(input.states)||input.states.length>60||!input.states.every(s=>typeof s==="string"&&/^[A-Z]{2}$/.test(s)))return {ok:false,message:"Check your company name and operating states."};
  if(typeof email!=="string"||email.length>254||!/^\S+@\S+\.\S+$/.test(email)||typeof phone!=="string"||phone.length>40)return {ok:false,message:"Enter a valid email and phone number."};
  const filings:Partial<Record<Service,Choice>>={};for(const key of Object.keys(serviceNames) as Service[]){const value=input.filings?.[key];if(value&&["help","have","self","process"].includes(value))filings[key]=value;}
  const text=(value:unknown)=>typeof value==="string"?value.slice(0,120):"";
  const data:Interview={company:input.company.trim(),states:input.states,filings,scope:text(input.scope),base:text(input.base),weight:text(input.weight),kyWeight:text(input.kyWeight),nyWeight:text(input.nyWeight)};
  const review=reviewInterview(data);if(!review.services.length)return {ok:false,message:"Choose at least one service you need help with."};
  try{const {error}=await createAdminClient().from("leads").insert({name:data.company,company:data.company,email,phone:phone||null,source:"carrier-interview",status:"new",message:JSON.stringify({interview:data,review})});if(error)throw error;return {ok:true,message:"Your carrier request was submitted for review. It is unpaid. No payment or filing has been submitted."};}catch{return {ok:false,message:"Your request could not be saved. Download your review and try again later."};}
}
