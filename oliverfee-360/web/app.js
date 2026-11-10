'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>globalThis.crypto?.randomUUID?.()??String(Date.now()+Math.random());
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const day=86400000;
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const dateIn=n=>new Date(Date.parse(today())+n*day).toISOString().slice(0,10);
const days=s=>s?Math.round((Date.parse(s)-Date.parse(today()))/day):null;
const dateText=s=>s?new Date(s+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'No date set';
const paths={truck:'M2 5h13v12H2zM15 9h4l3 4v4h-7M5 19a2 2 0 1 0 4 0 2 2 0 1 0-4 0m11 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0',home:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',shield:'M12 22S4 18 4 11V5l8-3 8 3v6c0 7-8 11-8 11zM9 12l2 2 4-4',file:'M6 2h8l4 4v16H6zM14 2v5h5M9 12h6m-6 4h6',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0m4-4a4 4 0 0 1 0 8',box:'M3 7l9-5 9 5v10l-9 5-9-5zM3 7l9 5 9-5m-9 5v10M7.5 4.5l9 5',calc:'M5 2h14v20H5zM8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0',alert:'M12 3l10 18H2zM12 9v4m0 4h.01',plus:'M12 5v14M5 12h14',arrow:'M5 12h14m-5-5 5 5-5 5',clock:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 6v6l4 2',pin:'M20 9c0 6-8 13-8 13S4 15 4 9a8 8 0 1 1 16 0zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',upload:'M4 16v5h16v-5M12 3v13m-5-8 5-5 5 5',menu:'M3 6h18M3 12h18M3 18h18',check:'M4 12l5 5L20 6',wallet:'M3 5h18v14H3zM3 9h18m-14 6h4'};
const icon=n=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[n]||paths.file)+'"/></svg>';
const nav=[['WORKSPACE',[['dashboard','Dashboard','home'],['onboarding','Carrier onboarding','list'],['compliance','Compliance records','shield'],['documents','Documents','file'],['fleet','Drivers & office users','users'],['audit','New entrant audit','box']]],['MARKETPLACE',[['board','Driver board','pin'],['bid','Bid calculator','calc'],['supplies','Supplies','box']]],['SETTINGS',[['notices','DOT & FMCSA notices','bell'],['plans','Plans & pricing','wallet']]]];
const statuses=['New','Reviewed','Action Needed','Paid','Waiting for Pay','Factored','Archived'];
const categories=['DOT','MC','BOC-3','UCR','KYU','NY HUT','NM','OR','CA MCP','IFTA','IRP','Intrastate','Insurance','Registration','License','Medical Card','Permit','Other'];
const fixes={
 DOT:['Open your FMCSA carrier account and review your USDOT registration details.','Submit the required update or contact FMCSA to correct the record.','Upload the filing confirmation and send the record for review.'],
 MC:['Check your operating authority in FMCSA Licensing & Insurance.','Resolve the deficiency listed by FMCSA and confirm the updated authority status.','Upload your authority confirmation for review.'],
 'BOC-3':['Contact your process agent and ask them to confirm or file your designation.','Upload the filing confirmation after the agent completes it.'],
 UCR:['Check the registration year and fleet size on the official UCR portal.','Complete the applicable registration and save the receipt.','Upload the receipt and enter its coverage end date.'],
 Insurance:['Contact your insurance agent for current coverage and any required regulatory filing.','Ask for the updated certificate or filing confirmation.','Upload the document and enter its new expiration date.'],
 'Medical Card':['Schedule an exam with a certified medical examiner.','Have the driver verify that the new medical certification appears in the applicable licensing record.','Upload permitted proof and enter the new expiration date.'],
 License:['Contact the driver’s licensing agency and complete the required renewal or reinstatement.','Confirm the license is current and enter its new expiration date.','Upload permitted proof for review.']
};
for(const x of ['KYU','NY HUT','NM','OR','IFTA','IRP','Intrastate','Registration','Permit','Other']) fixes[x]=['Check the issuing agency’s account or renewal notice for '+x+'.','Complete the renewal or correction required by the issuing agency.','Upload the new credential or receipt and enter the expiration date shown on it.'];
const seed={records:[
{id:'r1',type:'Insurance',name:'Commercial auto insurance',date:dateIn(-2),status:'Reviewed'},
{id:'r2',type:'Medical Card',name:'Medical card · Thomas Reed',date:dateIn(12),status:'Reviewed',person:'d1'},
{id:'r3',type:'UCR',name:'Unified Carrier Registration',date:dateIn(24),status:'Paid'},
{id:'r4',type:'DOT',name:'USDOT registration',date:dateIn(180),status:'Reviewed'},
{id:'r5',type:'MC',name:'Operating authority',date:'',status:'Reviewed'},
{id:'r6',type:'BOC-3',name:'Process agent designation',date:'',status:'Reviewed'}],
people:[{id:'d1',name:'Thomas Reed',state:'NC',role:'Driver'},{id:'d2',name:'Maya Brooks',state:'MD',role:'Driver'},{id:'o1',name:'Fleet coordinator',state:'CT',role:'Office user'}],
docs:[], listings:[{id:'l1',name:'Thomas Reed',city:'Charlotte',state:'NC',equipment:'Dry van',region:'Southeast',contact:'',sample:true},{id:'l2',name:'Maya Brooks',city:'Baltimore',state:'MD',equipment:'Reefer',region:'Mid-Atlantic',contact:'',sample:true}],jobs:[],orders:[],notices:[],audit:[],requests:[],plan:'Basic',broker:'',onboard:null};
const key='oliverfee-360-workspace-v1';
let db=structuredClone(seed);try{const data=JSON.parse(localStorage.getItem(key));if(data)db={...db,...data}}catch{}
let serverSession=null,activeCarrier='',officeRole='',officePerson='',officeRevision=0,saveQueue=Promise.resolve(),saveFailed=false;
let uploadMetadata={};
let toastTimer;
function toast(msg){const el=$('#toast');el.textContent=msg;el.style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.style.display='none',3200)}
function save(){
 if(activeCarrier){
  if(saveFailed){toast('Saving is paused. Reload this office before making more changes.');return false}
  if(officeRole==='driver'){toast('Drivers can upload their own files. Carrier administration requires an owner or office user.');return false}
  const state=structuredClone(db),carrier=activeCarrier;
  saveQueue=saveQueue.then(async()=>{if(saveFailed)return;try{const result=await officeAPI('/api/carriers/'+carrier+'/workspace',{method:'PUT',body:JSON.stringify({state,revision:officeRevision})});officeRevision=result.revision;showSaveStatus('Saved securely')}catch(error){saveFailed=true;showSaveStatus('Not saved — reload required');toast(error.message)}});
  showSaveStatus('Saving…');return true;
 }
 try{localStorage.setItem(key,JSON.stringify(db));return true}catch{toast('This browser could not save the change.');return false}
}
function showSaveStatus(text){const el=$('#save-status');if(el)el.textContent=text}
async function officeAPI(path,options={}){
 const response=await fetch(path,{credentials:'same-origin',...options,headers:{...(options.body&&typeof options.body==='string'?{'Content-Type':'application/json'}:{}),...options.headers}});
 if(!response.ok){let message='Request failed.';try{message=(await response.json()).error||message}catch{}throw new Error(message)}
 return response.json();
}
async function loadOffice(id){
 await saveQueue;if(saveFailed)throw new Error('Reload before switching carriers; unsaved changes need review.');
 const result=await officeAPI('/api/carriers/'+encodeURIComponent(id)+'/workspace');
 db={...structuredClone(seed),...result.state};activeCarrier=id;officeRole=result.role;officePerson=result.personId;officeRevision=result.revision;activeReview=null;
 if(page()!=='bid')location.hash='member';
 render();
}
async function startOffice(){
 try{
  serverSession=await officeAPI('/api/session');
  if(serverSession.carriers.length){const params=new URLSearchParams(location.search);const target=params.get('carrier')||serverSession.carriers[0].id;await loadOffice(target);if(params.get('quote'))await loadCustomerQuote(params.get('quote'))}
  else{db={...structuredClone(seed),records:[],people:[],docs:[]};if(page()!=='bid')location.hash='accounts';render()}
 }catch(error){
  $('#main').innerHTML=head('MEMBER OFFICE','Sign-in or connection needed',esc(error.message))+'<section class="panel"><a class="btn gold" href="/signin-with-chatgpt?return_to=/" target="_top">Sign in with ChatGPT</a><p>Secure accounts and files require the hosted Site. No browser demo records have been sent to the server.</p>'+btn('Retry connection','retry-office')+'</section>';
  $('#landing').hidden=true;document.body.classList.remove('show-landing');
 }
}
const badge=(s,kind='')=>'<span class="badge '+(kind||({'Action Needed':'bad',Paid:'good',Reviewed:'good','Waiting for Pay':'warn',New:'warn'}[s]||''))+'">'+esc(s)+'</span>';
const options=(list,v)=>list.map(x=>'<option'+(x===v?' selected':'')+'>'+esc(x)+'</option>').join('');
const btn=(label,action,style='',i='')=>'<button class="btn '+style+'" type="button" data-action="'+esc(action)+'">'+(i?icon(i):'')+esc(label)+'</button>';
const link=(label,page,style='',i='')=>'<a class="btn '+style+'" href="#'+page+'">'+(i?icon(i):'')+esc(label)+'</a>';
const head=(tag,title,desc,action='')=>'<div class="pagehead"><div><div class="eyebrow">'+tag+'</div><h1>'+title+'</h1><p class="muted">'+desc+'</p></div>'+action+'</div>';
const tile=(i,c='')=>'<span class="tileicon '+c+'">'+icon(i)+'</span>';
const empty=s=>'<p class="empty">'+esc(s)+'</p>';
const field=(label,name,type='text',value='',extra='')=>'<label>'+label+'<input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+extra+'></label>';
const select=(label,name,list,v)=>'<label>'+label+'<select name="'+name+'">'+options(list,v)+'</select></label>';
const table=(cols,rows)=>'<div class="tablewrap"><table><thead><tr>'+cols.map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
const needs=r=>r.status!=='Archived'&&(r.status==='Action Needed'||days(r.date)<0);
const soon=r=>r.status!=='Archived'&&!needs(r)&&days(r.date)!==null&&days(r.date)<=30;
const countdown=r=>{const n=days(r.date);return n===null?'No expiration set':n<0?'Expired '+(-n)+' day'+(n===-1?'':'s')+' ago':n===0?'Due today':n+' days left'};
const taskStatus=r=>needs(r)?badge('Action Needed'):soon(r)?badge(countdown(r),'warn'):badge(r.status);
const taskRow=r=>'<div class="row"><div class="inline">'+tile(needs(r)?'alert':'clock',needs(r)?'pink':'')+'<div><strong>'+esc(r.name)+'</strong><small>'+esc(r.type)+' · '+esc(countdown(r))+'</small></div></div><div class="actions">'+taskStatus(r)+btn(needs(r)?'Fix issue':'View','record:'+r.id)+'</div></div>';
const official='https://www.fmcsa.dot.gov/';
const policy='All OliverFee 360 service fees and government or third-party fees must be paid in full before processing.';
function chrome(page){
 $('#sidebar').innerHTML='<div class="brand"><span class="logo">'+icon('truck')+'</span><div><strong>OliverFee <b>360</b><img class="brand-lock" src="brand-lock.svg" alt=""></strong><small>Your Office in Your Pocket</small></div></div>'+nav.map(([group,links])=>'<div class="navlabel">'+group+'</div>'+links.map(([id,title,i])=>'<a href="#'+id+'" class="navlink '+(page===id?'active':'')+'" '+(page===id?'aria-current="page"':'')+'>'+icon(i)+title+'</a>').join('')).join('')+'<div class="workspace"><span class="avatar">OF</span><div><strong>Carrier workspace</strong><small>Sample data · '+esc(db.plan)+' plan</small></div></div>';
 const name=nav.flatMap(x=>x[1]).find(x=>x[0]===page)?.[1]||'Dashboard';
 const alerts=db.records.filter(r=>needs(r)||soon(r)).length;
 $('#top').innerHTML='<div class="inline"><button id="menubtn" class="iconbtn" data-action="menu" aria-label="Toggle menu">'+icon('menu')+'</button><small class="muted">Workspace /</small><strong>'+name+'</strong></div><div class="headright"><small class="muted">Demo workspace</small><button class="iconbtn" data-action="alerts" aria-label="'+alerts+' compliance alerts">'+icon('bell')+' '+alerts+'</button><span class="avatar" aria-hidden="true">OF</span></div>';
}
function dashboard(){
 const bad=db.records.filter(needs), upcoming=db.records.filter(soon).sort((a,b)=>a.date.localeCompare(b.date)), active=db.records.filter(r=>r.status!=='Archived');
 const stats=[['Compliance records',active.length,'shield',''],['Action needed',bad.length,'alert','pink'],['Due within 30 days',upcoming.length,'clock','silver'],['Active drivers',db.people.filter(p=>p.role==='Driver').length,'users','green']];
 const profile=db.profile;
 const logo=profile?.logo&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(profile.logo)
  ?'<img class="company-logo" src="'+esc(profile.logo)+'" alt="">' :'';
 return head('FLEET OPERATIONS',profile?.name?logo+esc(profile.name):'Compliance dashboard','Track filings, renewals, and driver records from one place.',btn('Upload document','upload','gold','upload'))+
 '<section class="hero"><div><div class="eyebrow">OLIVERFEE 360 WORKSPACE</div><h2>Your Office in Your Pocket</h2><p>Set up your carrier profile and get an itemized estimate.</p>'+link('Start carrier onboarding','onboarding','gold','arrow')+btn(profile?.name?'Edit company profile':'Create company profile','company-profile','profile-btn')+'</div></section>'+
 (bad.length?'<section class="alert">'+icon('alert')+'<div><strong>Out of compliance · '+bad.length+' '+(bad.length===1?'issue needs':'issues need')+' attention</strong><p>'+bad.map(r=>esc(r.name)).join(' · ')+'</p></div>'+btn('See fix steps','alerts')+'</section>':'')+
 '<div class="grid stats">'+stats.map(([l,v,i,c])=>'<div class="card stat">'+tile(i,c)+'<div><small>'+l+'</small><strong>'+v+'</strong></div></div>').join('')+'</div>'+
 '<div class="grid columns"><section class="panel"><div class="sectiontop"><h2>Compliance tasks</h2><a class="textbtn" href="#compliance">All records →</a></div>'+([...bad,...upcoming].length?[...bad,...upcoming].slice(0,6).map(taskRow).join(''):empty('You have no open or upcoming compliance alerts.'))+'</section><div class="stack"><section class="panel"><div class="sectiontop"><h2>Quick actions</h2></div><div class="quick">'+btn('Add a driver','person','','users')+btn('Upload a file','upload','','upload')+link('Audit checklist','audit','','box')+link('Estimate a bid','bid','','calc')+'</div></section><section class="panel"><div class="sectiontop"><h2>DOT & FMCSA notices</h2></div>'+noticeRows(2)+'<a class="textbtn" href="#notices">Open notice center →</a></section></div></div>';
}
function compliance(){
 return head('COMPLIANCE','Compliance records','Review credentials by program and keep renewal dates current.',btn('Add record','record:new','gold','plus'))+
 '<div class="panel"><label>Filter by credential<select id="record-filter">'+options(['All credentials',...categories])+'</select></label><div id="record-list">'+recordList('All credentials')+'</div></div>';
}
function recordList(type){
 const list=db.records.filter(r=>type==='All credentials'||r.type===type);
 return (list.length?list.map(taskRow).join(''):empty('No records in this category.'))+'<div class="note">Tracked categories include '+categories.join(', ')+'.</div>';
}
function recordForm(id){
 const r=db.records.find(x=>x.id===id)||{id:'',type:'DOT',status:'New'};
 modal(r.id?'Review compliance record':'Add compliance record','<form data-form="record"><input type="hidden" name="id" value="'+esc(r.id)+'"><div class="formgrid">'+select('Credential type','type',categories,r.type)+field('Record name','name','text',r.name,'required')+field('Expiration or renewal date','date','date',r.date)+select('Status','status',statuses,r.status)+select('Driver qualification file','person',['Company record',...db.people.filter(x=>x.role==='Driver').map(x=>x.id)],r.person).replace(/<option([^>]*)>([^<]*)<\/option>/g,(m,a,v)=>'<option'+a+' value="'+esc(v)+'">'+esc(db.people.find(x=>x.id===v)?.name||v)+'</option>')+'<label class="full">Notes<textarea name="notes">'+esc(r.notes)+'</textarea></label></div>'+(r.id?'<div class="note"><strong>'+esc(countdown(r))+'</strong><ol class="steps">'+(fixes[r.type]||fixes.Other).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol></div>':'')+'<div class="actions"><button class="btn gold">Save record</button>'+(r.id?btn('Upload proof','upload:'+r.id):'')+'</div></form>');
}
function alertView(){
 const bad=db.records.filter(needs), up=db.records.filter(soon);
 modal('Compliance alerts',(bad.length?'<div class="note"><strong>Out of compliance</strong></div>':'')+bad.map(r=>'<section class="task"><h3>'+esc(r.name)+'</h3><ol class="steps">'+(fixes[r.type]||fixes.Other).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>'+btn('Open record','record:'+r.id)+'</section>').join('')+'<h3>Due within 30 days</h3>'+(up.length?up.map(taskRow).join(''):empty('No upcoming renewals.')));
}
const states='AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
const allStatesLabel='All 50 states';
function parseOperatingStates(value){
 const normalized=value.trim().toUpperCase().replace(/\s+/g,' ');
 if(normalized==='ALL STATES'||normalized==='ALL 50 STATES')return states.filter(state=>state!=='DC');
 return [...new Set(normalized.split(',').map(state=>state.trim()).filter(Boolean))];
}
const equipment=['Dry van','Reefer','Flatbed','Box truck','Hotshot','Tanker','Power only','Cargo van','SUV','Sedan','Passenger vehicle','Other'];
const usStateNames='Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|District of Columbia|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming'.split('|');
const weightBands=['Unsure or mixed fleet','10,000 lb or less','10,001 to 26,000 lb','Over 26,000 lb'];
function statePicker(saved){
 const selected=parseOperatingStates(saved||'');
 return '<details class="full state-picker"><summary>Which states will you operate in? <span data-state-count>'+selected.length+' selected</span></summary>'+
 '<fieldset><legend>Select operating states</legend><label><input type="checkbox" data-all-states'+(states.every(code=>code==='DC'||selected.includes(code))?' checked':'')+'> All 50 states</label>'+
 '<div class="state-options">'+states.map((code,index)=>'<label><input type="checkbox" name="operatingState" value="'+code+'"'+(selected.includes(code)?' checked':'')+'> '+usStateNames[index]+'</label>').join('')+'</div></fieldset></details>';
}
const cargoTypes='General Freight|Household Goods|Metal: Sheets, Coils, Rolls|Motor Vehicles|Drive Away/Towaway|Logs, Poles, Beams, Lumber|Building Materials|Mobile Homes|Machinery, Large Objects|Fresh Produce|Liquids/Gases|Intermodal Container|Passengers|Oil Field Equipment|Livestock|Grain, Feed, Hay|Coal/Coke|Meat|Garbage, Refuse, Trash|U.S. Mail|Chemicals|Commodities Dry Bulk|Refrigerated Food|Beverages|Paper Product|Utility|Farm Supplies|Construction|Water Well|Other'.split('|');
function cargoPicker(o){
 const selected=o.cargoTypes||[];
 return '<details class="full state-picker" open><summary>What do you transport? <small>Select all that apply</small></summary>'+
 '<fieldset><legend>MCS-150 cargo classifications</legend><div class="state-options">'+cargoTypes.map(type=>'<label><input type="checkbox" name="cargoType" value="'+esc(type)+'"'+(selected.includes(type)?' checked':'')+'> '+esc(type)+'</label>').join('')+'</div>'+
 setupField('Describe other cargo','otherCargo','text',o.otherCargo,'maxlength="200"')+'</fieldset></details>';
}
function authorityQuestion(saved){
 const choices=[
  ['Unsure','I’m not sure — review it for me'],
  ['Regulated freight','I haul freight that requires federal operating authority'],
  ['Only federally exempt freight','I haul only freight I know is federally exempt'],
  ['Passengers','I transport passengers']
 ];
 return '<div class="full"><label>Do you know if your freight is federally exempt?<small>We use this answer with your route and for-hire answers to check whether to include an MC number and BOC-3 in your estimate.</small><select name="cargo">'+
 choices.map(([value,label])=>'<option value="'+esc(value)+'"'+(value===saved?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label>'+helpButton('cargo','Federal freight exemption')+'</div>';
}
const permitChoices={
 'KYU':'Kentucky weight-distance tax',
 'NY HUT':'New York Highway Use Tax',
 NM:'New Mexico weight-distance tax',
 OR:'Oregon weight-mile tax',
 'CA MCP':'California Motor Carrier Permit',
 'CT Highway Use Fee':'Connecticut Highway Use Fee',
 Hazmat:'Hazmat registration, permits, endorsements and routing',
 Other:'Other state or route requirements'
};
const startupServices=['LLC formation','EIN assistance','Driver Qualification File','New Entrant Audit Support'];
function onboardingChoices(title,name,choices,selected){
 return '<fieldset class="full state-picker"><legend>'+title+' <small>Select all that apply</small></legend><div class="state-options">'+
 choices.map(choice=>'<label><input type="checkbox" name="'+name+'" value="'+esc(choice)+'"'+(selected.includes(choice)?' checked':'')+'> '+esc(choice)+'</label>').join('')+'</div>'+helpButton(name,title)+'</fieldset>';
}
const llcFees={
 CT:[120,'Connecticut domestic filing','https://business.ct.gov/knowledge-base/articles/domestic-limited-liability-companies-forms-and-fees'],
 GA:[110,'Georgia filing including service charge','https://sos.ga.gov/sites/default/files/forms/Reference%20-%20Filing%20Fees.pdf'],
 MD:[100,'Maryland standard filing before any expedited or payment charges','https://dat.maryland.gov/businesses/Documents/FEES.pdf']
};
const setupHelp={
 equipmentType:'Select every vehicle or equipment type you use. Weight and axle answers are used separately.',
 hazmat:'Use your shipping papers to check whether the materials are regulated as hazardous.',
 scope:'Interstate includes freight moving as part of a shipment that starts or ends in another state, even if your leg stays in one state. Intrastate means the whole movement stays in one state.',
 hire:'Choose Yes if you are paid to transport someone else’s freight or passengers. If you carry only your company’s goods, choose No.',
 base:'Choose the state where your carrier business is based.',
 units:'Enter the number of powered vehicles. A trailer is not a power unit.',
 operatingState:'Include states you travel through as well as pickup and delivery states.',
 ucrYear:'Choose the year you are registering for.',
 ucrVehicles:'Enter the vehicles that count for UCR. Leave this blank for a preliminary estimate based on your setup answers.',
 weightBand:'Use the highest applicable actual or rated vehicle or combination weight. If you are unsure or have a mixed fleet, select that option.',
 axles:'Count the axles on the powered vehicle, excluding the trailer.',
 placards:'Check the shipping papers or confirm with the shipper whether placards are required.',
 cargoType:'Select each MCS-150 cargo category that describes what you carry.',
 otherCargo:'Describe cargo that does not fit the listed categories.',
 permitCheck:'Select the permits or programs you want us to verify. A selection requests a review and does not add a charge.',
 startupService:'Choose any optional formation or compliance services you want priced.',
 llcState:'Choose where you plan to form the new LLC. Its filing fee depends on that state.',
 cargo:'Choose Unsure if you do not know whether federal operating authority applies.',
 consortium:'Choose I need one if you want help reviewing testing program enrollment.',
 plannedDriverCount:'Estimate how many drivers you expect to operate with over the next 12 months.',
 MC:'Interstate for-hire carriers hauling federally regulated freight generally need MC authority. Exempt freight and certain routes can be exceptions. Private carriers hauling their own goods generally do not need MC authority.',
 DOT:'USDOT identifies your carrier. Private and for-hire carriers may need it for qualifying interstate operations. Some states also require it for in-state operations.',
 UCR:'Private carriers hauling their own goods in interstate commerce may still need UCR. Review the count and registration year separately.',
 'BOC-3':'A process agent designation generally goes with an operating authority application.',
 IFTA:'Review fuel-tax licensing based on your interstate operation, vehicle weight and axles.'
};
function helpButton(key,title){
 return '<button type="button" class="setup-help" data-action="setup-help:'+esc(key)+'" aria-label="Help: '+esc(title)+'">?</button>';
}
function helpField(render,name,title){
 return '<div>'+render+helpButton(name,title.replace(/<[^>]*>/g,''))+'</div>';
}
const setupSelect=(title,name,...args)=>helpField(select(title,name,...args),name,title);
const setupField=(title,name,...args)=>helpField(field(title,name,...args),name,title);
const filingTermsVersion=1;
const filingTerms='Permit and government filing fees are non-refundable once paid to the issuing agency, except where the agency allows a refund or the law requires one. OliverFee 360 processing fees for permits and authorities are non-refundable once we submit the filing, except where the law requires a refund. Third-party fees follow the provider’s refund rules.';
const acceptedSetupTerms=()=>db.setupTerms?.version===filingTermsVersion;
function filingTermsDialog(signing=false){
 const kind=signing?'sign-estimate':'accept-setup-terms';
 modal(signing?'Review and sign estimate':'Before you start Carrier Setup',
  '<form data-form="'+kind+'"><p>'+esc(filingTerms)+'</p>'+
  '<p class="note">Use the question marks to learn what each permit or filing is for. Confirm which items apply before authorizing a filing.</p>'+
  (signing?'<p class="note">Your typed signature applies to the current estimate in this private demo. Use a sample name. This step does not charge you or submit a filing.</p>':'<p>Continuing opens the setup questions without a charge.</p>')+
  '<label><input type="checkbox" name="agreed" value="yes" required> '+(signing?'I reviewed the itemized estimate and agree to the filing and refund terms.':'I read and agree to the filing and refund terms.')+'</label>'+
  (signing?field('Type your full name as your signature','signature','text','','required maxlength="120"'):'')+
  '<div class="actions"><button class="btn gold">'+(signing?'Sign estimate':'Agree and continue')+'</button></div></form>');
}
function onboarding(){
 if(!acceptedSetupTerms())return head('GET STARTED','Carrier onboarding','Review the filing and refund terms to continue.')+
  btn('Review filing and refund terms','setup-terms','gold');
 const o=db.onboard||{};
 return head('GET STARTED','Carrier onboarding','Tell us how you operate to build a preliminary checklist and estimate.')+
 applicationPanel()+'<div class="note"><strong>Phone interview</strong> · Work through the questions, build the checklist, then ask which items they need help with, already have, or want left out.</div><div class="grid columns"><section class="panel"><h2>Tell us about your operation</h2><form data-form="onboard"><div class="formgrid">'+onboardingChoices('What vehicles and equipment do you use?','equipmentType',equipment,o.equipmentTypes||(o.equipment?[o.equipment]:[]))+setupSelect('Do you haul hazardous materials?','hazmat',['No','Yes','Unsure'],(o.hazmat||'Unsure'))+setupSelect('Where do you operate?','scope',['Across state lines (interstate)','Within one state (intrastate)','Both','Unsure'],(o.scope||'Unsure'))+setupSelect('Are you for hire? <small>Choose Yes if customers pay you to transport their freight or passengers.</small>','hire',['Yes, for hire','No, own goods only','Unsure'],o.hire||'Unsure')+setupSelect('Where is your company based?','base',states,o.base)+setupField('How many power units do you operate?','units','number',o.units||1,'min="1" step="1" required')+ '<div class="full">'+statePicker(o.states)+helpButton('operatingState','Operating states')+'</div>'+oregonQuestions(o)+newMexicoQuestions(o)+setupSelect('IFTA base jurisdiction (verify before applying)','iftaBase',['Unsure',...states],o.iftaBase||o.base)+setupSelect('UCR registration year','ucrYear',Object.keys(ucrRates),o.ucrYear||'2027')+setupField('Vehicles to count for UCR (optional)','ucrVehicles','number',o.ucrVehicles,'min="0" step="1" placeholder="Leave blank for Needs verification"')+setupSelect('Vehicle or vehicle + trailer: highest actual or rated weight','weightBand',weightBands,o.weightBand)+setupSelect('Axles on the power unit','axles',['Unsure','2 or fewer','3 or more'],o.axles)+setupSelect('Does any cargo require hazmat placards?','placards',['Unsure','No','Yes'],o.placards)+'<div class="full">'+cargoPicker(o)+helpButton('cargoType','Cargo classifications')+'</div>'+onboardingChoices('Optional startup and compliance services','startupService',startupServices,o.startupServices||[])+setupSelect('LLC formation state (if requesting a new LLC)','llcState',['Select a state',...states],o.llcState)+onboardingChoices('Which permits or registrations would you like us to check?','permitCheck',Object.keys(permitChoices),o.permitChecks||[])+authorityQuestion(o.cargo)+setupSelect('Do you have a drug and alcohol testing consortium?','consortium',['Select an answer','Yes, already enrolled','No','I need one'],o.consortium)+setupField('How many drivers do you plan to operate with in the next 12 months?','plannedDriverCount','number',o.plannedDriverCount,'min="0" step="1"')+'<p class="note full">A load can be interstate commerce even if your leg stays in one state. If your fleet has different vehicle sizes or uses trailers, choose the highest applicable weight or mark it unsure for review.</p>'+'<div id="setup-followups" class="full">'+setupFollowups(o)+'</div><div id="advanced-followups" class="full">'+advancedFollowups()+'</div></div><div class="actions"><button class="btn gold">Build checklist & estimate</button></div></form></section><section class="panel"><h2>How pricing works</h2><p class="note">'+policy+'</p><p>Each line separates the OliverFee 360 service fee from the government or vendor charge. Applicability and open fees are confirmed during review.</p></section></div><div id="estimate">'+(db.onboard?serviceChoices(db.onboard)+estimate(db.onboard):'')+'</div>';
}
const feeSources={
 'EIN assistance':'https://www.irs.gov/businesses/small-businesses-self-employed/get-an-employer-identification-number',
 DOT:'https://www.fmcsa.dot.gov/faq/who-needs-get-usdot-number',
 MC:'https://www.fmcsa.dot.gov/faq/what-cost-obtaining-operating-authority-mcffmx-number',
 UCR:'https://plan.ucr.gov/fee-brackets/',
 IFTA:'https://dor.georgia.gov/ifta-faq',
 KYU:'https://drive.ky.gov/motor-carriers/Pages/KYU.aspx',
 'NY HUT':'https://www.tax.ny.gov/pdf/memos/highway/m16_2m.pdf',
 OR:'https://www.oregon.gov/odot/mct/pages/weight-mile-temporary-tax-pass.aspx',
 'CT Highway Use Fee':'https://portal.ct.gov/drs/drs-forms/current-year-forms/highway-use-fee',
 Hazmat:'https://www.fmcsa.dot.gov/regulations/hazardous-materials/national-hazardous-materials-route-registry-state',
 'CA MCP':'https://www.dmv.ca.gov/portal/vehicle-industry-services/motor-carrier-services-mcs/motor-carrier-permits/motor-carrier-permits-mcp-faqs/'
};
const ucrRates={
 '2026':[46,138,276,963,4592,44836],
 '2027':[55,167,333,1163,5548,54165]
};
const serviceDecision=o=>type=>OfficeRules.decision({...db,onboard:o},type);
function estimateDetails(o){
 const interstate=['Across state lines (interstate)','Both'].includes(o.scope);
 const intrastate=o.scope==='Within one state (intrastate)';
 const forHire=o.hire==='Yes, for hire';
 const freightAuthority=interstate&&forHire&&o.cargo==='Regulated freight';
 const authorityExcluded=o.hire==='No, own goods only'||o.cargo==='Only federally exempt freight'||intrastate;
 const count=o.ucrVehicles!==''&&o.ucrVehicles!=null?Number(o.ucrVehicles):null;
 const bracket=Number.isInteger(count)&&count>=0?[2,5,20,100,1000,Infinity].findIndex(n=>count<=n):-1;
 const ucrFee=bracket>=0?ucrRates[o.ucrYear]?.[bracket]:null;
 const items=[
 ['LLC formation','Confirm formation state, entity type, and whether an LLC is already registered.',null,'Fee pending; confirm directly with the formation state.'],
 ['EIN assistance','Request an EIN only if needed; the IRS application itself is free.',0,'IRS application has no fee.',undefined,feeSources['EIN assistance']],
 ['DOT',interstate?'USDOT: verify weight, passenger capacity, and safety registration requirements.':'Needs verification: some states require intrastate USDOT registration.',0,'USDOT registration itself is free; authority fees are separate.',25,'https://li-public.fmcsa.dot.gov/mcmisfile/before_you_start.htm'],
 ['MC',freightAuthority?'Interstate for-hire regulated freight: review operating authority.':authorityExcluded?'Your answers suggest a possible authority exemption. Needs verification before filing.':'Needs verification: confirm freight exemption, passenger operations, and route.',300,'Per authority requested. No refund for mistaken applications.',undefined,'https://www.fmcsa.dot.gov/registration/get-mc-number-authority-operate'],
 ['BOC-3','Process agent filing is coordinated with applicable operating authority. Needs verification.',null,'Vendor quote pending.'],
 ['UCR',intrastate?'Intrastate-only operations: verify whether UCR applies before requesting help.':'Interstate private and for-hire carriers may need UCR. Confirm eligible vehicle count.',ucrFee,'Registration year '+(o.ucrYear||'not selected')+'; counted vehicles '+(count===null?'needs verification':count)+'.',25,feeSources.UCR],
 ['IFTA','Needs verification: interstate qualified vehicles generally exceed 26,000 lb, have 3+ axles, or are qualifying combinations.',null,'Base-state fees pending.'],
 ['Intrastate','Needs verification: check home-state carrier authority requirements.',null,'State fees pending.'],
 ['Driver Qualification File','One-time preparation at $99.99 per driver. Upload an existing file instead if you have one.',0,'Preparation only.',9999*Math.max(1,Number(o.dqfDrivers)||1)/100],
 ['New Entrant Audit Support','Includes audit support and the OliverFee 360 Gold Binder Standard.',null,'Any outside costs require confirmation.',499.99],
 ['Drug & alcohol consortium','Needs verification: CDL testing applicability, existing enrollment, provider and projected driver count.',null,'Provider enrollment and testing quote pending.']
 ];
 const routes=parseOperatingStates(o.states||'');
 const statePrograms={KY:'KYU',NY:'NY HUT',NM:'NM',OR:'OR',CA:'CA MCP',CT:'CT Highway Use Fee'};
 const requested=new Set([...(o.permitChecks||[]),...Object.keys(o.serviceChoices||{}),...(o.requestedServices||[])]);
 for(const [state,type] of Object.entries(statePrograms))if(routes.includes(state)||requested.has(type))items.push([type,({KYU:'Kentucky: vehicles with combined licensed weight of 60,000 lb or more may need KYU. Verify weight and regular versus temporary operation.','NY HUT':'New York: verify gross/unloaded weight, exemptions and routes before HUT registration.'}[type]||'Needs verification: check '+state+' vehicle, route and permit requirements.'),null,'Fee pending; confirm program, quantities and filing scope.',undefined,feeSources[type]]);
 if(o.hazmat!=='No'||o.placards==='Yes'||requested.has('Hazmat'))items.push(['Hazmat','Needs verification: identify material, quantity, placards, PHMSA registration, safety permits and route restrictions.',null,'Fee pending; do not assume every hazmat carrier owes the same fee.',undefined,'https://www.phmsa.dot.gov/registration/registration-overview']);
 for(const type of ['Other'])if(requested.has(type))items.push([type,'Needs verification: describe the additional route or state requirement.',null,'Fee pending.']);
 if(o.base==='GA')items.push(['GA IFTA decals','One ordering item: $5 OliverFee ordering plus $3 state decal set per qualifying truck.',null,'Confirm the qualifying truck count.',undefined,feeSources.IFTA]);
 if(o.hazmat&&o.hazmat!=='No')for(const type of ['PHMSA','HMSP','Hazmat routes'])items.push([type,'See the separate hazmat applicability review.',null,'Fee pending; see who pays in the draft estimate.']);
 const unique=[...new Map(items.map(item=>[item[0],item])).values()];
 return {items:unique.filter(([type])=>type!=='UCR'||!o.skipUcr),eligibility:['Preliminary checklist only; actual applicability must be verified before processing.'],review:[],ucrApplies:!intrastate,ucrExcluded:intrastate};
}
function requestedItems(o){return estimateDetails(o).items.filter(([type])=>serviceDecision(o)(type)==='help')}
function serviceChoices(o){
 return '<section class="panel"><h2>Checklist and requested services</h2><p>Update filing choices in the Carrier Application above. Only requested assistance enters the payable quote.</p></section>';
}
function setupFollowups(o){
 const routes=parseOperatingStates(o.states||'');
 const choices=o.followups||{};
 const question=(name,title)=>select(title,'followup_'+name,['Needs verification','Yes','No','Unsure'],choices['followup_'+name]);
 return '<h3>Follow-up questions for this operation</h3><div class="formgrid">'+
 (routes.includes('KY')?question('KY','Kentucky: is the combined licensed weight 60,000 lb or more?'):'')+
 (routes.includes('NY')?question('NY','New York: over 18,000 lb gross weight, or using the unloaded-weight reporting method?'):'')+
 (routes.includes('NM')?question('NM','New Mexico: do vehicles exceed 26,000 lb declared gross weight?'):'')+
 (routes.includes('OR')?question('OR','Oregon: do vehicles exceed 26,000 lb declared combined weight?'):'')+
 (routes.includes('CA')?question('CA','California: are you transporting property for compensation or operating a regulated commercial vehicle?'):'')+
 (routes.includes('CT')?question('CT','Connecticut: do any qualifying vehicles have a gross weight of at least 26,000 lb?'):'')+
 ((o.hazmat&&o.hazmat!=='No')||o.placards==='Yes'?field('Hazmat: material, hazard class, quantity and package type','followup_hazmat','text',choices.followup_hazmat,'maxlength="500"')+question('hazmatPermit','Has PHMSA registration, FMCSA safety-permit and route applicability been confirmed?'):'')+
 question('cdl','Do any drivers operate vehicles requiring a CDL?')+question('ownerOperator','Will the owner be the only driver subject to DOT testing?')+'</div><p class="note">Needs verification: follow-ups guide the review; an answer does not authorize a filing or automatically add a charge.</p>';
}
const verifiedSources=[
 ['USDOT requirements','Weight, passenger and hazmat criteria; some intrastate requirements vary.','https://www.fmcsa.dot.gov/registration/do-i-need-usdot-number'],
 ['Operating authority','Review for-hire, exempt freight and route exceptions; $300 per permanent authority.','https://www.fmcsa.dot.gov/registration/get-mc-number-authority-operate'],
 ['UCR fees','2027 brackets: $55, $167, $333, $1,163, $5,548, $54,165. Verify count and year.','https://plan.ucr.gov/fee-brackets/'],
 ['KYU','Combined licensed weight over 59,999 lb; regular and temporary permits differ.','https://drive.ky.gov/Motor-Carriers/Pages/KYU.aspx'],
 ['NY HUT','Review weight method, vehicle exemptions and route. Fee pending.','https://www.tax.ny.gov/bus/hut/huidx.htm'],
 ['Hazmat','PHMSA fee depends on business category and registration term. Confirm applicability and all other permits separately.','https://www.phmsa.dot.gov/registration/registration-overview'],
 ['Drug and alcohol','Confirm CDL testing applicability; sole subject owner-operators need a consortium.','https://www.fmcsa.dot.gov/regulations/drug-alcohol-testing/management-drug-and-alcohol-testing-does-employer-have-join']
];
function sourcesPanel(){return '<details class="panel"><summary>Official filing guidance · reviewed November 7, 2026</summary><p>Fees and rules can change. Confirm applicability before processing; unconfirmed charges remain Fee pending.</p><ul>'+verifiedSources.map(([title,note,url])=>'<li><a href="'+url+'" target="_blank" rel="noopener">'+title+'</a> — '+esc(note)+'</li>').join('')+'</ul></details>'}
function memberOffice(){
 const o=db.onboard||{};const types=new Set([
  ...Object.keys(db.application?.filings||{}).filter(type=>['have','process'].includes(db.application.filings[type].status)),...Object.entries(o.serviceChoices||{}).filter(([,value])=>value==='have').map(([type])=>type),
  ...db.records.filter(r=>r.status!=='Archived').map(r=>r.type),
  ...db.docs.map(d=>d.purpose).filter(Boolean),
  ...db.requests.filter(r=>r.status==='Completed').flatMap(r=>r.services||[])
 ]);
 const logo=db.profile?.logo&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(db.profile.logo)?'<img class="company-logo" src="'+esc(db.profile.logo)+'" alt="Company logo">':'';
 return head('MEMBER OFFICE',logo+esc(db.profile?.name||'Your carrier office'),'Your Office in Your Pocket',btn('Upload a file or photo','upload','gold','upload'))+
 '<p class="note">'+(activeCarrier?'Records and documents are stored securely for this carrier. Your role: '+esc(officeRole)+'.':'Private browser demo · sample files only.')+'</p>'+
 (officeRole!=='driver'?'<div class="actions">'+link('Carrier Setup','onboarding','gold')+btn('Edit company name & logo','company-profile')+link('Account access','accounts')+'</div>':'')+
 '<h2 style="margin:20px 0 12px">Your documents</h2><div class="grid cards">'+(types.size?[...types].map(type=>{
  const records=db.records.filter(r=>r.type===type);const files=db.docs.filter(d=>d.purpose===type||records.some(r=>r.id===d.record));
  return '<section class="card"><h3>'+esc(bundleLabels[type]||type)+'</h3>'+badge(files.length?'Document on file':'Proof needed',files.length?'good':'warn')+'<div class="actions pricing-actions">'+btn(files.length?'Upload another file or photo':'Upload '+(type==='DOT'?'USDOT':type)+' proof','upload-service:'+type,'gold')+files.map(file=>btn('Open '+file.name,'download:'+file.id)).join('')+'</div></section>';
 }).join(''):empty('Items you already have and completed services will each get a document button here. Complete Carrier Setup or upload a file to begin.'))+'</div>'+
 '<section class="panel review-summary"><h2>Secure quote versions</h2>'+(db.quoteOrders?.length?table(['Quote','Status','Action'],db.quoteOrders.map(q=>[esc(q.id.slice(0,8)),esc(q.status),btn('Open review','open-quote:'+q.id)])):empty('No secure review links saved yet.'))+'</section><section class="panel review-summary"><h2>Service requests</h2>'+(db.requests.length?table(['Request','Payment','Work status'],db.requests.map(r=>[esc((r.services||[]).join(', ')||r.company||'Service request'),badge(r.paymentStatus==='paid'?'Paid':'Unpaid',r.paymentStatus==='paid'?'good':'warn'),esc(r.status||'Awaiting payment')])):empty('No requests yet.'))+'<p class="note">Unpaid → Paid → In progress → Completed. Processing requires full payment of service and outside fees. Live checkout coming soon; this app cannot mark a request paid.</p></section>'+link('Compliance dashboard','dashboard');
}
function accountsPage(){
 if(!serverSession)return head('ACCOUNTS','Member accounts','Open the hosted private Site to manage secure accounts.');
 return head('ACCOUNTS','Carrier accounts & access','Sign-in uses ChatGPT. Membership is checked separately on every carrier and file request.')+
 '<section class="panel"><h2>Open a carrier office</h2><div class="actions">'+serverSession.carriers.map(c=>btn(c.name+' · '+c.role,'open-office:'+c.id)).join('')+'</div></section>'+
 '<section class="panel"><h2>Create a carrier office</h2><form data-form="new-office">'+field('Company name','name','text','','required maxlength="120"')+'<button class="btn gold">Create private office</button></form><p>No sample records are copied into a new office.</p></section>'+
 (activeCarrier&&officeRole==='owner'?'<section class="panel"><h2>Invite an owner, office user or driver</h2><form data-form="invite-member"><div class="formgrid">'+field('Their ChatGPT account email','email','email','','required')+select('Account role','role',['owner','office','driver'])+'<label>Driver record (required for driver access)<select name="personId"><option value="">Choose a driver</option>'+db.people.filter(p=>p.role==='Driver').map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')+'</select></label></div><button class="btn gold">Save account invitation</button></form><p class="note">This does not send email or change Site sharing. The owner must separately approve the person in the private Site access list before they can sign in.</p>'+btn('View account memberships','view-members')+'</section>':'')+
 legacyImportButton()+'<section class="panel"><h2>Access rules</h2><p>Owners manage carrier records and account invitations. Office users manage carrier records and files. Drivers can see their assigned records and upload their own files; they cannot open company quotes, account settings, or other drivers’ files.</p></section>';
}
function estimate(o){
 const q=OfficeRules.buildQuote(db,activeReview||{kind:'quote'});
 return '<section class="panel" style="margin-top:14px"><h2>Draft itemized estimate</h2>'+operationCards(o,estimateDetails(o))+quoteSummary(q)+pricingEditor()+'<p>'+esc(filingTerms)+'</p><div class="actions">'+btn(o.skipUcr?'Add UCR back':'Skip UCR','toggle-ucr')+btn('Add Checklist to Records','checklist')+btn('Review final itemized quote','quote-review','gold')+btn('Copy Review Link','copy-review')+'</div></section>';
}
const safeURL=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
function noticeRows(n){
 return db.notices.length?db.notices.slice(0,n).map(x=>'<div class="row"><div><strong>'+esc(x.title)+'</strong><small>'+esc(x.agency)+' · '+dateText(x.date)+'</small><p class="truncate">'+esc(x.summary)+'</p></div><div class="actions">'+badge(x.status)+(safeURL(x.url)?'<a class="textbtn" target="_blank" rel="noopener" href="'+esc(safeURL(x.url))+'">Source ↗</a>':'')+'</div></div>').join(''):empty('No notices posted. Add a notice with an official source and a short summary.');
}
function notices(){
 return head('REGULATORY UPDATES','DOT & FMCSA notices','Post official updates and keep your team’s review status current.',btn('Add notice','notice','gold','plus'))+'<div class="panel">'+noticeRows(db.notices.length)+db.notices.map(x=>btn('Edit '+x.title,'notice:'+x.id)).join('')+'<p class="note">Check current agency announcements at <a href="'+official+'" target="_blank" rel="noopener">FMCSA ↗</a>.</p></div>';
}
function documents(){
 return head('RECORDS','Documents','Organize proof, attach it to a compliance record, and track its expiration.',btn('Upload document','upload','gold','upload'))+'<section class="panel"><p class="note">'+(activeCarrier?'Private carrier files · access checked for every download.':'Demo files stay in this browser. Use sample files only.')+'</p>'+(db.docs.length?table(['Document','Linked record','Expiration','Actions'],db.docs.map(d=>[esc(d.name),esc(db.records.find(r=>r.id===d.record)?.name||'Standalone'),esc(countdown(d)),btn('Download','download:'+d.id)+' '+btn('Remove','remove-doc:'+d.id)])):empty('No documents uploaded yet.'))+'</section>';
}
function filesDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('oliverfee-files',1);req.onupgradeneeded=()=>req.result.createObjectStore('files');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function fileOperation(mode,id,file){
 if(activeCarrier){
  const query=new URLSearchParams(uploadMetadata);
  const endpoint='/api/carriers/'+activeCarrier+'/files/'+id+(mode==='put'?'?'+query:'');
  if(mode==='get'){const response=await fetch(endpoint,{credentials:'same-origin'});if(!response.ok)throw new Error('File access denied or file unavailable.');return response.blob()}
  return officeAPI(endpoint,{method:mode==='put'?'PUT':'DELETE',...(mode==='put'?{body:file,headers:{'Content-Type':file.type||({pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',txt:'text/plain',csv:'text/csv',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}[file.name.split('.').pop().toLowerCase()]||'application/octet-stream')}}:{})});
 }
 const files=await filesDB();
 return new Promise((resolve,reject)=>{const tx=files.transaction('files',mode==='get'?'readonly':'readwrite'), store=tx.objectStore('files'), req=mode==='get'?store.get(id):mode==='put'?store.put(file,id):store.delete(id);tx.oncomplete=()=>{files.close();resolve(req.result)};tx.onabort=()=>{files.close();reject(tx.error)}});
}
function uploadForm(id){
 modal('Upload document or take a photo','<form data-form="upload"><p class="note">'+(activeCarrier?'Saved in this carrier’s private Member Office. Maximum 20 MB.':'Use sample files only in this browser demo.')+'</p><div class="formgrid">'+field('Choose a file','file','file','','accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.docx"')+field('Or take a photo','camera','file','','accept="image/jpeg,image/png,image/webp" capture="environment"')+field('Expiration date','date','date')+'<label>Document category<select name="purpose">'+options(['Other',...new Set([...categories,...startupServices,...db.docs.map(d=>d.purpose).filter(Boolean)])])+'</select></label><label>Driver (if applicable)<select name="person"><option value="">Company document</option>'+db.people.filter(p=>p.role==='Driver').map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')+'</select></label><label class="full">Link to record<select name="record"><option value="">Standalone document</option>'+db.records.map(r=>'<option value="'+esc(r.id)+'" '+(r.id===id?'selected':'')+'>'+esc(r.name)+'</option>').join('')+'</select></label></div><div class="actions"><button class="btn gold">Save document</button></div></form>');
}
function fleet(){
 return head('FLEET','Drivers & office users','Manage your team and open each driver’s qualification file.',btn('Add team member','person','gold','plus'))+
 '<div class="grid columns"><section class="panel"><h2>Drivers</h2>'+peopleRows('Driver')+'</section><section class="panel"><h2>Office users</h2>'+peopleRows('Office user')+'</section></div><div class="note">OliverFee 360 does not perform driver background checks. Motor carriers, brokers, and dispatchers are responsible for their own checks. Office user records in this workspace do not grant account access.</div>';
}
function peopleRows(role){
 const people=db.people.filter(x=>x.role===role);
 return people.length?people.map(p=>'<div class="row"><div><strong>'+esc(p.name)+' · '+esc(p.state)+'</strong><small>'+esc(p.email)+'</small></div><div class="actions">'+(role==='Driver'?btn('Open DQF','dqf:'+p.id)+btn('Hazmat test checklist','hazmat-test:'+p.id):'')+btn('Edit','person:'+p.id)+'</div></div>').join(''):empty('No team members in this category.');
}
const hazmatGuides={
 CT:'https://portal.ct.gov/dmv/commercial-and-industry-services/get-commercial-driver-license/cdl-license-classification',
 MD:'https://mva.maryland.gov/licenses-ids/commercial-drivers-license-cdl/classifications-endorsements-restrictions/hazmat-endorsement'
};
const licensingDirectory='https://www.fmcsa.dot.gov/registration/commercial-drivers-license/state-resources-and-programs';
function hazmatChecklist(driver){
 const steps=driver.hazmatTest||{};
 const state=driver.cdlState;
 const guide=hazmatGuides[state]||safeURL(steps.stateGuide);
 const required=[
  [states.includes(state),'Set the driver’s CDL state under Edit.'],
  [steps.enrolled,'Complete TSA hazmat pre-registration.'],
  [steps.application,'Confirm whether this is a first-time endorsement.'],
  [steps.application!=='First time'||steps.trained,'Complete approved first-time hazmat training.'],
  [state!=='MD'||steps.application!=='First time'||steps.approved,'Wait for TSA approval before scheduling in Maryland.'],
  [guide,'Enter the official state test instructions link.'],
  [steps.stateReady,'Confirm the driver meets their CDL state’s testing requirements.']
 ];
 return {steps,guide,next:required.find(([complete])=>!complete)?.[1]};
}
function hazmatDialog(driver){
 const {steps,guide,next}=hazmatChecklist(driver);
 const check=(name,label)=>'<label class="check full"><input type="checkbox" name="'+name+'"'+(steps[name]?' checked':'')+'> '+label+'</label>';
 const source=hazmatGuides[driver.cdlState]||licensingDirectory;
 modal(driver.name+' · Hazmat test checklist',
  '<p>CDL state: <strong>'+esc(driver.cdlState||'Not set')+'</strong>. Record what the driver has completed. This checklist is saved in this browser.</p>'+
  '<p>Review the <a href="'+source+'" target="_blank" rel="noopener">'+(hazmatGuides[driver.cdlState]?'official state requirements':'state licensing directory')+'</a>.</p>'+
  '<form data-form="hazmat-test"><input type="hidden" name="id" value="'+esc(driver.id)+'"><div class="formgrid">'+
  select('Endorsement application','application',['Select an answer','First time','Renewal or transfer'],steps.application)+
  (!hazmatGuides[driver.cdlState]?field('Official state test instructions link','stateGuide','url',steps.stateGuide,'placeholder="https://"'):'')+
  check('enrolled','TSA hazmat pre-registration completed')+
  check('trained','Approved hazmat training completed (first-time applicants)')+
  check('approved','TSA approval received')+
  check('stateReady','I confirmed the driver meets their state’s requirements to take the test')+
  '</div><div class="actions"><button type="submit" class="btn gold">Save checklist</button>'+
  '<button type="button" class="btn" data-action="send-hazmat-test:'+esc(driver.id)+'"'+(next?' disabled':'')+'>Send Hazmat Test Instructions</button></div></form>'+
  '<p class="note" data-hazmat-status role="status">'+(next?'<strong>Next step:</strong> '+esc(next):'Ready to share. <a href="'+esc(guide)+'" target="_blank" rel="noopener">Preview the official test instructions</a>. Sending opens an email draft for you to review.')+'</p>');
}
const auditItems=['Carrier registration and operating authority','Insurance and process agent records','Driver qualification files','Drug and alcohol program documentation, if applicable','Vehicle inspection and maintenance records','Hours-of-service records, if applicable','Accident register and supporting records','Fuel tax and apportioned registration records, if applicable'];
function audit(){
 return head('AUDIT SUPPORT','New entrant audit','Gather evidence and track what is ready for review.')+'<div class="grid columns"><section class="panel"><h2>Audit preparation checklist</h2><p class="muted">Mark each applicable item once you have its supporting records.</p><div style="margin-top:13px">'+auditItems.map((x,i)=>'<label class="check row" style="justify-content:start"><input type="checkbox" data-audit="'+i+'" '+(db.audit.includes(i)?'checked':'')+'>'+x+'</label>').join('')+'</div></section><section class="panel"><div class="eyebrow">ONE-TIME SERVICE</div><h2>New Entrant Audit Support</h2><div class="price">$499.99</div><p>Includes a digital audit support packet and the physical OliverFee 360 Gold Binder Standard.</p><div class="note"><strong>Gold Binder Standard</strong><p>Matte-black exterior, hot-pink interior, metallic gold lettering and trim, OliverFee 360 branding and the carrier’s company name on the front, gold spine logo, gold tagline inside, black and gold dividers, and white pages with black print.</p></div>'+btn(db.requests.length?'Requested · awaiting payment':'Request audit support','audit-request','gold')+'<p class="muted" style="margin-top:8px">'+policy+'</p></section></div>';
}
const carrierPlans={Basic:49.99,Pro:69.99,Premium:99.99,Ultimate:199};
const brokerPlans={'Find Drivers':5.99,'Find Drivers + 5 posts':10.99,'Find Drivers + unlimited posts':19.99};
function plans(){
 const cards=(data,kind)=>Object.entries(data).map(([name,cost])=>'<div class="card"><h3>'+name+'</h3><p><span class="price">'+money(cost)+'</span> / month</p><p class="muted">'+(name==='Ultimate'?'Online office and admin storage · Up to 20 drivers included':kind==='broker'?'Job posts expire after 30 days.':'Carrier subscription')+'</p><div class="actions pricing-actions">'+((kind==='broker'?db.broker:db.plan)===name?badge('Selected preference','good'):'')+(kind==='plan'?btn('Review '+name+' — $'+cost+'/month','plan:'+name,'gold'):btn('Select plan',kind+':'+name,'gold'))+'</div></div>').join('');
 return head('SETTINGS','Plans & pricing','Review carrier subscriptions, add-ons, and broker access.')+'<h2 style="margin-bottom:10px">Carrier plans</h2><div class="grid cards">'+cards(carrierPlans,'plan')+'</div><p class="note"><strong>$10 per added driver · $5 per office user</strong><br>Ultimate includes up to 20 drivers. '+policy+' Reviewing or saving a preference does not activate a subscription.</p><section class="panel startup-card"><div class="eyebrow">SEPARATE ONE-TIME SERVICE</div><h2>Carrier Startup Bundle</h2><p class="price">$199 one time</p><p>LLC filing assistance, EIN assistance, USDOT and MC application assistance, BOC-3 coordination, and UCR filing assistance, as applicable and requested.</p><p class="note">Government and third-party fees are separate. Unconfirmed amounts are Pending.</p>'+btn('Review Startup Bundle — $199 one time','startup-review','gold')+'</section><h2 style="margin:15px 0 10px">Broker plans</h2><div class="grid cards">'+cards(brokerPlans,'broker')+'</div>';
}
const bundleTypes=['LLC formation','EIN assistance','DOT','MC','BOC-3','UCR'];
const bundleLabels={'LLC formation':'LLC filing assistance','EIN assistance':'EIN assistance',DOT:'USDOT application assistance',MC:'MC authority application assistance','BOC-3':'BOC-3 coordination',UCR:'UCR filing assistance'};
let activeReview=null;
function openReview(selection){activeReview=selection;if(location.hash==='#review')render();else location.hash='review'}
function selectedQuote(){return OfficeRules.buildQuote(db,activeReview||{kind:'quote'})}
function quoteSummary(q){
 const amount=c=>c===null?'Pending':money(c/100);
 const source=i=>i.source?' <a href="'+esc(i.source)+'" target="_blank" rel="noopener">'+(i.type==='NM'||i.type==='NM mileage tax'?'Official New Mexico MVD Guidance':i.type==='IFTA'?(i.source==='https://www.iftach.org/helpdesk/'?'Find your IFTA base jurisdiction':'Apply for IFTA / Order Decals'):'Official source')+'</a>':'';
 return (q.plan?'<section class="note"><h3>Monthly membership</h3><p class="price">'+esc(q.plan)+' — $'+carrierPlans[q.plan]+'/month</p><p>Online office, admin tools and admin storage.'+(q.plan==='Ultimate'?' Up to 20 drivers included.':'')+'</p><p>$10 per added driver · $5 per office user. Recurring monthly subtotal: '+amount(q.monthlyCents)+'.</p></section>':'<p>No monthly membership is included in this service-only review.</p>')+
 '<h3>One-time OliverFee Services</h3>'+(q.services.length?table(['Service','Fee','Coverage'],q.services.map(i=>[esc(i.label)+source(i),amount(i.amountCents),esc(i.note)])):empty('No OliverFee service requested.'))+
 '<h3>Government / Third Party charges</h3>'+(q.outside.length?table(['Charge','Amount','Who pays / source'],q.outside.map(i=>[esc(i.label),i.type==='NM'&&i.amountCents===null?'Fee pending confirmation':amount(i.amountCents),esc(i.payer)+'<small>'+esc(i.period)+' · '+esc(i.note)+source(i)+'</small>'])):empty('No outside charges selected.'))+
 (q.planning?.length?'<section class="note"><h3>Projected mileage tax — planning only</h3>'+q.planning.map(i=>'<p>'+esc(i.label)+': <strong>'+(i.amountCents===null?'Fee pending confirmation':amount(i.amountCents))+'</strong> · '+esc(i.note)+source(i)+'</p>').join('')+'<p>Use actual New Mexico miles for quarterly reporting. These projections are separate from any permit charge and are excluded from amount due.</p></section>':'')+'<p class="note"><strong>OliverFee collects: '+amount(q.payableCents)+' one-time subtotal</strong><br>Direct-pay charges: '+amount(q.directPayCents)+' known subtotal — paid to agencies by the carrier or driver, excluded from OliverFee checkout.<br><strong>Amount due today when checkout is available: '+amount(q.dueTodayCents)+'</strong>'+(q.blockers.length?' · Subtotal only; full payable price is not confirmed.':'')+'</p>'+
 (q.blockers.length?'<div class="note"><strong>Finalization blocked</strong><ul>'+q.blockers.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>':'')+
 '<p class="note">Full payment of all service and outside fees collected by OliverFee is required before processing. Direct-pay receipts must also be verified. Live checkout coming soon. No charge is made and nothing is marked paid.</p><label class="check"><input type="checkbox" disabled> Proposed first 30 days free — disabled until approved. Current quote includes no free period.</label>';
}
function pricingReview(){
 if(!activeReview)return head('REVIEW','Choose a plan or bundle','Return to pricing to open its review.',link('Plans & pricing','plans','gold'));
 const q=selectedQuote(),o=db.onboard||{};
 const applicable=estimateDetails(o).items;
 const choices=applicable.filter(([type])=>bundleTypes.includes(type));
 return head('REVIEW',q.plan?q.plan+' subscription review':activeReview.kind==='startup'?'Carrier Startup Bundle review':'Final itemized quote','Review all recurring and one-time costs before signing.',link('Back to pricing','plans'))+
 (activeReview.kind==='startup'?'<section class="panel"><h2>Carrier Startup Bundle — $199 one time</h2><p>The bundle covers these services as applicable: '+Object.values(bundleLabels).join(', ')+'. Only services you ask us to handle appear in the quote.</p><p class="note">'+(db.onboard?'Select applicable services below.':'Complete Carrier Setup to determine which filings apply. No filings have been selected.')+'</p><div class="service-choices">'+choices.map(([type])=>'<label class="check"><input type="checkbox" data-request-service="'+esc(type)+'"'+(requestedItems(o).some(i=>i[0]===type)?' checked':'')+'> '+esc(bundleLabels[type])+'</label>').join('')+'</div>'+link('Open Carrier Setup','onboarding','gold')+(db.onboard?btn(o.skipUcr?'Add UCR back':'Skip UCR','toggle-ucr'):'')+'</section>':'')+
 '<section class="panel review-summary">'+quoteSummary(q)+'</section>'+
 '<section class="panel"><h2>Driver Qualification File</h2><p>Already have a file? Upload it to your Member Office. Documents are kept in this carrier’s private Member Office when connected.</p><div class="actions">'+btn('Upload existing DQF to Member Office','upload-dqf')+btn('Request DQF preparation — $99.99 per driver','prepare-dqf')+'</div><p>Preparation is a separate one-time service, not part of the monthly subscription or Startup Bundle.</p></section>'+
 '<section class="panel"><p>'+esc(filingTerms)+'</p><div class="actions">'+btn('Review acknowledgment & sign final quote','sign-pricing','gold')+btn('Copy Review Link','copy-review')+(q.plan?btn('Save '+q.plan+' preference','save-plan:'+q.plan):activeReview.kind==='startup'?btn('Save Startup Bundle preference','save-bundle'):'')+'</div></section>';
}
function signPricing(){
 const q=selectedQuote();
 modal('Final itemized quote — acknowledgment & signature','<form data-form="sign-pricing">'+quoteSummary(q)+'<p>'+esc(filingTerms)+'</p><label class="check"><input type="checkbox" name="agreed" value="yes" required> I reviewed this itemized quote and acknowledge the filing and refund terms.</label>'+field('Type your full name as your signature','signature','text','','required maxlength="120"')+'<p class="note">Your signature acknowledges this itemized quote. No payment or filing is submitted.</p><button class="btn gold">Save signed quote</button></form>');
}
const activeJobs=()=>db.jobs.filter(j=>Date.now()<j.expires);
function board(){
 return head('MARKETPLACE','Driver board','Search driver availability by location, equipment, or preferred region.',btn('Post availability','listing','gold','plus'))+'<div class="grid columns"><section class="panel"><h2>Find available drivers</h2><div class="formgrid" style="margin:12px 0"><label>City, state, driver, or region<input id="board-search" placeholder="Try Charlotte, NC, or Southeast"></label><label>Equipment<select id="board-equipment">'+options(['All equipment',...equipment])+'</select></label></div><div id="listing-results">'+listingRows()+'</div></section><section class="panel"><h2>Broker job posts</h2><p class="muted">Posts expire 30 days after creation. Brokers can remove them sooner.</p><div class="actions" style="margin-top:10px">'+btn('Create job post','job','gold')+link('Broker plans','plans')+'</div>'+ (activeJobs().length?activeJobs().map(j=>'<div class="row"><div><strong>'+esc(j.title)+'</strong><p>'+esc(j.detail)+'</p><small>Expires '+dateText(new Date(j.expires).toISOString().slice(0,10))+'</small></div>'+btn('Remove','remove-job:'+j.id)+'</div>').join(''):empty('No active job posts.'))+'</section></div><p class="note">OliverFee 360 does not perform driver background checks. Brokers, dispatchers, and motor carriers conduct their own checks.</p>';
}
function listingRows(query='',eq='All equipment'){
 const terms=query.toLowerCase().split(/[\s,]+/).filter(Boolean);
 const list=db.listings.filter(x=>(eq==='All equipment'||eq===x.equipment)&&terms.every(term=>[x.name,x.city,x.state,x.equipment,x.region,x.company].join(' ').toLowerCase().includes(term)));
 return list.length?list.map(x=>'<div class="row"><div class="inline">'+tile('pin')+'<div><strong>'+esc(x.name)+' · '+esc(x.state)+'</strong><small>'+esc(x.city)+' · '+esc(x.equipment)+' · '+esc(x.region)+'</small>'+(x.contact?'<p>'+esc(x.company)+' · '+esc(x.contact)+'</p>':'')+'</div></div><div class="actions">'+badge('Available','good')+(!x.sample?btn('Remove','remove-listing:'+x.id):'')+'</div></div>').join(''):empty('No drivers match your search.');
}
const dieselRateEndpoint='/api/national-diesel-rate';
const dieselRateSource='https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=EMD_EPD2D_PTE_NUS_DPG&f=W';
const dieselPrice=rate=>'$'+rate.price.toFixed(3)+' per gallon';
function showDieselRate(target,rate){
 target.textContent=rate?dieselPrice(rate)+' · EIA week of '+dateText(rate.date):'No national diesel rate has been posted yet.';
}
async function loadDieselRate(target){
 try{
  const {rate}=await officeAPI(dieselRateEndpoint);
  showDieselRate(target,rate);
 }catch{
  target.textContent='The posted rate is unavailable. Use the EIA link to check the source.';
 }
}
function bid(){
 const adminForm=serverSession?.user?.admin
  ?'<details><summary>Post national diesel rate</summary><form data-form="post-diesel-rate"><div class="formgrid">'+
   field('National diesel price ($/gallon)','price','number','','min="0.001" max="99.999" step="0.001" required')+
   field('EIA week-of date','date','date','','max="'+today()+'" required')+
   '</div><div class="actions"><button class="btn gold">Post rate</button></div></form></details>':'';
 const fuelPanel='<section class="panel"><h2>National diesel rate</h2><p id="bid-diesel-rate" aria-live="polite">Loading posted rate…</p>'+
  '<p><a class="btn" href="'+dieselRateSource+'" target="_blank" rel="noopener noreferrer">Check National Diesel Rate ↗</a></p>'+adminForm+'</section>';
 return head('MARKETPLACE','Broker bid calculator','Turn an offer, mileage, and trip costs into three suggested quotes.')+
  '<div class="grid columns"><section class="panel"><h2>Trip details</h2><form data-form="bid"><div class="formgrid">'+
  [['Current offer ($)','offer',0],['Trip miles','miles',''],['Desired rate ($/mile)','rate',''],['Lumper ($)','lumper',0],['Tolls ($)','tolls',0],['Other costs ($)','other',0]].map(([l,n,v])=>field(l,n,'number',v,'min="'+(n==='miles'?1:0)+'" step="0.01" required')).join('')+
  field('Truck MPG (optional)','mpg','number','','min="0.01" step="0.01"')+
  '</div><p class="muted">Enter truck MPG to include estimated diesel cost based on the posted national rate. Leave MPG blank if your mileage rate already includes fuel.</p><div class="note" id="bid-rate-warning" hidden></div><div class="actions"><button class="btn gold">Calculate suggested quotes</button></div></form></section>'+
  '<div class="stack">'+fuelPanel+'<section class="panel"><h2>Suggested quotes</h2><p class="muted">Suggested – screenshot your bid. Quotes are not saved.</p><div id="bid-result" aria-live="polite">'+empty('Enter your trip details to see your quotes.')+'</div></section></div></div>';
}
const supplies=[['Cargo straps','Securement'],['Tarps','Securement'],['Fire extinguishers','Safety'],['Spill kits','Safety'],['Roadside safety kits','Safety']];
function supplyPage(){
 return head('MARKETPLACE','Order your necessary supplies','Request a quote for equipment and safety supplies.')+'<div class="grid cards">'+supplies.map(([n,c],i)=>'<div class="card">'+tile('box')+'<div class="eyebrow" style="margin-top:8px">'+c+'</div><h3>'+n+'</h3><div style="margin-top:10px">'+btn('Request order','supply:'+i,'gold')+'</div></div>').join('')+'</div><section class="panel" style="margin-top:14px"><h2>Order requests</h2>'+(db.orders.length?table(['Supply','Quantity','Status'],db.orders.map(o=>[esc(o.item),esc(o.qty),badge(o.status)])):empty('No supply orders requested.'))+'<p class="note">Requests are saved here for review. Final pricing, shipping, and payment must be confirmed before fulfillment.</p></section>';
}
function modal(title,body){
 const d=$('#dialog');d.innerHTML='<div class="sectiontop"><h2 id="dialog-title">'+esc(title)+'</h2><button type="button" class="iconbtn" data-action="close" aria-label="Close dialog">✕</button></div>'+body;d.setAttribute('aria-labelledby','dialog-title');if(!d.open)d.showModal();
}
function formModal(title,kind,fields,id='',remove=''){
 modal(title,'<form data-form="'+kind+'"><input type="hidden" name="id" value="'+esc(id)+'"><div class="formgrid">'+fields+'</div><div class="actions"><button class="btn gold">Save</button>'+remove+'</div></form>');
}
const pages={dashboard,onboarding,compliance,documents,fleet,audit,board,bid,supplies:supplyPage,notices,plans,review:pricingReview,member:memberOffice,accounts:accountsPage,'customer-review':customerReviewPage};
function page(){return Object.hasOwn(pages,location.hash.slice(1))?location.hash.slice(1):'dashboard'}
function render(){
 const landing=location.hash.length<=1;
 $('#landing').hidden=!landing;
 document.body.classList.toggle('show-landing',landing);
 if(landing)return;
 const p=activeCarrier&&officeRole==='driver'&&!['member','documents','compliance','fleet','bid'].includes(page())?'member':page();
 chrome(p);
 $('#sidebar').insertAdjacentHTML?.('beforeend','<div class="account-nav">'+link('Member Office','member')+link('Carrier accounts','accounts')+'<small id="save-status">'+(activeCarrier?'Secure office · '+esc(officeRole):'Browser demo')+'</small></div>');
 if(activeCarrier){$('#top').querySelectorAll('small.muted').forEach(el=>{if(el.textContent==='Demo workspace')el.textContent='Private Member Office'});if(officeRole==='driver')$('#sidebar').querySelectorAll('.navlink').forEach(el=>{if(!['#compliance','#documents','#fleet','#bid'].includes(el.getAttribute('href')))el.hidden=true})}
 $('#main').innerHTML=pages[p]();
 if(p==='bid')loadDieselRate($('#bid-diesel-rate'));
 if(p==='onboarding')$('#main').insertAdjacentHTML('beforeend',sourcesPanel());
 if(activeCarrier){const workspace=$('#sidebar .workspace');if(workspace)workspace.innerHTML='<span class="avatar">OF</span><div><strong>'+esc(db.profile?.name||'Carrier office')+'</strong><small>'+esc(officeRole)+' · '+esc(db.plan)+' preference</small></div>';const footer=document.querySelector('.shell>footer');if(footer)footer.textContent='OliverFee 360 · Your Office in Your Pocket · Private Member Office'}
 if(p==='onboarding'&&!acceptedSetupTerms())filingTermsDialog();
}
window.addEventListener('hashchange',()=>{document.body.classList.remove('navopen');if($('#dialog').open)$('#dialog').close();render();scrollTo(0,0)});
function upsert(list,data){const existing=list.findIndex(r=>r.id===data.id);if(existing<0)list.push({...data,id:uid()});else list[existing]={...list[existing],...data}}
function done(msg){if($('#dialog').open)$('#dialog').close();if(save())toast(msg);render()}
document.addEventListener('click',async e=>{
 const el=e.target.closest('[data-action]');if(!el)return;
 const [action,id]=el.dataset.action.split(':');
 try{
 if(activeCarrier&&officeRole==='driver'&&!['menu','close','alerts','dqf','download','upload','upload-service','upload-dqf'].includes(action)){toast('This action requires a carrier owner or office user.');return}
 switch(action){
 case 'retry-office':await startOffice();break;
 case 'open-office':await loadOffice(id);break;
 case 'open-quote':await loadCustomerQuote(id);break;
 case 'view-members':{const members=await officeAPI('/api/carriers/'+activeCarrier+'/members');modal('Carrier account memberships',table(['Email','Role','Sign-in'],members.map(m=>[esc(m.email),esc(m.role),m.active?'Linked account':'Pending first sign-in'])));break;}
 case 'upload-service':uploadForm();{const field=$('#dialog select[name="purpose"]');if(![...field.options].some(o=>o.value===id))field.add(new Option(id,id));field.value=id}break;
 case 'menu':document.body.classList.toggle('navopen');break;
 case 'close':$('#dialog').close();break;
 case 'alerts':alertView();break;
 case 'record':recordForm(id);break;
 case 'upload':uploadForm(id);break;
 case 'person':{
 const p=db.people.find(x=>x.id===id)||{};
 formModal(p.id?'Edit team member':'Add team member','person',field('Name','name','text',p.name,'required')+select('Role','role',['Driver','Office user'],p.role)+select('State','state',states,p.state)+select('CDL issuing state (drivers only)','cdlState',['Select a state',...states],p.cdlState)+field('Email (optional)','email','email',p.email),p.id,p.id?btn('Remove','remove-person:'+p.id):'');break;}
 case 'hazmat-test':{
  const driver=db.people.find(p=>p.id===id&&p.role==='Driver');
  if(driver)hazmatDialog(driver);
  break;
 }
 case 'send-hazmat-test':{
  const driver=db.people.find(p=>p.id===id&&p.role==='Driver');
  if(!driver)break;
  if(el.closest('form')?.dataset.dirty){toast('Save checklist changes before sending.');break}
  const {next,guide}=hazmatChecklist(driver);
  if(next){toast(next);break}
  const subject=encodeURIComponent('CDL hazmat knowledge test instructions');
  const body=encodeURIComponent('Hi '+driver.name+',\n\nHere are the official CDL hazmat knowledge test instructions for '+driver.cdlState+':\n'+guide);
  location.href='mailto:'+encodeURIComponent(driver.email||'')+'?subject='+subject+'&body='+body;
  break;
 }
 case 'remove-person':{
 const p=db.people.find(x=>x.id===id);if(!p||!confirm('Remove this team member? Existing qualification records will remain in Compliance records.'))break;
 db.records.forEach(r=>{if(r.person===id)r.person=''});db.people=db.people.filter(x=>x.id!==id);done('Team member removed.');break;}
 case 'dqf':{
 const p=db.people.find(x=>x.id===id);if(!p)break;
 const rec=db.records.filter(r=>r.person===id);
 modal(p.name+' · Driver qualification file','<p class="note">Track license, medical certification and other qualification records.</p>'+(rec.length?rec.map(taskRow).join(''):empty('No records linked to this driver.'))+btn('Add qualification record','dqf-add:'+id,'gold'));break;}
 case 'dqf-add':recordForm('new');$('select[name="person"]').value=id;$('select[name="type"]').value='License';break;
 case 'notice':{
 const n=db.notices.find(x=>x.id===id)||{};
 formModal(n.id?'Edit notice':'Add notice','notice',field('Title','title','text',n.title,'required')+select('Agency','agency',['FMCSA','U.S. DOT','State DOT','Other'],n.agency)+field('Publication date','date','date',n.date||today(),'required')+select('Status','status',['New','Reviewed','Action Needed','Archived'],n.status)+field('Official source URL','url','url',n.url,'required')+'<label class="full">Plain-language summary<textarea name="summary" required>'+esc(n.summary)+'</textarea></label>',n.id);break;}
 case 'download':{
 const d=db.docs.find(x=>x.id===id),file=await fileOperation('get',id);
 if(!file||!d){toast('This file is unavailable in this browser.');break}
 const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=d.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);break;}
 case 'remove-doc':if(confirm('Remove this uploaded file?')){await fileOperation('delete',id);db.docs=db.docs.filter(x=>x.id!==id);db.records=db.records.filter(x=>x.sourceDoc!==id);done('Document removed.')}break;
 case 'plan':if(Object.hasOwn(carrierPlans,id))openReview({kind:'plan',plan:id});break;
 case 'startup-review':openReview({kind:'startup'});break;
 case 'quote-review':openReview({kind:'quote'});break;
 case 'sign-pricing':if(selectedQuote().blockers.length){toast('Resolve all payable Pending fees before finalizing.');break}signPricing();break;
 case 'save-plan':if(Object.hasOwn(carrierPlans,id)){db.plan=id;db.membershipRequested=true;save();toast('Membership preference saved. Live checkout coming soon.')}break;
 case 'save-bundle':db.startupBundle=true;save();render();toast('Bundle preference saved. No payment collected.');break;
 case 'upload-dqf':uploadForm();$('#dialog-title').textContent='Member Office · Upload existing DQF';$('#dialog select[name="purpose"]').value='Driver Qualification File';break;
 case 'prepare-dqf':formModal('DQF preparation · $99.99 per driver one time','prepare-dqf',field('Drivers needing preparation','drivers','number',db.onboard?.dqfDrivers||1,'min="1" max="10000" step="1" required')+'<p class="note full">Separate one-time preparation service. Existing files can be uploaded without requesting preparation. No payment collected.</p>');break;
 case 'broker':if(Object.hasOwn(brokerPlans,id)){db.broker=id;done('Broker plan preference saved.')}break;
 case 'audit-request':
 if(db.requests.length){toast('Audit support request is awaiting payment.');break}
 formModal('Request New Entrant Audit Support','audit',field('Company name for binder','company','text','','required')+'<p class="note full">$499.99 one time. '+policy+'</p>');break;
 case 'company-profile':
 formModal(db.profile?'Edit company profile':'Create company profile','company-profile',
  field('Company name','name','text',db.profile?.name,'required maxlength="120"')+
  '<label>Company logo (optional)<input type="file" name="logo" accept="image/png,image/jpeg,image/webp"><small>PNG, JPEG or WebP up to 512 KB.</small></label>'+
  (db.profile?.logo?'<label class="full"><input type="checkbox" name="removeLogo"> Remove current logo</label>':'')+
  '<p class="note full">'+(activeCarrier?'Company name and logo are saved to this carrier’s office.':'This demo saves your profile in this browser.')+'</p>');
 break;
 case 'listing':
 formModal('Post driver availability','listing',field('Driver name','name','text','','required')+field('Company','company')+field('Current city','city','text','','required')+select('Current state','state',states)+select('Equipment','equipment',equipment)+field('Preferred regions or states','region','text','','required')+field('Business contact','contact','text','','required'));break;
 case 'remove-listing':db.listings=db.listings.filter(x=>x.id!==id);done('Availability removed.');break;
 case 'job':
 if(!db.broker||db.broker==='Find Drivers'){modal('Broker posting plan','<p>Select the $10.99 or $19.99 broker tier to try job posting in this demo.</p><div class="actions">'+link('View broker plans','plans','gold')+'</div>');break}
 if(db.broker==='Find Drivers + 5 posts'&&activeJobs().length>=5){toast('This tier allows up to 5 active posts.');break}
 formModal('Create broker job post','job',field('Job title','title','text','','required')+'<label class="full">Route, equipment, and contact details<textarea name="detail" required></textarea></label>');break;
 case 'remove-job':db.jobs=db.jobs.filter(x=>x.id!==id);done('Job post removed.');break;
 case 'supply':
 if(!supplies[id])break;
 formModal('Request '+supplies[id][0].toLowerCase(),'order',field('Quantity','qty','number',1,'min="1" step="1" required')+'<p class="note full">This adds a request for a quote to your workspace.</p>',id);break;
 case 'toggle-ucr':{
 const o=db.onboard;
 if(!o)break;
 const previous=o.skipUcr;
 o.skipUcr=!previous;
 if(!save()){o.skipUcr=previous;break}
 db.signedQuote=null;
 if(page()==='review')render();else{$('#estimate').innerHTML=serviceChoices(o)+estimate(o);$('#estimate [data-action="toggle-ucr"]').focus()}
 break;}
 case 'setup-terms':filingTermsDialog();break;
 case 'sign-estimate':if(acceptedSetupTerms()&&db.onboard)filingTermsDialog(true);break;
 case 'setup-help':{const type=id==='service'?el.dataset.action.slice('setup-help:service:'.length):id;const item=id==='service'?estimateDetails(db.onboard||{}).items.find(i=>i[0]===type):null;const text=item?item[1]:setupHelp[type];if(text)modal('Carrier Setup help','<p>'+esc(text)+'</p>'+(item&&item[5]?'<p><a target="_blank" rel="noopener" href="'+esc(item[5])+'">Official guidance</a></p>':''));break;}
 case 'checklist':saveChecklist();break;
 }
 }catch{toast('This action could not be completed.')}
});
document.addEventListener('change',e=>{
 if(e.target.hasAttribute('data-service-choice')){
  const o=db.onboard;if(!o)return;const type=e.target.dataset.serviceChoice;
  o.serviceChoices??={};o.serviceChoices[type]=e.target.value;if(db.application?.filings?.[type])db.application.filings[type].status=e.target.value==='help'?'help':e.target.value==='have'?'have':'self';
  db.signedQuote=null;save();$('#estimate').innerHTML=serviceChoices(o)+estimate(o);return;
 }
 if(e.target.closest('[data-form="onboard"]')){
  const form=e.target.closest('form');const fields=new FormData(form);
  const o={...Object.fromEntries(fields),states:fields.getAll('operatingState').join(', '),followups:Object.fromEntries([...fields].filter(([k])=>k.startsWith('followup_')))};
  if(['hazmat','placards','operatingState'].includes(e.target.name)||e.target.hasAttribute('data-all-states')){
   const section=$('#setup-followups');if(section)section.innerHTML=setupFollowups(o);
  }
 }
 if(e.target.hasAttribute('data-request-service')){
  const o=db.onboard;if(!o)return;
  const type=e.target.dataset.requestService;
  const requested=new Set(requestedItems(o).map(item=>item[0]));
  if(e.target.checked)requested.add(type);else requested.delete(type);
  o.requestedServices=[...requested];
  if(!e.target.checked)o.startupServices=(o.startupServices||[]).filter(item=>item!==type);
  db.signedQuote=null;save();
  if(page()==='review')render();else $('#estimate').innerHTML=serviceChoices(o)+estimate(o);
  return;
 }
 const picker=e.target.closest('.state-picker');
 if(!picker||!picker.querySelector('[data-all-states]'))return;
 const all=picker.querySelector('[data-all-states]');
 const boxes=[...picker.querySelectorAll('[name=operatingState]')];
 const stateBoxes=boxes.filter(box=>box.value!=='DC');
 if(e.target===all)stateBoxes.forEach(box=>{box.checked=all.checked});
 all.checked=stateBoxes.every(box=>box.checked);
 picker.querySelector('[data-state-count]').textContent=boxes.filter(box=>box.checked).length+' selected';
 const opform=picker.closest('form');const orSection=opform?.querySelector('[data-oregon-questions]');if(orSection)orSection.hidden=!boxes.some(box=>box.value==='OR'&&box.checked);syncNewMexicoQuestions(opform);captureOperationDraft();save();refreshDraftSections();
});
document.addEventListener('input',e=>{
 if(e.target.form?.dataset.form==='bid'&&e.target.name!=='confirmBidRate'){
  const warning=$('#bid-rate-warning');
  warning.hidden=true;
  warning.innerHTML='';
  $('#bid-result').innerHTML=empty('Calculate again to update your quotes.');
 }

 const hazmatForm=e.target.form;
 if(hazmatForm?.dataset.form==='hazmat-test'){
  hazmatForm.dataset.dirty='true';
  hazmatForm.querySelector('[data-action^="send-hazmat-test:"]').disabled=true;
  $('#dialog [data-hazmat-status]').textContent='Save checklist changes to see the next step.';
  return;
 }

 const {id}=e.target;
 if(id==='board-search'||id==='board-equipment')$('#listing-results').innerHTML=listingRows($('#board-search').value,$('#board-equipment').value);
 if(id==='record-filter')$('#record-list').innerHTML=recordList(e.target.value);
 if(e.target.hasAttribute('data-quote')){
  const {quote,column}=e.target.dataset;
  db.onboard.quotes??={};
  db.onboard.quotes[quote]??={};
  db.onboard.quotes[quote][column]=e.target.validity.valid?e.target.value:'';
  db.signedQuote=null;
  const total=[...document.querySelectorAll('[data-quote]')].reduce((sum,input)=>sum+(input.validity.valid?(+input.value||0):0),0);
  const totalEl=$('#estimate-total');if(totalEl)totalEl.textContent='Fee estimate subtotal '+money(total);
  save();
 }
 if(e.target.hasAttribute('data-audit')){
  const i=Number(e.target.dataset.audit);db.audit=e.target.checked?[...new Set([...db.audit,i])]:db.audit.filter(x=>x!==i);save();
 }
});
document.addEventListener('submit',async e=>{
 const kind=e.target.dataset.form;if(!kind)return;e.preventDefault();
 const form=e.target,d=Object.fromEntries(new FormData(form));
 if(kind==='onboard'){d.vehicleSetups=db.onboard?.vehicleSetups||[];d.hazmatDetails=db.onboard?.hazmatDetails||{};d.gaDecalTrucks=db.onboard?.gaDecalTrucks||'';captureNMFields(form);d.nmVehicles=db.onboard?.nmVehicles||[]}
 for(const k in d)if(typeof d[k]==='string')d[k]=d[k].trim();
 try{
 if(activeCarrier&&officeRole==='driver'&&!['upload','bid'].includes(kind)){toast('Your driver account can upload files but cannot edit carrier administration.');return}
 switch(kind){
 case 'new-office':{
  const result=await officeAPI('/api/carriers',{method:'POST',body:JSON.stringify({name:d.name})});
  serverSession=await officeAPI('/api/session');await loadOffice(result.id);toast('Private carrier office created.');break;
 }
 case 'invite-member':{
  const result=await officeAPI('/api/carriers/'+activeCarrier+'/members',{method:'POST',body:JSON.stringify(d)});
  modal('Account invitation saved','<p>'+esc(result.status)+'</p>');break;
 }
 case 'prepare-dqf':{
  const count=Number(d.drivers);if(!Number.isInteger(count)||count<1||count>10000)return;
  db.onboard??={};db.onboard.dqfDrivers=count;
  db.onboard.startupServices=[...new Set([...(db.onboard.startupServices||[]),'Driver Qualification File'])];db.onboard.serviceChoices??={};db.onboard.serviceChoices['Driver Qualification File']='help';
  db.signedQuote=null;done('DQF preparation added as a one-time service.');break;
 }
 case 'sign-pricing':{
  if(d.agreed!=='yes'||!d.signature)return;
  if(selectedQuote().blockers.length){toast('Resolve payable Pending fees first.');return}
  if(!activeCarrier){toast('Open a secure carrier office to save a signed version.');return}
  const link=await makeReviewLink();
  await officeAPI('/api/carriers/'+activeCarrier+'/quotes/'+link.id+'/sign',{method:'POST',body:JSON.stringify({signature:d.signature,acknowledged:true})});
  $('#dialog').close();await loadCustomerQuote(link.id);toast('Signed — Awaiting Payment. No processing authorized.');break;
 }
 case 'accept-setup-terms':{
  if(d.agreed!=='yes')return;
  const previous=db.setupTerms;
  db.setupTerms={version:filingTermsVersion,acceptedAt:new Date().toISOString()};
  if(!save()){db.setupTerms=previous;return}
  $('#dialog').close();
  render();
  break;
 }
 case 'sign-estimate':{
  if(!acceptedSetupTerms()||!db.onboard||d.agreed!=='yes'||!d.signature){
   toast('Check the agreement and enter a signature.');return;
  }
  const previous=db.signedEstimate;
  const amounts=[...$('#estimate').querySelectorAll('[data-quote]')].map(input=>({
   item:input.dataset.quote,column:input.dataset.column,amount:input.value
  }));
  db.signedEstimate={signature:d.signature,signedAt:new Date().toISOString(),version:filingTermsVersion,terms:filingTerms,estimate:structuredClone(db.onboard),amounts};
  if(!save()){db.signedEstimate=previous;return}
  $('#dialog').close();
  toast('Demo signature saved in this browser.');
  break;
 }
 case 'record':if(!d.name){toast('Enter a record name.');return}if(d.person==='Company record')d.person='';upsert(db.records,d);done('Compliance record saved.');break;
 case 'person':{
  if(!d.name){toast('Enter a team member name.');return}
  d.cdlState=d.role==='Driver'&&states.includes(d.cdlState)?d.cdlState:'';
  const previous=db.people.find(p=>p.id===d.id);
  if(previous?.cdlState!==d.cdlState)d.hazmatTest=null;
  upsert(db.people,d);done('Team member saved.');break;
 }
 case 'hazmat-test':{
  const driver=db.people.find(p=>p.id===d.id&&p.role==='Driver');
  if(!driver)break;
  const stateGuide=safeURL(d.stateGuide);
  if(d.stateGuide&&!stateGuide.startsWith('https://')){toast('Enter an official HTTPS state link.');break}
  const previous=driver.hazmatTest;
  driver.hazmatTest={
   application:['First time','Renewal or transfer'].includes(d.application)?d.application:'',
   enrolled:d.enrolled==='on',trained:d.trained==='on',approved:d.approved==='on',
   stateReady:d.stateReady==='on',stateGuide
  };
  if(!save()){driver.hazmatTest=previous;break}
  hazmatDialog(driver);
  toast('Hazmat checklist saved.');
  break;
 }
 case 'notice':if(!d.title||!d.summary||!safeURL(d.url)){toast('Enter a title, summary, and valid source URL.');return}upsert(db.notices,d);db.notices.sort((a,b)=>b.date.localeCompare(a.date));done('Notice saved.');break;
 case 'company-profile':{
  if(!d.name){toast('Enter your company name.');return}
  const file=d.logo;
  let logo=d.removeLogo?'':db.profile?.logo||'';
  if(file.size){
   if(file.size>512*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){
    toast('Choose a PNG, JPEG or WebP logo up to 512 KB.');return;
   }
   const submit=form.querySelector('button.btn.gold');
   submit.disabled=true;
   try{
    logo=await new Promise((resolve,reject)=>{
     const reader=new FileReader();
     reader.onload=()=>resolve(reader.result);
     reader.onerror=()=>reject(reader.error);
     reader.readAsDataURL(file);
    });
   }finally{submit.disabled=false}
  }
  const previous=db.profile;
  db.profile={name:d.name,logo};
  if(!save()){db.profile=previous;return}
  $('#dialog').close();
  render();
  toast('Company profile saved.');
  break;
 }
 case 'onboard':{
 const fields=new FormData(form);
 const entered=fields.getAll('operatingState');
 d.equipmentTypes=fields.getAll('equipmentType').filter(type=>equipment.includes(type));
 d.permitChecks=fields.getAll('permitCheck').filter(key=>Object.hasOwn(permitChoices,key));
 d.startupServices=fields.getAll('startupService').filter(service=>startupServices.includes(service));
 if(d.startupServices.includes('LLC formation')&&!states.includes(d.llcState)){
  toast('Choose the state where you want to form the LLC.');form.elements.llcState.focus();return;
 }
 d.cargoTypes=fields.getAll('cargoType').filter(type=>cargoTypes.includes(type));
 if(!d.cargoTypes.includes('Other'))delete d.otherCargo;
 if(!entered.length||entered.some(s=>!states.includes(s))){toast('Select at least one operating state.');form.querySelector('.state-picker').open=true;form.querySelector('.state-picker summary').focus();return}
 d.states=entered.length===50&&!entered.includes('DC')?allStatesLabel:entered.join(', ');d.quotes=db.onboard?.quotes||{};d.skipUcr=db.onboard?.skipUcr||false;d.requestedServices=db.onboard?.requestedServices||[];d.serviceChoices=db.onboard?.serviceChoices||{};d.followups=Object.fromEntries([...fields.entries()].filter(([name])=>name.startsWith('followup_')));d.dqfDrivers=db.onboard?.dqfDrivers||1;db.onboard=d;db.signedQuote=null;done('Checklist and estimate updated.');$('#estimate').scrollIntoView({block:'nearest'});break;}
 case 'upload':{
 const file=d.camera?.size?d.camera:d.file;
 if(!file.size||file.size>20*1024*1024){toast('Choose a file between 1 byte and 20 MB.');return}
 const id=uid(),submit=form.querySelector('button.btn.gold');submit.disabled=true;
 try{
  uploadMetadata={name:file.name,date:d.date,record:d.record||'',purpose:d.purpose||'Other',person:d.person||''};
  await fileOperation('put',id,file);
  let rec=db.records.find(r=>r.id===d.record);
  if(!rec&&d.date&&officeRole!=='driver'){rec={id:uid(),type:d.purpose||'Other',name:file.name,status:'New',date:d.date,sourceDoc:id};db.records.push(rec)}
  if(rec&&d.date&&!rec.date){rec.date=d.date;if(rec.status!=='Archived')rec.status='New'}
  db.docs.unshift({id,name:file.name,date:d.date,record:rec?.id||'',purpose:d.purpose||'Other',person:officePerson||d.person||''});
  if(activeCarrier){if(officeRole!=='driver')save();$('#dialog').close();render();toast('Document saved securely to Member Office.')}else done('Document saved in this browser demo.');
 }finally{submit.disabled=false}break;}
 case 'post-diesel-rate':{
  const {rate}=await officeAPI(dieselRateEndpoint,{method:'PUT',body:JSON.stringify({price:Number(d.price),date:d.date})});
  const target=$('#bid-diesel-rate');
  if(target)showDieselRate(target,rate);
  toast('National diesel rate posted.');
  break;}
 case 'bid':{
 const rate=Number(d.rate), miles=Number(d.miles), offer=Number(d.offer);
 const result=$('#bid-result'), warning=$('#bid-rate-warning');
 const mileageTarget=miles*rate;
 if(rate>25&&d.confirmBidRate!=='on'){
  warning.hidden=false;
  warning.innerHTML='<label class="check"><input type="checkbox" name="confirmBidRate">Confirm that '+money(rate)+' per mile is intentional.</label><p>'+miles.toLocaleString('en-US')+' miles at '+money(rate)+' per mile is '+money(mileageTarget)+' before add-ons. If you meant a total offer, enter it in Current offer instead. Check the box and calculate again to use this rate.</p>';
  warning.querySelector('input').focus();
  result.innerHTML=empty('Review the per-mile rate before calculating quotes.');
  break;
 }
 warning.hidden=true;
 let diesel=null;
 if(d.mpg){
  result.innerHTML=empty('Checking the posted diesel rate…');
  try{({rate:diesel}=await officeAPI(dieselRateEndpoint));}
  catch{result.innerHTML=empty('The posted diesel rate is unavailable. Try again to include fuel.');break;}
  if(!form.isConnected||Object.entries(d).some(([name,value])=>name!=='confirmBidRate'&&form.elements[name].value!==value))break;
  showDieselRate($('#bid-diesel-rate'),diesel);
  if(!diesel){result.innerHTML=empty('A national diesel rate must be posted before fuel can be included.');break;}
 }
 const fuel=diesel?miles/Number(d.mpg)*diesel.price:0;
 const expenses=['lumper','tolls','other'].reduce((total,key)=>total+Number(d[key]),fuel);
 const minimum=offer+expenses, goal=Math.max(offer,mileageTarget)+expenses;
 const mid=minimum+(goal-minimum)/2;
 if(![minimum,mid,goal].every(Number.isFinite)){
  result.innerHTML=empty('Enter smaller trip amounts.');break;
 }
 result.innerHTML=[['Minimum suggested',minimum],['Middle suggested',mid],['Goal suggested',goal]].map(([n,v])=>'<div class="row"><strong>'+n+'</strong><span class="price">'+money(v)+'</span></div>').join('')+
  '<p class="note">Current offer '+money(offer)+' · Mileage target '+miles.toLocaleString('en-US')+' miles × '+money(rate)+' per mile = '+money(mileageTarget)+' · Add-ons '+money(expenses)+'. The goal uses the higher of the offer and mileage target, plus add-ons. The middle is halfway between the minimum and goal.</p>'+
  (diesel?'<p class="note">Estimated diesel cost '+money(fuel)+' at '+dieselPrice(diesel)+' · EIA week of '+dateText(diesel.date)+'.</p>':'');break;}
 case 'audit':if(!db.requests.length&&d.company)db.requests.push({company:d.company,status:'Waiting for Pay'});done('Audit request saved · awaiting payment.');break;
 case 'listing':upsert(db.listings,d);done('Driver availability posted.');break;
 case 'job':if(db.broker==='Find Drivers + unlimited posts'||(db.broker==='Find Drivers + 5 posts'&&activeJobs().length<5)){upsert(db.jobs,{...d,expires:Date.now()+30*day});done('Job posted for 30 days.')}break;
 case 'order':if(supplies[d.id]){db.orders.unshift({id:uid(),item:supplies[d.id][0],qty:+d.qty,status:'New'});done('Supply quote request saved.')}break;
 }
 }catch(error){toast(error.message||'The change could not be saved.')}
});
if(typeof fetch==='function')startOffice();else render();
