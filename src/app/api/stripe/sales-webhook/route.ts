import {verifyStripeSignature} from '@/lib/sales/stripe-verification';
import {fulfillEvent} from '@/lib/sales/payments';
import {drainSalesOutbox} from '@/lib/sales/notifications';
import {salesFailure,SalesError} from '@/lib/sales/server';
import {after} from 'next/server';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){
 const secret=process.env.STRIPE_WEBHOOK_SECRET;if(!secret||process.env.SALES_PAYMENTS_ENABLED!=='true')return Response.json({error:'Sales webhook is not enabled.'},{status:503});
 if(Number(request.headers.get('content-length')||0)>1000000)return Response.json({error:'Webhook too large.'},{status:413});
 const raw=await request.text();if(new TextEncoder().encode(raw).length>1000000)return Response.json({error:'Webhook too large.'},{status:413});
 try{verifyStripeSignature(raw,request.headers.get('stripe-signature')||'',secret);}catch{return Response.json({error:'Invalid webhook signature.'},{status:400});}
 try{
  const event=JSON.parse(raw);if(!event.id||!event.type||!event.data?.object)throw new SalesError('Invalid event.');
  const result=await fulfillEvent(event);if('fulfilled' in result||'recorded' in result||'duplicate' in result){after(async()=>{try{await drainSalesOutbox();}catch{/* The durable owner-visible queue retains notification retries. */}});}
  return Response.json({received:true,...result});
 }catch(e){return salesFailure(e);}
}
