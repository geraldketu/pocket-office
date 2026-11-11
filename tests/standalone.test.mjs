import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewInterview,calculateBid} from '../src/lib/interview-rules.ts';
import {authConfigured,requestsConfigured} from '../src/lib/config.ts';
const fixture={company:'Sample Carrier',scope:'Interstate',base:'GA',weight:'Over 26,000 lb',states:['GA','KY','NY'],filings:{DOT:'help',KYU:'help','NY HUT':'help'},kyWeight:'Yes',nyWeight:'Yes'};
test('USDOT, KYU and NY HUT are requested but unpaid and unresolved government fees stay pending',()=>{
 const q=reviewInterview(fixture);assert.deepEqual(q.services.map(s=>s.key),['DOT','KYU','NY HUT']);assert.equal(q.knownCents,2500);assert.equal(q.pending,true);assert.equal(q.paymentStatus,'unpaid');assert.equal(q.checkoutEnabled,false);
});
test('existing USDOT and unrequested NY HUT stay out of service quote',()=>{
 const q=reviewInterview({...fixture,filings:{DOT:'have',KYU:'help','NY HUT':'self'}});assert.deepEqual(q.services.map(s=>s.key),['KYU']);
});
test('self-handled and in-process registrations never produce a charge',()=>{
 const q=reviewInterview({...fixture,filings:{DOT:'self',KYU:'process','NY HUT':'have'}});assert.deepEqual(q.services,[]);assert.equal(q.knownCents,0);
});
test('IFTA help is free but government fees need confirmation; DQF remains separate',()=>{
 const q=reviewInterview({...fixture,filings:{IFTA:'help',DQF:'help'}});assert.equal(q.services.find(s=>s.key==='IFTA').serviceCents,0);assert.equal(q.services.find(s=>s.key==='DQF').serviceCents,9999);assert.equal(q.pending,true);
});
test('bid example: 500 offer, 300 miles, 2.50 per mile and 50 tolls',()=>{
 assert.deepEqual(calculateBid(500,300,2.5,50,0),{minimum:550,middle:675,goal:800,mileageTarget:750,addons:50});
});
test('calculator rejects zero mileage, negative costs and non-finite values',()=>{
 for(const values of [[500,0,2.5,0,0],[500,300,2.5,-10,0],[500,300,Infinity,0,0]])assert.throws(()=>calculateBid(...values));
});
test('placeholder configuration cannot enable member authentication or request submission',()=>{
 const keys=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'];const previous=keys.map(k=>process.env[k]);
 try{process.env.NEXT_PUBLIC_SUPABASE_URL='https://YOUR-PROJECT.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='';process.env.SUPABASE_SERVICE_ROLE_KEY='';assert.equal(authConfigured(),false);assert.equal(requestsConfigured(),false);}finally{keys.forEach((k,i)=>previous[i]===undefined?delete process.env[k]:process.env[k]=previous[i]);}
});

test('Basic UCR assistance has no service fee and registration remains separate',()=>{
 const q=reviewInterview({...fixture,filings:{UCR:'help'}});assert.equal(q.services[0].serviceCents,0);assert.equal(q.services[0].governmentCents,null);assert.equal(q.knownCents,0);assert.equal(q.pending,true);assert.equal(q.checkoutEnabled,false);
});
test('Startup Bundle is 1250 before outside fees without duplicate USDOT or UCR service charges',()=>{
 const q=reviewInterview({...fixture,packageSelection:'startup',filings:{DOT:'help',UCR:'help'}});assert.equal(q.bundleCents,125000);assert.equal(q.knownCents,125000);assert.ok(q.services.every(s=>s.serviceCents===0));assert.equal(q.pending,true);assert.equal(q.paymentStatus,'unpaid');assert.equal(q.checkoutEnabled,false);
});
test('Basic and Startup approved prices match marketing copy',async()=>{
 const {pricing}=await import('../src/lib/interview-rules.ts');assert.equal(pricing.basicMonthlyCents,4999);assert.equal(pricing.startupBundleCents,125000);
 const {readFileSync}=await import('node:fs');const plans=readFileSync(new URL('../src/app/plans/page.tsx',import.meta.url),'utf8');assert.ok(plans.includes('49.99'));assert.ok(plans.includes('$1,250'));assert.ok(!plans.includes('$25 service fee'));assert.ok(plans.includes('full total is due before processing begins'));
});
