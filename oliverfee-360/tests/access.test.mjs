import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker/index.mjs';
function env(){
 const sql=new DatabaseSync(':memory:');for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+file,'utf8'));
 const DB={prepare(text){let args=[];return {bind(...values){args=values;return this},async first(){return sql.prepare(text).get(...args)||null},async all(){return {results:sql.prepare(text).all(...args)}},async run(){const result=sql.prepare(text).run(...args);return {meta:{changes:Number(result.changes)}}}}},async batch(statements){sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results}catch(error){sql.exec('ROLLBACK');throw error}}};
 const objects=new Map();return {DB,BUCKET:{async put(k,bytes){objects.set(k,new Uint8Array(bytes))},async get(k){return objects.has(k)?{body:objects.get(k)}:null},async delete(k){objects.delete(k)}},OWNER_EMAIL:'admin@example.test'};
}
function req(path,user,method='GET',body,headers={}){
 return new Request('https://office.test'+path,{method,headers:{Origin:'https://office.test',...(user?{'oai-authenticated-user-id':user,'oai-authenticated-user-email':user+'@example.test'}:{}),...(typeof body==='string'?{'Content-Type':'application/json'}:{}),...headers},body});
}
async function call(e,path,user,method='GET',body){const r=await worker.fetch(req(path,user,method,body===undefined?undefined:JSON.stringify(body)),e);return {status:r.status,data:await r.json()}}
async function fixture(){
 const e=env();const a=await call(e,'/api/carriers','alice','POST',{name:'Carrier A'}),b=await call(e,'/api/carriers','bob','POST',{name:'Carrier B'});return {e,a:a.data.id,b:b.data.id};
}
test('only the site administrator can post the shared diesel rate',async()=>{
 const e=env(),path='/api/national-diesel-rate';
 const rate={price:6.292,date:'2026-11-02'};
 assert.deepEqual((await call(e,path,'driver')).data,{rate:null});
 assert.equal((await call(e,path,'driver','PUT',rate)).status,403);
 assert.equal((await call(e,path,'admin','PUT',{...rate,date:'2026-02-30'})).status,400);
 assert.deepEqual(await call(e,path,'admin','PUT',rate),{status:200,data:{rate}});
 assert.equal((await call(e,path,'admin','PUT',{price:6.352,date:'2026-10-26'})).status,409);
 assert.deepEqual((await call(e,path,'driver')).data,{rate});
});
test('anonymous and service-only callers cannot open carrier records',async()=>{
 const {e,a}=await fixture();assert.equal((await call(e,'/api/carriers/'+a+'/workspace',null)).status,401);
 const r=await worker.fetch(new Request('https://office.test/api/carriers/'+a+'/workspace',{headers:{'OAI-Sites-Authorization':'Bearer service-token'}}),e);assert.equal(r.status,401);
});
test('each owner only lists and accesses their own carrier; guessed IDs are rejected',async()=>{
 const {e,a,b}=await fixture();const session=await call(e,'/api/session','alice');assert.equal(session.data.carriers.length,1);assert.equal(session.data.carriers[0].id,a);
 assert.equal((await call(e,'/api/carriers/'+b+'/workspace','alice')).status,403);
 assert.equal((await call(e,'/api/carriers/'+a+'/workspace','bob')).status,403);
 assert.equal((await call(e,'/api/carriers/'+b+'/members','alice')).status,403);
});
test('email invitations bind stable identity; office cannot grant access, driver sees only assigned records',async()=>{
 const {e,a}=await fixture();let current=await call(e,'/api/carriers/'+a+'/workspace','alice');
 current.data.state.people=[{id:'driver1',name:'One',role:'Driver'},{id:'driver2',name:'Two',role:'Driver'}];
 current.data.state.records=[{id:'r1',person:'driver1',type:'License'},{id:'r2',person:'driver2',type:'License'},{id:'r3',type:'DOT'}];
 assert.equal((await call(e,'/api/carriers/'+a+'/workspace','alice','PUT',{state:current.data.state,revision:0})).status,200);
 assert.equal((await call(e,'/api/carriers/'+a+'/members','alice','POST',{email:'driver@example.test',role:'driver',personId:'driver1'})).status,201);
 assert.equal((await call(e,'/api/carriers/'+a+'/members','alice','POST',{email:'office@example.test',role:'office'})).status,201);
 await call(e,'/api/session','driver');await call(e,'/api/session','office');
 const driver=await call(e,'/api/carriers/'+a+'/workspace','driver');assert.equal(driver.data.role,'driver');assert.deepEqual(driver.data.state.records.map(r=>r.id),['r1']);assert.equal(driver.data.state.people.length,1);assert.equal(driver.data.state.onboard,null);
 assert.equal((await call(e,'/api/carriers/'+a+'/workspace','driver','PUT',{state:driver.data.state,revision:1})).status,403);
 assert.equal((await call(e,'/api/carriers/'+a+'/members','office','POST',{email:'bad@example.test',role:'owner'})).status,403);
});
test('file access is carrier-scoped and drivers cannot read another driver file',async()=>{
 const {e,a,b}=await fixture();const state=(await call(e,'/api/carriers/'+a+'/workspace','alice')).data.state;
 state.people=[{id:'d1',role:'Driver'},{id:'d2',role:'Driver'}];await call(e,'/api/carriers/'+a+'/workspace','alice','PUT',{state,revision:0});
 await call(e,'/api/carriers/'+a+'/members','alice','POST',{email:'driver@example.test',role:'driver',personId:'d1'});await call(e,'/api/session','driver');
 for(const [id,person] of [['file1','d1'],['file2','d2']]){
  const r=await worker.fetch(req('/api/carriers/'+a+'/files/'+id+'?name=proof.pdf&person='+person,'alice','PUT',new Uint8Array([37,80,68,70]),{'Content-Type':'application/pdf'}),e);assert.equal(r.status,201);
 }
 assert.equal((await worker.fetch(req('/api/carriers/'+a+'/files/file1','driver'),e)).status,200);
 assert.equal((await worker.fetch(req('/api/carriers/'+a+'/files/file2','driver'),e)).status,403);
 assert.equal((await worker.fetch(req('/api/carriers/'+a+'/files/file1','bob'),e)).status,403);
 assert.equal((await worker.fetch(req('/api/carriers/'+b+'/files/file1','alice'),e)).status,403);
 const own=(await call(e,'/api/carriers/'+a+'/workspace','driver')).data;assert.deepEqual(own.state.docs.map(f=>f.id),['file1']);
});
test('checkout remains unpaid, processing is blocked, revisions prevent overwrites, CSRF is rejected',async()=>{
 const {e,a}=await fixture();const state=(await call(e,'/api/carriers/'+a+'/workspace','alice')).data.state;
 state.requests=[{id:'order1',status:'Awaiting payment',paymentStatus:'paid'}];
 const saved=await call(e,'/api/carriers/'+a+'/workspace','alice','PUT',{state,revision:0});assert.equal(saved.status,200);
 const stored=(await call(e,'/api/carriers/'+a+'/workspace','alice')).data.state;assert.equal(stored.requests[0].paymentStatus,'unpaid');
 for(const status of ['Paid','In progress','Completed']){stored.requests[0].status=status;assert.equal((await call(e,'/api/carriers/'+a+'/workspace','alice','PUT',{state:stored,revision:1})).status,409)}
 assert.equal((await call(e,'/api/carriers/'+a+'/workspace','alice','PUT',{state,revision:0})).status,409);
 const r=await worker.fetch(req('/api/carriers','alice','POST',JSON.stringify({name:'Bad'}),{Origin:'https://evil.test'}),e);assert.equal(r.status,403);
});
test('secure quote link persists signature, blocks unresolved fees, rejects stale estimates and stays unpaid',async()=>{
 const {e,a,b}=await fixture();
 const created=await call(e,'/api/carriers/'+a+'/quotes','alice','POST',{selection:{kind:'plan',plan:'Ultimate'}});assert.equal(created.status,201);assert.ok(created.data.path.includes('carrier='+a));
 const id=created.data.id;
 assert.equal((await call(e,'/api/carriers/'+a+'/quotes/'+id,'bob')).status,403);
 assert.equal((await call(e,'/api/carriers/'+b+'/quotes/'+id,'bob')).status,404);
 assert.equal((await call(e,'/api/carriers/'+a+'/quotes/'+id+'/sign','alice','POST',{signature:'Test Carrier',acknowledged:false})).status,400);
 const signed=await call(e,'/api/carriers/'+a+'/quotes/'+id+'/sign','alice','POST',{signature:'Test Carrier',acknowledged:true});assert.equal(signed.status,200);assert.equal(signed.data.status,'Signed — Awaiting Payment');
 const read=await call(e,'/api/carriers/'+a+'/quotes/'+id,'alice');assert.equal(read.data.signature,'Test Carrier');assert.equal(read.data.paidCents,0);
 assert.equal((await call(e,'/api/carriers/'+a+'/quotes/'+id+'/checkout','alice','POST',{})).status,503);
 let office=await call(e,'/api/carriers/'+a+'/workspace','alice');office.data.state.application={company:'Changed legal name',filings:{KYU:{status:'help'}}};
 await call(e,'/api/carriers/'+a+'/workspace','alice','PUT',{state:office.data.state,revision:office.data.revision});
 assert.equal((await call(e,'/api/carriers/'+a+'/quotes/'+id,'alice')).data.stale,true);
 assert.equal((await call(e,'/api/carriers/'+a+'/quotes/'+id+'/sign','alice','POST',{signature:'Test Carrier',acknowledged:true})).status,409);
 const pending=await call(e,'/api/carriers/'+a+'/quotes','alice','POST',{selection:{kind:'quote'}});
 assert.equal((await call(e,'/api/carriers/'+a+'/quotes/'+pending.data.id+'/sign','alice','POST',{signature:'Test Carrier',acknowledged:true})).status,409);
});
test('Ready to Process requires trusted server confirmation of the full current Stripe amount',async()=>{
 const {e,a}=await fixture();const created=await call(e,'/api/carriers/'+a+'/quotes','alice','POST',{selection:{kind:'plan',plan:'Ultimate'}});const id=created.data.id;
 await call(e,'/api/carriers/'+a+'/quotes/'+id+'/sign','alice','POST',{signature:'Test Carrier',acknowledged:true});
 await e.DB.prepare('UPDATE quote_reviews SET checkout_session=? WHERE id=?').bind('cs_test_verified',id).run();e.STRIPE_SECRET_KEY='sk_test_synthetic';
 const saved=globalThis.fetch;try{
  globalThis.fetch=async()=>new Response(JSON.stringify({payment_status:'unpaid',metadata:{quote_id:id,carrier_id:a},currency:'usd',amount_total:19900}),{headers:{'Content-Type':'application/json'}});
  assert.equal((await call(e,'/api/carriers/'+a+'/quotes/'+id+'/confirm','alice','POST',{})).data.status,'Signed — Awaiting Payment');
  globalThis.fetch=async()=>new Response(JSON.stringify({payment_status:'paid',metadata:{quote_id:id,carrier_id:a},currency:'usd',amount_total:100}),{headers:{'Content-Type':'application/json'}});
  assert.equal((await call(e,'/api/carriers/'+a+'/quotes/'+id+'/confirm','alice','POST',{})).status,409);
  globalThis.fetch=async()=>new Response(JSON.stringify({payment_status:'paid',metadata:{quote_id:id,carrier_id:a},currency:'usd',amount_total:19900}),{headers:{'Content-Type':'application/json'}});
  assert.equal((await call(e,'/api/carriers/'+a+'/quotes/'+id+'/confirm','alice','POST',{})).data.status,'Ready to Process');
 }finally{globalThis.fetch=saved}
});
