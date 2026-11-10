export const RULE_SOURCES={
 phmsa:'https://www.phmsa.dot.gov/registration/registration-information',
 phmsaFees:'https://www.phmsa.dot.gov/registration/registration-overview',
 hmsp:'https://www.fmcsa.dot.gov/regulations/hazardous-materials/hazardous-materials-safety-permit-program-hmsp',
 placards:'https://www.ecfr.gov/current/title-49/subtitle-B/chapter-I/subchapter-C/part-172/subpart-F/section-172.504',
 general:'https://csa.fmcsa.dot.gov/SafetyPlanner/MyFiles/Sections.aspx?ch=25&eta=100792&sec=83',
 security:'https://www.ecfr.gov/current/title-49/subtitle-B/chapter-I/subchapter-C/part-172/subpart-I/section-172.800',
 tsa:'https://www.tsa.gov/for-industry/hazmat-endorsement',
 ga:'https://dds.georgia.gov/fees-and-terms',
 gaManual:'https://dds.georgia.gov/media/12646/download',
 ifta:'https://dor.georgia.gov/ifta-faq',ucr:'https://plan.ucr.gov/fee-brackets/'
};
export function decision(state,type){
 const o=state.onboard||{};const row=state.application?.filings?.[type];
 if(row)return row.status==='help'?'help':row.status==='have'?'have':row.status==='process'?'process':'omit';
 return o.serviceChoices?.[type]||({'I have it':'have','I need it':'help','I’ll get it on my own':'omit'}[o.requirementChoices?.[type]])||((o.requestedServices||[]).includes(type)||(o.startupServices||[]).includes(type)?'help':'omit');
}
export function weightResults(setups=[]){
 const results=setups.map(v=>{
  const actual=v.actual!==''&&v.actual!=null?Number(v.actual):null;
  const rated=v.rated!==''&&v.rated!=null?Number(v.rated):null;
  const known=actual!==null&&rated!==null&&actual>0&&rated>0&&!v.verifyLater;
  const max=known?Math.max(actual,rated):null;
  return {name:v.name||'Vehicle setup',actual,rated,max,status:known?'Known':'Needs verification',dot:known?(max>=10001?'Threshold met':'Below weight threshold'):'Needs verification',ifta:known?(max>26000||v.axles==='3 or more'?'Weight/axle threshold met':'Review combination and other criteria'):'Needs verification'};
 });
 return {results,unresolved:results.some(v=>v.status!=='Known')||!results.length,highestKnown:Math.max(0,...results.map(v=>v.max||0))};
}
export function newMexicoPlanning(o={}){
 const route=String(o.states||'').toUpperCase().split(',').map(x=>x.trim()).includes('NM')||/ALL (50 )?STATES/i.test(o.states||'');
 const rows=o.nmVehicles?.length?o.nmVehicles:[{}];
 return rows.map((v,i)=>{
  const travel=v.travel==='No'?false:route||v.travel==='Yes';
  const knownTravel=route||['Yes','No'].includes(v.travel);
  const weight=v.weight!==''&&v.weight!=null&&Number(v.weight)>0?Number(v.weight):null;
  const miles=v.miles!==''&&v.miles!=null&&Number(v.miles)>=0?Number(v.miles):null;
  const rate=v.rate!==''&&v.rate!=null&&Number(v.rate)>=0?Number(v.rate):null;
  const verified=v.rateVerified===true&&/^https:\/\/(www\.)?(mvd|tax)\.newmexico\.gov\//i.test(v.rateSource||'')&&!!v.ratePeriod;
  const status=!knownTravel||weight===null?'Needs verification':travel&&weight>26000?'Required':'Does not apply';
  const missing=[];if(!knownTravel)missing.push('confirm whether this vehicle travels in New Mexico');if(weight===null)missing.push('declared gross vehicle weight');if(!['Yes','No'].includes(v.permit))missing.push('current electronic permit status');if(miles===null)missing.push('New Mexico miles including pass-through miles');if(!verified||rate===null)missing.push('applicable official rate, source and effective period');
  return {name:v.name||'Vehicle '+(i+1),status,weight,miles,permit:v.permit||'Unsure',missing,projectedCents:status==='Required'&&miles!==null&&rate!==null&&verified?Math.round(miles*rate*100):null,source:'https://www.mvd.newmexico.gov/commercial/commercial-vehicles/weight-distance/',rateSource:v.rateSource||'',period:v.ratePeriod||'Rate period unverified'};
 });
}
export function evaluateHazmat(o={}){
 const h=o.hazmatDetails||{};const materials=h.materials||[];
 const no=o.hazmat==='No'&&o.placards!=='Yes';
 const known=materials.filter(m=>m.verified===true&&(m.shippingName&&!/^(unknown|unsure)$/i.test(m.shippingName)||/^(UN|NA)?\s*\d{4}$/i.test(m.un||''))&&/^[1-9](\.[1-6])?$/.test(m.division||'')&&m.quantity!==''&&m.quantity!=null&&Number(m.quantity)>0&&m.quantityUnit&&m.quantityUnit!=='Unknown'&&['Bulk','Non-bulk'].includes(m.packaging)&&m.capacity!==''&&Number(m.capacity)>0&&m.capacityUnit&&m.capacityUnit!=='Unknown');
 const allKnown=materials.length>0&&known.length===materials.length;
 const missing=[];if(!materials.length)missing.push('shipping name or UN/NA number, hazard class, quantity, packaging and capacity');
 materials.forEach((m,i)=>{if(!known.includes(m))missing.push('complete verified shipping details for material '+(i+1))});
 if(!h.farmerException)missing.push('farmer exception review');
 const yesPlacard=known.some(m=>m.placards==='Yes');
 const bulk=known.some(m=>m.packaging==='Bulk'&&((['Liquid','Gas'].includes(m.phase)&&m.capacityUnit==='gallons'&&Number(m.capacity)>=3500)||(['Liquid','Gas'].includes(m.phase)&&m.capacityUnit==='liters'&&Number(m.capacity)>=13248)||(m.phase==='Solid'&&m.capacityUnit==='cubic feet'&&Number(m.capacity)>468)));
 const explosive=known.some(m=>['1.1','1.2','1.3'].includes(m.division)&&((m.quantityUnit==='kg'&&Number(m.quantity)>25)||(m.quantityUnit==='lb'&&Number(m.quantity)>55)));
 const radioactive=known.some(m=>m.radioactiveControlled==='Yes');
 const phmsaRequired=h.farmerException==='No'&&(yesPlacard||bulk||explosive||radioactive);
 const hmspRequired=radioactive||explosive||known.some(m=>m.hmspVerified==='Required');
 const noHMSP=allKnown&&known.every(m=>m.hmspVerified==='Does not apply');
 const knownPlacards=allKnown&&known.every(m=>['Yes','No'].includes(m.placards));
 const result=(type,label,status,reason,source,needs=[])=>({type,label,status:no?'Does not apply':status,reason:no?'Carrier reports no hazardous materials; revisit if the operation changes.':reason,missing:no?[]:needs,source,reviewed:'2026-11-07'});
 return [
  result('PHMSA','PHMSA registration',phmsaRequired?'Required':'Needs verification',phmsaRequired?'Verified shipment meets a PHMSA registration trigger.':'Review all registration categories and exceptions; a hazmat answer alone is insufficient.',RULE_SOURCES.phmsa,phmsaRequired?[]:missing),
  result('HMSP','FMCSA Hazardous Materials Safety Permit',hmspRequired?'Required':noHMSP?'Does not apply':'Needs verification',hmspRequired?'Verified material meets a safety-permit trigger.':noHMSP?'Staff verified every listed material against the safety-permit categories.':'Safety-permit categories are narrower than PHMSA registration.',RULE_SOURCES.hmsp,hmspRequired||noHMSP?[]:['material-specific safety-permit threshold verification']),
  result('HME','Driver CDL hazmat endorsements',yesPlacard?'Required':'Needs verification',yesPlacard?'A placarded load requires review of each driver’s H/X endorsement and TSA eligibility.':'Confirm placards, CDL transaction and driver licensing state.',RULE_SOURCES.tsa,yesPlacard?[]:['placarding determination and driver CDL details']),
  result('Placards','Placards',yesPlacard?'Required':knownPlacards?'Does not apply':'Needs verification',yesPlacard?'Verified shipping details specify placards.':knownPlacards?'No listed load requires placards according to verified shipment details.':'Confirm classes, aggregate load, packaging and exceptions under the placarding tables.',RULE_SOURCES.placards,knownPlacards?[]:['verified placarding determination']),
  result('Shipping papers','Shipping papers',allKnown?'Required':'Needs verification',allKnown?'Regulated shipments need shipping papers unless a specific exception applies; classification verification includes exception review.':'Review classification and any shipping-paper exception.',RULE_SOURCES.general,allKnown?[]:missing),
  result('Training','Hazmat training',allKnown?'Required':'Needs verification',allKnown?'Employees performing regulated hazmat functions need applicable training.':'Confirm which employees perform regulated hazmat functions.',RULE_SOURCES.general,allKnown?[]:missing),
  result('Security plan','Hazmat security plan',known.some(m=>m.securityPlanVerified==='Required')?'Required':allKnown&&known.every(m=>m.securityPlanVerified==='Does not apply')?'Does not apply':'Needs verification','Evaluate the distinct security-plan categories; do not infer them from registration alone.',RULE_SOURCES.security,['verify material-specific security-plan categories and exceptions']),
  result('Hazmat routes','State and route requirements','Needs verification','Reuse operating states '+(o.states||'(not yet supplied)')+'; check restrictions, permits, tunnels and routing for each load.',RULE_SOURCES.hmsp,['state and route-specific verification'])
 ];
}
export function buildQuote(state={},selection={}){
 const o=state.onboard||{};const plan=selection.kind==='plan'?selection.plan:(state.membershipRequested?state.plan:null);
 const coveragePlan=plan||state.plan||'Basic';
 const rates={Basic:4999,Pro:6999,Premium:9999,Ultimate:19900};
 const bundle=selection.kind==='startup'||state.startupBundle===true;
 const covered=['LLC formation','EIN assistance','DOT','MC','BOC-3','UCR'];
 const application=state.application?.filings||{};
 const allTypes=new Set([...Object.keys(application),...Object.keys(o.serviceChoices||{}),...(o.requestedServices||[]),...(o.startupServices||[])]);
 const hazmatRequested=['Hazmat','PHMSA','HMSP','Hazmat routes'].some(type=>decision(state,type)==='help');
 if(hazmatRequested)allTypes.add('Hazmat');
 const services=[];const outside=[];const blockers=[];
 const cents=v=>v!==''&&v!=null&&Number.isFinite(Number(v))&&Number(v)>=0?Math.round(Number(v)*100):null;
 const line=(type,label,amount,source='',period='',payer='OliverFee collects',note='')=>({type,label,amountCents:amount,source,period,payer,note});
 if(bundle)services.push(line('Startup Bundle','Carrier Startup Bundle',39900,'','one time'));
 for(const type of allTypes){
  if((decision(state,type)!=='help'&&!(type==='Hazmat'&&hazmatRequested))||type==='UCR'&&o.skipUcr)continue;
  const q=o.quotes?.[type]||{};let service=cents(q.service),external=cents(q.external),note='',source='',period='';
  if(type==='DOT'){service=2500;external=0}
  if(type==='EIN assistance')external=0;
  if(type==='MC')external=30000;
  if(type==='UCR'){
   service=0;
   note=service===0?'Included in your plan':'';
   const n=o.ucrVehicles!==''&&o.ucrVehicles!=null?Number(o.ucrVehicles):null;
   const bracket=Number.isInteger(n)&&n>=0?[2,5,20,100,1000,Infinity].findIndex(max=>n<=max):-1;
   external=bracket>=0?({'2026':[46,138,276,963,4592,44836],'2027':[55,167,333,1163,5548,54165]}[o.ucrYear]?.[bracket]??null):null;
   if(external!==null)external*=100;source=RULE_SOURCES.ucr;period=o.ucrYear||'Year pending';
  }
  if(type==='IFTA'){service=0;external=cents(q.external);note='IFTA setup assistance is free. Confirm any base-state license charge separately. Decals are a separate single ordering item.'}
  if(type==='GA IFTA decals'){
   const n=Number(o.gaDecalTrucks);service=Number.isInteger(n)&&n>0?n*500:null;external=Number.isInteger(n)&&n>0?n*300:null;source=RULE_SOURCES.ifta;note='$5 OliverFee ordering + $3 state decal set per qualifying truck';period=o.ucrYear||'Verify decal year';
   if((o.iftaBase||o.base)!=='GA'){service=null;external=null;note='Verify decal ordering: the selected IFTA base jurisdiction is not Georgia.'}
  }
  if(type==='IFTA'){const base=o.iftaBase||o.base;source=({CT:'https://portal.ct.gov/drs/ifta/connecticut-ifta',GA:'https://dor.georgia.gov/register-new-ifta-account'}[base])||'https://www.iftach.org/helpdesk/';note+=(base==='CT'?' Use myconneCT for first-time registration.':'');period='IFTA base jurisdiction: '+(base||'Needs verification')}
  if(type==='NM'){source='https://www.mvd.newmexico.gov/commercial/commercial-vehicles/weight-distance/';note='Permit / filing charge only. Projected mileage tax is planning only and excluded from amount due.'}
  if(type==='Driver Qualification File'){service=9999*Math.max(1,Number(o.dqfDrivers)||1);external=0}
  if(type==='New Entrant Audit Support')service=49999;
  if(type==='Hazmat'){
   service=cents(state.pricing?.hazmatFlatFee);
   if(state.planCoverage?.[coveragePlan]?.hazmat===true){service=0;note='Included in your plan'}
   external=0;note+=(note?' · ':'')+'One flat standard hazmat setup charge; government fees listed separately.';
  }
  if(['PHMSA','HMSP','TSA HME','CDL HME','Hazmat routes'].includes(type))continue;
  if(bundle&&covered.includes(type)){service=0;note='Included in $399 Startup Bundle'}
  services.push(line(type,type,service,['IFTA','NM'].includes(type)?source:'','one time','OliverFee collects',note));
  if(!['Hazmat'].includes(type))outside.push(line(type,type+' government / vendor charge',external,source,period,'OliverFee collects'));
 }
 const h=o.hazmatDetails||{};const evaluation=evaluateHazmat(o);const phmsa=evaluation.find(r=>r.type==='PHMSA');
 if(phmsa.status!=='Does not apply'&&(o.hazmat==='Yes'||o.hazmat==='Unsure')){
  let amount=null;
  if(phmsa.status==='Required'&&h.registrationYear==='2026–2027')amount=h.businessCategory==='Small business or nonprofit (verified)'?27500:h.businessCategory==='Other business (verified)'?260000:null;
  const choice=decision(state,'PHMSA');
  outside.push(line('PHMSA','PHMSA one-year registration',amount,RULE_SOURCES.phmsaFees,'2026–2027; fee schedule reviewed 2026-11-07',choice==='help'?'OliverFee collects':'Carrier pays PHMSA directly',phmsa.status+' · processing included'));
  if(choice==='help'&&phmsa.status!=='Required')blockers.push('Verify PHMSA applicability.');
  if(evaluation.find(r=>r.type==='HMSP').status!=='Does not apply')outside.push(line('HMSP','FMCSA safety permit',cents(o.quotes?.HMSP?.external),RULE_SOURCES.hmsp,'Fee pending verification',decision(state,'HMSP')==='help'?'OliverFee collects':'Carrier pays directly'));
  if(evaluation.find(r=>r.type==='HME').status!=='Does not apply')for(const [index,driver] of (h.drivers||[]).entries()){
   let amount=driver.rate==='Standard'?8825:driver.rate==='Reduced TWIC (eligibility verified)'?4100:null;
   outside.push(line('TSA HME','TSA threat assessment · '+(driver.name||'Driver '+(index+1)),amount,RULE_SOURCES.tsa,'Rates effective October 1, 2026; confirm state process','Driver pays TSA directly','TSA performs the assessment; OliverFee does not perform driver background checks.'));
   let dds=driver.state==='GA'&&driver.transactionVerified===true?cents(driver.ddsFee):null;
   outside.push(line('CDL HME','CDL hazmat endorsement · '+(driver.name||'Driver '+(index+1))+' · '+(driver.state||'State pending'),dds,driver.state==='GA'?RULE_SOURCES.ga:RULE_SOURCES.tsa,'Verify driver transaction','Driver pays licensing agency directly',driver.state==='GA'?'Older GA manual lists $20; current DDS terms differ by transaction. Confirm actual fee.':'Verify the driver’s licensing state fee.'));
  }
  if(decision(state,'Hazmat routes')==='help')outside.push(line('Hazmat routes','State / route hazmat permits',cents(o.quotes?.['Hazmat routes']?.external),RULE_SOURCES.hmsp,'Verify routes','OliverFee collects'));
 }
 const payable=[...services,...outside.filter(x=>x.payer==='OliverFee collects')];
 for(const item of payable)if(item.amountCents===null)blockers.push(item.label+' is Pending.');
 if((decision(state,'IFTA')==='help'||decision(state,'DOT')==='help')&&o.weightBand==='Unsure or mixed fleet'&&weightResults(o.vehicleSetups).unresolved)blockers.push('Resolve mixed-fleet weights for requested weight-dependent filings.');
 const drivers=Math.max(0,Number(state.extraDrivers)||0),office=Math.max(0,Number(state.officeUsers)||0);
 const monthlyCents=plan?(rates[plan]||0)+drivers*1000+office*500:0;
 const nmSelected=String(o.states||'').split(',').map(x=>x.trim()).includes('NM')||(o.permitChecks||[]).includes('NM')||!!application.NM;
 const planning=nmSelected?newMexicoPlanning(o).map(v=>({type:'NM mileage tax',label:v.name+' · projected New Mexico mileage tax (planning only)',amountCents:v.projectedCents,source:v.source,period:v.period,payer:'Carrier pays New Mexico using actual quarterly miles',note:v.status+' · '+(v.missing.join('; ')||'Verified planning inputs')+' · Permit charge is separate; excluded from amount due.'})):[];
 return {version:2,plan:plan||null,bundle,coveragePlan,monthlyCents,services,outside,planning,blockers:[...new Set(blockers)],payableCents:payable.reduce((n,x)=>n+(x.amountCents||0),0),directPayCents:outside.filter(x=>x.payer!=='OliverFee collects').reduce((n,x)=>n+(x.amountCents||0),0),dueTodayCents:payable.reduce((n,x)=>n+(x.amountCents||0),0)+monthlyCents,trialEnabled:false,trialDays:0,firstBillingDate:null};
}
