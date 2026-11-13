import test from 'node:test';import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {importProspects,parseCsv} from '../src/lib/sales/csv.ts';
import {applicationPayload,callPayload,plan,safeCsvCell} from '../src/lib/sales/validation.ts';
import {verifyStripeSignature,assertPaidSession} from '../src/lib/sales/stripe-verification.ts';
test('FMCSA CSV handles quoted names/newlines, BOM, aliases, dates and duplicate USDOTs without overwriting records',()=>{
 const parsed=importProspects('\uFEFFLEGAL_NAME,DOT_NUMBER,EMAIL_ADDRESS,PHY_CITY,PHY_STATE,ADD_DATE,NBR_POWER_UNIT,notes\r\n"Carrier, One",123,one@example.test,Atlanta,GA,20261101,2,"First line\nSecond line"\r\nDuplicate,123,,,,,,\r\nInvalid,not-a-number,,,,,,');
 assert.equal(parsed.rows.length,1);assert.equal(parsed.rows[0].company_name,'Carrier, One');assert.equal(parsed.rows[0].registration_date,'2026-11-01');assert.equal(parsed.rows[0].notes,'First line\nSecond line');assert.equal(parsed.duplicates,1);assert.equal(parsed.errors.length,1);
 assert.throws(()=>parseCsv('name,dot\n"unfinished'),/unclosed/);assert.throws(()=>importProspects('name,phone\nMissing,123'),/Required headers/);assert.throws(()=>importProspects('LEGAL_NAME,DOT_NUMBER,DOT_NUMBER\nx,1,2'),/unique/);
 assert.equal(importProspects('company_name,usdot,registration_date\nBad,1,2026-02-30').errors.length,1);assert.throws(()=>parseCsv('x'.repeat(1500001)),/1.5 MB/);
});
test('enrollment drafts preserve partial data, completion validates contact and equipment, and unapproved prices cannot be supplied',()=>{
 const draft=applicationPayload({details:{legal_name:'New company'},plan_key:'Basic',complete:false,revision:0});assert.equal(draft.complete,false);assert.equal(draft.plan_key,'Basic');
 assert.throws(()=>applicationPayload({details:{legal_name:'New company'},plan_key:'Basic',complete:true,revision:0}),/email/);
 for(const name of ['Custom','basic','__proto__','constructor'])assert.throws(()=>plan(name),/approved/);
 assert.throws(()=>applicationPayload({details:{usdot:'123456789'},plan_key:'Basic',complete:false,revision:0}),/too long/);
 assert.throws(()=>callPayload({disposition:'Forged',revision:0}),/disposition/);assert.throws(()=>callPayload({disposition:'Call Back',revision:0}),/follow-up/);
 assert.ok(safeCsvCell('=WEBSERVICE("https://example.test")').startsWith('"\''));assert.ok(safeCsvCell('  +cmd').startsWith('"\''));
});
test('Stripe signature checks bind the raw body, timestamp and all rotating v1 signatures',()=>{
 const raw='{"id":"evt_test"}',time=1800000000,secret='whsec_test_only',sig=createHmac('sha256',secret).update(time+'.'+raw).digest('hex');
 assert.doesNotThrow(()=>verifyStripeSignature(raw,'t='+time+',v1='+'0'.repeat(64)+',v1='+sig,secret,time));
 for(const [body,header,clock] of [[raw+' ','t='+time+',v1='+sig,time],[raw,'t='+time+',v1='+sig,time+301],[raw,'t='+time+',v1=bad',time],[raw,'v1='+sig,time]])assert.throws(()=>verifyStripeSignature(body,header,secret,clock),/signature/);
});
test('only the exact paid recurring Stripe session can activate the matching customer and representative sale',()=>{
 const expected={attempt:'attempt',application:'app',rep:'rep',session:'cs_test',price:'price_basic',amount:4999,email:'customer@example.test',live:false};
 const valid={id:'cs_test',mode:'subscription',payment_status:'paid',amount_total:4999,currency:'usd',livemode:false,client_reference_id:'app',customer_details:{email:'customer@example.test'},metadata:{sales_attempt_id:'attempt',application_id:'app',rep_id:'rep'},subscription:{id:'sub_test',status:'active',metadata:{sales_attempt_id:'attempt'}},line_items:{data:[{quantity:1,price:{id:'price_basic',unit_amount:4999,currency:'usd',recurring:{interval:'month',interval_count:1}}}]}};
 assert.equal(assertPaidSession(valid,expected),'sub_test');
 for(const patch of [{payment_status:'unpaid'},{amount_total:1},{currency:'eur'},{livemode:true},{metadata:{...valid.metadata,rep_id:'other'}},{customer_details:{email:'other@example.test'}},{subscription:{...valid.subscription,status:'incomplete'}},{line_items:{data:[{...valid.line_items.data[0],quantity:2}]}},{line_items:{data:[{quantity:1,price:{...valid.line_items.data[0].price,id:'price_changed'}}]}}])assert.throws(()=>assertPaidSession({...valid,...patch},expected),/does not match/);
});
