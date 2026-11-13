import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const owner='d5f443af-ac3a-42b2-8294-6fbf51f73beb',rep1='11111111-1111-4111-8111-111111111111',rep2='22222222-2222-4222-8222-222222222222',customer='33333333-3333-4333-8333-333333333333';
async function database(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);
 create table storage.objects(id uuid,bucket_id text,name text);alter table storage.objects enable row level security;
 create function storage.foldername(name text) returns text[] language sql as $$select string_to_array(name,'/')$$;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;
 grant select on auth.users to service_role;`);
 const initial=fs.readFileSync(new URL('../supabase/migrations/0001_init.sql',import.meta.url),'utf8').replace('create extension if not exists "pgcrypto";','');await db.exec(initial);
 await db.exec(`grant select on all tables in schema public to authenticated;grant all on all tables in schema public to service_role;
 insert into auth.users values('${owner}','felicialvrg@gmail.com',now()),('${rep1}','rep1@example.test',now()),('${rep2}','rep2@example.test',now()),('${customer}','customer@example.test',null);
 update public.profiles set role='admin' where id='${owner}';`);
 await db.exec(fs.readFileSync(new URL('../supabase/migrations/0002_sales.sql',import.meta.url),'utf8'));
 const as=async(id,role,sql,params=[])=>db.transaction(async tx=>{await tx.exec('set local role '+role);await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)",[id||'',role]);return tx.query(sql,params);});
 const command=(id,action,record,payload)=>as(id,'authenticated','select public.sales_command($1,$2,$3) as result',[action,record,JSON.stringify(payload)]).then(r=>r.rows[0].result);
 for(const [id,email,code] of [[rep1,'rep1@example.test','OF-01'],[rep2,'rep2@example.test','OF-02']]){await command(owner,'register-rep',id,{name:code,email,rep_code:code});await command(owner,'rep-update',id,{status:'active',commission_mode:'percent',commission_value:1000});}
 return {db,as,command};
}
test('sales migration enforces assignments, owner controls, suspension and direct-table/RPC denials',async()=>{
 const {db,as,command}=await database();try{
  await command(owner,'import',null,{rows:[{company_name:'One carrier',usdot:'101',email:'one@example.test'},{company_name:'Two carrier',usdot:'102'}]});
  const prospects=(await db.query('select * from sales_prospects order by usdot')).rows;
  await command(owner,'assign',prospects[0].id,{rep_id:rep1});await command(owner,'assign',prospects[1].id,{rep_id:rep2});
  await db.exec("insert into public.carriers(id,legal_name,status) values('99999999-9999-4999-8999-999999999999','Private member business','active');insert into public.payments(carrier_id,amount) values('99999999-9999-4999-8999-999999999999',999.99);");assert.equal((await as(rep1,'authenticated','select * from public.carriers')).rows.length,0);assert.equal((await as(rep1,'authenticated','select * from public.payments')).rows.length,0);
  assert.equal((await as(rep1,'authenticated','select * from sales_prospects')).rows.length,1);
  assert.equal((await as(rep1,'authenticated','select * from sales_prospects where id=$1',[prospects[1].id])).rows.length,0);
  await assert.rejects(as(rep1,'authenticated',"update sales_prospects set assigned_to=$1",[rep1]),/permission denied/);
  for(const action of ['import','assign','rep-update','register-rep','commission-approve','resource-save'])await assert.rejects(command(rep1,action,prospects[0].id,{}),/Owner required/);
  await assert.rejects(command(rep1,'call',prospects[1].id,{disposition:'Interested',revision:1}),/Assigned prospect/);
  await command(rep1,'call',prospects[0].id,{disposition:'Call Back',follow_up_at:new Date().toISOString(),notes:'Customer requests tomorrow',revision:1});
  assert.equal((await as(rep1,'authenticated','select public.sales_metrics() as metrics')).rows[0].metrics.callsToday,1);
  await assert.rejects(command(rep1,'call',prospects[0].id,{disposition:'Closed Sale',revision:2}),/verified payment/);
  await command(owner,'rep-update',rep1,{status:'suspended',commission_mode:'none',commission_value:0});
  assert.equal((await as(rep1,'authenticated','select * from sales_prospects')).rows.length,0);
  await assert.rejects(command(rep1,'call',prospects[0].id,{disposition:'Interested',revision:2}),/access denied/);
  await assert.rejects(as(rep2,'authenticated',"select sales_fulfill('fake','checkout.session.completed',null,'fake',null,'fake',0,'usd','sub_fake')"),/permission denied/);
  assert.equal((await db.query('select count(*)::int as count from sales_activity')).rows[0].count>0,true);
 }finally{await db.close();}
});
test('verified fulfillment is atomic and idempotent; drafts, wrong amounts, stale revisions and Do Not Contact cannot enroll',async()=>{
 const {db,as,command}=await database();try{
  await command(owner,'import',null,{rows:[{company_name:'Customer carrier',usdot:'103',email:'customer@example.test'}]});const prospect=(await db.query('select * from sales_prospects')).rows[0];await command(owner,'assign',prospect.id,{rep_id:rep1});
  const details={legal_name:'Customer carrier',dba:'',email:'customer@example.test',contact_name:'Test Customer',phone:'5555550100',address:'123 Test Street, Atlanta, GA',usdot:'103',mc:'',equipment_type:'Dry van',drivers:'1',services:['Document organization']};
  const draft=await command(rep1,'save-application',prospect.id,{details,plan_key:'Basic',complete:false,revision:0});await assert.rejects(command(rep1,'save-application',prospect.id,{details:{...details,legal_name:'Stale second draft'},plan_key:'Basic',complete:false,revision:0}),/changed/);await assert.rejects(command(rep1,'checkout-reserve',prospect.id,{}),/Complete/);
  const completed=await command(rep1,'save-application',prospect.id,{details,plan_key:'Basic',complete:true,revision:draft.revision});
  const attempt=await command(rep1,'checkout-reserve',prospect.id,{});const repeated=await command(rep1,'checkout-reserve',prospect.id,{});assert.equal(attempt.id,repeated.id);
  await assert.rejects(command(rep1,'save-application',prospect.id,{details,plan_key:'Ultimate',complete:true,revision:completed.revision}),/locked/);
  await as(null,'service_role','select sales_record_checkout($1,$2,$3,$4)',[attempt.id,'cs_test_123','https://checkout.stripe.com/c/pay/test','price_test_basic']);
  const fulfill=(amount,event='evt_test_1')=>as(null,'service_role','select sales_fulfill($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) as carrier',[event,'checkout.session.completed',attempt.id,'cs_test_123',customer,'customer@example.test',amount,'usd','sub_test_123','in_test_123']);
  await assert.rejects(fulfill(1),/does not match/);assert.equal((await db.query('select count(*)::int as n from carriers')).rows[0].n,0);
  await command(owner,'assign',prospect.id,{rep_id:rep2});assert.equal((await as(rep1,'authenticated','select * from sales_applications')).rows.length,0);await assert.rejects(command(rep1,'call',prospect.id,{disposition:'Interested',revision:3}),/Assigned prospect/);
  const result=await fulfill(4999);assert.ok(result.rows[0].carrier);await fulfill(4999,'evt_duplicate');
  assert.equal((await db.query('select count(*)::int as n from carriers')).rows[0].n,1);assert.equal((await db.query('select count(*)::int as n from payments')).rows[0].n,1);
  assert.equal((await db.query('select amount_cents from sales_commissions')).rows[0].amount_cents,500);
  assert.equal((await db.query('select rep_id from sales_commissions')).rows[0].rep_id,rep1);
  const commission=(await db.query('select id from sales_commissions')).rows[0];await command(owner,'commission-approve',commission.id,{});assert.equal((await db.query('select status from sales_commissions')).rows[0].status,'approved');
  assert.equal((await db.query("select count(*)::int as n from sales_outbox where application_id=$1",[completed.id])).rows[0].n,2);
  await as(null,'service_role','select sales_refund($1,$2,$3)',['evt_refund','in_test_123',4999]);await as(null,'service_role','select sales_refund($1,$2,$3)',['evt_refund_duplicate','in_test_123',4999]);assert.equal((await db.query('select status from sales_commissions')).rows[0].status,'voided');assert.equal((await db.query('select initial_revenue_cents from sales_applications')).rows[0].initial_revenue_cents,0);assert.equal((await db.query('select count(*)::int as n from payments')).rows[0].n,2);
  await command(owner,'import',null,{rows:[{company_name:'Do not call',usdot:'104'}]});const dnc=(await db.query("select * from sales_prospects where usdot='104'")).rows[0];await command(owner,'assign',dnc.id,{rep_id:rep1});await command(rep1,'call',dnc.id,{disposition:'Do Not Contact',revision:1});await assert.rejects(command(rep1,'save-application',dnc.id,{details,plan_key:'Basic',complete:true,revision:0}),/Do Not Contact/);
 }finally{await db.close();}
});
