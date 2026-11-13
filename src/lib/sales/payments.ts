import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';
import {command,SalesError} from './server';
import {PLANS,type Plan} from './types';
import {assertPaidSession,type PaidSession} from './stripe-verification';
export function salesOrigin(){const origin=process.env.NEXT_PUBLIC_SITE_URL||'';let url;try{url=new URL(origin);}catch{throw new SalesError('Set the existing production site address before enabling payment or email.',503);}if(url.origin!=='https://oliverfee360.com'||url.pathname!=='/'||url.search||url.hash)throw new SalesError('Sales payments must use the existing OliverFee360 production address.',503);return url.origin;}
export function paymentConfig(){const key=process.env.STRIPE_SECRET_KEY||'',accountId=process.env.SALES_STRIPE_ACCOUNT_ID||'';if(process.env.SALES_PAYMENTS_ENABLED!=='true'||!/^sk_(test|live)_/.test(key)||!process.env.STRIPE_WEBHOOK_SECRET||!/^acct_[A-Za-z0-9]+$/.test(accountId))throw new SalesError('Sales Checkout is not enabled. No payment link was created.',503);return {key,accountId,live:key.startsWith('sk_live_'),origin:salesOrigin()};}
export async function stripe(path:string,method='GET',body?:URLSearchParams,idempotency?:string){
 const {key}=paymentConfig();const r=await fetch('https://api.stripe.com/v1'+path,{method,headers:{Authorization:'Bearer '+key,'Stripe-Version':'2024-06-20',...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotency?{'Idempotency-Key':idempotency}:{})},body,signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new SalesError('Stripe could not complete this request. Retry; no payment has been reported as successful.',502);return r.json();
}
export async function generateCheckout(prospect:string){
 const config=paymentConfig(),reserved=await command('checkout-reserve',prospect,{}) as {id:string;application_id:string;rep_id:string;plan_key:Plan;amount_cents:number;customer_email:string;checkout_url:string|null;status:string};
 if(reserved.status==='pending'&&reserved.checkout_url)return {url:reserved.checkout_url};
 const priceId=process.env[PLANS[reserved.plan_key].priceEnv];const service=createAdminClient();
 try{
 if(!priceId||!/^price_/.test(priceId))throw new SalesError('The existing approved Stripe price is not configured for this membership.',503);
 const account=await stripe('/account');if(account.id!==config.accountId||config.live&&!account.charges_enabled)throw new SalesError('The Stripe key does not match the approved existing account, or charges are disabled.',409);
 const {data:existing,error:profileError}=await service.from('profiles').select('id,role,carrier_id').ilike('email',reserved.customer_email);
 if(profileError||!existing||existing.length>1||existing.some(p=>p.role!=='carrier'||p.carrier_id))throw new SalesError('This email has an existing account that needs owner review before a new enrollment.',409);
 if(existing.length){const {data:rep,error}=await service.from('sales_representatives').select('user_id').eq('user_id',existing[0].id).maybeSingle();if(error||rep)throw new SalesError('A representative account cannot be enrolled as a customer.',409);}
 const price=await stripe('/prices/'+encodeURIComponent(priceId));
 if(!price.active||price.currency!=='usd'||price.unit_amount!==reserved.amount_cents||price.recurring?.interval!=='month'||price.recurring?.interval_count!==1||price.type!=='recurring'||price.livemode!==config.live)throw new SalesError('Stripe price differs from the approved monthly membership. The owner must review it.',409);
 }catch(error){
  // No Checkout request was made: release the reservation so the draft can be corrected.
  const {error:released}=await service.rpc('sales_record_checkout',{p_attempt:reserved.id,p_session:'',p_url:'',p_price:'',p_failed:true});
  if(released)throw new SalesError('Checkout preflight failed; the reservation needs owner review.',503);throw error;
 }
 if(!priceId)throw new SalesError('Approved price is unavailable.',503);
 const form=new URLSearchParams({mode:'subscription','line_items[0][price]':priceId,'line_items[0][quantity]':'1',customer_email:reserved.customer_email,client_reference_id:reserved.application_id,success_url:config.origin+'/sales/payment-result',cancel_url:config.origin+'/sales/payment-result?cancelled=1','metadata[sales_attempt_id]':reserved.id,'metadata[application_id]':reserved.application_id,'metadata[rep_id]':reserved.rep_id,'subscription_data[metadata][sales_attempt_id]':reserved.id,'subscription_data[metadata][application_id]':reserved.application_id,'subscription_data[metadata][rep_id]':reserved.rep_id});
 const session=await stripe('/checkout/sessions','POST',form,'oliverfee-sales-'+reserved.id);
 if(typeof session.id!=='string'||!session.id.startsWith('cs_')||typeof session.url!=='string'||new URL(session.url).origin!=='https://checkout.stripe.com')throw new SalesError('Stripe did not return a valid hosted checkout.',502);
 const {error}=await service.rpc('sales_record_checkout',{p_attempt:reserved.id,p_session:session.id,p_url:session.url,p_price:priceId});if(error)throw new SalesError('Checkout was created but could not be saved. Retry the same application; do not create another enrollment.',503);
 return {url:session.url};
}
async function findCustomer(email:string){const service=createAdminClient();for(let page=1;page<=100;page++){const {data,error}=await service.auth.admin.listUsers({page,perPage:1000});if(error)throw new SalesError('Customer identity verification is unavailable.',503);const matches=data.users.filter(u=>u.email?.toLowerCase()===email.toLowerCase());if(matches.length>1)throw new SalesError('Customer identity is ambiguous.',409);if(matches[0])return matches[0];if(data.users.length<1000)return null;}throw new SalesError('Customer identity needs operator review.',503);}
export async function fulfillEvent(event:{id:string;type:string;data:{object:{id:string;metadata?:Record<string,string>}}}){
 if(!['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired','charge.refunded','customer.subscription.updated','customer.subscription.deleted'].includes(event.type))return {ignored:true};
 const service=createAdminClient(),config=paymentConfig();
 if(event.type.startsWith('customer.subscription.')){
  const {data:app,error}=await service.from('sales_applications').select('id').eq('stripe_subscription_id',event.data.object.id).maybeSingle();if(error)throw new SalesError('Subscription lookup failed.',503);if(!app)return {ignored:true};
  const subscription=await stripe('/subscriptions/'+encodeURIComponent(event.data.object.id));
  const {error:saved}=await service.rpc('sales_subscription_state',{p_event:event.id,p_subscription:subscription.id,p_status:subscription.status});if(saved)throw new SalesError('Verified subscription state could not be recorded.',503);return {recorded:true};
 }
 if(event.type==='charge.refunded'){
  const charge=await stripe('/charges/'+encodeURIComponent(event.data.object.id));if(!charge.invoice)return {ignored:true};
  const {data:attempt,error}=await service.from('sales_checkout_attempts').select('*').eq('initial_invoice_id',charge.invoice).maybeSingle();if(error)throw new SalesError('Refund lookup failed.',503);if(!attempt)return {ignored:true};
  const invoice=await stripe('/invoices/'+encodeURIComponent(charge.invoice));if(invoice.charge!==charge.id||charge.currency!=='usd'||charge.amount!==attempt.amount_cents||charge.livemode!==config.live||!Number.isSafeInteger(charge.amount_refunded))throw new SalesError('Refund does not match the initial membership invoice.',409);
  const {error:saved}=await service.rpc('sales_refund',{p_event:event.id,p_invoice:charge.invoice,p_refunded_total:charge.amount_refunded});if(saved)throw new SalesError('Verified refund needs owner review.',503);return {recorded:true};
 }
 const eventObject=event.data?.object;if(!eventObject?.metadata?.sales_attempt_id)return {ignored:true};
 const {data:attempt,error}=await service.from('sales_checkout_attempts').select('*').eq('id',eventObject.metadata.sales_attempt_id).maybeSingle();
 if(error||!attempt||attempt.stripe_session_id!==eventObject.id)throw new SalesError('Checkout does not match a sales reservation.',409);
 if(['paid','refunded'].includes(attempt.status))return {duplicate:true};
 if(['checkout.session.expired','checkout.session.async_payment_failed'].includes(event.type)){
  const remote=await stripe('/checkout/sessions/'+encodeURIComponent(attempt.stripe_session_id));
  if(event.type==='checkout.session.expired'&&remote.status!=='expired')throw new SalesError('Checkout expiration did not verify.',409);
  if(event.type==='checkout.session.async_payment_failed'&&remote.payment_status==='paid')throw new SalesError('A paid session cannot be marked failed.',409);
  const {error:stateError}=await service.rpc('sales_payment_state',{p_event:event.id,p_type:event.type,p_session:attempt.stripe_session_id,p_status:event.type.endsWith('expired')?'expired':'failed'});if(stateError)throw new SalesError('Payment state could not be saved.',503);return {recorded:true};
 }
 if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))return {ignored:true};
 const session=await stripe('/checkout/sessions/'+encodeURIComponent(attempt.stripe_session_id)+'?expand[]=line_items.data.price&expand[]=subscription') as PaidSession;
 if(session.payment_status!=='paid')return {pending:true};
 const subscription=assertPaidSession(session,{attempt:attempt.id,application:attempt.application_id,rep:attempt.rep_id,session:attempt.stripe_session_id,price:attempt.stripe_price_id,amount:attempt.amount_cents,email:attempt.customer_email,live:config.live});
 if(typeof session.invoice!=='string'||!session.invoice.startsWith('in_'))throw new SalesError('The paid membership invoice could not be verified.',409);
 let customer=await findCustomer(attempt.customer_email);
 if(!customer){const {data,error:createError}=await service.auth.admin.createUser({email:attempt.customer_email,email_confirm:false});if(createError)customer=await findCustomer(attempt.customer_email);else customer=data.user;}
 if(!customer)throw new SalesError('Customer account could not be created. The verified payment remains pending onboarding.',503);
 const {data,error:fulfilled}=await service.rpc('sales_fulfill',{p_event:event.id,p_type:event.type,p_attempt:attempt.id,p_session:attempt.stripe_session_id,p_user:customer.id,p_email:attempt.customer_email,p_amount:session.amount_total,p_currency:session.currency,p_subscription:subscription,p_invoice:session.invoice});
 if(fulfilled)throw new SalesError('Payment verified, but customer records require owner review. No duplicate membership was activated.',409);
 return {fulfilled:true,carrier:data};
}
