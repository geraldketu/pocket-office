import 'server-only';
import {createHash,createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {createAdminClient} from '@/lib/supabase/admin';
import {sendEmail,inviteEmailHtml} from '@/lib/email';
import {ManagementError} from './management-validation';
function origin(){const site=process.env.NEXT_PUBLIC_SITE_URL;if(site!=='https://oliverfee360.com')throw new ManagementError('Configure the canonical production site URL before sending invitations.',503);return site;}
function key(){const k=process.env.OWNER_MANAGEMENT_EMAIL_KEY||process.env.OLIVERFEE_PREVIEW_SECRET||'';if(!/^[a-f0-9]{64}$/i.test(k))throw new ManagementError('Secure notification encryption is not configured.',503);return createHash('sha256').update('oliverfee-owner-management:'+k).digest();}
function encrypt(v:string){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key(),iv);const body=Buffer.concat([c.update(v),c.final()]);return Buffer.concat([iv,c.getAuthTag(),body]).toString('base64');}
function decrypt(v:string){const b=Buffer.from(v,'base64'),c=createDecipheriv('aes-256-gcm',key(),b.subarray(0,12));c.setAuthTag(b.subarray(12,28));return Buffer.concat([c.update(b.subarray(28)),c.final()]).toString();}
export async function queuedOwnerNotifications(){try{return await deliverOwnerNotifications();}catch{return {pending:true,sent:0,message:'The notification is queued. Delivery is not confirmed; review configuration and retry the queue.'};}}
export async function completeOwnerInvitation(requestId:string,create=false){
 const service=createAdminClient();const {data:r,error}=await service.from('owner_invitation_requests').select('*').eq('id',requestId).single();if(error||!r||r.status==='cancelled')throw new ManagementError('Invitation request could not be loaded.',409);
 if(r.status==='ready')return {requestId,delivery:await queuedOwnerNotifications()};
 let userId=r.user_id;
 if(!userId){if(!create)throw new ManagementError('Account creation requires operator review. The pending request was retained; no duplicate account was created.',409);
  const {data,error:created}=await service.auth.admin.createUser({email:r.email,email_confirm:false,user_metadata:{full_name:r.full_name}});
  if(created||!data.user)throw new ManagementError('Account creation was not confirmed. Existing accounts were not changed; the pending request remains for review.',409);
  userId=data.user.id;const {error:save}=await service.from('owner_invitation_requests').update({user_id:userId}).eq('id',requestId).eq('status','pending');if(save)throw new ManagementError('Account created, but invitation preparation requires operator review. Do not create another account.',503);
 }
 const {error:linked}=await service.rpc('owner_complete_invitation',{p_request:requestId,p_user:userId});if(linked)throw new ManagementError('Invitation exists, but company access could not be confirmed. Retry this request rather than creating another account.',409);
 return {requestId,delivery:await queuedOwnerNotifications()};
}
export async function deliverOwnerNotifications(){
 if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM)return {pending:true,sent:0,message:'Email delivery is not configured. Notification remains queued.'};origin();key();
 const service=createAdminClient();const {data:items,error}=await service.rpc('owner_claim_notifications');if(error)throw new ManagementError('Notification queue could not be claimed.',503);let sent=0,failed=0;
 for(const item of items||[]){try{let subject:string,html:string;let dedupe='owner-notification-'+item.id;
  if(item.kind==='invitation'){
   const {data:request,error:requestError}=await service.from('owner_invitation_requests').select('user_id,email,status').eq('id',item.invitation_id).single();if(requestError||request?.status!=='ready'||request.email!==item.recipient)throw Error('Invitation identity unavailable');
   const {data:profile,error:profileError}=await service.from('profiles').select('role,email').eq('id',request.user_id).single();const {data:access,error:accessError}=await service.from('owner_user_access').select('active').eq('user_id',request.user_id).maybeSingle();
   if(profileError||accessError||!profile||profile.role==='admin'||profile.email.toLowerCase()!==item.recipient||access?.active===false)throw Error('Invitation access unavailable');
   let link:string;if(item.encrypted_link&&item.link_created_at&&Date.now()-Date.parse(item.link_created_at)<30*60000)link=decrypt(item.encrypted_link);
   else{const {data,error:generated}=await service.auth.admin.generateLink({type:'magiclink',email:item.recipient});if(generated||data.user?.id!==request.user_id||!data.properties?.hashed_token)throw Error('Setup link unavailable');const url=new URL(origin()+'/auth/confirm');url.searchParams.set('token_hash',data.properties.hashed_token);url.searchParams.set('type','magiclink');url.searchParams.set('next','/set-password');link=url.href;item.link_created_at=new Date().toISOString();const {error:saved}=await service.from('owner_management_outbox').update({encrypted_link:encrypt(link),link_created_at:item.link_created_at}).eq('id',item.id);if(saved)throw Error('Secure queue unavailable');}
   dedupe+='-'+item.link_created_at;subject='Your OliverFee 360 account invitation';html=inviteEmailHtml('your company',link);
  }else{const {data:doc,error:docError}=await service.from('documents').select('carrier_id').eq('id',item.document_id).single();if(docError||!doc)throw Error('Document unavailable');const {data:company,error:companyError}=await service.from('carriers').select('email,status').eq('id',doc.carrier_id).single();if(companyError||!company||company.email!==item.recipient||['paused','cancelled'].includes(company.status))throw Error('Company access unavailable');subject='OliverFee 360 document reminder';html='<p>Please sign in to your existing OliverFee 360 dashboard to review your document requirements and expiration dates.</p><p><a href="'+origin()+'/login">Open your dashboard</a></p>';}
  if(!await sendEmail(item.recipient,subject,html,dedupe))throw Error('Delivery not confirmed');const {error:saved}=await service.from('owner_management_outbox').update({status:'sent',sent_at:new Date().toISOString(),lease_until:null,last_error:null}).eq('id',item.id);if(saved)throw Error('Delivery acceptance could not be saved');sent++;
 }catch{failed++;await service.from('owner_management_outbox').update({status:'failed',lease_until:new Date(Date.now()+60000).toISOString(),last_error:'Delivery not confirmed. Review configuration and retry.'}).eq('id',item.id);}}
 return {sent,failed,pending:failed>0,processed:items?.length||0};
}
