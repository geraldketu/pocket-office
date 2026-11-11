import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const ownerEmail='oliverfee360@gmail.com';
function action({user={id:'owner-id',email:ownerEmail,email_confirmed_at:'verified'},profile={id:'owner-id',email:ownerEmail,role:'carrier',carrier_id:null},admins=[],configured=true,ids='',updateError=false}={}){
 const calls=[],module={exports:{}};
 const imports={
  '@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user},error:null})}})},
  '@/lib/config':{requestsConfigured:()=>configured},
  '@/lib/admin/owner-account':{designatedOwnerEmail:email=>email?.trim().toLowerCase()===ownerEmail},
  '@/lib/supabase/admin':{createAdminClient:()=>{calls.push(['admin-client']);return {from:table=>{assert.equal(table,'profiles');return {
   select:()=>({eq:(key,value)=>key==='id'?{single:async()=>({data:profile})}:{limit:async()=>({data:admins})}}),
   update:patch=>{const filters=[];const chain={eq:(key,value)=>{filters.push([key,value]);return chain;},is:(key,value)=>{filters.push([key,value]);return chain;},select:()=>({single:async()=>{calls.push(['update',patch,filters]);return {data:updateError?null:{id:user.id},error:updateError?Error('test'):null};}})};return chain;}
  };}};}}
 };
 const source=ts.transpileModule(fs.readFileSync(new URL('../src/app/actions/owner-access.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',source)(name=>{assert.ok(imports[name],name);return imports[name];},module,module.exports);
 return {calls,async run(...args){const before=process.env.OLIVERFEE_OWNER_IDS;if(ids)process.env.OLIVERFEE_OWNER_IDS=ids;else delete process.env.OLIVERFEE_OWNER_IDS;try{return await module.exports.ensureOwnerAccess(...args);}finally{if(before===undefined)delete process.env.OLIVERFEE_OWNER_IDS;else process.env.OLIVERFEE_OWNER_IDS=before;}}};
}
test('only provider-verified designated owner can complete initial admin provisioning',async()=>{
 const a=action();assert.deepEqual(await a.run(),{owner:true});assert.deepEqual(a.calls.at(-1),['update',{role:'admin'},[['id','owner-id'],['role','carrier'],['carrier_id',null]]]);
});
test('anonymous users, other emails and forged metadata cannot claim owner access',async()=>{
 for(const user of [null,{id:'other',email:'carrier@example.test',email_confirmed_at:'verified',user_metadata:{email:ownerEmail,role:'admin'}}]){
  const a=action({user});assert.deepEqual(await a.run({email:ownerEmail,id:'owner-id',role:'admin'}),{owner:false});assert.deepEqual(a.calls,[]);
 }
 for(const user of [{id:'owner-id',email:ownerEmail},{id:'owner-id',email:ownerEmail,email_confirmed_at:'verified',is_anonymous:true}]){const a=action({user});assert.equal((await a.run()).needsReview,true);assert.deepEqual(a.calls,[]);}
});
test('conflicting admin, linked carrier, driver and stale owner UUID stop provisioning',async()=>{
 for(const options of [{admins:[{id:'other',email:'other@example.test',role:'admin'}]},{admins:[{id:'owner-id',email:ownerEmail},{id:'other',email:'other@example.test'}]},{profile:{id:'owner-id',email:ownerEmail,role:'carrier',carrier_id:'existing-company'}},{profile:{id:'owner-id',email:ownerEmail,role:'driver',carrier_id:null}},{ids:'different-owner'},{ids:'owner-id,other'},{configured:false},{profile:{id:'owner-id',email:'different@example.test',role:'carrier',carrier_id:null}}]){
  const a=action(options);assert.equal((await a.run()).needsReview,true);assert.equal(a.calls.some(x=>x[0]==='update'),false);
 }
});
test('existing verified sole owner is idempotent; setup failures never claim access',async()=>{
 const profile={id:'owner-id',email:ownerEmail,role:'admin',carrier_id:null},a=action({profile,admins:[profile],ids:'owner-id'});assert.deepEqual(await a.run(),{owner:true});assert.equal(a.calls.some(x=>x[0]==='update'),false);
 const failed=action({updateError:true});assert.equal((await failed.run()).needsReview,true);
});
