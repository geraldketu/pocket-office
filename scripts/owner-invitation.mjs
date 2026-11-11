import {pathToFileURL} from 'node:url';
import {createClient} from '@supabase/supabase-js';

export const OWNER_EMAIL='oliverfee360@gmail.com';
export const AUTH_HOST='dgjqwnewuhpwitadppkv.supabase.co';

// Operator-only workflow. Never imported by an application route or public form.
// Audit is read-only by default; --send requires explicit template verification.
export async function ownerInvitation(client,{origin,send=false,templatesVerified=false,ownerIds=''}={}){
 const url=new URL(origin);
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash||(url.hostname!=='oliverfee360.com'&&!/^pocket-office-[a-z0-9-]+\.vercel\.app$/.test(url.hostname)))throw Error('Use https://oliverfee360.com or the exact HTTPS preview deployment origin from the existing pocket-office Vercel project.');
 const {data:admins,error:adminError}=await client.from('profiles').select('id,email,role,carrier_id').eq('role','admin');
 if(adminError)throw Error('Cannot audit admin profiles. No invitation was sent.');
 if(!admins||admins.length>1||admins.some(p=>p.email?.toLowerCase()!==OWNER_EMAIL||p.carrier_id))throw Error('Existing administrators need manual reconciliation before this account can become the sole owner. No account was changed.');
 let user=null;
 for(let page=1;;page++){
  const {data,error}=await client.auth.admin.listUsers({page,perPage:1000});
  if(error)throw Error('Cannot audit authentication users. No invitation was sent.');
  const matches=data.users.filter(u=>u.email?.toLowerCase()===OWNER_EMAIL);
  if(matches.length>1||user&&matches.length)throw Error('Ambiguous owner identity. No account was changed.');
  user=matches[0]||user;if(data.users.length<1000)break;
 }
 if(admins.length&&admins[0].id!==user?.id)throw Error('Admin profile and authentication identity do not match. No invitation was sent.');
 const ids=ownerIds.split(',').map(x=>x.trim()).filter(Boolean);
 if(ids.length&&(ids.length!==1||ids[0]!==user?.id))throw Error('The existing owner allowlist must be reconciled with this verified account first. No invitation was sent.');
 if(user){
  const {data:profile,error}=await client.from('profiles').select('id,email,role,carrier_id').eq('id',user.id).maybeSingle();
  if(error)throw Error('Cannot inspect owner profile. No invitation was sent.');
  if(profile&&(profile.carrier_id||profile.email?.toLowerCase()!==OWNER_EMAIL))throw Error('This account has conflicting carrier records or email. Review before assigning owner permissions.');
 }
 const status={email:OWNER_EMAIL,accountExists:!!user,emailVerified:!!user?.email_confirmed_at,ownerRole:!!admins.length,invitationSent:false};
 if(!send)return status;
 if(!templatesVerified)throw Error('Verify the invite/recovery token-hash email templates and preview redirect allowlist first. No invitation was sent.');
 if(user){
  const {error}=await client.from('profiles').upsert({id:user.id,email:OWNER_EMAIL,role:'admin',carrier_id:null});
  if(error)throw Error('Owner profile could not be configured. No email was sent.');
  const {error:sendError}=await client.auth.resetPasswordForEmail(OWNER_EMAIL,{redirectTo:url.origin+'/auth/confirm'});
  if(sendError)throw Error('Provider rejected the recovery email. The owner profile exists, but no successful send was reported.');
  return {...status,ownerRole:true,invitationSent:true,flow:'recovery'};
 }
 const {data,error}=await client.auth.admin.inviteUserByEmail(OWNER_EMAIL,{redirectTo:url.origin+'/auth/confirm'});
 if(error||!data.user||data.user.email?.toLowerCase()!==OWNER_EMAIL)throw Error('Provider did not confirm the expected invitation. Inspect provider logs before retrying.');
 const {error:profileError}=await client.from('profiles').upsert({id:data.user.id,email:OWNER_EMAIL,role:'admin',carrier_id:null});
 if(profileError)throw Error('Invitation sent, but owner profile setup failed. Repair this account through the provider before signing in.');
 return {...status,accountExists:true,ownerRole:true,invitationSent:true,flow:'invite'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const env=process.env;
  if(env.NEXT_PUBLIC_SUPABASE_URL!==`https://${AUTH_HOST}`||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Connect the existing production Supabase project or load its server credentials securely; no email was sent.');
  const client=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const result=await ownerInvitation(client,{origin:env.OWNER_LOGIN_ORIGIN||env.OWNER_PREVIEW_ORIGIN,send:process.argv.includes('--send'),templatesVerified:env.OWNER_EMAIL_TEMPLATES_VERIFIED==='true',ownerIds:env.OLIVERFEE_OWNER_IDS||''});
  console.log(JSON.stringify(result));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
