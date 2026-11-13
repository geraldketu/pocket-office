import {callLink} from '@/lib/sales/dnc';
export const dynamic='force-dynamic';
export async function GET(request:Request){return callLink(request);}
