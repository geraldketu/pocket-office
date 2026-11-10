import {buildQuote} from './rules.mjs';
// Identity headers are supplied by Sites dispatch. No browser role or carrier ID is trusted.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
const validId=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(s);
const roles=['owner','office','driver'];
const freshState=name=>({records:[],people:[],docs:[],listings:[],jobs:[],orders:[],notices:[],audit:[],requests:[],plan:'Basic',broker:'',onboard:null,profile:{name,logo:''}});
export function identity(req,env){
 const id=req.headers.get('oai-authenticated-user-id');
 const email=req.headers.get('oai-authenticated-user-email')?.toLowerCase();
 if(!id||!email)fail(401,'Sign in with ChatGPT to open your Member Office.');
 return {id,email,admin:!!env.OWNER_EMAIL&&email===env.OWNER_EMAIL.toLowerCase()};
}
export async function authorize(env,user,carrierId,write=false,ownerOnly=false){
 if(!validId(carrierId))fail(404,'Carrier not found.');
 const carrier=await env.DB.prepare('SELECT id,name FROM carriers WHERE id=?').bind(carrierId).first();
 if(!carrier)fail(404,'Carrier not found.');
 if(user.admin)return {...carrier,role:'owner',admin:true};
 const membership=await env.DB.prepare('SELECT role,person_id FROM memberships WHERE carrier_id=? AND user_id=?').bind(carrierId,user.id).first();
 if(!membership)fail(403,'You do not have access to this carrier.');
 if(write&&membership.role==='driver')fail(403,'Drivers can upload their own files but cannot edit carrier administration.');
 if(ownerOnly&&membership.role!=='owner')fail(403,'Only a carrier owner can manage account access.');
 return {...carrier,...membership};
}
const audit=(env,user,id,action)=>env.DB.prepare('INSERT INTO office_audit(id,carrier_id,user_id,action,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),id,user.id,action,new Date().toISOString()).run();
export function driverState(state,person){
 return {...freshState(state.profile?.name||'Member Office'),profile:state.profile,records:(state.records||[]).filter(r=>r.person===person),people:(state.people||[]).filter(p=>p.id===person)};
}
export function cleanState(input,previous){
 if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'Invalid workspace.');
 const next={...input};delete next.docs;delete next.quoteOrders;
 for(const key of ['records','people','listings','jobs','orders','notices','audit','requests'])if(!Array.isArray(next[key]))fail(400,'Invalid '+key+'.');
 for(const key of ['orders','requests']){
  const old=new Map((previous[key]||[]).map(x=>[x.id,x]));
  next[key]=next[key].map(item=>{
   const existing=old.get(item.id);const state=existing?.paymentStatus==='paid'?existing.paymentStatus:'unpaid';
   if(['Paid','In progress','Completed','Ready to Process'].includes(item.status)&&existing?.paymentStatus!=='paid')fail(409,'Payment verification is required before processing.');
   return {...item,paymentStatus:state};
  });
 }
 if(next.signedQuote){
  if(!next.signedQuote.signature?.trim()||!next.signedQuote.terms||!next.signedQuote.quote)fail(400,'Quote acknowledgment, signature and itemization are required.');
  next.signedQuote.status='Signed — unpaid';
 }
 return next;
}
async function bodyJSON(req,max=900000){
 const text=await req.text();if(text.length>max)fail(413,'Workspace too large.');
 try{return JSON.parse(text)}catch{fail(400,'Invalid JSON.')}
}
const terms='Permit and government filing fees are non-refundable once paid to the issuing agency, except where the agency allows a refund or the law requires one. OliverFee 360 processing fees for permits and authorities are non-refundable once we submit the filing, except where the law requires a refund. Third-party fees follow the provider’s refund rules.';
async function digest(text){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function canonical(state,selection){const q=buildQuote(state,selection);const snapshot={...q,filingTerms:terms,application:state.application||null,operation:state.onboard||null};return {snapshot,hash:await digest(JSON.stringify(snapshot))}}
function safeSelection(value){if(!value||!['plan','startup','quote'].includes(value.kind))fail(400,'Select a review type.');if(value.kind==='plan'&&!['Basic','Pro','Premium','Ultimate'].includes(value.plan))fail(400,'Invalid plan.');return {kind:value.kind,...(value.kind==='plan'?{plan:value.plan}:{})}}
async function quoteResponse(env,row,state){const current=await canonical(state,JSON.parse(row.selection));return {id:row.id,snapshot:JSON.parse(row.snapshot),status:row.input_hash!==current.hash?'Changed — new signature required':row.status,signature:row.signature,signedAt:row.signed_at,stale:row.input_hash!==current.hash,checkoutConfigured:!!env.STRIPE_SECRET_KEY&&env.STRIPE_CHECKOUT_ENABLED==='true',paidCents:row.paid_cents}}
async function stripeWebhook(req,env){
 if(!env.STRIPE_WEBHOOK_SECRET)fail(503,'Stripe is not connected.');
 const signature=req.headers.get('stripe-signature')||'';const values=signature.split(',').map(v=>v.split('='));const timestamp=values.find(([key])=>key==='t')?.[1];const signatures=values.filter(([key])=>key==='v1').map(([,v])=>v);
 if(!timestamp||Math.abs(Date.now()/1000-Number(timestamp))>300)fail(400,'Expired webhook signature.');
 const raw=await req.text();if(raw.length>1000000)fail(413,'Webhook too large.');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signed=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+raw));const expected=[...new Uint8Array(signed)].map(b=>b.toString(16).padStart(2,'0')).join('');
 const equal=(a,b)=>a.length===b.length&&[...a].reduce((n,c,i)=>n|(c.charCodeAt(0)^b.charCodeAt(i)),0)===0;
 if(!signatures.some(s=>equal(s,expected)))fail(400,'Invalid webhook signature.');
 const event=JSON.parse(raw);if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))return json({received:true});
 if(await env.DB.prepare('SELECT id FROM stripe_events WHERE id=?').bind(event.id).first())return json({received:true});
 const session=event.data?.object;if(session?.payment_status!=='paid')return json({received:true});
 const row=await env.DB.prepare('SELECT * FROM quote_reviews WHERE id=?').bind(session.metadata?.quote_id||'').first();
 if(!row||row.checkout_session!==session.id||!row.signature||row.carrier_id!==session.metadata?.carrier_id)fail(400,'Unknown checkout.');
 const stored=await env.DB.prepare('SELECT state FROM workspaces WHERE carrier_id=?').bind(row.carrier_id).first();const current=await canonical(JSON.parse(stored.state),JSON.parse(row.selection));
 if(current.hash!==row.input_hash||current.snapshot.blockers.length||session.currency!=='usd'||session.amount_total!==current.snapshot.dueTodayCents)fail(409,'Full current quote payment is not confirmed.');
 // Direct-pay agency receipts are a separate staff verification gate.
 const status=current.snapshot.outside.some(i=>i.payer!=='OliverFee collects'&&(i.amountCents===null||i.amountCents>0))?'Paid — direct-pay proof needed':'Ready to Process';
 await env.DB.batch([env.DB.prepare('UPDATE quote_reviews SET status=?,paid_cents=? WHERE id=?').bind(status,session.amount_total,row.id),env.DB.prepare('INSERT INTO stripe_events(id,received_at) VALUES(?,?)').bind(event.id,new Date().toISOString())]);
 return json({received:true});
}
async function api(req,env){
 const url=new URL(req.url);const user=identity(req,env);
 if(!env.DB||!env.BUCKET)fail(503,'Secure storage is not configured.');
 if(!['GET','HEAD'].includes(req.method)){
  if(req.headers.get('Origin')!==url.origin)fail(403,'Same-origin request required.');
 }
 if(url.pathname==='/api/national-diesel-rate'){
  if(req.method==='GET'){
   const rate=await env.DB.prepare('SELECT price, rate_date AS date FROM national_diesel_rate WHERE id=1').first();
   return json({rate});
  }
  if(req.method==='PUT'){
   if(!user.admin)fail(403,'Only the OliverFee 360 administrator can post the national diesel rate.');
   const {price,date}=await bodyJSON(req,300);
   const timestamp=typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)?Date.parse(date):NaN;
   if(!Number.isFinite(price)||price<0.001||price>99.999||!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==date||timestamp>Date.now())fail(400,'Enter a valid diesel price and a source date up to today.');
   const result=await env.DB.prepare('INSERT INTO national_diesel_rate(id,price,rate_date) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET price=excluded.price,rate_date=excluded.rate_date WHERE excluded.rate_date>=national_diesel_rate.rate_date').bind(Math.round(price*1000)/1000,date).run();
   if(result.meta.changes!==1)fail(409,'A rate with a newer source date is already posted.');
   return json({rate:{price:Math.round(price*1000)/1000,date}});
  }
  fail(405,'Method not allowed.');
 }
 if(url.pathname==='/api/session'&&req.method==='GET'){
  // Bind an owner-issued email invitation to its authenticated, stable Sites identity.
  await env.DB.prepare('UPDATE memberships SET user_id=? WHERE lower(email)=? AND user_id IS NULL').bind(user.id,user.email).run();
  const list=user.admin?await env.DB.prepare("SELECT id,name,'owner' AS role FROM carriers ORDER BY created_at DESC").all():await env.DB.prepare('SELECT c.id,c.name,m.role FROM carriers c JOIN memberships m ON c.id=m.carrier_id WHERE m.user_id=? ORDER BY c.created_at DESC').bind(user.id).all();
  return json({user:{email:user.email,admin:user.admin},carriers:list.results,checkout:'coming_soon'});
 }
 if(url.pathname==='/api/carriers'&&req.method==='POST'){
  const {name}=await bodyJSON(req,300);if(typeof name!=='string'||!name.trim()||name.length>120)fail(400,'Enter a company name under 120 characters.');
  const id=crypto.randomUUID(),created=new Date().toISOString();
  await env.DB.batch([
   env.DB.prepare('INSERT INTO carriers(id,name,created_at) VALUES(?,?,?)').bind(id,name.trim(),created),
   env.DB.prepare("INSERT INTO memberships(carrier_id,email,user_id,role) VALUES(?,?,?,'owner')").bind(id,user.email,user.id),
   env.DB.prepare('INSERT INTO workspaces(carrier_id,state,revision) VALUES(?,?,0)').bind(id,JSON.stringify(freshState(name.trim())))
  ]);return json({id,name:name.trim()},201);
 }
 const parts=url.pathname.split('/').filter(Boolean);
 if(parts[0]!=='api'||parts[1]!=='carriers'||!parts[2])fail(404,'Not found.');
 const id=parts[2],resource=parts[3];const access=await authorize(env,user,id);
 const stored=await env.DB.prepare('SELECT state,revision FROM workspaces WHERE carrier_id=?').bind(id).first();
 const state=JSON.parse(stored.state);
 if(resource==='workspace'&&req.method==='GET'){
  let data=access.role==='driver'?driverState(state,access.person_id):state;
  const files=access.role==='driver'?await env.DB.prepare('SELECT * FROM files WHERE carrier_id=? AND person_id=? ORDER BY created_at DESC').bind(id,access.person_id).all():await env.DB.prepare('SELECT * FROM files WHERE carrier_id=? ORDER BY created_at DESC').bind(id).all();
  data.docs=files.results.map(f=>({id:f.id,name:f.name,date:f.expires_on,record:f.record_id,purpose:f.purpose,person:f.person_id}));
  if(access.role!=='driver'){const reviews=(await env.DB.prepare('SELECT * FROM quote_reviews WHERE carrier_id=? ORDER BY created_at DESC').bind(id).all()).results;data.quoteOrders=await Promise.all(reviews.map(row=>quoteResponse(env,row,state)))}
  return json({state:data,revision:stored.revision,role:access.role,personId:access.person_id||null});
 }
 if(resource==='workspace'&&req.method==='PUT'){
  await authorize(env,user,id,true);
  const body=await bodyJSON(req);const next=cleanState(body.state,state);
  if(!Number.isInteger(body.revision)||body.revision!==stored.revision)fail(409,'Another session changed this office. Reload before saving.');
  const result=await env.DB.prepare('UPDATE workspaces SET state=?,revision=revision+1 WHERE carrier_id=? AND revision=?').bind(JSON.stringify(next),id,body.revision).run();
  if(result.meta.changes!==1)fail(409,'This office changed. Reload before saving.');
  await audit(env,user,id,'workspace.updated');return json({revision:body.revision+1});
 }
 if(resource==='quotes'){
  if(access.role==='driver')fail(403,'Drivers cannot access carrier quotes.');
  if(req.method==='POST'&&!parts[4]){
   const body=await bodyJSON(req,1000);const selection=safeSelection(body.selection);const current=await canonical(state,selection);const quoteId=crypto.randomUUID();
   await env.DB.prepare('INSERT INTO quote_reviews(id,carrier_id,snapshot,selection,input_hash,status,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(quoteId,id,JSON.stringify(current.snapshot),JSON.stringify(selection),current.hash,'Awaiting Signature',user.id,new Date().toISOString()).run();
   await audit(env,user,id,'quote.created');return json({id:quoteId,path:'/?carrier='+id+'&quote='+quoteId+'#customer-review'},201);
  }
  const row=await env.DB.prepare('SELECT * FROM quote_reviews WHERE carrier_id=? AND id=?').bind(id,parts[4]||'').first();if(!row)fail(404,'Quote not found.');
  const current=await canonical(state,JSON.parse(row.selection));
  if(req.method==='GET')return json(await quoteResponse(env,row,state));
  if(parts[5]==='sign'&&req.method==='POST'){
   const body=await bodyJSON(req,2000);
   if(current.hash!==row.input_hash)fail(409,'The estimate changed. Ask staff for a new review link.');
   if(current.snapshot.blockers.length)fail(409,'Resolve payable Pending fees before finalization.');
   if(body.acknowledged!==true||typeof body.signature!=='string'||!body.signature.trim()||body.signature.length>120)fail(400,'Acknowledgment and customer signature are required.');
   if(row.signature)fail(409,'This quote version is already signed.');
   await env.DB.prepare('UPDATE quote_reviews SET signature=?,signed_at=?,signed_by=?,status=? WHERE id=? AND signature IS NULL').bind(body.signature.trim(),new Date().toISOString(),user.id,'Signed — Awaiting Payment',row.id).run();
   await audit(env,user,id,'quote.signed');return json({status:'Signed — Awaiting Payment'});
  }
  if(parts[5]==='checkout'&&req.method==='POST'){
   if(!env.STRIPE_SECRET_KEY||env.STRIPE_CHECKOUT_ENABLED!=='true')fail(503,'Live checkout coming soon.');
   if(!row.signature||current.hash!==row.input_hash||current.snapshot.blockers.length||row.status!=='Signed — Awaiting Payment')fail(409,'A current signed and fully priced quote is required.');
   const q=current.snapshot;const form=new URLSearchParams({mode:q.plan?'subscription':'payment',success_url:url.origin+'/?carrier='+id+'&quote='+row.id+'#customer-review',cancel_url:url.origin+'/?carrier='+id+'&quote='+row.id+'#customer-review','metadata[quote_id]':row.id,'metadata[carrier_id]':id});
   let index=0;
   for(const [name,amount,recurring] of [['OliverFee one-time services and collected outside fees',q.payableCents,false],[q.plan+' monthly membership',q.monthlyCents,true]])if(amount>0){const prefix='line_items['+index+']';form.set(prefix+'[quantity]','1');form.set(prefix+'[price_data][currency]','usd');form.set(prefix+'[price_data][unit_amount]',String(amount));form.set(prefix+'[price_data][product_data][name]',name);if(recurring)form.set(prefix+'[price_data][recurring][interval]','month');index++}
   const response=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':row.id+':'+row.input_hash},body:form});
   const session=await response.json();if(!response.ok||!session.url)fail(502,'Checkout could not be created.');
   await env.DB.prepare('UPDATE quote_reviews SET checkout_session=? WHERE id=?').bind(session.id,row.id).run();return json({url:session.url});
  }
  if(parts[5]==='confirm'&&req.method==='POST'){
   if(!env.STRIPE_SECRET_KEY||!row.checkout_session||!row.signature)fail(409,'No signed checkout is awaiting confirmation.');
   const response=await fetch('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(row.checkout_session),{headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY}});
   const session=await response.json();if(!response.ok)fail(502,'Stripe confirmation unavailable.');
   if(session.payment_status!=='paid')return json({status:row.status});
   if(current.hash!==row.input_hash||current.snapshot.blockers.length||session.currency!=='usd'||session.amount_total!==current.snapshot.dueTodayCents||session.metadata?.quote_id!==row.id||session.metadata?.carrier_id!==id)fail(409,'Full current quote payment is not confirmed.');
   const status=current.snapshot.outside.some(i=>i.payer!=='OliverFee collects'&&(i.amountCents===null||i.amountCents>0))?'Paid — direct-pay proof needed':'Ready to Process';
   await env.DB.prepare('UPDATE quote_reviews SET status=?,paid_cents=? WHERE id=?').bind(status,session.amount_total,row.id).run();return json({status});
  }
 }
 if(resource==='members'){
  await authorize(env,user,id,true,true);
  if(req.method==='GET')return json((await env.DB.prepare('SELECT email,role,person_id,user_id IS NOT NULL AS active FROM memberships WHERE carrier_id=?').bind(id).all()).results);
  if(req.method==='POST'){
   const m=await bodyJSON(req,1000);const email=m.email?.trim().toLowerCase();
   if(!email||!/^\S+@\S+\.\S+$/.test(email)||!roles.includes(m.role))fail(400,'Valid email and role required.');
   if(m.role==='driver'&&!(state.people||[]).some(p=>p.id===m.personId&&p.role==='Driver'))fail(400,'Link the driver account to an existing driver.');
   const existing=await env.DB.prepare('SELECT role FROM memberships WHERE carrier_id=? AND email=?').bind(id,email).first();
   if(existing)fail(409,'This email already has access.');
   await env.DB.prepare('INSERT INTO memberships(carrier_id,email,role,person_id) VALUES(?,?,?,?)').bind(id,email,m.role,m.role==='driver'?m.personId:null).run();
   await audit(env,user,id,'member.invited');return json({status:'Pending first sign-in. Site access must also be approved; no email was sent.'},201);
  }
 }
 if(resource==='files'&&parts[4]){
  const fileId=parts[4];if(!validId(fileId))fail(404,'File not found.');
  const key=id+'/'+fileId;
  const metadata=await env.DB.prepare('SELECT * FROM files WHERE carrier_id=? AND id=?').bind(id,fileId).first();
  if(req.method==='PUT'){
   if(metadata)fail(409,'File already exists.');
   const size=Number(req.headers.get('Content-Length'));if(size>20*1024*1024)fail(413,'File must be 20 MB or smaller.');
   const bytes=await req.arrayBuffer();if(!bytes.byteLength||bytes.byteLength>20*1024*1024)fail(413,'File must be 1 byte to 20 MB.');
   const mime=req.headers.get('Content-Type')||'application/octet-stream';
   const allowed=['application/pdf','image/jpeg','image/png','image/webp','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
   if(!allowed.includes(mime))fail(415,'Use PDF, JPEG, PNG, WebP, text, CSV or DOCX.');
   const name=url.searchParams.get('name')?.slice(0,200)||'Document';
   const recordId=url.searchParams.get('record')||'';
   const record=recordId?(state.records||[]).find(r=>r.id===recordId):null;
   if(recordId&&!record)fail(400,'Record not found.');
   const person=access.role==='driver'?access.person_id:record?.person||url.searchParams.get('person')||null;
   if(access.role==='driver'&&(!person||(record&&record.person!==person)))fail(403,'Drivers can only upload their own documents.');
   if(person&&!(state.people||[]).some(p=>p.id===person))fail(400,'Driver not found.');
   const purpose=(url.searchParams.get('purpose')||'Other').slice(0,100);
   const expires=url.searchParams.get('date')||null;if(expires&&!/^\d{4}-\d{2}-\d{2}$/.test(expires))fail(400,'Invalid date.');
   await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:mime}});
   try{await env.DB.prepare('INSERT INTO files(id,carrier_id,person_id,record_id,purpose,name,mime,size,expires_on,uploaded_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(fileId,id,person,recordId||null,purpose,name,mime,bytes.byteLength,expires,user.id,new Date().toISOString()).run()}catch(error){await env.BUCKET.delete(key);throw error}
   await audit(env,user,id,'file.uploaded');return json({id:fileId},201);
  }
  if(!metadata)fail(404,'File not found.');
  if(access.role==='driver'&&metadata.person_id!==access.person_id)fail(403,'You cannot access this driver document.');
  if(req.method==='GET'){
   const object=await env.BUCKET.get(key);if(!object)fail(404,'File unavailable.');
   return new Response(object.body,{headers:{'Content-Type':metadata.mime,'Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(metadata.name),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }
  if(req.method==='DELETE'){
   if(access.role==='driver')fail(403,'Ask the carrier owner to remove a file.');
   await env.BUCKET.delete(key);await env.DB.prepare('DELETE FROM files WHERE carrier_id=? AND id=?').bind(id,fileId).run();await audit(env,user,id,'file.removed');return json({removed:true});
  }
 }
 fail(404,'Not found.');
}
export default {async fetch(req,env){
 try{
  const url=new URL(req.url);
  if(url.pathname==='/api/stripe/webhook'&&req.method==='POST')return await stripeWebhook(req,env);
  if(url.pathname.startsWith('/api/'))return await api(req,env);
  const asset=ASSETS[url.pathname==='/'?'/index.html':url.pathname];
  if(!asset)return new Response('Not found',{status:404});
  return new Response(asset.body,{headers:{'Content-Type':asset.mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}});
 }catch(error){return json({error:error.status?error.message:'The operation failed. Please retry.'},error.status||500)}
}};
