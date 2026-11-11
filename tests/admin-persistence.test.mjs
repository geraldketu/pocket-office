import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {randomBytes} from 'node:crypto';
import {PreviewStorage,seal,unseal,previewSecret} from '../src/lib/admin/persistence.ts';

test('preview snapshots are authenticated encrypted and reject wrong keys or tampering',()=>{
 const key=randomBytes(32).toString('hex'),value={ownerId:'test-owner',data:'synthetic'},bytes=seal(value,key);
 assert.ok(!bytes.includes(Buffer.from('synthetic')));assert.deepEqual(unseal(bytes,key),value);
 assert.throws(()=>unseal(bytes,randomBytes(32).toString('hex')));bytes[30]^=1;assert.throws(()=>unseal(bytes,key));
});
test('preview key derivation is server-only, purpose-separated and accepts an explicit override',()=>{
 const env={SUPABASE_SERVICE_ROLE_KEY:'test-server-only-key'.repeat(4),NEXT_PUBLIC_SUPABASE_URL:'https://test.supabase.co'};
 const key=previewSecret(env);assert.match(key,/^[a-f0-9]{64}$/);assert.equal(previewSecret(env),key);assert.notEqual(previewSecret({...env,NEXT_PUBLIC_SUPABASE_URL:'https://other.supabase.co'}),key);assert.notEqual(previewSecret({...env,SUPABASE_SERVICE_ROLE_KEY:'other'.repeat(30)}),key);
 const explicit=randomBytes(32).toString('hex');assert.equal(previewSecret({...env,OLIVERFEE_PREVIEW_SECRET:explicit}),explicit);assert.throws(()=>previewSecret({}));assert.throws(()=>previewSecret({...env,OLIVERFEE_PREVIEW_SECRET:'bad'}));
});
test('preview storage creates only its private test bucket and rejects an existing public bucket',async()=>{
 const calls=[];let exists=false;
 const transport=async(url,init)=>{calls.push({url,init});if(init.method==='POST'){assert.equal(new URL(url).pathname,'/storage/v1/bucket');const b=JSON.parse(init.body);assert.equal(b.id,'oliverfee-admin-preview');assert.equal(b.public,false);exists=true;return Response.json({});}return exists?Response.json({public:false}):Response.json({message:'Bucket not found'},{status:404});};
 await new PreviewStorage('https://test.supabase.co','test',randomBytes(32).toString('hex'),transport).ensurePrivateBucket();assert.equal(calls.length,3);
 await assert.rejects(new PreviewStorage('https://test.supabase.co','test',randomBytes(32).toString('hex'),async()=>Response.json({public:true})).ensurePrivateBucket(),/must be private/);
});
test('separate server instances retain state, isolate owners and serialize concurrent requests',async()=>{
 const objects=new Map(),key=randomBytes(32).toString('hex'),id='a'.repeat(48);
 const transport=async(url,init)=>{
  if(new URL(url).pathname.includes('/bucket/'))return Response.json({public:false});
  const path=new URL(url).pathname.split('/object/')[1],method=init.method||'GET';
  if(method==='GET')return objects.has(path)?new Response(objects.get(path)):new Response('Object not found',{status:400});
  if(method==='POST'){if(objects.has(path)&&init.headers['x-upsert']==='false')return new Response('Duplicate',{status:409});objects.set(path,Buffer.from(init.body));return new Response('{}');}
  if(method==='DELETE'){for(const name of JSON.parse(init.body).prefixes)objects.delete(path+'/'+name);return new Response('{}');}
  throw Error('Unexpected transport');
 };
 const a=new PreviewStorage('https://test.supabase.co','test',key,transport),b=new PreviewStorage('https://test.supabase.co','test',key,transport);
 await a.write('owner-a',id,{counter:0},true);assert.deepEqual(await b.read('owner-a',id),{counter:0});assert.equal(await b.read('owner-b',id),null);
 await Promise.all([a,b].map(store=>store.locked('owner-a',id,async()=>{const value=await store.read('owner-a',id);await new Promise(r=>setTimeout(r,20));await store.write('owner-a',id,{counter:value.counter+1});})));
 assert.deepEqual(await a.read('owner-a',id),{counter:2});await b.remove('owner-a',id);assert.equal(await a.read('owner-a',id),null);
});
test('archived SQLite, quote identity and uploaded test bytes survive a fresh runtime',async()=>{
 let source=fs.readFileSync(new URL('../src/lib/admin/legacy.ts',import.meta.url),'utf8');
 source=source.replace('import "server-only";','').replace('"../../../oliverfee-360/worker/index.mjs"',JSON.stringify(new URL('../oliverfee-360/worker/index.mjs',import.meta.url).href)).replace('import {logPreview} from "./store";','const logPreview=(s,kind,detail)=>s.data.events.push({kind,detail});');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const {legacySession,snapshotLegacy,legacyCall}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
 const original={id:'b'.repeat(48),role:'archive-owner',scenario:'signed-quote',data:{events:[]}};
 const first=await legacySession(original),quote=first.quote;first.objects.set('test-only-extra',new Uint8Array([1,2,3]));
 const snapshot=JSON.parse(JSON.stringify(snapshotLegacy(first)));first.sql.close();
 const next={id:original.id,role:original.role,scenario:original.scenario,data:{events:[]},snapshot};
 const second=await legacySession(next);assert.equal(second.quote,quote);assert.deepEqual([...second.objects.get('test-only-extra')],[1,2,3]);
 const r=await legacyCall(next,`/api/carriers/${second.carrier}/quotes/${quote}`);assert.equal(r.status,200);assert.ok((await r.json()).id===quote);second.sql.close();
});
test('production request wrapper persists role changes and releases locks when navigation redirects',async()=>{
 const objects=new Map(),previous={};for(const name of ['NODE_ENV','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','OLIVERFEE_PREVIEW_SECRET'])previous[name]=process.env[name];
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async(url,init)=>{
  const path=new URL(url).pathname.split('/object/')[1],method=init.method||'GET';
  if(method==='GET')return objects.has(path)?new Response(objects.get(path)):new Response('Object not found',{status:400});
  if(method==='POST'){if(objects.has(path)&&init.headers['x-upsert']==='false')return new Response('Duplicate',{status:409});objects.set(path,Buffer.from(init.body));return new Response('{}');}
  if(method==='DELETE'){for(const name of JSON.parse(init.body).prefixes)objects.delete(path+'/'+name);return new Response('{}');}
  throw Error('Unexpected operation');
 };
 try{
  Object.assign(process.env,{NODE_ENV:'production',NEXT_PUBLIC_SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-only',OLIVERFEE_PREVIEW_SECRET:randomBytes(32).toString('hex')});
  let source=fs.readFileSync(new URL('../src/lib/admin/store.ts',import.meta.url),'utf8').replace('import "server-only";','');
  for(const name of ['persistence','fixtures','policy'])source=source.replaceAll('"./'+name+'"',JSON.stringify(new URL('../src/lib/admin/'+name+'.ts',import.meta.url).href));
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const first=await import('data:text/javascript;base64,'+Buffer.from(js+'\n// instance-a').toString('base64'));
  const s=await first.openPreview('owner-a','visitor');
  await assert.rejects(first.withPreview(s.id,'owner-a',async state=>{state.role='Basic';state.data.events.push({kind:'test',detail:'redirect',at:'now'});throw Error('NEXT_REDIRECT');}),/NEXT_REDIRECT/);
  const next=await import('data:text/javascript;base64,'+Buffer.from(js+'\n// instance-b').toString('base64'));
  assert.equal(await next.withPreviewRead(s.id,'owner-a',async state=>state.role),'Basic');
  assert.equal(await next.withPreviewRead(s.id,'owner-b',async state=>state),null);
  await next.withPreview(s.id,'owner-a',async state=>{state.scenario='empty';});
  assert.equal(await first.withPreviewRead(s.id,'owner-a',async state=>state.scenario),'empty');
  assert.equal(await next.removePreview(s.id,'owner-a'),true);assert.equal(await next.withPreviewRead(s.id,'owner-a',async state=>state),null);
 }finally{globalThis.fetch=originalFetch;for(const [name,value]of Object.entries(previous))if(value===undefined)delete process.env[name];else process.env[name]=value;}
});
