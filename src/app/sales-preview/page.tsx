import {notFound} from 'next/navigation';
import {SalesWorkspace} from '@/components/sales/workspace';
import {remoteSalesDemo} from '@/lib/sales/demo';
import '../sales/sales.css';
export const dynamic='force-dynamic';
export default async function Preview({searchParams}:{searchParams:Promise<{view?:string;rep?:string}>}){if(process.env.NODE_ENV==='production')notFound();const q=await searchParams,management=q.view==='management',agent=Number(q.rep||0);return <SalesWorkspace key={q.view+'-'+q.rep} initial={remoteSalesDemo(Number.isInteger(agent)?agent:0,management)} management={management} preview/>;}
