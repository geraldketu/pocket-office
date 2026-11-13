import {notFound} from 'next/navigation';
import {SalesWorkspace} from '@/components/sales/workspace';
import {demoSalesData} from '@/lib/sales/demo';
import '../sales/sales.css';
export const dynamic='force-dynamic';
export default async function Preview({searchParams}:{searchParams:Promise<{view?:string}>}){if(process.env.NODE_ENV==='production')notFound();return <SalesWorkspace initial={demoSalesData()} management={(await searchParams).view==='management'} preview/>;}
