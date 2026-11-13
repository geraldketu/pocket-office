import {redirect} from 'next/navigation';
import SalesLogin from '@/components/sales/login-form';
import {salesEntryDestination} from '@/lib/sales/server';
export const dynamic='force-dynamic';
export default async function SalesLoginPage(){const destination=await salesEntryDestination();if(destination)redirect(destination);return <SalesLogin/>;}
