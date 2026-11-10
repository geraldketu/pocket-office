const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function app(){
 const nodes={};const handlers={};
 const context=vm.createContext({Intl,Date,Math,Number,Object,String,Set,Array,JSON,structuredClone,console,setTimeout,clearTimeout,
  localStorage:{getItem:()=>null,setItem(){}},location:{hash:''},window:{addEventListener(){}},
  document:{querySelector:s=>nodes[s]??=( {hidden:false,innerHTML:'',classList:{toggle(){}},style:{}}),body:{classList:{toggle(){}}},addEventListener:(name,fn)=>handlers[name]=fn}});
 vm.runInContext(fs.readFileSync('web/rules.js','utf8'),context);
 vm.runInContext(fs.readFileSync('web/state-workflows.js','utf8'),context);
 vm.runInContext(fs.readFileSync('web/advanced.js','utf8'),context);
 vm.runInContext(fs.readFileSync('web/app.js','utf8'),context);
 return {run:source=>vm.runInContext(source,context),handlers};
}
const setup={scope:'Across state lines (interstate)',hire:'Yes, for hire',cargo:'Regulated freight',weightBand:'Over 26,000 lb',axles:'3 or more',placards:'No',units:1,base:'GA',ucrYear:'2027',ucrVehicles:1,startupServices:['LLC formation','EIN assistance'],llcState:'CT'};
test('all carrier cards retain review buttons even when selected',()=>{
 const a=app();for(const plan of ['Basic','Pro','Premium','Ultimate']){
  a.run(`db.plan=${JSON.stringify(plan)}`);
  const html=a.run('plans()');
  for(const name of ['Basic','Pro','Premium','Ultimate'])assert.ok(html.includes(`data-action="plan:${name}"`));
  assert.ok(html.includes('Review Ultimate — $199/month'));
  assert.ok(html.includes('Review Startup Bundle — $399 one time'));
 }
});
test('plan click opens a review without activating or paying',async()=>{
 const a=app();a.run(`db.plan='Ultimate'`);
 await a.handlers.click({target:{closest:()=>({dataset:{action:'plan:Ultimate'}})}});
 assert.equal(a.run('location.hash'),'review');
 assert.equal(a.run('activeReview.plan'),'Ultimate');
 assert.equal(a.run('db.plan'),'Ultimate');
 const html=a.run('pricingReview()');
 assert.ok(html.includes('Ultimate — $199/month'));
 assert.ok(html.includes('Up to 20 drivers included'));
 assert.ok(html.includes('Online office, admin tools and admin storage'));
 assert.ok(html.includes('Live checkout coming soon'));
});
test('each plan and the separate bundle dispatch to the correct review',async()=>{
 for(const plan of ['Basic','Pro','Premium','Ultimate']){
  const a=app();await a.handlers.click({target:{closest:()=>({dataset:{action:'plan:'+plan}})}});
  assert.equal(a.run('activeReview.plan'),plan);
  assert.equal(a.run('db.plan'),'Basic');
 }
 const a=app();await a.handlers.click({target:{closest:()=>({dataset:{action:'startup-review'}})}});
 assert.equal(a.run('activeReview.kind'),'startup');
 assert.ok(a.run('pricingReview()').includes('Carrier Startup Bundle — $399 one time'));
});
test('only requested items are quoted; bundle replaces covered service fees',()=>{
 const a=app();a.run(`db.onboard=${JSON.stringify(setup)};activeReview={kind:'startup'}`);
 assert.equal(a.run('selectedQuote().services.filter(i=>i.type!=="Startup Bundle").length'),2);
 a.run(`db.onboard.requestedServices=['DOT','MC','BOC-3','UCR'];db.onboard.quotes={DOT:{service:25},MC:{service:80},'BOC-3':{service:50}}`);
 const q=a.run('selectedQuote()');
 assert.equal(q.services.length,7);
 assert.ok(q.services.filter(item=>item.type!=='Startup Bundle').every(item=>item.amountCents===0&&item.note.includes('Included')));
 const html=a.run('quoteSummary(selectedQuote())');
 assert.ok(html.includes('Pending'));
 assert.ok(html.includes('Carrier Startup Bundle'));
 assert.ok(html.includes('$754.00')); // 399 bundle + 300 MC + 55 UCR; formation fee pending
 assert.ok(!q.services.some(item=>item.type==='IFTA'));
 a.run('db.onboard.skipUcr=true');
 assert.ok(!a.run('selectedQuote().services.some(item=>item.type===\'UCR\')'));
 assert.ok(a.run('quoteSummary(selectedQuote())').includes('$699.00'));
});
test('phone example: existing USDOT is proof-only, only KYU is quoted, NY HUT stays out',()=>{
 const a=app();a.run(`db.onboard=${JSON.stringify({...setup,states:'KY, NY',startupServices:[],requestedServices:[],serviceChoices:{DOT:'have',KYU:'help','NY HUT':'omit'}})};activeReview={kind:'quote'}`);
 const requested=a.run('requestedItems(db.onboard).map(i=>i[0]).join(",")');assert.equal(requested,'KYU');
 const quote=a.run('quoteSummary(selectedQuote())');assert.ok(quote.includes('KYU'));assert.ok(!quote.includes('USDOT'));assert.ok(!quote.includes('NY HUT'));
 const office=a.run('memberOffice()');assert.ok(office.includes('upload-service:DOT'));assert.ok(office.includes('Proof needed'));
 const after=a.run(`db.docs.push({id:'proof',purpose:'DOT',name:'usdot.pdf'});memberOffice()`);assert.ok(after.includes('Document on file'));assert.ok(after.includes('download:proof'));
});
test('Basic UCR assistance is included; skipped UCR is never charged',()=>{
 const a=app();a.run(`db.onboard=${JSON.stringify({...setup,startupServices:[],serviceChoices:{UCR:'help'},ucrVehicles:1})}`);
 assert.equal(a.run('requestedItems(db.onboard)[0][4]'),0);
 a.run('db.onboard.skipUcr=true');assert.equal(a.run('requestedItems(db.onboard).length'),0);
});
test('DQF is a separate one-time fee per driver and upload stays available',()=>{
 const a=app();a.run(`db.onboard=${JSON.stringify({...setup,startupServices:['Driver Qualification File'],dqfDrivers:3})};activeReview={kind:'plan',plan:'Ultimate'}`);
 assert.equal(a.run('selectedQuote().services[0].amountCents'),29997);
 const html=a.run('pricingReview()');
 assert.ok(html.includes('$299.97'));
 assert.ok(html.includes('$199/month'));
 assert.ok(html.includes('data-action="upload-dqf"'));
 assert.ok(html.includes('$99.99 per driver'));
});
test('final quote shows itemization, terms, required acknowledgment and signature',()=>{
 const a=app();a.run(`activeReview={kind:'plan',plan:'Basic'};modal=(title,body)=>globalThis.lastModal=body;signPricing()`);
 const html=a.run('lastModal');
 assert.ok(html.includes('Monthly membership'));
 assert.ok(html.includes('One-time OliverFee Services'));
 assert.ok(html.includes('non-refundable'));
 assert.ok(html.includes('name="agreed" value="yes" required'));
 assert.ok(html.includes('name="signature"'));
 assert.ok(html.includes('Live checkout coming soon'));
});
