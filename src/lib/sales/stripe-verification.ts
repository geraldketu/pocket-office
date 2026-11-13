import {createHmac,timingSafeEqual} from 'node:crypto';
export function verifyStripeSignature(raw:string,header:string,secret:string,now=Math.floor(Date.now()/1000)){
 const pairs=header.split(',').map(x=>x.trim().split('=')),timestamp=pairs.find(([k])=>k==='t')?.[1];
 if(!secret||!timestamp||!/^\d+$/.test(timestamp)||Math.abs(now-Number(timestamp))>300)throw Error('Invalid or expired webhook signature.');
 const expected=createHmac('sha256',secret).update(timestamp+'.'+raw).digest();
 const valid=pairs.filter(([k])=>k==='v1').some(([,sig])=>/^[a-f0-9]{64}$/i.test(sig||'')&&timingSafeEqual(Buffer.from(sig,'hex'),expected));
 if(!valid)throw Error('Invalid or expired webhook signature.');
}
export type QuotedLine={key:string;description:string;kind:string;quantity:number;unit_cents:number|null;source?:string};
export type PaidSession={id:string;mode:string;payment_status:string;amount_total:number;currency:string;livemode:boolean;client_reference_id:string;invoice?:string;customer_details?:{email?:string};metadata?:Record<string,string>;line_items?:{data:{quantity:number;price:{id:string;unit_amount:number;currency:string;recurring?:{interval:string;interval_count:number};product?:{metadata?:Record<string,string>}}}[]};subscription?:string|{id:string;status:string;metadata?:Record<string,string>}};
export function assertPaidSession(session:PaidSession,expected:{attempt:string;application:string;rep:string|null;session:string;price:string;amount:number;email:string;live:boolean;monthly?:number;quote?:string;extras?:QuotedLine[]}){
 const sub=typeof session.subscription==='object'?session.subscription:null,line=session.line_items?.data;
 const extra=expected.extras||[],membership=line?.find(l=>l.price.id===expected.price),used=new Set<string>();let total=expected.monthly??expected.amount;
 if(session.id!==expected.session||session.mode!=='subscription'||session.payment_status!=='paid'||session.amount_total!==expected.amount||session.currency!=='usd'||session.livemode!==expected.live||session.client_reference_id!==expected.application||session.customer_details?.email?.toLowerCase()!==expected.email.toLowerCase()||session.metadata?.sales_attempt_id!==expected.attempt||session.metadata?.application_id!==expected.application||session.metadata?.rep_id!==(expected.rep||'owner')||!sub||sub.status!=='active'||sub.metadata?.sales_attempt_id!==expected.attempt||!line||line.length!==extra.length+1||!membership||membership.quantity!==1||membership.price.unit_amount!==(expected.monthly??expected.amount)||membership.price.currency!=='usd'||membership.price.recurring?.interval!=='month'||membership.price.recurring?.interval_count!==1||expected.quote&&session.metadata?.quote_id!==expected.quote)throw Error('Payment does not match the approved enrollment. Owner review is required.');
 for(const item of line.filter(l=>l!==membership)){const metadata=item.price.product?.metadata,key=metadata?.quote_line_key;const quoted=extra.find(e=>e.key===key);if(!quoted||!key||used.has(key)||metadata?.quote_id!==expected.quote||item.quantity!==quoted.quantity||item.price.unit_amount!==quoted.unit_cents||item.price.currency!=='usd'||item.price.recurring||!Number.isSafeInteger(quoted.unit_cents)||Number(quoted.unit_cents)<0)throw Error('Service payment does not match the owner-approved quote.');used.add(key);total+=Number(quoted.unit_cents)*quoted.quantity;}
 if(total!==expected.amount)throw Error('Quote and payment totals do not match.');
 return sub.id;
}
