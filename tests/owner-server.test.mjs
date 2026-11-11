import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as policy from '../src/lib/admin/policy.ts';

test('actual server owner gate denies signed-out, carrier, driver and non-designated admins; accepts verified sole owner',async()=>{
 const code=ts.transpileModule(fs.readFileSync(new URL('../src/lib/admin/owner.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const saved={ids:process.env.OLIVERFEE_OWNER_IDS,mode:process.env.NODE_ENV};
 process.env.NODE_ENV='production';delete process.env.OLIVERFEE_OWNER_IDS;
 let profile=null,queries=0,verifiedEmail='oliverfee360@gmail.com';
 const owner={id:'owner-id',email:'oliverfee360@gmail.com',role:'admin',carrier_id:null};
 const module={exports:{}},imports={
  'server-only':{},'next/headers':{cookies:async()=>({get:()=>null})},'next/navigation':{redirect:path=>{throw Error('redirect:'+path);}},
  '@/lib/auth':{getProfile:async()=>profile},'./policy':policy,'@/lib/config':{requestsConfigured:()=>true},'./store':{labToken:()=>{throw Error('No lab in production');}},
  '@/lib/supabase/admin':{createAdminClient:()=>{queries++;return {from:()=>({select:()=>({eq:()=>({limit:async()=>({data:[owner]})})})}),auth:{admin:{getUserById:async()=>({data:{user:{email:verifiedEmail,email_confirmed_at:'verified'}}})}}};}}
 };
 new Function('require','module','exports',code)(name=>{assert.ok(name in imports,name);return imports[name];},module,module.exports);
 try{
  for(const candidate of [null,{...owner,role:'carrier'},{...owner,role:'driver'}]){profile=candidate;assert.equal(await module.exports.ownerIdentity(),null);await assert.rejects(module.exports.requireOwner(),/redirect:\/login\?error=owner-required/);}
  assert.equal(queries,0);
  profile=owner;assert.equal(await module.exports.requireOwner(),owner);
  verifiedEmail='someone-else@example.test';assert.equal(await module.exports.ownerIdentity(),null);
  process.env.OLIVERFEE_OWNER_IDS='owner-id';profile={...owner,id:'staff-admin'};assert.equal(await module.exports.ownerIdentity(),null);await assert.rejects(module.exports.requireOwner(),/owner-required/);
  profile=owner;assert.equal(await module.exports.requireOwner(),owner);
 }finally{if(saved.ids===undefined)delete process.env.OLIVERFEE_OWNER_IDS;else process.env.OLIVERFEE_OWNER_IDS=saved.ids;if(saved.mode===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=saved.mode;}
});
