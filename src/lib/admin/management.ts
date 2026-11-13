import 'server-only';
import {ownerIdentity} from './owner';
import {labEnabled} from './policy';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {ManagementError,managementEmpty,managementPayload,type ManagementData,type ManagementRow} from './management-validation';
import {completeOwnerInvitation,deliverOwnerNotifications,queuedOwnerNotifications} from './management-notifications';
export async function managementOwner(){const owner=await ownerIdentity();if(!owner||owner.id==='local-lab-owner'||labEnabled(process.env))throw new ManagementError('Verified production owner authorization required. Preview changes stay in this browser.',403);return owner;}
export async function readManagement(preview=false,page=0):Promise<ManagementData>{
 if(preview)return {...managementEmpty,ready:true,preview:true,notice:'Isolated preview. Changes stay in this browser. No accounts, email or payments are created.'};
 await managementOwner();const client=await createClient();
 const modules={access:['owner_user_access','*'],companyReviews:['owner_company_reviews','*'],documentReviews:['owner_document_reviews','*'],leadWorkflow:['owner_lead_workflow','*'],audit:['owner_management_audit','*'],invitations:['owner_invitation_requests','id,email,full_name,role,carrier_id,user_id,status,created_at'],outbox:['owner_management_outbox','id,kind,invitation_id,document_id,recipient,status,attempts,sent_at,last_error,created_at']} as const;
 const recordPages=await Promise.all(['profiles','carriers','documents','leads'].map(t=>client.from(t).select('id').order('id').range(page*200,page*200+199)));if(recordPages.some(r=>r.error))throw new ManagementError('Record revisions could not be loaded.',503);
 const scopes:Record<string,{column:string;ids:string[]}>={access:{column:'user_id',ids:(recordPages[0].data||[]).map(r=>r.id)},companyReviews:{column:'carrier_id',ids:(recordPages[1].data||[]).map(r=>r.id)},documentReviews:{column:'document_id',ids:(recordPages[2].data||[]).map(r=>r.id)},leadWorkflow:{column:'lead_id',ids:(recordPages[3].data||[]).map(r=>r.id)}};
 const entries=await Promise.all(Object.entries(modules).map(async([key,[table,columns]])=>{const scope=scopes[key];if(scope){const rows:ManagementRow[]=[];for(let i=0;i<scope.ids.length;i+=100){const {data,error}=await client.from(table).select(columns).in(scope.column,scope.ids.slice(i,i+100));if(error)return {key,data:[],error};rows.push(...((data||[]) as unknown as ManagementRow[]));}return {key,data:rows,error:null};}const {data,error}=await client.from(table).select(columns).order('created_at',{ascending:false}).limit(200);return {key,data,error};}));
 // Probe the schema even when no customer records exist yet.
 const {error:setupError}=await client.from('owner_record_versions').select('record_id').limit(1);
 if(setupError||entries.some(e=>e.error))return {...managementEmpty,notice:'Owner management migration is pending or the database could not be read safely. Existing records remain available below.'};
 const ids=recordPages.flatMap(r=>(r.data||[]).map(row=>row.id)),versions:ManagementRow[]=[];for(let i=0;i<ids.length;i+=100){const {data:rows,error:versionError}=await client.from('owner_record_versions').select('*').in('record_id',ids.slice(i,i+100));if(versionError)throw new ManagementError('Record revisions could not be loaded.',503);versions.push(...(rows||[]));}
 const {data,error}=await createAdminClient().auth.admin.listUsers({page:1,perPage:1000});
 // Only safe Auth fields are returned; no identities, hashes, sessions, metadata or tokens.
 const auth=error?[]:data.users.map(u=>({id:u.id,email:u.email,verified:!!u.email_confirmed_at,last_sign_in_at:u.last_sign_in_at,banned:!!u.banned_until&&new Date(u.banned_until).getTime()>Date.now()}));
 return {...managementEmpty,ready:true,...Object.fromEntries(entries.map(e=>[e.key,e.data||[]])),versions,auth,notice:error?'Authentication audit unavailable. No account changes were made.':data.users.length===1000?'Authentication audit shows the first 1,000 identities. Use provider audit for further pages.':undefined} as ManagementData;
}
export async function ownerManagementPost(request:Request){try{
 await managementOwner();if(request.headers.get('origin')!==new URL(request.url).origin)throw new ManagementError('Same-origin request required.',403);
 if(Number(request.headers.get('content-length')||0)>24000)throw new ManagementError('Request too large.',413);const raw=await request.text();if(new TextEncoder().encode(raw).length>24000)throw new ManagementError('Request too large.',413);
 let body;try{body=JSON.parse(raw);}catch{throw new ManagementError('Invalid JSON.');}if(!body||typeof body!=='object'||Array.isArray(body))throw new ManagementError('Invalid request.');
 const {action,id,payload}=managementPayload(body);let result:unknown;
 if(action==='notifications-retry')result=await deliverOwnerNotifications();
 else if(action==='invite-resume')result=await completeOwnerInvitation(id!);
 else{const client=await createClient();const {data,error}=await client.rpc('owner_management_command',{p_action:action,p_id:id,p_payload:payload});if(error)throw new ManagementError(error.code==='42501'?'Verified owner authorization required.':/changed|exists|required|not found|invalid|unsupported|confirm|protected|before|payment|company|review|queued|identity|account|plan/i.test(error.message)?error.message:'Management update was not confirmed.',error.code==='42501'?403:409);result=data;
  if(action==='invite-reserve')result=await completeOwnerInvitation(data.id,true);
  if(action==='document-reminder'||action==='invitation-resend')result={...data,delivery:await queuedOwnerNotifications()};
 }
 return Response.json({ok:true,result},{headers:{'Cache-Control':'no-store'}});
 }catch(e){const error=e instanceof ManagementError?e:new ManagementError('Owner management is temporarily unavailable. No successful change is reported.',503);return Response.json({error:error.message},{status:error.status,headers:{'Cache-Control':'no-store'}});}}
