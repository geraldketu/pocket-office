import test from 'node:test';
import assert from 'node:assert/strict';
import {STATE_CODES,allRules,screen,emptyVehicle,selectedStates,normalizeScreening,questionsFor,callStatus} from '../src/lib/screening.ts';
import {reviewInterview} from '../src/lib/interview-rules.ts';
const vehicle={...emptyVehicle(),count:'1',kind:'Truck',axles:'2',gvwr:'18000',actual:'18000',registered:'18000',nyGross:'18000',combination:'No',fuel:'Diesel',engineYear:'2020'};
const answers={forHire:'Yes',cargoKind:'Property',cargoDescription:'General freight',interstateGoods:'Yes',hazmat:'No',personal:'No',oversize:'No',overweight:'No',routesComplete:'Yes',canada:'No',iftaException:'No',ucrException:'No',otherBusiness:'No',interstateProfile:'Yes',irpUse:'Yes',restrictedPlate:'No',domicile:'United States',authorityException:'No',regulatedGoods:'Yes',dotException:'No',dotPassenger:'No',caCtcException:'No',caBusException:'No',caMcpException:'No',caActivity:'Pass through only',caFuelException:'No',fuelCredentials:'No'};
const context=(patch={})=>({states:['GA','CA'],base:'GA',scope:'Across state lines (interstate)',answers:{...answers},vehicles:[{...vehicle}],...patch});
const result=(id,c=context())=>screen(c).find(r=>r.rule.id===id);
test('state selection is exactly fifty, individual toggle, Select All and Clear All preserve no stale state rules',()=>{
 assert.equal(STATE_CODES.length,50);assert.equal(new Set(STATE_CODES).size,50);assert.ok(!STATE_CODES.includes('DC'));
 assert.deepEqual(selectedStates([], 'CA',true),['CA']);assert.deepEqual(selectedStates(['CA'],'CA',true),['CA']);assert.deepEqual(selectedStates(['CA'],'CA',false),[]);
 assert.equal(screen(context({states:[...STATE_CODES]})).filter(r=>r.rule.state).length,260);
 assert.equal(screen(context({states:[]})).filter(r=>r.rule.state).length,0);
});
for(const state of STATE_CODES)test(`${state}: individual and pass-through selection always has five incomplete-coverage review categories`,()=>{
 const rows=screen(context({states:[state],base:state==='GA'?'CA':'GA'})).filter(r=>r.rule.state===state);
 for(const category of ['AUTHORITY','TAX','TRIP','SIZE','HAZMAT']){const r=rows.find(r=>r.rule.id===`${state}-${category}`);assert.ok(r);assert.equal(r.status,'Needs manual review');assert.equal(r.rule.verifiedOn,null);assert.ok(r.rule.sources.every(s=>s.url.startsWith('https://')));assert.ok(r.rule.questions.length>0);assert.ok(r.reason.includes('not been verified'));}
});
test('UCR applies to an 18000 lb interstate property truck while IFTA does not',()=>{
 assert.equal(result('UCR').status,'Required');assert.equal(result('IFTA').status,'Not applicable based on your answers');assert.equal(result('IRP').status,'Not applicable based on your answers');
});
test('IFTA applies to a private three-axle employee bus while UCR and IRP do not',()=>{
 const c=context({answers:{...answers,cargoKind:'Passengers',forHire:'No',privatePassengers:'Yes'},vehicles:[{...vehicle,kind:'Bus',axles:'3'}]});assert.equal(result('IFTA',c).status,'Required');assert.equal(result('UCR',c).status,'Not applicable based on your answers');assert.equal(result('IRP',c).status,'Not applicable based on your answers');
});
test('IFTA / IRP exact 26000 threshold, three-axle alternative and actual/registered rather than GVWR',()=>{
 for(const id of ['IFTA','IRP']){assert.equal(result(id,context({vehicles:[{...vehicle,gvwr:'80000',actual:'26000',registered:'26000'}]})).status,'Not applicable based on your answers');assert.equal(result(id,context({vehicles:[{...vehicle,actual:'26001'}]})).status,'Required');assert.equal(result(id,context({vehicles:[{...vehicle,axles:'3'}]})).status,'Required');assert.equal(result(id,context({vehicles:[{...vehicle,combination:'Yes',combinedActual:'27000',combinedRegistered:'27000'}]})).status,'Required');}
});
test('Alaska/Hawaii plus one lower-48 state is not two IFTA/IRP members; unknown routes remain unknown',()=>{
 const v={...vehicle,axles:'3'};for(const id of ['IFTA','IRP']){assert.equal(result(id,context({states:['AK','HI','CA'],vehicles:[v]})).status,'Not applicable based on your answers');assert.equal(result(id,context({states:['CA'],answers:{...answers,canada:'Not sure'},vehicles:[v]})).status,'May be required — answer needed');}
});
test('single-state interstate goods and active profile can require UCR without physical multi-jurisdiction IFTA',()=>{
 const c=context({states:['GA'],scope:'Within one state (intrastate)',vehicles:[{...vehicle,axles:'3'}]});assert.equal(result('UCR',c).status,'Required');assert.equal(result('IFTA',c).status,'Not applicable based on your answers');
});
test('MC has no general 10001lb cutoff; private property is not MC exempt from UCR',()=>{
 assert.equal(result('MC',context({vehicles:[{...vehicle,gvwr:'9000',actual:'9000',registered:'9000'}]})).status,'Required');const c=context({answers:{...answers,forHire:'No'}});assert.equal(result('MC',c).status,'Not applicable based on your answers');assert.equal(result('UCR',c).status,'Required');
});
test('unknown and claimed exemptions never become guessed Required/Not required',()=>{
 const c=context({answers:{...answers,iftaException:'Yes',ucrException:'Yes',authorityException:'Yes'},vehicles:[{...vehicle,axles:'3'}]});for(const id of ['IFTA','UCR','MC'])assert.equal(result(id,c).status,'Needs manual review');const unknown=result('IFTA',context({vehicles:[emptyVehicle()]}));assert.equal(unknown.status,'May be required — answer needed');assert.equal(callStatus(unknown.status),'Needs review');
});
test('California diesel pass-through triggers emissions screenings, not automatic MCP',()=>{
 for(const id of ['CA-CTC','CA-TRUCK-BUS'])assert.equal(result(id).status,'Required');assert.equal(result('CA-MCP').status,'Needs manual review');assert.match(result('CA-MCP').reason,/pass-through alone/);
});
test('California MCP ordinary California-based for-hire property carrier and exemptions',()=>{
 const c=context({base:'CA',answers:{...answers,caActivity:'Both pick up and deliver'}});assert.equal(result('CA-MCP',c).status,'Required');c.answers.caMcpException='Yes';assert.equal(result('CA-MCP',c).status,'Needs manual review');
});
test('California 14000 boundary, gasoline, zero emission, unknown fuel and exemptions',()=>{
 for(const id of ['CA-CTC','CA-TRUCK-BUS'])for(const v of [{...vehicle,gvwr:'14000'},{...vehicle,fuel:'Gasoline'},{...vehicle,fuel:'Zero emission'}])assert.equal(result(id,context({vehicles:[v]})).status,'Not applicable based on your answers');assert.equal(result('CA-CTC',context({vehicles:[{...vehicle,fuel:'Not sure'}]})).status,'May be required — answer needed');assert.equal(result('CA-CTC',context({answers:{...answers,caCtcException:'Yes'}})).status,'Needs manual review');
});
test('KY licensed, NM declared and OR combined thresholds are separate from actual GVWR',()=>{
 for(const [state,id,key,low,high] of [['KY','KYU','kyLicensed','59999','60000'],['NM','NM-WDT','nmDeclared','26000','26001'],['OR','OR-WMT','orCombined','26000','26001']]){
  const a={...answers,[id+'Exception']:'No',kyFarmPlate:'No',[key]:low};const c=context({states:[state],answers:a});assert.equal(result(id,c).status,'Not applicable based on your answers');a[key]=high;assert.equal(result(id,c).status,'Required');a[id+'Exception']='Yes';assert.equal(result(id,c).status,'Needs manual review');
 }
 assert.equal(result('KYU',context({states:['KY'],answers:{...answers,kyLicensed:'80000',kyFarmPlate:'Yes'}})).status,'Not applicable based on your answers');
});
test('NY gross and unloaded election boundaries and exemption review',()=>{
 const c=context({states:['NY'],answers:{...answers,nyMethod:'Gross weight',nyException:'No'}});assert.equal(result('NY HUT',c).status,'Not applicable based on your answers');c.vehicles=[{...vehicle,actual:'18001',nyGross:'18001'}];assert.equal(result('NY HUT',c).status,'Required');c.answers.nyMethod='Unloaded weight election';c.vehicles=[{...vehicle,kind:'Tractor',unloaded:'4001'}];assert.equal(result('NY HUT',c).status,'Required');c.answers.nyException='Yes';assert.equal(result('NY HUT',c).status,'Needs manual review');
});
test('CT requires BOTH class8–13 and gross>=26000; single-unit and mixed fleet do not produce guessed requirement',()=>{
 const c=context({states:['CT'],answers:{...answers,ctClass:'Yes',ctException:'No'},vehicles:[{...vehicle,combination:'Yes',combinedActual:'26000'}]});assert.equal(result('CT-HUF',c).status,'Required');c.answers.ctClass='No';assert.equal(result('CT-HUF',c).status,'Not applicable based on your answers');c.answers.ctClass='Yes';c.vehicles.push({...vehicle});assert.equal(result('CT-HUF',c).status,'Needs manual review');
});
test('all rule IDs unique and every question panel has specific questions, official sources and truthful verification',()=>{
 const rules=allRules(STATE_CODES);assert.equal(new Set(rules.map(r=>r.id)).size,rules.length);for(const r of rules){assert.ok(r.sources.length);assert.ok(r.questions.length);assert.ok(r.temporary);if(r.verifiedOn)assert.equal(r.verifiedOn,'2026-11-10');}const ucr=rules.find(r=>r.id==='UCR');assert.ok(!questionsFor(ucr,{cargoKind:'Property'}).some(q=>q.key==='privatePassengers'));assert.ok(questionsFor(ucr,{cargoKind:'Passengers',forHire:'No'}).some(q=>q.key==='privatePassengers'));
});
test('estimator excludes other states, reuses pricing, keeps unresolved government fees separate and remains unpaid',()=>{
 const q=reviewInterview({company:'Test',scope:'Both',base:'GA',weight:'',states:['CA'],filings:{UCR:'help','CA-MCP':'help','KYU':'help'},answers,vehicles:[vehicle],kyWeight:'',nyWeight:'',packageSelection:'startup'});assert.deepEqual(q.services.map(s=>s.key),['UCR','CA-MCP']);assert.equal(q.services[0].serviceCents,0);assert.equal(q.services[0].governmentCents,null);assert.equal(q.bundleCents,125000);assert.equal(q.pending,true);assert.equal(q.paymentStatus,'unpaid');assert.equal(q.checkoutEnabled,false);
});
test('verified California 30 dollar fuel trip fee requires actual option, quantities and all-vehicle qualification',()=>{
 const data={company:'Test',scope:'Both',base:'GA',weight:'',states:['CA'],filings:{'CA-FUEL':'help'},answers:{...answers,caFuelOption:'Four-day trip permit',caFuelCountVerified:'Yes'},vehicles:[{...vehicle,count:'2',axles:'3'}],kyWeight:'',nyWeight:''};let q=reviewInterview(data);assert.equal(q.outsideFeeCents,6000);assert.equal(q.services[0].serviceCents,null);assert.ok(q.services[0].feeSource);data.vehicles.push({...vehicle});q=reviewInterview(data);assert.equal(q.services[0].governmentCents,null);data.answers.caFuelCountVerified='Not sure';assert.equal(reviewInterview(data).services[0].governmentCents,null);
});
test('normalization bounds payload and never accepts injected vehicle fee fields',()=>{
 const n=normalizeScreening({answers:{bad:{amount:1},safe:'Yes'},vehicles:[{...vehicle,governmentCents:'1'}]});assert.equal(n.answers.bad,undefined);assert.equal(n.vehicles[0].governmentCents,undefined);assert.equal(n.vehicles[0].actual,'18000');
});

