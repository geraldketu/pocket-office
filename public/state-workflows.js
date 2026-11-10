function oregonQuestions(o){
 const applies=parseOperatingStates(o.states||'').includes('OR');
 const answers=['Unsure','Yes','No'];
 return '<section class="full" data-oregon-questions'+(applies?'':' hidden')+'><h3>Oregon permit questions</h3><p>Use the vehicle and load that will travel through Oregon.</p><div class="formgrid">'+
  setupField('Loaded weight of truck, trailer and cargo (lb)','oregonLoadedWeight','number',o.oregonLoadedWeight,'min="1" step="1" placeholder="Leave blank if unsure"')+
  setupSelect('Is the vehicle over 10,000 lb gross or does it have three or more axles?','oregonHeavyVehicle',answers,o.oregonHeavyVehicle)+
  setupSelect('Do you have proof of current registration valid in Oregon?','oregonRegistration',answers,o.oregonRegistration)+
  setupSelect('Is this vehicle already enrolled in Oregon weight-mile tax?','oregonEnrollment',answers,o.oregonEnrollment)+
  '</div></section>';
}
function oregonPermitResults(o){
 const weight=Number(o.oregonLoadedWeight);
 const tax=o.oregonEnrollment==='Yes'?'Already enrolled. Use your Oregon account to report and pay the tax.':
  weight>26000&&o.oregonEnrollment==='No'?'Get this pass before entering Oregon. Government fee: $9 plus Oregon mileage tax.':
  weight>0&&weight<=26000?'Generally not triggered at this weight. Check with ODOT if the vehicle ran over 26,000 lb earlier in the reporting period.':
  'Needs verification. Confirm loaded weight and Oregon weight-mile enrollment.';
 const trip=o.oregonRegistration==='Yes'?'Registration coverage reported. Carry proof valid in Oregon.':
  o.oregonHeavyVehicle==='No'?'Heavy vehicle trip permit threshold not met. Verify ordinary registration separately.':
  o.oregonHeavyVehicle==='Yes'&&o.oregonRegistration==='No'?'Get this permit before entering Oregon. Government fee: $43 for 10 days.':
  'Needs verification. Confirm vehicle weight or axles and proof of Oregon registration coverage.';
 return '<p><strong>Weight-Mile Temporary Tax Pass</strong> — '+tax+'</p>'+
  '<p><strong>Heavy Motor Vehicle Trip Permit</strong> — '+trip+'</p>'+
  '<p><a href="https://www.oregontruckingonline.com/" target="_blank" rel="noopener">Open Oregon Trucking Online</a>. For weight-mile passes without an Oregon CCD account, call <a href="tel:+15033786699">503-378-6699</a>.</p>';
}
const newMexicoGuidance='https://www.mvd.newmexico.gov/commercial/commercial-vehicles/weight-distance/';
const iftaLinks={
 CT:'https://portal.ct.gov/drs/ifta/connecticut-ifta',
 GA:'https://dor.georgia.gov/register-new-ifta-account'
};
function iftaApplication(o){
 const base=o.iftaBase||o.base;
 const url=iftaLinks[base]||'https://www.iftach.org/helpdesk/';
 return '<a href="'+url+'" target="_blank" rel="noopener">'+(iftaLinks[base]?'Apply for IFTA / Order Decals':'Find your IFTA base jurisdiction')+'</a>'+
  (base==='CT'?' · Use myconneCT for first-time registration.':'');
}
function newMexicoVehicle(vehicle={},index=0){
 const attr=key=>'data-nm-field="'+key+'" data-index="'+index+'"';
 return '<div class="formgrid" data-nm-vehicle>'+field('Vehicle / unit reference','nmName','text',vehicle.name,attr('name'))+
 field('Declared gross vehicle weight (lb)','nmWeight','number',vehicle.weight,'min="1" step="1" placeholder="Unsure — verify later" '+attr('weight'))+
 field('Estimated miles inside New Mexico, including pass-through miles','nmMiles','number',vehicle.miles,'min="0" step="any" placeholder="Unsure — verify later" '+attr('miles'))+
 '<label>Will this vehicle travel in New Mexico?<select '+attr('travel')+'>'+options(['Unsure','Yes','No'],vehicle.travel)+'</select></label>'+
 '<label>Current New Mexico Weight Distance Tax Electronic Permit?<select name="nmPermit" '+attr('permit')+'>'+options(['Unsure','Yes','No'],vehicle.permit)+'</select></label>'+
 field('Applicable official rate ($ per NM mile)','nmRate','number',vehicle.rate,'min="0" step="any" placeholder="Fee pending confirmation" '+attr('rate'))+
 field('Official rate source URL','nmRateSource','url',vehicle.rateSource,'placeholder="https://www.mvd.newmexico.gov/…" '+attr('rateSource'))+
 field('Applicable year / effective period','nmRatePeriod','text',vehicle.ratePeriod,attr('ratePeriod'))+
 '<label class="check full"><input type="checkbox" '+attr('rateVerified')+(vehicle.rateVerified?' checked':'')+'> Staff verified that this official rate applies to this vehicle, weight and reporting period</label>'+btn('Remove vehicle','nm-remove:'+index)+'</div>';
}
function newMexicoQuestions(o){
 const route=parseOperatingStates(o.states||'').includes('NM');
 const selected=route||(o.permitChecks||[]).includes('NM')||!!db.application?.filings?.NM;
 const rows=o.nmVehicles?.length?o.nmVehicles:[{}];
 return '<section class="full panel" data-nm-questions'+(selected?'':' hidden')+'><h3>New Mexico Weight Distance Tax</h3><a href="'+newMexicoGuidance+'" target="_blank" rel="noopener">Official New Mexico MVD Guidance</a>'+
 '<p>For each vehicle traveling in New Mexico, include pass-through miles. Blank values mean Unsure and can be saved.</p><p data-nm-route'+(route?' hidden':'')+'>New Mexico was requested but is not on the route. Confirm travel for each vehicle below; your Operating States will not be changed automatically.</p>'+
 '<div data-nm-vehicles>'+rows.map(newMexicoVehicle).join('')+'</div>'+btn('Add New Mexico vehicle','nm-add')+'<div data-nm-results>'+newMexicoResults(o)+'</div></section>';
}
function newMexicoResults(o){
 return OfficeRules.newMexicoPlanning(o).map(v=>'<section class="task"><strong>'+esc(v.name)+'</strong> '+badge(v.status,v.status==='Required'?'warn':'')+
 '<p>'+(v.status==='Required'?'Weight-distance requirement applies: declared gross vehicle weight exceeds 26,000 lb and the vehicle will operate in New Mexico.':v.status==='Does not apply'?'No weight-distance trigger based on the declared weight and confirmed travel.':'Confirm travel and declared weight before deciding applicability.')+'</p><p>Electronic permit: '+esc(v.permit)+'. Projected mileage tax: '+(v.projectedCents===null?'Fee pending confirmation':money(v.projectedCents/100)+' (planning only)')+'.</p><small>Needs verification: '+esc(v.missing.length?v.missing.join('; '):'No missing planning inputs')+'. Use actual New Mexico miles for quarterly reporting. Permit charges are separate.</small></section>').join('');
}
function syncNewMexicoQuestions(form){
 const section=form?.querySelector('[data-nm-questions]');if(!section)return;
 const route=!!form.querySelector('[name=operatingState][value=NM]')?.checked;
 section.hidden=!route&&!form.querySelector('[name=permitCheck][value=NM]')?.checked&&!db.application?.filings?.NM;
 section.querySelector('[data-nm-route]').hidden=route;
}
const routeRequirements={
 KY:['KYU','Review Kentucky’s weight threshold and whether a temporary permit fits your trips.','https://drive.ky.gov/motor-carriers/Pages/KYU.aspx'],
 NY:['NY HUT','Check New York’s vehicle weight and credential rules.','https://www.tax.ny.gov/bus/hut/huidx.htm'],
 NM:['NM','Review each vehicle traveling in New Mexico, including pass-through trips.',newMexicoGuidance],
 OR:['OR','Review Oregon tax and registration separately, including when passing through.','https://www.oregon.gov/odot/mct/pages/weight-mile-temporary-tax-pass.aspx'],
 CA:['CA MCP','Check California’s motor carrier permit rules for your equipment and service.','https://www.dmv.ca.gov/portal/vehicle-industry-services/motor-carrier-services-mcs/motor-carrier-permits/motor-carrier-permits-mcp-faqs/'],
 CT:['CT Highway Use Fee','Check Connecticut’s vehicle weight and classification rules.','https://portal.ct.gov/DRS/Businesses/Highway-Use-Fee/HUF']
};
const requirementOptions=['Choose a status','I have it','I need it','I’ll get it on my own'];
function operationChecklist(o,details){
 const items=new Map();
 const add=(id,title,reason,url,required=false)=>items.set(id,{id,title,reason,url,required});
 for(const [type,reason,,, ,source] of details.items){
  if(startupServices.includes(type))continue;
  const required=type==='DOT'&&['Across state lines (interstate)','Both'].includes(o.scope)&&
   (weightBands.slice(2).includes(o.weightBand)||o.placards==='Yes');
  add(type,type,reason,source||(type==='IFTA'&&o.base!=='GA'?'':feeSources[type]),required);
 }
 if(details.ucrApplies&&!items.has('UCR'))add('UCR','UCR','Review interstate UCR registration and fleet count.','https://www.ucr.gov/');
 for(const title of details.eligibility){
  const type={'USDOT registration':'DOT','UCR registration':'UCR',IFTA:'IFTA'}[title];
  if(type&&items.has(type))continue;
  add(type||title,title,'Your answers leave eligibility open. Confirm the details before filing.',type==='IFTA'&&o.base!=='GA'?'':feeSources[type]);
 }
 const route=parseOperatingStates(o.states||'');
 for(const state of route){
  const entry=routeRequirements[state];
  if(entry)add(entry[0],state+' · '+entry[0],entry[1],entry[2]);
 }
 if(route.some(state=>!Object.hasOwn(routeRequirements,state))){
  add('Other','Other state and route permits','Check the issuing agencies for '+route.filter(state=>!Object.hasOwn(routeRequirements,state)).join(', ')+'.');
 }
 if(o.hazmat==='Yes'||o.hazmat==='Unsure'||o.placards==='Yes'||o.permitChecks?.includes('Hazmat')){
  add('Hazmat','Hazmat credentials','Confirm the material, quantity and route to identify carrier registrations, permits and driver endorsements.',feeSources.Hazmat);
 }
 for(const id of o.permitChecks||[]){
  if(!items.has(id)&&Object.hasOwn(permitChoices,id))add(id,id,permitChoices[id],feeSources[id]);
 }
 return [...items.values()].sort((a,b)=>Number(b.required)-Number(a.required));
}
function operationCards(o,details){
 const items=operationChecklist(o,details);
 if(!items.length)return '<p class="note">Review your answers and confirm any additional requirements with your issuing agencies.</p>';
 return '<h3>What your operation may need</h3><p>Choose a status for each item. Items that need a fee or eligibility check stay pending review.</p>'+
  items.map(({id,title,reason,url,required})=>{
   const requested=o.requestedServices?.includes(id);
   const status=requested?'I need it':o.requirementChoices?.[id];
   const pending=status==='I need it'&&!details.items.some(([type])=>type===id);
   return '<div class="row"><div><strong>'+esc(title)+'</strong> '+badge(required?'Mandatory for your operation':'Verify applicability',required?'bad':'warn')+
    '<p>'+esc(reason)+'</p>'+(id==='OR'&&parseOperatingStates(o.states||'').includes('OR')?oregonPermitResults(o):'')+(id==='NM'?newMexicoResults(o):'')+
    (id==='IFTA'?iftaApplication(o):url?'<a href="'+esc(url)+'" target="_blank" rel="noopener">'+(id==='NM'?'Official New Mexico MVD Guidance':'Official guidance')+'</a>':'')+
    (pending?'<small>Pending eligibility and fee review</small>':'')+'</div>'+
    '<label><span>Status for '+esc(title)+'</span><select data-requirement="'+esc(id)+'">'+options(requirementOptions,status)+'</select></label></div>';
  }).join('');
}
