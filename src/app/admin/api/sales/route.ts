import {getSales,postSales} from '@/lib/sales/api';
export const dynamic='force-dynamic';
export async function GET(request:Request){return getSales(request,true);}
export async function POST(request:Request){return postSales(request,true);}
