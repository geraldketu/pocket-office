import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
async function page(width){
 const dom=new JSDOM(fs.readFileSync('web/index.html','utf8'),{url:'https://office.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.structuredClone=structuredClone;w.scrollTo=()=>{};w.fetch=undefined;
 Object.defineProperty(w,'innerWidth',{value:width});w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 const errors=[];w.addEventListener('error',e=>errors.push(e.error||e.message));
 for(const file of ['rules.js','state-workflows.js','advanced.js','app.js'])vm.runInContext(fs.readFileSync('web/'+file,'utf8'),dom.getInternalVMContext());
 w.eval(`db.setupTerms={version:filingTermsVersion};db.onboard={scope:'Across state lines (interstate)',hire:'Yes, for hire',base:'GA',states:'GA, KY, NY',hazmat:'No',weightBand:'Over 26,000 lb',vehicleSetups:[],hazmatDetails:{materials:[]}};location.hash='onboarding';render()`);
 await new Promise(resolve=>setTimeout(resolve,0));
 return {w,dom,errors,change(selector,value){const el=w.document.querySelector(selector);assert.ok(el,selector);if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));el.dispatchEvent(new w.Event('change',{bubbles:true}));},click(selector){const el=w.document.querySelector(selector);assert.ok(el,selector);el.click()}};
}
test('bid uses the posted diesel rate and links to the official source',async()=>{
 const p=await page(390),{w}=p;
 try{
  w.fetch=async()=>new Response(JSON.stringify({rate:{price:6.292,date:'2026-11-02'}}));
  w.eval("serverSession={user:{admin:false}};location.hash='bid';render()");
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.match(w.document.querySelector('#bid-diesel-rate').textContent,/\$6\.292/);
  assert.match(w.document.querySelector('a[href*="EMD_EPD2D_PTE_NUS_DPG"]').textContent,/Check National Diesel Rate/);
  assert.equal(w.document.querySelector('[data-form="post-diesel-rate"]'),null);
  p.change('[name="offer"]','300');p.change('[name="miles"]','120');p.change('[name="rate"]','3');p.change('[name="mpg"]','6');
  p.click('[data-form="bid"] button');
  await new Promise(resolve=>setTimeout(resolve,0));
  const result=w.document.querySelector('#bid-result').textContent;
  assert.match(result,/Estimated diesel cost \$125\.84 at \$6\.292/);
  assert.match(result,/Goal suggested\$485\.84/);
 }finally{p.dom.window.close()}
});
for(const width of [390,1280]){
 test('USDOT, KYU and NY HUT interview follow-ups and unpaid review at '+width+'px',async()=>{
  const p=await page(width),{w}=p;try{
   p.change('[name="operatingState"][value="KY"]',false);
   p.change('[name="operatingState"][value="NY"]',false);
   assert.equal(w.document.querySelector('[name="followup_KY"]'),null);
   assert.equal(w.document.querySelector('[name="followup_NY"]'),null);
   p.change('[name="operatingState"][value="KY"]',true);
   p.change('[name="operatingState"][value="NY"]',true);
   assert.match(w.document.querySelector('#setup-followups').textContent,/Kentucky: is the combined licensed weight 60,000 lb or more/);
   assert.match(w.document.querySelector('#setup-followups').textContent,/New York: over 18,000 lb gross weight/);
   p.change('[name="followup_KY"]','Yes');p.change('[name="followup_NY"]','Yes');
   for(const type of ['DOT','KYU','NY HUT'])p.change('[data-application-status="'+type+'"]','help');
   const q=JSON.parse(w.eval('JSON.stringify(OfficeRules.buildQuote(db))'));
   assert.deepEqual(q.services.map(i=>i.type).sort(),['DOT','KYU','NY HUT'].sort());
   assert.ok(w.document.querySelector('[name="followup_cdl"]'));
   assert.ok(w.document.querySelector('[name="followup_ownerOperator"]'));
   assert.equal(w.eval('db.signedQuote == null'),true);
   assert.equal(w.eval('db.requests.some(r=>r.paymentStatus === "paid" || r.status === "Paid")'),false);
   assert.match(w.document.querySelector('#estimate').textContent,/No charge is made and nothing is marked paid/);
   assert.deepEqual(p.errors,[]);
  }finally{p.dom.window.close()}
 });

 test('NM/IFTA immediate form flow at '+width+'px preserves Oregon and NY/KY cards',async()=>{
  const p=await page(width),{w}=p;try{
   p.change('[name="iftaBase"]','CT');
   p.change('[name="operatingState"][value="NM"]',true);
   assert.equal(w.document.querySelector('[data-nm-questions]').hidden,false);
   assert.equal(w.document.querySelector('[data-nm-questions] a').textContent,'Official New Mexico MVD Guidance');
   p.change('[data-nm-field="weight"]','30000');p.change('[data-nm-field="permit"]','No');
   assert.match(w.document.querySelector('[data-nm-results]').textContent,/Weight-distance requirement applies/);
   assert.match(w.document.querySelector('#estimate').textContent,/Fee pending confirmation/);
   p.change('[data-application-status="NM"]','help');p.change('[data-application-status="IFTA"]','help');
   const links=[...w.document.querySelectorAll('#estimate a')];assert.ok(links.some(a=>a.href==='https://portal.ct.gov/drs/ifta/connecticut-ifta'&&a.textContent==='Apply for IFTA / Order Decals'));
   assert.match(w.document.querySelector('#estimate').textContent,/myconneCT/);
   const nmLink=links.find(a=>a.textContent==='Official New Mexico MVD Guidance');assert.ok(nmLink);
   p.change('[name="operatingState"][value="OR"]',true);assert.equal(w.document.querySelector('[data-oregon-questions]').hidden,false);assert.ok(w.document.querySelector('[name="oregonLoadedWeight"]'));assert.ok(w.document.querySelector('[name="oregonEnrollment"]'));
   const cards=w.document.querySelector('#estimate');assert.match(cards.innerHTML,/drive.ky.gov/);assert.match(cards.innerHTML,/tax.ny.gov/);
   p.change('[name="operatingState"][value="NM"]',false);p.change('[name="permitCheck"][value="NM"]',true);assert.equal(w.document.querySelector('[data-nm-questions]').hidden,false);assert.equal(w.document.querySelector('[data-nm-route]').hidden,false);assert.equal(w.document.querySelector('[name="operatingState"][value="NM"]').checked,false);
   p.change('[data-nm-field="travel"]','Yes');assert.equal(w.eval('OfficeRules.newMexicoPlanning(db.onboard)[0].status'),'Required');assert.deepEqual(p.errors,[]);
  }finally{p.dom.window.close()}
 });
 test('interactive form flow at '+width+'px: application first, draft, immediate follow-ups, checklist and review buttons',async()=>{
  const p=await page(width),{w}=p;try{
   const app=w.document.querySelector('#carrier-application');const operation=w.document.querySelector('[data-form="onboard"]');assert.ok(app.compareDocumentPosition(operation)&w.Node.DOCUMENT_POSITION_FOLLOWING);
   p.change('[data-application-status="DOT"]','have');p.change('[data-application-number="DOT"]','1234567');p.change('[data-application-activation="DOT"]','Issued, not yet active');
   p.change('[data-application-status="KYU"]','help');p.change('[data-application-status="NY HUT"]','self');
   assert.equal(w.eval('db.application.filings.DOT.number'),'1234567');assert.deepEqual(JSON.parse(w.eval('JSON.stringify(OfficeRules.buildQuote(db).services.map(i=>i.type))')),['KYU']);
   assert.ok(w.document.querySelector('[data-action="upload-service:DOT"]'));
   p.change('[name="weightBand"]','Unsure or mixed fleet');assert.equal(w.document.querySelector('#mixed-fleet').open,true);
   p.click('[data-action="add-weight"]');p.change('[data-weight-field="name"][data-index="0"]','Known combination');p.change('[data-weight-field="actual"][data-index="0"]','42000');p.change('[data-weight-field="rated"][data-index="0"]','52000');p.click('[data-action="save-weights"]');
   p.click('[data-action="add-weight"]');p.change('[data-weight-field="name"][data-index="1"]','Verify second truck');p.change('[data-weight-field="verifyLater"][data-index="1"]',true);p.click('[data-action="save-weights"]');
   assert.equal(w.eval('OfficeRules.weightResults(db.onboard.vehicleSetups).results[0].max'),52000);assert.equal(w.eval('OfficeRules.weightResults(db.onboard.vehicleSetups).results[1].status'),'Needs verification');
   p.change('[name="hazmat"]','Yes');assert.equal(w.document.querySelector('#hazmat-interview').open,true);p.click('[data-action="add-material"]');assert.equal(w.document.querySelectorAll('.material-row').length,1);assert.equal(w.document.querySelectorAll('#hazmat-evaluation .task').length,8);
   p.click('[data-action="checklist"]');assert.equal(w.eval('db.records.find(r=>r.type==="DOT").filingNumber'),'1234567');assert.equal(w.eval('db.records.find(r=>r.type==="DOT").activation'),'Issued, not yet active');
   w.eval("location.hash='plans';render()");await new Promise(resolve=>setTimeout(resolve,0));
   assert.ok(w.document.querySelector('[data-action="plan:Ultimate"]').textContent.includes('$199/month'));assert.ok(w.document.querySelector('[data-action="startup-review"]').textContent.includes('$1,250 one time'));
   p.click('[data-action="plan:Ultimate"]');await new Promise(resolve=>setTimeout(resolve,0));assert.ok(w.document.querySelector('#main').textContent.includes('Ultimate — $199/month'));
   w.eval("location.hash='plans';render()");await new Promise(resolve=>setTimeout(resolve,0));p.click('[data-action="startup-review"]');await new Promise(resolve=>setTimeout(resolve,0));assert.ok(w.document.querySelector('#main').textContent.includes('Carrier Startup Bundle — $1,250 one time'));
   assert.deepEqual(p.errors,[]);
  }finally{p.dom.window.close()}
 });
}
