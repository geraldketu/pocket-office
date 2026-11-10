'use strict';
const applicationStatuses=[['have','Already have it'],['help','Need OliverFee 360 to handle it'],['process','In process'],['self','Handling it on my own']];
let customerQuote=null;
function legacyImportButton(){try{const data=JSON.parse(localStorage.getItem(key));return activeCarrier&&officeRole!=='driver'&&data?'<section class="panel"><h2>Saved browser records</h2><p>Your earlier browser workspace has been preserved. Import it into this office without replacing existing records.</p>'+btn('Import saved browser records into this carrier','import-legacy')+'</section>':''}catch{return ''}}
async function importLegacy(){
 const legacy=JSON.parse(localStorage.getItem(key));if(!legacy||!activeCarrier)throw new Error('No saved browser workspace is available.');
 for(const field of ['records','people','notices','listings','jobs','orders','requests']){const current=new Map((db[field]||[]).map(x=>[x.id,x]));for(const item of legacy[field]||[])if(!current.has(item.id))current.set(item.id,item);db[field]=[...current.values()]}
 if(!db.onboard&&legacy.onboard)db.onboard=legacy.onboard;
 if(!db.application&&legacy.application)db.application=legacy.application;
 save();await saveQueue;if(saveFailed)throw new Error('Import could not be saved.');
 let missing=0;for(const doc of legacy.docs||[]){if(db.docs.some(d=>d.id===doc.id))continue;const files=await filesDB();const blob=await new Promise((resolve,reject)=>{const tx=files.transaction('files','readonly'),req=tx.objectStore('files').get(doc.id);tx.oncomplete=()=>{files.close();resolve(req.result)};tx.onabort=()=>{files.close();reject(tx.error)}});if(!blob){missing++;continue}
  uploadMetadata={name:doc.name,date:doc.date||'',record:doc.record||'',purpose:doc.purpose||'Other'};await fileOperation('put',doc.id,blob);
 }
 await loadOffice(activeCarrier);toast('Browser records imported. '+(missing?missing+' original file(s) unavailable in this browser.':'Original browser data retained.'));
}
async function makeReviewLink(){
 if(!activeCarrier)throw new Error('Open a secure carrier office before copying a review link.');
 await saveQueue;if(saveFailed)throw new Error('Save changes successfully before creating a review.');
 const result=await officeAPI('/api/carriers/'+activeCarrier+'/quotes',{method:'POST',body:JSON.stringify({selection:activeReview||{kind:'quote'}})});
 return {id:result.id,url:location.origin+result.path};
}
async function loadCustomerQuote(id){
 customerQuote=await officeAPI('/api/carriers/'+activeCarrier+'/quotes/'+id);location.hash='customer-review';render();
}
function customerReviewPage(){
 if(!customerQuote)return head('QUOTE','Secure review','Open the review link supplied by staff.');
 const q=customerQuote;
 return head('SECURE CUSTOMER REVIEW','Final itemized quote','Review the charges and filing/refund terms on your phone or computer.')+'<section class="panel">'+badge(q.status,q.signature?'good':'warn')+quoteSummary(q.snapshot)+'<h3>Filing and refund acknowledgment</h3><p>'+esc(q.snapshot.filingTerms)+'</p>'+
 (q.stale?'<p class="note">This estimate changed. Ask staff to issue a new review link; a new signature is required.</p>':q.signature?'<p class="note">Signed by '+esc(q.signature)+' · '+esc(q.signedAt)+'</p>'+(q.checkoutConfigured?btn('Continue to Stripe-hosted checkout','quote-checkout','gold')+btn('Check payment confirmation','quote-confirm'):'<p class="note">Live checkout coming soon. Signed — Awaiting Payment. No processing is authorized.</p>'):q.snapshot.blockers.length?'<p class="note">Staff must resolve payable Pending fees before you can sign.</p>':'<form data-form="customer-sign"><label class="check"><input type="checkbox" name="agreed" value="yes" required> I reviewed this itemized quote and acknowledge the filing and refund terms.</label>'+field('Customer full name / signature','signature','text','','required maxlength="120"')+'<button class="btn gold">Sign this quote version</button></form>')+'</section>';
}
function draftApplication(){db.application??={company:db.profile?.name||'',filings:{}};db.application.filings??={};return db.application}
function applicationTypes(o=db.onboard||{}){
 return [...new Set(['LLC formation','EIN assistance','DOT','MC','BOC-3','UCR','IFTA',...estimateDetails(o).items.map(i=>i[0]),...Object.keys(db.application?.filings||{})])];
}
function applicationPanel(){
 const a=db.application||{company:db.profile?.name||'',filings:{}};
 return '<section class="panel application-panel" id="carrier-application"><div class="sectiontop"><div><div class="eyebrow">STAFF WORKSPACE</div><h2>Carrier Application</h2></div>'+badge('Draft','warn')+'</div><p>Save what you know during the phone call. An issued number may still be inactive. Only “Need OliverFee 360 to handle it” enters the payable quote.</p><form data-form="carrier-application">'+field('Company legal name','company','text',a.company,'maxlength="120"')+'<div class="application-rows">'+applicationTypes().map(type=>{
  const row=a.filings?.[type]||{};const status=row.status||((db.onboard?.serviceChoices?.[type]==='help')?'help':db.onboard?.serviceChoices?.[type]==='have'?'have':'self');
  return '<div class="application-row"><h3>'+esc(bundleLabels[type]||type)+'</h3><label>Who is handling it?<select data-application-status="'+esc(type)+'">'+applicationStatuses.map(([value,label])=>'<option value="'+value+'"'+(status===value?' selected':'')+'>'+label+'</option>').join('')+'</select></label>'+field('Number / filing ID (if issued)','application_number','text',row.number,'data-application-number="'+esc(type)+'" maxlength="120"')+'<label>Activation<select data-application-activation="'+esc(type)+'">'+options(['Not confirmed','Issued, not yet active','Active','Not applicable'],row.activation)+'</select></label>'+((status==='have'||status==='process')?'<div class="actions">'+btn('Upload '+(type==='DOT'?'USDOT':type)+' document','upload-service:'+type)+'</div>':'')+'</div>';
 }).join('')+'</div><div class="actions"><button class="btn gold">Save application draft</button>'+btn('Add Checklist to Records','checklist')+'</div></form><p id="application-save" role="status"></p></section>';
}
function syncApplication(form){
 const a=draftApplication();a.company=form.elements.company?.value.trim()||a.company;
 for(const input of form.querySelectorAll('[data-application-status]')){const type=input.dataset.applicationStatus;a.filings[type]??={};a.filings[type].status=input.value;db.onboard??={};db.onboard.serviceChoices??={};db.onboard.serviceChoices[type]=input.value==='help'?'help':input.value==='have'?'have':'omit'}
 for(const input of form.querySelectorAll('[data-application-number]')){const type=input.dataset.applicationNumber;a.filings[type]??={};a.filings[type].number=input.value.trim()}
 for(const input of form.querySelectorAll('[data-application-activation]')){const type=input.dataset.applicationActivation;a.filings[type]??={};a.filings[type].activation=input.value}
 a.updatedAt=new Date().toISOString();invalidateCurrentSignature();
}
function invalidateCurrentSignature(){db.signedQuote=null;db.quoteChanged=true}
function captureOperationDraft(){
 const form=document.querySelector('[data-form="onboard"]');if(!form)return;
 const fields=new FormData(form);const previous=db.onboard||{};
 db.onboard={...previous,...Object.fromEntries([...fields].filter(([,v])=>typeof v==='string')),equipmentTypes:fields.getAll('equipmentType'),cargoTypes:fields.getAll('cargoType'),states:fields.getAll('operatingState').join(', '),permitChecks:fields.getAll('permitCheck'),startupServices:fields.getAll('startupService'),followups:Object.fromEntries([...fields].filter(([k])=>k.startsWith('followup_')))};
 captureNMFields(form);
}
function captureNMFields(form=document.querySelector('[data-form="onboard"]')){if(!form)return;const rows=[...form.querySelectorAll('[data-nm-vehicle]')];if(!rows.length)return;db.onboard??={};db.onboard.nmVehicles=rows.map(row=>Object.fromEntries([...row.querySelectorAll('[data-nm-field]')].map(input=>[input.dataset.nmField,input.type==='checkbox'?input.checked:input.value])))}
function refreshDraftSections(){
 const estimateEl=document.querySelector('#estimate');if(estimateEl)estimateEl.innerHTML=serviceChoices(db.onboard||{})+estimate(db.onboard||{});
 const application=document.querySelector('#carrier-application');if(application)application.outerHTML=applicationPanel();
}
function mixedFleetPanel(){
 const o=db.onboard||{};const rows=o.vehicleSetups||[];const result=OfficeRules.weightResults(rows);
 return '<details id="mixed-fleet" class="panel"'+(o.weightBand==='Unsure or mixed fleet'?' open':'')+'><summary>Vehicle-by-vehicle weights · '+(result.unresolved?'Needs verification':'Known setups')+'</summary><p>Enter each vehicle or combination you actually run. Keep loaded and manufacturer-rated weight separate, in pounds.</p>'+rows.map((v,i)=>'<div class="vehicle-row">'+field('Vehicle / vehicle-and-trailer setup','vehicle_name','text',v.name,'data-weight-field="name" data-index="'+i+'"')+field('Actual loaded weight (lb)','vehicle_actual','number',v.actual,'min="1" data-weight-field="actual" data-index="'+i+'"')+field('Manufacturer-rated weight (lb)','vehicle_rated','number',v.rated,'min="1" data-weight-field="rated" data-index="'+i+'"')+'<label>Power-unit axles<select data-weight-field="axles" data-index="'+i+'">'+options(['Unsure','2 or fewer','3 or more'],v.axles)+'</select></label><label class="check"><input type="checkbox" data-weight-field="verifyLater" data-index="'+i+'"'+(v.verifyLater?' checked':'')+'> Verify later</label><p>'+badge(result.results[i].status,result.results[i].status==='Known'?'good':'warn')+' · '+esc(result.results[i].dot)+' · '+esc(result.results[i].ifta)+'</p></div>').join('')+'<div class="actions">'+btn('Add vehicle or combination','add-weight')+btn('Save and continue — verify unresolved setups later','save-weights')+'</div><p class="note">Known setups remain visible. Missing weight information does not turn a known requirement off; dependent unresolved requirements stay Needs verification.</p></details>';
}
function hazmatPanel(){
 const o=db.onboard||{},h=o.hazmatDetails||{},materials=h.materials||[];
 const mField=(label,key,value,i,type='text',extra='')=>field(label,key,type,value,'data-material-field="'+key+'" data-index="'+i+'" '+extra);
 const mSelect=(label,key,choices,value,i)=>'<label>'+label+'<select data-material-field="'+key+'" data-index="'+i+'">'+options(choices,value)+'</select></label>';
 return '<details id="hazmat-interview" class="panel"'+(o.hazmat!=='No'?' open':'')+'><summary>Hazmat materials, drivers and fee checks</summary><p>Use shipping documents to verify classification. Unknown answers can be saved. Routes and states: '+esc(o.states||'Not supplied')+'.</p>'+materials.map((m,i)=>'<div class="material-row"><h3>Material '+(i+1)+'</h3><div class="formgrid">'+mField('Shipping name','shippingName',m.shippingName,i)+mField('UN / NA number','un',m.un,i)+mField('Hazard class / division','division',m.division,i)+mField('Maximum quantity','quantity',m.quantity,i,'number','min="0"')+mSelect('Quantity units','quantityUnit',['Unknown','lb','kg','gallons','liters','cubic feet'],m.quantityUnit,i)+mSelect('Packaging type','packaging',['Unknown','Bulk','Non-bulk'],m.packaging,i)+mField('Packaging capacity','capacity',m.capacity,i,'number','min="0"')+mSelect('Capacity units','capacityUnit',['Unknown','gallons','liters','cubic feet','lb','kg'],m.capacityUnit,i)+mSelect('Placards required?','placards',['Unsure','Yes','No'],m.placards,i)+mSelect('Packing group','packingGroup',['Unknown','I','II','III','Not applicable'],m.packingGroup,i)+mSelect('Highway route controlled radioactive quantity?','radioactiveControlled',['Unsure','Yes','No'],m.radioactiveControlled,i)+mSelect('Safety-permit category reviewed against FMCSA?','hmspVerified',['Needs verification','Required','Does not apply'],m.hmspVerified,i)+mSelect('Security-plan category reviewed?','securityPlanVerified',['Needs verification','Required','Does not apply'],m.securityPlanVerified,i)+'<label class="check full"><input type="checkbox" data-material-field="verified" data-index="'+i+'"'+(m.verified?' checked':'')+'> Classification, packaging, quantities and exceptions verified from shipping documents</label></div></div>').join('')+'<div class="actions">'+btn('Add another material','add-material')+'</div><div class="formgrid">'+hSelect('Farmer registration exception reviewed?','farmerException',['Needs verification','No','Yes'],h.farmerException)+hSelect('PHMSA registration year','registrationYear',['2026–2027','Other / needs verification'],h.registrationYear||'2026–2027')+hSelect('PHMSA business fee category','businessCategory',['Needs verification','Small business or nonprofit (verified)','Other business (verified)'],h.businessCategory)+'</div><h3>Drivers needing an endorsement transaction</h3>'+(h.drivers||[]).map((driver,i)=>'<div class="driver-fee-row formgrid">'+field('Driver name / reference','name','text',driver.name,'data-hme-field="name" data-index="'+i+'"')+'<label>Driver CDL state<select data-hme-field="state" data-index="'+i+'">'+options(['Unknown',...states],driver.state)+'</select></label><label>TSA rate (confirm eligibility)<select data-hme-field="rate" data-index="'+i+'">'+options(['Needs verification','Standard','Reduced TWIC (eligibility verified)'],driver.rate)+'</select></label>'+field('Verified licensing-agency fee ($)','ddsFee','number',driver.ddsFee,'min="0" step="0.01" data-hme-field="ddsFee" data-index="'+i+'"')+'<label class="check full"><input type="checkbox" data-hme-field="transactionVerified" data-index="'+i+'"'+(driver.transactionVerified?' checked':'')+'> Confirmed the driver’s exact licensing transaction and fee. Older GA manual lists $20; current terms differ.</label></div>').join('')+btn('Add driver endorsement transaction','add-hme-driver')+'<div id="hazmat-evaluation">'+hazmatEvaluation()+'</div><p class="note">One flat OliverFee standard hazmat setup fee is Pending until approved. Plan coverage must be confirmed; government fees remain separate. No TWIC button is added here.</p></details>';
}
function hSelect(label,key,choices,value){return '<label>'+label+'<select data-hazmat-field="'+key+'">'+options(choices,value)+'</select></label>'}
function hazmatEvaluation(){return '<h3>Separate applicability decisions</h3>'+OfficeRules.evaluateHazmat(db.onboard||{}).map(r=>'<section class="task"><strong>'+esc(r.label)+'</strong> '+badge(r.status,r.status==='Required'?'warn':r.status==='Does not apply'?'good':'')+'<p>'+esc(r.reason)+'</p><small>Missing: '+esc(r.missing.length?r.missing.join('; '):'No additional facts for this decision')+' · <a href="'+esc(r.source)+'" target="_blank" rel="noopener">Official source</a></small></section>').join('')}
function advancedFollowups(){return mixedFleetPanel()+hazmatPanel()}
function pricingEditor(){
 const o=db.onboard||{};return '<details class="panel"><summary>Staff fee confirmation · leave unknown amounts Pending</summary><p>Approved fixed prices and membership coverage are applied automatically. Enter other amounts only after confirmation.</p><div class="formgrid">'+field('Georgia qualifying trucks needing IFTA decal sets','gaDecalTrucks','number',o.gaDecalTrucks,'min="0" step="1" data-setup-scalar="gaDecalTrucks"')+'</div>'+applicationTypes(o).filter(type=>!['PHMSA','TSA HME','CDL HME'].includes(type)).map(type=>'<div class="fee-edit-row"><strong>'+esc(type)+'</strong>'+field('Confirmed OliverFee service fee ($)','service','number',o.quotes?.[type]?.service,'min="0" step="0.01" data-quote="'+esc(type)+'" data-column="service"')+field('Confirmed agency / vendor charge ($)','external','number',o.quotes?.[type]?.external,'min="0" step="0.01" data-quote="'+esc(type)+'" data-column="external"')+'</div>').join('')+'<p>UCR registration, free IFTA setup, approved DQF/audit prices, and verified PHMSA fees override generic entries. Standard hazmat setup remains one flat Pending item until the owner approves its price or coverage.</p></details>';
}
function saveChecklist(){
 const a=draftApplication();
 for(const [type,row] of Object.entries(a.filings)){
  let record=db.records.find(r=>r.applicationType===type||r.type===type&&!r.person);
  if(!record){record={id:uid(),type,name:bundleLabels[type]||type,date:'',status:'New',applicationType:type};db.records.push(record)}
  Object.assign(record,{filingChoice:row.status,filingNumber:row.number||'',activation:row.activation||'Not confirmed',applicationType:type,notes:'Carrier Application: '+(applicationStatuses.find(x=>x[0]===row.status)?.[1]||'Not selected')});
 }
 db.checklist=structuredClone(a);save();toast('Checklist saved to this carrier’s records.');
}
document.addEventListener('input',e=>{
 const form=e.target.closest('[data-form="carrier-application"]');if(form)syncApplication(form);
 if(e.target.hasAttribute('data-weight-field')||e.target.hasAttribute('data-material-field')||e.target.hasAttribute('data-hme-field'))captureAdvancedField(e.target,false);
 if(e.target.hasAttribute('data-nm-field'))captureNMFields();
});
function captureAdvancedField(input,refresh=true){
 db.onboard??={};const o=db.onboard;const index=Number(input.dataset.index);const value=input.type==='checkbox'?input.checked:input.value;
 if(input.hasAttribute('data-weight-field')){o.vehicleSetups??=[];o.vehicleSetups[index]??={};o.vehicleSetups[index][input.dataset.weightField]=value}
 if(input.hasAttribute('data-material-field')){o.hazmatDetails??={};o.hazmatDetails.materials??=[];o.hazmatDetails.materials[index]??={};o.hazmatDetails.materials[index][input.dataset.materialField]=value}
 if(input.hasAttribute('data-hme-field')){o.hazmatDetails??={};o.hazmatDetails.drivers??=[];o.hazmatDetails.drivers[index]??={};o.hazmatDetails.drivers[index][input.dataset.hmeField]=value}
 if(input.hasAttribute('data-hazmat-field')){o.hazmatDetails??={};o.hazmatDetails[input.dataset.hazmatField]=value}
 invalidateCurrentSignature();if(refresh){save();refreshDraftSections();const evaluation=document.querySelector('#hazmat-evaluation');if(evaluation)evaluation.innerHTML=hazmatEvaluation()}
}
document.addEventListener('change',e=>{
 const input=e.target;
 if(input.hasAttribute('data-nm-field')){captureNMFields();invalidateCurrentSignature();save();refreshDraftSections();const result=document.querySelector('[data-nm-results]');if(result)result.innerHTML=newMexicoResults(db.onboard||{})}
 if(input.hasAttribute('data-requirement')){const type=input.dataset.requirement;const status=input.value==='I need it'?'help':input.value==='I have it'?'have':'self';draftApplication().filings[type]={...db.application.filings[type],status};db.onboard??={};db.onboard.requirementChoices??={};db.onboard.requirementChoices[type]=input.value;invalidateCurrentSignature();save();refreshDraftSections()}
 if(input.hasAttribute('data-quote')){invalidateCurrentSignature();save();refreshDraftSections()}
 if(input.hasAttribute('data-setup-scalar')){db.onboard??={};db.onboard[input.dataset.setupScalar]=input.value;invalidateCurrentSignature();save();refreshDraftSections()}
 if(input.matches('[data-weight-field],[data-material-field],[data-hme-field],[data-hazmat-field]'))captureAdvancedField(input);
 if(input.closest('[data-form="carrier-application"]')){syncApplication(input.closest('form'));save();refreshDraftSections()}
 if(input.closest('[data-form="onboard"]')&&!input.matches('[data-weight-field],[data-material-field],[data-hme-field],[data-hazmat-field]')){
  captureOperationDraft();invalidateCurrentSignature();save();refreshDraftSections();
  syncNewMexicoQuestions(input.closest('form'));const oregon=input.closest('form')?.querySelector('[data-oregon-questions]');if(oregon)oregon.hidden=!parseOperatingStates(db.onboard.states).includes('OR');
  if(input.name==='weightBand'){const panel=document.querySelector('#mixed-fleet');if(panel){panel.outerHTML=mixedFleetPanel();if(input.value==='Unsure or mixed fleet')document.querySelector('#mixed-fleet').open=true}}
  if(input.name==='hazmat'){const panel=document.querySelector('#hazmat-interview');if(panel){panel.outerHTML=hazmatPanel();if(['Yes','Unsure'].includes(input.value))document.querySelector('#hazmat-interview').open=true}}
 }
});
document.addEventListener('click',e=>{
 const action=e.target.closest('[data-action]')?.dataset.action;
 if(!['add-weight','save-weights','add-material','add-hme-driver'].includes(action))return;
 captureOperationDraft();db.onboard??={};const o=db.onboard;
 if(action==='add-weight'){o.vehicleSetups??=[];o.vehicleSetups.push({name:'',actual:'',rated:'',verifyLater:false,axles:'Unsure'});document.querySelector('#mixed-fleet').outerHTML=mixedFleetPanel();document.querySelector('#mixed-fleet').open=true}
 if(action==='save-weights'){save();document.querySelector('#mixed-fleet').outerHTML=mixedFleetPanel();toast('Vehicle setups saved. Unresolved weights remain Needs verification.')}
 if(action==='add-material'){o.hazmatDetails??={};o.hazmatDetails.materials??=[];o.hazmatDetails.materials.push({});document.querySelector('#hazmat-interview').outerHTML=hazmatPanel();document.querySelector('#hazmat-interview').open=true}
 if(action==='add-hme-driver'){o.hazmatDetails??={};o.hazmatDetails.drivers??=[];o.hazmatDetails.drivers.push({});document.querySelector('#hazmat-interview').outerHTML=hazmatPanel();document.querySelector('#hazmat-interview').open=true}
 invalidateCurrentSignature();save();
});
document.addEventListener('click',async e=>{
 const action=e.target.closest('[data-action]')?.dataset.action;
 try{
  if(action==='nm-add'||action?.startsWith('nm-remove:')){captureOperationDraft();db.onboard.nmVehicles??=[];if(action==='nm-add')db.onboard.nmVehicles.push({});else db.onboard.nmVehicles.splice(Number(action.split(':')[1]),1);const section=document.querySelector('[data-nm-questions]');if(section)section.outerHTML=newMexicoQuestions(db.onboard);invalidateCurrentSignature();save();refreshDraftSections()}
  if(action==='import-legacy')await importLegacy();
  if(action==='copy-review'){
   const link=await makeReviewLink();
   try{await navigator.clipboard.writeText(link.url);toast('Secure review link copied. Customer sign-in and carrier access are required.')}
   catch{modal('Secure review link','<p>The carrier must sign in and have access to this private Site and carrier office.</p>'+field('Copy this link','reviewLink','text',link.url,'readonly'))}
  }
  if(action==='quote-checkout'&&customerQuote){const result=await officeAPI('/api/carriers/'+activeCarrier+'/quotes/'+customerQuote.id+'/checkout',{method:'POST',body:'{}'});const target=new URL(result.url);if(target.protocol!=='https:'||target.hostname!=='checkout.stripe.com')throw new Error('Unexpected checkout destination.');location.href=target.href}
  if(action==='quote-confirm'&&customerQuote){await officeAPI('/api/carriers/'+activeCarrier+'/quotes/'+customerQuote.id+'/confirm',{method:'POST',body:'{}'});await loadCustomerQuote(customerQuote.id)}
 }catch(error){toast(error.message)}
});
document.addEventListener('submit',async e=>{
 if(e.target.dataset.form==='customer-sign'){
  e.preventDefault();const fields=new FormData(e.target);
  try{await officeAPI('/api/carriers/'+activeCarrier+'/quotes/'+customerQuote.id+'/sign',{method:'POST',body:JSON.stringify({signature:fields.get('signature'),acknowledged:fields.get('agreed')==='yes'})});await loadCustomerQuote(customerQuote.id)}catch(error){toast(error.message)}return;
 }
 if(e.target.dataset.form!=='carrier-application')return;e.preventDefault();syncApplication(e.target);save();await saveQueue;if(!saveFailed){const el=document.querySelector('#application-save');if(el)el.textContent='Application draft saved.';toast('Carrier Application draft saved.')}
});
