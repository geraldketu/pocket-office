import 'server-only';
import {screenProspect} from './dnc';
import {createClient} from '@/lib/supabase/server';
import {actor,salesData,command,sameOrigin,requestBody,salesFailure,SalesError} from './server';
import {uuid,text,callPayload,applicationPayload,salesReport,safeCsvCell} from './validation';
import {importProspects} from './csv';
import {generateCheckout} from './payments';
import {registerRepresentative,sendCheckoutEmail,drainSalesOutbox} from './notifications';
import {DISPOSITIONS} from './types';
export async function getSales(request:Request,management=false){try{
 await actor(management);const url=new URL(request.url),page=Number(url.searchParams.get('page')||0);if(!Number.isSafeInteger(page)||page<0||page>10000)throw new SalesError('Invalid page.');
 if(url.searchParams.get('export')==='team'){if(!management)throw new SalesError('Owner access required.',403);const client=await createClient();const {data,error}=await client.rpc('sales_team_performance');if(error)throw new SalesError('Team performance report unavailable.',503);const keys=['slot','rep_id','name','rep_code','status','calls_today','assigned_leads','followups_due','applications_submitted','verified_sales','revenue_cents','commission_cents'];const csv=[keys.join(','),...(data||[]).map((r:Record<string,unknown>)=>keys.map(k=>safeCsvCell(r[k])).join(','))].join('\r\n');return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="oliverfee-four-person-sales.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
 if(url.searchParams.get('export')==='csv'){
  if(!management)throw new SalesError('Owner access required.',403);
  const client=await createClient(),rows:Record<string,unknown>[]=[];let total=1;
  const dates:Record<string,string>={};for(const key of ['from','to']){const value=url.searchParams.get(key);if(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value)))throw new SalesError('Use valid report dates.');dates[key]=value;}}
  if(dates.from&&dates.to&&dates.from>dates.to)throw new SalesError('Report start must be before its end.');
  while(rows.length<total){
   let query=client.from('sales_applications').select('id,rep_id,plan_key,status,initial_revenue_cents,paid_at',{count:'exact'}).order('created_at').order('id').range(rows.length,rows.length+499);
   if(dates.from)query=query.gte('created_at',dates.from+'T00:00:00Z');if(dates.to)query=query.lte('created_at',dates.to+'T23:59:59.999Z');
   const {data,error,count}=await query;if(error||count===null)throw new SalesError('Report could not be loaded.',503);total=count;
   if(total>10000)throw new SalesError('Narrow the date range to export up to 10,000 sales records.',413);
   if(!data?.length&&rows.length<total)throw new SalesError('Report changed while loading. Retry the export.',409);rows.push(...(data||[]));
  }
  return new Response(salesReport(rows),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="oliverfee-sales.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 const status=url.searchParams.get('status')||'All';if(!['All','Due',...DISPOSITIONS].includes(status))throw new SalesError('Invalid calling-list filter.');
 return Response.json(await salesData(management,page,text(url.searchParams.get('q'),120),status),{headers:{'Cache-Control':'no-store'}});
 }catch(e){return salesFailure(e);}}
export async function postSales(request:Request,management=false){try{
 sameOrigin(request);await actor(management);const raw=await requestBody(request),action=text(raw.action,50);let result:unknown;
 if(action==='quote-create')result=await command(action,uuid(raw.id),{});
 else if(action==='dnc-optout')result=await command(action,uuid(raw.id),{reason:text(raw.reason,500)});
 else if(action==='prospect-notes')result=await command(action,uuid(raw.id),{notes:text(raw.notes,4000),follow_up_at:raw.follow_up_at?new Date(String(raw.follow_up_at)).toISOString():null,revision:raw.revision});
 else if(action==='call')result=await command('call',uuid(raw.id),callPayload(raw));
 else if(action==='save-application')result=await command(action,uuid(raw.id),applicationPayload(raw));
 else if(action==='checkout')result=await generateCheckout(uuid(raw.id));
 else if(action==='email-checkout')result=await sendCheckoutEmail(uuid(raw.id));
 else{
  if(!management)throw new SalesError('This is an owner-only sales action.',403);
  if(action==='owner-enrollment')result=await command(action,raw.id?uuid(raw.id):null,applicationPayload(raw));
  else if(action==='quote-approve'||action==='quote-reject'){const notes=text(raw.notes,2000);if(notes.length<3)throw new SalesError('Owner review notes required.');result=await command(action,uuid(raw.id),{notes,resolutions:raw.resolutions||{}});}
  else if(action==='register-rep'){const representative=await registerRepresentative(raw);result={representative,notifications:await drainSalesOutbox()};}
  else if(action==='rep-update'){
   const status=text(raw.status),mode=text(raw.commission_mode),value=Number(raw.commission_value);if(!['invited','active','suspended','inactive'].includes(status)||!['none','percent','flat'].includes(mode)||!Number.isSafeInteger(value)||value<0||value>1000000||mode==='percent'&&value>10000)throw new SalesError('Invalid representative status or commission settings.');
   result=await command(action,uuid(raw.id),{status,commission_mode:mode,commission_value:mode==='none'?0:value});
  }else if(action==='import-preview'||action==='import'){
   if(typeof raw.csv!=='string')throw new SalesError('Choose a CSV file.');const parsed=importProspects(raw.csv);
   if(action==='import-preview')result={...parsed,rows:parsed.rows.slice(0,5),validCount:parsed.rows.length};
   else {if(parsed.errors.length)throw new SalesError('Fix the CSV validation errors before importing. No prospects were imported.');result=await command('import',null,{rows:parsed.rows});}
  }else if(action==='screen-prospect')result=await screenProspect(uuid(raw.id));
  else if(action==='team-slot')result=await command(action,null,{slot:Number(raw.slot),rep_id:raw.rep_id?uuid(raw.rep_id):null});
  else if(action==='dnc-provider-disable')result=await command(action,null,{provider:text(raw.provider,100)});
  else if(action==='assign')result=await command(action,uuid(raw.id),{rep_id:raw.rep_id?uuid(raw.rep_id):null});
  else if(action==='resource-save'){const title=text(raw.title,150),body=text(raw.body,20000);if(!title||!body||!Number.isSafeInteger(raw.revision))throw new SalesError('Resource title, body and current revision are required.');result=await command(typeof raw.body_es==='string'?'resource-save-bilingual':action,null,{slug:text(raw.slug,100),title,body,title_es:text(raw.title_es,150),body_es:text(raw.body_es,20000),revision:raw.revision});}
  else if(action==='commission-approve')result=await command(action,uuid(raw.id),{});
  else if(action==='retry-notifications')result=await drainSalesOutbox();
  else throw new SalesError('Unknown sales action.');
 }
 return Response.json({ok:true,result},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return salesFailure(e);}}