test('NY unloaded election never removes a gross-weight HUT trigger',()=>{const c=context({states:['NY'],answers:{...answers,nyMethod:'Unloaded weight election',nyException:'No'},vehicles:[{...vehicle,nyGross:'30000',unloaded:'2000'}]});assert.equal(result('NY HUT',c).status,'Required');});
test('CA hazmat licensing uses placards OR for-hire qualifying material over500lb, not generic hazmat alone',()=>{const c=context({answers:{...answers,hazmat:'Yes',placards:'No',caHazmat500:'Yes',caHazmatException:'No'}});assert.equal(result('CA-HAZMAT-LICENSE',c).status,'Required');c.answers.caHazmat500='No';assert.equal(result('CA-HAZMAT-LICENSE',c).status,'Not applicable based on your answers');c.answers.placards='Not sure';assert.equal(result('CA-HAZMAT-LICENSE',c).status,'May be required — answer needed');});

test('Clear All does not reuse a complete route answer as proof of no IFTA travel',()=>{assert.equal(result('IFTA',context({states:[],vehicles:[{...vehicle,axles:'3'}]})).status,'May be required \u2014 answer needed');});

test('personal use is never silently treated as commercial from a weight alone',()=>{const c=context({states:['NM'],answers:{...answers,personal:'Yes',nmDeclared:'80000','NM-WDTException':'No'}});assert.equal(result('NM-WDT',c).status,'Needs manual review');assert.equal(result('UCR',c).status,'Needs manual review');});
