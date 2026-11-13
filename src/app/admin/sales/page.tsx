import {requireOwner} from '@/lib/admin/owner';
import {salesData} from '@/lib/sales/server';
import {SalesWorkspace} from '@/components/sales/workspace';
import '../../sales/sales.css';
export const dynamic='force-dynamic';
export default async function SalesManagement(){await requireOwner();try{return <SalesWorkspace initial={await salesData(true)} management/>;}catch{return <section className="card"><h1>Sales Management setup</h1><p>The existing Admin Portal is intact. The additive sales database migration and configuration must be installed before live sales records can load.</p><p>Preview work does not apply migrations or create real representative accounts.</p></section>;}}
