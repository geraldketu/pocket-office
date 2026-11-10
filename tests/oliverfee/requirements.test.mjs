import test from 'node:test';
import assert from 'node:assert/strict';
import {buildQuote,evaluateHazmat,weightResults,newMexicoPlanning} from '../../src/lib/oliverfee/rules.mjs';
const material={shippingName:'Gasoline',un:'UN1203',division:'3',quantity:3000,quantityUnit:'gallons',packaging:'Bulk',capacity:4000,capacityUnit:'gallons',phase:'Liquid',placards:'Yes',verified:true,hmspVerified:'Does not apply',securityPlanVerified:'Required'};
const hazmat={hazmat:'Yes',base:'GA',states:'GA, TN',scope:'Across state lines (interstate)',hire:'Yes, for hire',hazmatDetails:{registrationYear:'2026–2027',businessCategory:'Small business or nonprofit (verified)',farmerException:'No',materials:[material],drivers:[{name:'Driver A',state:'GA',rate:'Standard',transactionVerified:false}]}};
test('Georgia hazmat with missing cargo details stays unresolved; verified material triggers PHMSA fee automatically',()=>{
 const missing={...hazmat,hazmatDetails:{...hazmat.hazmatDetails,materials:[]}};
 assert.equal(evaluateHazmat(missing).find(r=>r.type==='PHMSA').status,'Needs verification');
 assert.equal(buildQuote({onboard:missing}).outside.find(i=>i.type==='PHMSA').amountCents,null);
 const enough=buildQuote({onboard:hazmat});
 const fee=enough.outside.find(i=>i.type==='PHMSA');assert.equal(fee.amountCents,27500);assert.equal(fee.payer,'Carrier pays PHMSA directly');assert.equal(enough.payableCents,0);assert.ok(enough.directPayCents>=27500);assert.ok(fee.source.includes('phmsa.dot.gov'));
 const other=structuredClone(hazmat);other.hazmatDetails.businessCategory='Other business (verified)';assert.equal(buildQuote({onboard:other}).outside.find(i=>i.type==='PHMSA').amountCents,260000);
});
test('PHMSA requested help moves fee into collected total once, flat hazmat charge stays Pending',()=>{
 const state={onboard:hazmat,application:{filings:{PHMSA:{status:'help'}}}};const q=buildQuote(state);
 assert.equal(q.outside.filter(i=>i.type==='PHMSA').length,1);assert.equal(q.outside.find(i=>i.type==='PHMSA').payer,'OliverFee collects');assert.equal(q.payableCents,27500);assert.equal(q.services.filter(i=>i.type==='Hazmat').length,1);assert.ok(q.blockers.some(x=>x.includes('Hazmat')));
 const covered=buildQuote({...state,plan:'Ultimate',planCoverage:{Ultimate:{hazmat:true}}});assert.equal(covered.services.find(i=>i.type==='Hazmat').amountCents,0);assert.ok(covered.services.find(i=>i.type==='Hazmat').note.includes('Included in your plan'));
});
test('TSA and DDS direct-pay fees never inflate OliverFee checkout',()=>{
 const state={onboard:structuredClone(hazmat)};state.onboard.hazmatDetails.drivers[0].transactionVerified=true;state.onboard.hazmatDetails.drivers[0].ddsFee='20';const q=buildQuote(state);
 assert.equal(q.outside.find(i=>i.type==='TSA HME').amountCents,8825);assert.equal(q.outside.find(i=>i.type==='CDL HME').amountCents,2000);assert.equal(q.payableCents,0);
 state.onboard.hazmatDetails.drivers[0].rate='Reduced TWIC (eligibility verified)';assert.equal(buildQuote(state).outside.find(i=>i.type==='TSA HME').amountCents,4100);
});
test('mixed fleet preserves a known setup alongside unresolved setup without guessing',()=>{
 const result=weightResults([{name:'Truck and trailer',actual:42000,rated:52000,axles:'2 or fewer'},{name:'Second truck',actual:'',rated:'',verifyLater:true}]);assert.equal(result.results[0].max,52000);assert.equal(result.results[0].status,'Known');assert.equal(result.results[1].status,'Needs verification');assert.equal(result.unresolved,true);assert.equal(result.highestKnown,52000);
});
test('self-handled, in-process and existing permits remain off the payable quote',()=>{
 const state={application:{filings:{DOT:{status:'have',number:'1234',activation:'Issued, not yet active'},KYU:{status:'help'},'NY HUT':{status:'self'},MC:{status:'process'}}},onboard:{quotes:{KYU:{service:35,external:0}}}};
 const q=buildQuote(state);assert.deepEqual(q.services.map(i=>i.type),['KYU']);assert.equal(q.payableCents,3500);
});
test('Pro/Premium/Ultimate include UCR help, IFTA setup is free, GA decal order appears once',()=>{
 for(const plan of ['Pro','Premium','Ultimate']){
  const state={plan,onboard:{base:'GA',iftaBase:'GA',ucrYear:'2027',ucrVehicles:1,gaDecalTrucks:2},application:{filings:{UCR:{status:'help'},IFTA:{status:'help'},'GA IFTA decals':{status:'help'}}}};
  const q=buildQuote(state);assert.equal(q.services.find(i=>i.type==='UCR').amountCents,0);assert.equal(q.services.find(i=>i.type==='IFTA').amountCents,0);assert.equal(q.services.filter(i=>i.type==='GA IFTA decals').length,1);assert.equal(q.services.find(i=>i.type==='GA IFTA decals').amountCents,1000);assert.equal(q.outside.find(i=>i.type==='GA IFTA decals').amountCents,600);
 }
});
test('trial is disabled and the two $199 offers remain distinct',()=>{
 const plan=buildQuote({}, {kind:'plan',plan:'Ultimate'}),bundle=buildQuote({}, {kind:'startup'});assert.equal(plan.monthlyCents,19900);assert.equal(bundle.monthlyCents,0);assert.equal(bundle.services[0].amountCents,19900);assert.equal(plan.trialEnabled,false);assert.equal(plan.firstBillingDate,null);
});
test('unknown packaging cannot be promoted to a verified hazmat classification',()=>{
 const o=structuredClone(hazmat);o.hazmatDetails.materials[0].packaging='Unknown';assert.equal(evaluateHazmat(o).find(i=>i.type==='PHMSA').status,'Needs verification');
});
test('New Mexico pass-through: over 26000 triggers review, unverified rates and missing miles never enter amount due',()=>{
 const o={base:'CT',iftaBase:'CT',states:'CT, NM',nmVehicles:[{weight:'30000',miles:'',permit:'No',rate:'0.02'}]};
 let result=newMexicoPlanning(o)[0];assert.equal(result.status,'Required');assert.equal(result.projectedCents,null);assert.ok(result.missing.some(m=>m.includes('miles')));
 o.nmVehicles[0].miles='100';assert.equal(newMexicoPlanning(o)[0].projectedCents,null);
 Object.assign(o.nmVehicles[0],{rateVerified:true,rateSource:'https://www.mvd.newmexico.gov/commercial/commercial-vehicles/weight-distance/',ratePeriod:'2026, verified bracket for vehicle'});
 result=newMexicoPlanning(o)[0];assert.equal(result.projectedCents,200);
 const state={onboard:o,application:{filings:{NM:{status:'help'}}}};const q=buildQuote(state);assert.equal(q.planning[0].amountCents,200);assert.equal(q.payableCents,0);assert.equal(q.outside.find(i=>i.type==='NM').amountCents,null);
 o.nmVehicles[0].weight='26000';assert.equal(newMexicoPlanning(o)[0].status,'Does not apply');
 o.nmVehicles[0].weight='30000';o.states='CT';assert.equal(newMexicoPlanning(o)[0].status,'Needs verification');o.nmVehicles[0].travel='Yes';assert.equal(newMexicoPlanning(o)[0].status,'Required');assert.equal(o.states,'CT');
});
test('IFTA links use the IFTA base even when LLC state and New Mexico route differ',()=>{
 const state={onboard:{base:'MD',llcState:'GA',iftaBase:'CT',states:'MD, NM'},application:{filings:{IFTA:{status:'help'}}}};const q=buildQuote(state);assert.match(q.outside.find(i=>i.type==='IFTA').source,/portal.ct.gov\/drs\/ifta\/connecticut-ifta/);assert.match(q.services.find(i=>i.type==='IFTA').note,/myconneCT/);
 state.onboard.iftaBase='WA';assert.equal(buildQuote(state).outside.find(i=>i.type==='IFTA').source,'https://www.iftach.org/helpdesk/');
});
