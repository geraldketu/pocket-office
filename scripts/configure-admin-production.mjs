import {randomBytes} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {PreviewStorage,PREVIEW_BUCKET} from '../src/lib/admin/persistence.ts';

// Run only in the authorized deployment job after `vercel pull`. Secrets never
// enter command arguments, source files, artifact uploads or console output.
process.loadEnvFile('.vercel/.env.production.local');
const env=process.env;
for(const key of ['VERCEL_TOKEN','VERCEL_PROJECT_ID','VERCEL_ORG_ID','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'])if(!env[key])throw Error(`Production setup requires ${key}; existing configuration was not replaced.`);
const supabase=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const {data:admins,error}=await supabase.from('profiles').select('id,email,role').eq('role','admin');
if(error)throw Error('Could not verify production owner profiles. No access was granted.');
const configured=env.ADMIN_RELEASE_OWNER_IDS||env.OLIVERFEE_OWNER_IDS||'';
const ids=configured.split(',').map(v=>v.trim()).filter(Boolean);
const owners=ids.length?admins.filter(p=>ids.includes(p.id)):admins.length===1?admins:[];
if(!owners.length||ids.length&&owners.length!==ids.length)throw Error('Owner selection is ambiguous or invalid. Set the OLIVERFEE_OWNER_IDS repository variable to the verified existing owner UUID; no account was promoted.');
for(const owner of owners){const {data,error}=await supabase.auth.admin.getUserById(owner.id);if(error||!data.user?.email_confirmed_at||data.user.email?.toLowerCase()!==owner.email?.toLowerCase())throw Error('Owner identity could not be verified. No account was changed.');}
const bucket=await supabase.storage.getBucket(PREVIEW_BUCKET);
if(bucket.error){
 const missing=/not.?found/i.test(bucket.error.message);if(!missing)throw Error('Could not inspect the preview bucket');
 const created=await supabase.storage.createBucket(PREVIEW_BUCKET,{public:false,fileSizeLimit:10_000_000,allowedMimeTypes:['application/octet-stream']});if(created.error)throw Error('Could not create private test-only storage');
}else if(bucket.data.public)throw Error('Preview bucket must be private. Existing bucket settings were not overwritten.');
const secret=env.OLIVERFEE_PREVIEW_SECRET||randomBytes(32).toString('hex');
if(!/^[a-f0-9]{64}$/.test(secret))throw Error('Existing preview encryption key is invalid; it was not rotated.');
const store=new PreviewStorage(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,secret),id=randomBytes(24).toString('hex'),ownerId=owners[0].id;
try{
 await store.write(ownerId,id,{testOnly:true,counter:0},true);
 await Promise.all([1,2].map(()=>store.locked(ownerId,id,async()=>{const v=await store.read(ownerId,id);await store.write(ownerId,id,{...v,counter:v.counter+1});})));
 if((await store.read(ownerId,id))?.counter!==2)throw Error('Distributed test storage verification failed');
}finally{await store.remove(ownerId,id);}
const api=async(path,method,body)=>{
 const r=await fetch(`https://api.vercel.com${path}${path.includes('?')?'&':'?'}teamId=${env.VERCEL_ORG_ID}`,{method,headers:{Authorization:`Bearer ${env.VERCEL_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!r.ok)throw Error(`Vercel configuration failed (${r.status}); consult project access permissions.`);return r;
};
await api(`/v10/projects/${env.VERCEL_PROJECT_ID}/env?upsert=true`,'POST',[
 {key:'OLIVERFEE_OWNER_IDS',value:owners.map(p=>p.id).join(','),type:'encrypted',target:['production']},
 {key:'OLIVERFEE_PREVIEW_SECRET',value:secret,type:'encrypted',target:['production']}
]);
await api(`/v9/projects/${env.VERCEL_PROJECT_ID}`,'PATCH',{nodeVersion:'24.x'});
console.log(`Production owner verification passed for ${owners.length} existing account(s). Private encrypted test storage and concurrency checks passed. No customer record, password or domain was changed.`);
