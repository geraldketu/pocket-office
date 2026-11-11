import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const base=process.env.ADMIN_TEST_BASE||'http://localhost:3004';
const inventory=JSON.parse(fs.readFileSync(new URL('../src/lib/admin/inventory.json',import.meta.url),'utf8')).entries;
const lab=await fetch(base+'/api/admin-lab',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:'Preview-Only-2026!'}),redirect:'manual'});
assert.equal(lab.status,303,'Start npm run admin:lab before running this isolated integration suite.');
const cookie=lab.headers.get('set-cookie').split(';')[0];const report=[];
async function request(path,options={}){return fetch(new URL(path,base),{...options,headers:{Cookie:cookie,Origin:base,...options.headers},redirect:'manual'});}
async function create(role='visitor',scenario='populated',path){const r=await request('/admin/api/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role,scenario,path})});assert.equal(r.status,200,await r.clone().text());return r.json();}
async function follow(path){for(let i=0;i<8;i++){const r=await request(path);if([301,302,303,307,308].includes(r.status)){path=r.headers.get('location');continue;}return r;}throw Error('Preview redirect loop at '+path);}
async function op(id,op,data={}){const r=await request(`/admin/api/preview/${id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op,...data})});return {status:r.status,data:await r.json()};}
test('anonymous / forged sessions cannot access owner admin APIs or pages',async()=>{
 for(const path of ['/admin/api/overview','/admin/api/preview','/admin/api/preview/not-a-session']){const r=await fetch(base+path,{method:path==='/admin/api/preview'?'POST':'GET',headers:{Cookie:'oliver-admin-lab=forged',Origin:base},redirect:'manual'});assert.equal(r.status,403,path);}
 const r=await fetch(base+'/admin',{redirect:'manual'});assert.ok([303,307].includes(r.status));assert.match(r.headers.get('location'),/login/);
 const forged=await request('/admin/api/preview',{method:'POST',headers:{Origin:'https://evil.test','Content-Type':'application/json'},body:'{"role":"owner"}'});assert.equal(forged.status,403);
});
test('preview referer cannot request live data, server actions, auth or storage routes',async()=>{
 const session=await create();for(const path of ['/admin/api/overview','/app','/documents/live-id/file','/auth/signout']){const r=await request(path,{headers:{Referer:base+`/admin/preview/${session.id}/view/`}});assert.equal(r.status,403,path);}
 const r=await follow(`/admin/preview/${session.id}/view/`);assert.match(r.headers.get('content-security-policy'),/connect-src 'self'/);
});
for(const e of inventory)test('Explorer coverage: '+e.id,async()=>{
 const s=await create(e.role,e.scenario,e.previewPath);let path=e.previewPath;if(path.startsWith('/archive#'))path='/archive?screen='+encodeURIComponent(path.split('#')[1]);
 const r=await follow(`/admin/preview/${s.id}/view`+(path==='/'?'/':path));const body=await r.text();const expected=e.id==='state:doc-error'?500:['state:doc-missing','state:carrier-missing','state:unknown-route'].includes(e.id)?404:200;
 assert.equal(r.status,expected,`${e.id}: ${body.slice(0,500)}`);if(expected===200)assert.ok(body.length>20,e.id);
 assert.ok(!body.includes('This administrative portal is restricted')||e.role==='salesperson'||e.path.startsWith('/login'),e.id);
 if(e.path.startsWith('/archive')){const a=await request(`/admin/api/preview/${s.id}/archive/index.html?screen=${e.path.split('#')[1]}`);assert.equal(a.status,200,await a.clone().text());assert.ok((await a.text()).includes('External request blocked in preview'));}
 report.push({id:e.id,path:e.path,role:e.role,scenario:e.scenario,httpStatus:r.status,steps:e.steps});
 await request(`/admin/api/preview/${s.id}`,{method:'DELETE'});
});
test('test login, password, invitation, role permissions and carrier isolation are independent of owner authentication',async()=>{
 const s=await create();assert.equal((await op(s.id,'login',{email:'basic@example.test',password:'wrong'})).status,401);assert.equal((await op(s.id,'login',{email:'basic@example.test',password:'Preview-Only-2026!'})).status,200);
 assert.equal((await op(s.id,'upload',{carrierId:'other-company',typeId:'type-dot',fileName:'sample.txt'})).status,403);assert.equal((await op(s.id,'invite',{email:'another@example.test'})).status,403);assert.equal((await op(s.id,'addLead',{name:'Wrong role'})).status,403);
 const roleAdmin=await follow(`/admin/preview/${s.id}/view/admin`);assert.match(await roleAdmin.text(),/Welcome back/);
 const owner=await request('/admin/api/overview');assert.equal(owner.status,200,'Outer owner privilege remains intact after preview login');
 const o=await create('owner');const invite=await op(o.id,'invite',{legal_name:'Invited Test Carrier',email:'invited@example.test'});assert.equal(invite.status,200);const confirmed=await follow(`/admin/preview/${o.id}/view/auth/confirm?token_hash=test-invite&type=invite&next=/set-password`);assert.match(await confirmed.text(),/Choose your password/);assert.equal((await op(o.id,'password',{password:'A-valid-test-password'})).status,200);const home=await follow(`/admin/preview/${o.id}/view/dashboard`);assert.match(await home.text(),/Invited Test Carrier/);
});
test('contact/interview saves and payment/filing/notification simulations only affect test state',async()=>{
 const s=await create('Basic');assert.equal((await op(s.id,'simulateFiling')).status,409);const paid=await op(s.id,'simulatePayment');assert.equal(paid.data.paymentStatus,'simulated-paid');assert.equal((await op(s.id,'simulateFiling')).status,200);assert.equal((await op(s.id,'simulateNotification')).status,200);
 const contact=await op(s.id,'contact',{name:'Sample Person',email:'sample@example.test'});assert.equal(contact.data.ok,true);const interview=await op(s.id,'interview',{interview:{company:'Sample Carrier',states:['CA'],scope:'Both',base:'GA',filings:{UCR:'help'},answers:{},vehicles:[],kyWeight:'',nyWeight:''},email:'sample@example.test',phone:''});assert.equal(interview.data.ok,true);
 const events=await (await request(`/admin/api/preview/${s.id}`)).json();assert.ok(events.events.some(e=>e.kind==='SIMULATED PAYMENT'));assert.ok(events.events.some(e=>e.kind==='interview saved'&&e.detail.includes('unpaid')));
 const other=await create('Basic');assert.equal((await (await request(`/admin/api/preview/${other.id}`)).json()).events.length,0);
});
for(const role of ['archive-owner','archive-office','archive-driver'])test('original Worker permissions and disabled checkout: '+role,async()=>{
 const s=await create(role,'signed-quote');await request(`/admin/api/preview/${s.id}/archive/index.html?screen=member`);
 async function api(path,method='GET',data){const r=await request(`/admin/api/preview/${s.id}/legacy?path=${encodeURIComponent(path)}`,{method,...(data?{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{})});return {status:r.status,data:await r.json()};}
 const session=await api('/api/session');assert.equal(session.status,200);const carrier=session.data.carriers[0].id;const work=await api(`/api/carriers/${carrier}/workspace`);assert.equal(work.data.role,role.split('-')[1]);assert.equal((await api('/api/carriers/other-test-carrier/workspace')).status,403);
 if(role==='archive-driver'){assert.deepEqual(work.data.state.people.map(p=>p.id),['d1']);assert.ok(work.data.state.records.every(r=>r.person==='d1'));assert.equal((await api(`/api/carriers/${carrier}/workspace`,'PUT',{state:work.data.state,revision:work.data.revision})).status,403);}
 if(role==='archive-office')assert.equal((await api(`/api/carriers/${carrier}/members`,'POST',{email:'new@example.test',role:'owner'})).status,403);
 if(role!=='archive-driver'){const q=await api(`/api/carriers/${carrier}/quotes`,'POST',{selection:{kind:'plan',plan:'Basic'}});assert.equal(q.status,201);assert.equal((await api(`/api/carriers/${carrier}/quotes/${q.data.id}/checkout`,'POST',{})).status,503);}
});
test('all fifteen original archive screens render their real components and navigation in isolated transport',async()=>{
 const screens=inventory.filter(e=>e.id.startsWith('archive:'));
 for(const entry of screens){const session=await create('archive-owner',entry.scenario);const screen=entry.path.split('#')[1];const url=`/admin/api/preview/${session.id}/archive/index.html?screen=${screen}`;const html=await (await request(url)).text();const dom=new JSDOM(html,{url:base+url,runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;w.structuredClone=structuredClone;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.URL.createObjectURL=()=> 'blob:sample';w.fetch=(input,options={})=>request(String(input),options);const errors=[];w.addEventListener('error',e=>errors.push(String(e.error||e.message)));
  try{vm.runInContext(w.document.querySelector('head script').textContent,dom.getInternalVMContext());for(const file of ['rules.js','state-workflows.js','advanced.js','app.js']){const js=await (await request(`/admin/api/preview/${session.id}/archive/${file}`)).text();vm.runInContext(js,dom.getInternalVMContext());}
   for(let i=0;i<200;i++){if(w.eval('!!activeCarrier')&&w.document.querySelector('#main').textContent.length>10&&w.eval('page()')===screen)break;await new Promise(r=>setTimeout(r,20));}
   assert.equal(w.eval('page()'),screen,screen);assert.ok(w.document.querySelector('#main').textContent.length>20,screen);assert.ok(w.document.querySelector('#sidebar a[href^="#"]'),screen);assert.deepEqual(errors,[],screen);
  }finally{dom.window.close();}
 }
});
async function mountArchive(s,screen){
 const url=`/admin/api/preview/${s.id}/archive/index.html?screen=${screen}`,html=await (await request(url)).text();const dom=new JSDOM(html,{url:base+url,runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.structuredClone=structuredClone;w.scrollTo=()=>{};w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.URL.createObjectURL=()=> 'blob:sample';w.URL.revokeObjectURL=()=>{};w.fetch=(input,options={})=>request(String(input),options);
 vm.runInContext(w.document.querySelector('head script').textContent,dom.getInternalVMContext());for(const file of ['rules.js','state-workflows.js','advanced.js','app.js'])vm.runInContext(await (await request(`/admin/api/preview/${s.id}/archive/${file}`)).text(),dom.getInternalVMContext());
 for(let i=0;i<250;i++){if(w.eval('!!activeCarrier')&&w.eval('page()')===screen)break;await new Promise(r=>setTimeout(r,20));}
 async function click(selector){const el=w.document.querySelector(selector);assert.ok(el,selector);el.click();await new Promise(r=>setTimeout(r,30));}
 function field(selector,value){const el=w.document.querySelector(selector);assert.ok(el,selector);if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));}
 async function submit(selector){const el=w.document.querySelector(selector);assert.ok(el,selector);el.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,80));await w.eval('saveQueue');}
 async function go(hash){w.location.hash=hash;await new Promise(r=>setTimeout(r,30));}
 return {w,dom,click,field,submit,go};
}
test('original archive action workflows: compliance, team/DQF, supplies, notices, marketplace and imports',async()=>{
 const session=await create('archive-owner'),p=await mountArchive(session,'compliance'),{w}=p;
 try{
  await p.click('[data-action="record:new"]');p.field('[data-form="record"] [name="name"]','Synthetic permit record');await p.submit('[data-form="record"]');assert.ok(w.eval('db.records.some(r=>r.name==="Synthetic permit record")'));
  await p.go('fleet');await p.click('[data-action="person"]');p.field('[data-form="person"] [name="name"]','Synthetic Driver');await p.submit('[data-form="person"]');assert.ok(w.eval('db.people.some(p=>p.name==="Synthetic Driver")'));
  await p.click('[data-action="dqf:d1"]');assert.match(w.document.querySelector('#dialog').textContent,/Driver qualification file/);await p.click('[data-action="close"]');
  await p.click('[data-action="hazmat-test:d1"]');p.field('[data-form="hazmat-test"] [name="application"]','Renewal or transfer');for(const name of ['enrolled','stateReady'])p.field('[data-form="hazmat-test"] [name="'+name+'"]',true);if(w.document.querySelector('[name="stateGuide"]'))p.field('[name="stateGuide"]','https://dds.georgia.gov/');await p.submit('[data-form="hazmat-test"]');await p.click('[data-action="send-hazmat-test:d1"]');await p.click('[data-action="close"]');
  await p.go('audit');p.field('[data-audit="0"]',true);await p.click('[data-action="audit-request"]');p.field('[data-form="audit"] [name="company"]','Synthetic Binder Company');await p.submit('[data-form="audit"]');assert.equal(w.eval('db.requests.length'),1);
  await p.go('supplies');await p.click('[data-action="supply:0"]');p.field('[data-form="order"] [name="qty"]','3');await p.submit('[data-form="order"]');assert.equal(w.eval('db.orders.length'),1);
  await p.go('notices');await p.click('[data-action="notice"]');p.field('[data-form="notice"] [name="title"]','Synthetic notice');p.field('[data-form="notice"] [name="url"]','https://www.fmcsa.dot.gov/');p.field('[data-form="notice"] [name="summary"]','Test summary');await p.submit('[data-form="notice"]');assert.ok(w.eval('db.notices.some(n=>n.title==="Synthetic notice")'));
  await p.go('board');await p.click('[data-action="listing"]');for(const [name,value]of Object.entries({name:'Sample Available Driver',company:'Sample Co',city:'Atlanta',region:'Southeast',contact:'sample@example.test'}))p.field(`[data-form="listing"] [name="${name}"]`,value);await p.submit('[data-form="listing"]');assert.ok(w.eval('db.listings.some(x=>x.name==="Sample Available Driver")'));
  await p.go('plans');await p.click('[data-action="broker:Find Drivers + 5 posts"]');await p.go('board');await p.click('[data-action="job"]');p.field('[data-form="job"] [name="title"]','Synthetic job');p.field('[data-form="job"] [name="detail"]','Synthetic route and contact');await p.submit('[data-form="job"]');assert.equal(w.eval('db.jobs.length'),1);
  await p.go('accounts');const importButton=w.document.querySelector('[data-action="import-legacy"]');assert.ok(importButton);await p.click('[data-action="import-legacy"]');assert.ok(w.eval('db.records.some(r=>r.id==="sample-browser-record")'));for(let i=0;i<150&&!w.document.querySelector('#toast').textContent.includes('Browser records imported');i++)await new Promise(r=>setTimeout(r,20));await p.go('accounts');
  p.field('[data-form="invite-member"] [name="email"]','new-office@example.test');p.field('[data-form="invite-member"] [name="role"]','office');await p.submit('[data-form="invite-member"]');for(let i=0;i<150&&!w.document.querySelector('#dialog').textContent.includes('Account invitation saved');i++)await new Promise(r=>setTimeout(r,20));assert.match(w.document.querySelector('#dialog').textContent,/invitation saved/);await p.click('[data-action="close"]');await p.click('[data-action="view-members"]');for(let i=0;i<150&&!w.document.querySelector('#dialog').textContent.includes('new-office@example.test');i++)await new Promise(r=>setTimeout(r,20));assert.match(w.document.querySelector('#dialog').textContent,/new-office@example.test/);await p.click('[data-action="close"]');
  p.field('[data-form="new-office"] [name="name"]','Synthetic New Company');await p.submit('[data-form="new-office"]');for(let i=0;i<100&&w.eval('db.profile.name')!=='Synthetic New Company';i++)await new Promise(r=>setTimeout(r,20));assert.equal(w.eval('db.profile.name'),'Synthetic New Company');
  const meta=await (await request(`/admin/api/preview/${session.id}`)).json();assert.ok(meta.events.some(e=>e.kind==='archived test operation'));
 }finally{p.dom.window.close();}
});
test('actual customer signing screen reaches signed state, safe receipt and quote review without live checkout',async()=>{
 const session=await create('archive-owner','unsigned-quote'),p=await mountArchive(session,'customer-review'),{w}=p;
 try{p.field('[data-form="customer-sign"] [name="signature"]','Synthetic Carrier');p.field('[data-form="customer-sign"] [name="agreed"]',true);await p.submit('[data-form="customer-sign"]');for(let i=0;i<100&&!w.eval('customerQuote?.signature');i++)await new Promise(r=>setTimeout(r,20));assert.equal(w.eval('customerQuote.signature'),'Synthetic Carrier');assert.equal(w.eval('customerQuote.checkoutConfigured'),false);assert.equal(w.document.querySelector('[data-action="quote-checkout"]'),null);assert.equal((await op(session.id,'simulatePayment')).status,200);const id=w.eval('customerQuote.id'),carrier=w.eval('activeCarrier');const q=await (await request(`/admin/api/preview/${session.id}/legacy?path=${encodeURIComponent(`/api/carriers/${carrier}/quotes/${id}`)}`)).json();assert.equal(q.paidCents,4999);assert.equal(q.status,'Ready to Process');}
 finally{p.dom.window.close();}
});
test('pending and stale quotes cannot be signed or simulated paid; empty/error states have working guided paths',async()=>{
 for(const scenario of ['pending-quote','stale-quote']){const s=await create('archive-owner',scenario),p=await mountArchive(s,'customer-review');try{assert.equal(p.w.document.querySelector('[data-form="customer-sign"]'),null);assert.equal((await op(s.id,'simulatePayment')).status,409);}finally{p.dom.window.close();}}
 const s=await create('archive-owner','empty'),p=await mountArchive(s,'documents');try{assert.match(p.w.document.querySelector('#main').textContent,/No documents|No uploaded|Upload/i);}finally{p.dom.window.close();}
});
test('copied quote URLs open the owner-bound preview and archive input cannot inject scripts',async()=>{
 const s=await create('archive-owner','unsigned-quote');await request(`/admin/api/preview/${s.id}/archive/index.html?screen=member`);
 const quote=await request(`/admin/api/preview/${s.id}/legacy?path=${encodeURIComponent('/api/carriers/test-archive-carrier/quotes')}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({selection:{kind:'plan',plan:'Basic'}})});const q=await quote.json();assert.ok(q.path.startsWith(`/admin/preview/${s.id}?path=`));assert.equal((await follow(q.path)).status,200);
 const html=await (await request(`/admin/api/preview/${s.id}/archive/index.html?screen=${encodeURIComponent('</script><script>alert(1)</script>')}`)).text();assert.ok(!html.includes('alert(1)'));
 const denied=await request(`/admin/api/preview/${s.id}/archive/index.html?screen=customer-review&carrier=other-test-carrier&quote=${q.id}`);assert.equal(denied.status,403);
});
test('original archive file transport stores only test bytes and enforces membership / driver scope',async()=>{
 const s=await create('archive-owner');await request(`/admin/api/preview/${s.id}/archive/index.html?screen=documents`);const path='/api/carriers/test-archive-carrier/files/test-upload?name=SAMPLE.txt&purpose=Other&person=d1',endpoint=`/admin/api/preview/${s.id}/legacy?path=`;
 const put=await request(endpoint+encodeURIComponent(path),{method:'PUT',headers:{'Content-Type':'text/plain'},body:'TEST BYTES ONLY'});assert.equal(put.status,201);const file=await request(endpoint+encodeURIComponent('/api/carriers/test-archive-carrier/files/test-upload'));assert.equal(file.status,200);assert.equal(await file.text(),'TEST BYTES ONLY');assert.equal((await request(endpoint+encodeURIComponent('/api/carriers/other-test-carrier/files/test-upload'))).status,403);
 assert.equal((await request(endpoint+encodeURIComponent('/api/carriers/test-archive-carrier/files/test-upload'),{method:'DELETE'})).status,200);assert.equal((await request(endpoint+encodeURIComponent('/api/carriers/test-archive-carrier/files/test-upload'))).status,404);
});
test('failure scenarios return actual-form errors without mutating any production provider',async()=>{
 const contact=await create('visitor','save-error');assert.equal((await op(contact.id,'contact',{name:'Test',email:'sample@example.test'})).data.ok,false);
 const account=await create('new-customer','password-error');assert.equal((await op(account.id,'password',{password:'Valid-test-password'})).status,400);
 const storage=await create('Basic','storage-error');const upload=await op(storage.id,'upload',{carrierId:'test-carrier-Basic',typeId:'type-dot',fileName:'SAMPLE.txt'});assert.match(upload.data.error,/Upload failed/);
 const invite=await create('owner','invite-error');assert.equal((await op(invite.id,'invite',{legal_name:'Sample',email:'sample@example.test'})).data.ok,false);
});
test.after(()=>{if(report.length!==inventory.length)return;fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/ADMIN-PREVIEW-COVERAGE.json',JSON.stringify({checkedAt:new Date().toISOString(),base,coverage:report},null,2)+'\n');});

test('self signup confirms into an unlinked member without owner privileges or live actions',async()=>{
 const s=await create();const result=await op(s.id,'signup',{name:'Test Signup',email:'signup@example.test',password:'Preview-Only-2026!',role:'admin',carrier_id:'other-company'});assert.equal(result.status,200);const confirmed=await follow('/admin/preview/'+s.id+'/view'+result.data.confirmationPath);assert.equal(confirmed.status,200);assert.match(await confirmed.text(),/Carrier access pending/);const app=await follow('/admin/preview/'+s.id+'/view/app');assert.match(await app.text(),/Carrier access pending/);assert.equal((await op(s.id,'addLead',{name:'Forbidden'})).status,403);const failed=await create('visitor','signup-error');assert.equal((await op(failed.id,'signup',{name:'Test Signup',email:'signup@example.test',password:'Preview-Only-2026!'})).status,503);
});
