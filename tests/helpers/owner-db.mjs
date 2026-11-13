import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {PGlite} from '@electric-sql/pglite';
export const owner='d5f443af-ac3a-42b2-8294-6fbf51f73beb',gerald='a6cc4726-798e-478f-9df2-6a83b757654f',member='33333333-3333-4333-8333-333333333333',company='22222222-2222-4222-8222-222222222222';
export async function setup(){const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);create table storage.objects(id uuid,bucket_id text,name text);alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql as $$select string_to_array(name,'/')$$;
grant usage on schema public,auth,storage to anon,authenticated,service_role;grant select on auth.users to service_role;`);
for(const name of ['0001_init.sql','0002_sales.sql'])await db.exec(fs.readFileSync(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8').replace('create extension if not exists "pgcrypto";',''));
await db.exec(`grant all on all tables in schema public to authenticated,service_role;grant all on storage.objects to authenticated,service_role;
insert into auth.users(id,email,email_confirmed_at) values('${owner}','felicialvrg@gmail.com',now()),('${gerald}','geraldketu@gmail.com',now()),('${member}','member@example.test',now());
update profiles set role='admin' where id in ('${owner}','${gerald}');insert into carriers(id,legal_name,email,status) values('${company}','Existing Carrier','office@example.test','onboarding');update profiles set carrier_id='${company}' where id='${member}';`);
await db.exec(fs.readFileSync(new URL('../../supabase/migrations/0003_owner_management.sql',import.meta.url),'utf8'));
const as=async(id,role,sql,args=[])=>{await db.exec('begin');try{await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true),set_config('request.jwt.claims',$3,true)",[id||'',role,JSON.stringify({sub:id,role,email:id===owner?'felicialvrg@gmail.com':id===gerald?'geraldketu@gmail.com':'member@example.test'})]);await db.exec('set local role '+role);const r=await db.query(sql,args);await db.exec('commit');return r;}catch(e){await db.exec('rollback');throw e;}};
const command=async(id,action,rid,payload={})=>(await as(id,'authenticated','select public.owner_management_command($1,$2,$3) as result',[action,rid,JSON.stringify(payload)])).rows[0].result;
const rev=async(entity,id)=>(await db.query('select revision from owner_record_versions where entity=$1 and record_id=$2',[entity,id])).rows[0]?.revision||0;return {db,as,command,rev};}
