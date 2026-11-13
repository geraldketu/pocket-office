import 'server-only';
import {SalesInputError} from './input-error';
import {createClient} from '@/lib/supabase/server';
import {ownerIdentity} from '@/lib/admin/owner';
import {authConfigured} from '@/lib/config';
import {redirect} from 'next/navigation';
import {DISPOSITIONS,emptyMetrics,type Representative,type SalesData,type Prospect,type Application,type Checkout,type Commission,type Resource,type Activity} from './types';
export class SalesError extends Error{constructor(message:string,public status=400){super(message);}}
export async function salesIdentity(){
 if(!authConfigured())return null;
 try{const client=await createClient();const {data:{user},error}=await client.auth.getUser();if(error||!user?.email_confirmed_at||user.is_anonymous)return null;
  const [{data:rep,error:repError},{data:profile,error:profileError}]=await Promise.all([client.from('sales_representatives').select('*').eq('user_id',user.id).maybeSingle(),client.from('profiles').select('id,role,carrier_id').eq('id',user.id).single()]);
  if(repError||profileError||!rep||rep.user_id!==user.id||rep.status!=='active'||rep.email.toLowerCase()!==user.email?.toLowerCase()||profile?.id!==user.id||profile.role!=='carrier'||profile.carrier_id)return null;
  return rep as Representative;
 }catch{return null;}
}
export async function requireSales(){const rep=await salesIdentity();if(!rep)redirect('/sales/login?error=access');return rep;}
export async function actor(management=false){
 if(management){const owner=await ownerIdentity();if(!owner)throw new SalesError('Owner access required.',403);return {id:owner.id,owner:true,rep:null};}
 const rep=await salesIdentity();if(!rep)throw new SalesError('An active sales representative account is required.',403);return {id:rep.user_id,owner:false,rep};
}
export async function salesData(management=false,page=0,query='',status='All'):Promise<SalesData>{
 const who=await actor(management),client=await createClient();
 let list=client.from('sales_prospects').select('*').order('created_at',{ascending:false}).order('id').range(page*30,page*30+30);
 if(!who.owner)list=list.eq('assigned_to',who.id);if(query)list=list.ilike('company_name','%'+query.replace(/[%_\\]/g,'')+'%');
 if(status==='Due')list=list.lte('follow_up_at',new Date().toISOString()).not('disposition','in','("Closed Sale","Do Not Contact","Not Interested")');
 else if((DISPOSITIONS as readonly string[]).includes(status))list=list.eq('disposition',status);
 const {data:prospects,error}=await list;if(error)throw new SalesError('Sales database setup is pending or temporarily unavailable.',503);
 const visible=(prospects||[]).slice(0,30) as Prospect[];const ids=visible.map(p=>p.id);
 const {data:applications,error:applicationError}=ids.length?await client.from('sales_applications').select('*').in('prospect_id',ids):{data:[],error:null};
 if(applicationError)throw new SalesError('Applications could not be loaded.',503);
 const appIds=(applications||[]).map(a=>a.id);
 const [resources,checkouts,commissions,activity,reps,metrics,outbox]=await Promise.all([
  client.from('sales_resources').select('*').order('title').limit(30),
  appIds.length?client.from('sales_checkout_attempts').select('id,application_id,status,checkout_url,amount_cents,plan_key').in('application_id',appIds).order('created_at',{ascending:false}):Promise.resolve({data:[],error:null}),
  client.from('sales_commissions').select('id,application_id,rep_id,amount_cents,status').order('created_at',{ascending:false}).limit(100),
  client.from('sales_activity').select('*').order('created_at',{ascending:false}).limit(100),
  who.owner?client.from('sales_representatives').select('*').order('name').limit(500):Promise.resolve({data:[who.rep],error:null}),
  who.owner?client.rpc('sales_management_metrics'):client.rpc('sales_metrics'),
  who.owner?client.from('sales_outbox').select('id,kind,recipient,status,attempts,last_error').neq('status','sent').order('created_at').limit(100):Promise.resolve({data:[],error:null})
 ]);
 if([resources,checkouts,commissions,activity,reps,metrics,outbox].some(v=>v.error))throw new SalesError('Sales records could not be loaded safely. Retry after database setup.',503);
 return {representative:who.rep,representatives:(reps.data||[]) as Representative[],prospects:visible,applications:(applications||[]) as Application[],checkouts:(checkouts.data||[]) as Checkout[],commissions:(commissions.data||[]) as Commission[],resources:(resources.data||[]) as Resource[],activity:(activity.data||[]) as Activity[],metrics:{...emptyMetrics,...metrics.data},page,hasMore:(prospects||[]).length>30,outbox:outbox.data||[]};
}
export async function command(action:string,id:string|null,payload:Record<string,unknown>){
 const client=await createClient();const {data,error}=await client.rpc('sales_command',{p_action:action,p_id:id,p_payload:payload});
 if(error){const known=/assigned|contact|changed|locked|complete|active|owner|required|valid|only|too long|checkout|conflict|unavailable|pending/i.test(error.message);throw new SalesError(known?error.message:'Sales update failed. No successful update was reported.',error.code==='42501'?403:409);}return data;
}
export function sameOrigin(request:Request){if(request.headers.get('origin')!==new URL(request.url).origin)throw new SalesError('Same-origin requests required.',403);}
export async function requestBody(request:Request){if(Number(request.headers.get('content-length')||0)>1_600_000)throw new SalesError('Request is too large.',413);const raw=await request.text();if(new TextEncoder().encode(raw).length>1_600_000)throw new SalesError('Request is too large.',413);let data;try{data=JSON.parse(raw);}catch{throw new SalesError('Invalid JSON.');}if(!data||typeof data!=='object'||Array.isArray(data))throw new SalesError('Invalid request.');return data as Record<string,unknown>;}
export function salesFailure(error:unknown){const e=error instanceof SalesError?error:error instanceof SalesInputError?new SalesError(error.message,400):new SalesError('Sales service is temporarily unavailable.',503);return Response.json({error:e.message},{status:e.status,headers:{'Cache-Control':'no-store'}});}

export async function representativeDestination(id:string){try{const client=await createClient();const {data,error}=await client.from("sales_representatives").select("status").eq("user_id",id).maybeSingle();if(error||!data)return null;return data.status==="active"?"/sales":"/sales/login?error=access";}catch{return null;}}
