import 'server-only';
import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {createAdminClient} from '@/lib/supabase/admin';
import {sendEmail,inviteEmailHtml} from '@/lib/email';
import {salesOrigin} from './payments';
import {SalesError,command} from './server';
import {createClient} from '@/lib/supabase/server';
import {email,uuid,text} from './validation';
function encryptionKey(){const secret=process.env.SALES_EMAIL_ENCRYPTION_KEY||process.env.OLIVERFEE_PREVIEW_SECRET||'';if(!/^[a-f0-9]{64}$/i.test(secret))throw new SalesError('Configure server-side sales email encryption before sending setup links.',503);return createHash('sha256').update('oliverfee-sales-notifications:'+secret).digest();}
function encrypt(link:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv);const body=Buffer.concat([cipher.update(link,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64');}
function decrypt(value:string){const b=Buffer.from(value,'base64'),decipher=createDecipheriv('aes-256-gcm',encryptionKey(),b.subarray(0,12));decipher.setAuthTag(b.subarray(12,28));return Buffer.concat([decipher.update(b.subarray(28)),decipher.final()]).toString('utf8');}
export async function findAuthUser(address:string){const service=createAdminClient();for(let page=1;page<=100;page++){const {data,error}=await service.auth.admin.listUsers({page,perPage:1000});if(error)throw new SalesError('Authentication lookup is unavailable.',503);const users=data.users.filter(u=>u.email?.toLowerCase()===address.toLowerCase());if(users.length>1)throw new SalesError('Account identity needs owner review.',409);if(users[0])return users[0];if(data.users.length<1000)return null;}throw new SalesError('Account lookup needs operator review.',503);}
export async function registerRepresentative(raw:Record<string,unknown>){
 const address=email(raw.email),name=text(raw.name,120),code=text(raw.rep_code,32);if(name.length<2||!(/^[A-Za-z0-9_-]{2,32}$/).test(code))throw new SalesError('Enter a representative name and a unique ID (letters, digits, dash or underscore).');
 const service=createAdminClient();
 const [{data:existingCode,error:codeError},{data:existingRep,error:repError}]=await Promise.all([service.from('sales_representatives').select('user_id').eq('rep_code',code).maybeSingle(),service.from('sales_representatives').select('user_id').eq('email',address).maybeSingle()]);
 if(codeError||repError)throw new SalesError('Representative records could not be checked.',503);if(existingCode||existingRep)throw new SalesError('That representative ID or email is already registered. Update the existing record instead.',409);
 let user=await findAuthUser(address);
 if(!user){const {data,error}=await service.auth.admin.createUser({email:address,email_confirm:false,user_metadata:{full_name:name}});if(error)user=await findAuthUser(address);else user=data.user;}
 if(!user)throw new SalesError('The individual login could not be created.',503);
 return command('register-rep',user.id,{name,rep_code:code,email:address});
}
export async function sendCheckoutEmail(prospectId:string){
 if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM)throw new SalesError('Email delivery is not configured. The secure checkout can still be copied.',503);
 const client=await createClient();const {data:app,error}=await client.from('sales_applications').select('id,details').eq('prospect_id',uuid(prospectId)).single();if(error||!app)throw new SalesError('Assigned application required.',403);
 const {data:checkout,error:checkoutError}=await client.from('sales_checkout_attempts').select('id,checkout_url,status').eq('application_id',app.id).eq('status','pending').single();if(checkoutError||!checkout?.checkout_url||new URL(checkout.checkout_url).origin!=='https://checkout.stripe.com')throw new SalesError('Generate a secure pending checkout first.',409);
 await command('checkout-email',prospectId,{});
 const recipient=email(app.details.email),sent=await sendEmail(recipient,'Your OliverFee 360 secure membership checkout',`<p>Thank you for speaking with OliverFee 360. Review your selected monthly membership and enter payment details directly on Stripe.</p><p><a href="${checkout.checkout_url.replaceAll('&','&amp;').replaceAll('"','&quot;')}">Review and pay securely on Stripe</a></p><p>No representative needs your card information. Government and third-party fees are separate.</p>`,'sales-checkout-'+checkout.id+'-'+Math.floor(Date.now()/60000));
 if(!sent)throw new SalesError('The email provider did not confirm acceptance. No successful send is reported.',502);return {accepted:true};
}
export async function drainSalesOutbox(){
 if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM)return {processed:0,pending:true,reason:'Email delivery is not configured.'};
 const service=createAdminClient();const {data:items,error}=await service.rpc('sales_claim_outbox',{p_limit:2});if(error)throw new SalesError('Notification queue is unavailable.',503);let sent=0,failed=0;
 for(const item of items||[]){try{
  let html:string,subject:string;let idempotency='sales-outbox-'+item.id;
  if(item.kind==='owner-sale'||item.kind==='owner-refund'){html='<p>A sales-assisted membership '+(item.kind==='owner-refund'?'refund':'payment')+' was verified. Review the record in your existing <a href="'+salesOrigin()+'/admin/sales">Sales Management</a> section.</p>';subject='OliverFee 360: verified sales '+(item.kind==='owner-refund'?'refund':'enrollment');}
  else{
   let link:string;
   if(item.encrypted_link&&item.link_created_at&&Date.now()-new Date(item.link_created_at).getTime()<45*60000){link=decrypt(item.encrypted_link);}
   else{
    const {data,error:linkError}=await service.auth.admin.generateLink({type:'recovery',email:item.recipient});
    if(linkError||!data.properties?.hashed_token)throw new Error('Secure account setup could not be generated.');
    const url=new URL(salesOrigin()+'/auth/confirm');url.searchParams.set('token_hash',data.properties.hashed_token);url.searchParams.set('type','recovery');url.searchParams.set('next','/set-password');link=url.href;
    item.link_created_at=new Date().toISOString();const {error:saveError}=await service.from('sales_outbox').update({encrypted_link:encrypt(link),link_created_at:item.link_created_at}).eq('id',item.id);if(saveError)throw new Error('Secure notification preparation could not be saved.');
   }
   idempotency+='-'+item.link_created_at;subject=item.kind==='representative-invite'?'Your individual OliverFee 360 sales login':'Welcome to OliverFee 360';
   html=inviteEmailHtml(item.kind==='representative-invite'?'OliverFee 360 Sales Representative':'your OliverFee 360 membership',link);
   if(item.kind==='representative-invite')html+='<p>Your administrator must activate your representative record. After password setup, use the dedicated sales login at '+salesOrigin()+'/sales/login.</p>';
  }
  if(!await sendEmail(item.recipient,subject,html,idempotency))throw new Error('Email provider did not confirm acceptance.');
  const {error:saved}=await service.from('sales_outbox').update({status:'sent',sent_at:new Date().toISOString(),lease_until:null,last_error:null}).eq('id',item.id);if(saved)throw new Error('Delivery acceptance could not be recorded.');sent++;
 }catch{
  failed++;await service.from('sales_outbox').update({status:'failed',lease_until:new Date(Date.now()+60000).toISOString(),last_error:'Notification not confirmed. Check provider configuration and retry.'}).eq('id',item.id);
 }}return {processed:items?.length||0,sent,failed};
}
