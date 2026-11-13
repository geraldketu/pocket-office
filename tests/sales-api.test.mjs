import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import * as validation from '../src/lib/sales/validation.ts';import * as csv from '../src/lib/sales/csv.ts';import * as types from '../src/lib/sales/types.ts';import {SalesInputError} from '../src/lib/sales/input-error.ts';
class SalesError extends Error{constructor(message,status=400){super(message);this.status=status;}}
function api({owner=false,rows=[]}={}){
 const calls=[],ranges=[],module={exports:{}};
 const client={from:()=>{const b={select:()=>b,order:()=>b,gte:()=>b,lte:()=>b,range:(start,end)=>{ranges.push([start,end]);b.start=start;b.end=end;return b;},then:resolve=>resolve({data:rows.slice(b.start,b.end+1),count:rows.length,error:null}),start:0,end:499};return b;}};
 const imports={'server-only':{},'@/lib/supabase/server':{createClient:async()=>client},'./types':types,'./validation':validation,'./csv':csv,'./payments':{generateCheckout:async()=>{calls.push('checkout');return {}; }},'./notifications':{registerRepresentative:async()=>{calls.push('register');},sendCheckoutEmail:async()=>{calls.push('email');},drainSalesOutbox:async()=>{calls.push('outbox');}},'./server':{SalesError,actor:async management=>{if(management&&!owner)throw new SalesError('Owner access required.',403);return {id:'server-verified-rep',owner:management};},salesData:async()=>({prospects:[]}),command:async()=>{calls.push('command');return {};},sameOrigin:r=>{if(r.headers.get('origin')!==new URL(r.url).origin)throw new SalesError('Same origin required.',403);},requestBody:r=>r.json(),salesFailure:e=>Response.json({error:e.message},{status:e instanceof SalesError?e.status:e instanceof SalesInputError?400:503})}};
 const source=ts.transpileModule(fs.readFileSync(new URL('../src/lib/sales/api.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',source)(n=>{assert.ok(imports[n],n);return imports[n];},module,module.exports);return {...module.exports,calls,ranges};
}
test('representatives cannot invoke management functions, spoof owner flags, export team data or make cross-origin changes',async()=>{
 const a=api();for(const action of ['register-rep','rep-update','assign','import','resource-save','commission-approve','retry-notifications']){
  const response=await a.postSales(new Request('https://app.test/api/sales',{method:'POST',headers:{Origin:'https://app.test','Content-Type':'application/json'},body:JSON.stringify({action,owner:true,management:true,role:'admin'})}));assert.equal(response.status,403);
 }
 assert.equal((await a.getSales(new Request('https://app.test/api/sales?export=csv'))).status,403);
 assert.equal((await a.getSales(new Request('https://app.test/admin/api/sales'),true)).status,403);
 assert.equal((await a.postSales(new Request('https://app.test/api/sales',{method:'POST',headers:{Origin:'https://other.test'},body:'{"action":"checkout"}'}))).status,403);
 assert.equal((await a.postSales(new Request('https://app.test/api/sales',{method:'POST',headers:{Origin:'https://app.test'},body:'{"action":"checkout","id":"not-a-uuid"}'}))).status,400);
 assert.equal(a.calls.length,0);
});
test('owner report paginates beyond provider row limits and guards CSV formulas rather than silently exporting the first page',async()=>{
 const rows=Array.from({length:1203},(_,i)=>({id:'sale-'+i,rep_id:'rep',plan_key:i===0?'=HYPERLINK("bad")':'Basic',status:'paid',initial_revenue_cents:4999,paid_at:'2026-11-12'}));
 const a=api({owner:true,rows}),response=await a.getSales(new Request('https://app.test/admin/api/sales?export=csv'),true);assert.equal(response.status,200);const csv=await response.text();assert.equal(csv.split('\r\n').length,1204);assert.ok(csv.includes('sale-1202'));assert.deepEqual(a.ranges,[[0,499],[500,999],[1000,1499]]);assert.ok(csv.includes('"\'=HYPERLINK'));assert.equal(response.headers.get('cache-control'),'no-store');
 const tooMany=api({owner:true,rows:Array(10001).fill(rows[0])});assert.equal((await tooMany.getSales(new Request('https://app.test/admin/api/sales?export=csv'),true)).status,413);
});
