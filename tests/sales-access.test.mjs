import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import * as types from '../src/lib/sales/types.ts';import {SalesInputError} from '../src/lib/sales/input-error.ts';
function server({user={id:'verified-id',email:'rep@example.test',email_confirmed_at:'verified'},rep={user_id:'verified-id',email:'rep@example.test',status:'active'},profile={id:'verified-id',role:'carrier',carrier_id:null},owner=null}={}){
 const reads=[],module={exports:{}};const client={auth:{getUser:async()=>({data:{user},error:null})},from:table=>({select:()=>({eq:(key,value)=>{reads.push({table,key,value});return {maybeSingle:async()=>({data:table==='sales_representatives'?rep:profile,error:null}),single:async()=>({data:profile,error:null})};}})})};
 const imports={'server-only':{},'./input-error':{SalesInputError},'@/lib/supabase/server':{createClient:async()=>client},'@/lib/admin/owner':{ownerIdentity:async()=>owner},'@/lib/config':{authConfigured:()=>true},'next/navigation':{redirect:p=>{throw Error('redirect:'+p);}},'./types':types};
 const code=ts.transpileModule(fs.readFileSync(new URL('../src/lib/sales/server.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(n=>{assert.ok(imports[n],n);return imports[n];},module,module.exports);return {...module.exports,reads};
}
test('sales access verifies the provider identity and active owner-created record, never caller metadata',async()=>{
 const good=server();assert.equal((await good.actor()).id,'verified-id');assert.ok(good.reads.every(x=>x.value==='verified-id'));
 for(const options of [{user:null},{user:{id:'verified-id',email:'rep@example.test'}},{user:{id:'verified-id',email:'rep@example.test',email_confirmed_at:'verified',is_anonymous:true}},{user:{id:'verified-id',email:'rep@example.test',email_confirmed_at:'verified',user_metadata:{role:'admin'}},rep:null},{rep:{user_id:'verified-id',email:'rep@example.test',status:'suspended'}},{rep:{user_id:'verified-id',email:'other@example.test',status:'active'}},{profile:{id:'verified-id',role:'admin',carrier_id:null}},{profile:{id:'verified-id',role:'carrier',carrier_id:'company'}}]){assert.equal(await server(options).salesIdentity(),null);await assert.rejects(server(options).actor(),/active sales representative/);}
 await assert.rejects(good.actor(true),/Owner access/);assert.equal((await server({owner:{id:'owner'}}).actor(true)).owner,true);
});

test('existing owner enters sales management without creating a representative or weakening employee permissions',async()=>{
 const owner=server({owner:{id:'existing-owner'},rep:null});
 assert.equal(await owner.salesEntryDestination(),'/admin/sales');
 await assert.rejects(owner.requireSales(),/redirect:\/admin\/sales/);
 assert.equal(owner.reads.length,0,'owner entry does not depend on a representative record');
 assert.equal((await owner.actor(true)).owner,true);
 await assert.rejects(owner.actor(),/active sales representative/);
 const rep=server();assert.equal(await rep.salesEntryDestination(),'/sales');assert.equal((await rep.requireSales()).user_id,'verified-id');await assert.rejects(rep.actor(true),/Owner access/);
 for(const options of [{user:null,rep:null},{rep:{user_id:'verified-id',email:'rep@example.test',status:'suspended'}},{profile:{id:'verified-id',role:'admin',carrier_id:null},rep:null}]){
  const denied=server(options);assert.equal(await denied.salesEntryDestination(),null);await assert.rejects(denied.requireSales(),/redirect:\/sales\/login\?error=access/);
 }
});
