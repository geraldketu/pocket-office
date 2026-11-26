import fs from 'node:fs';
const workspace='src/components/sales/workspace.tsx',owner='src/components/sales/enrollment.tsx';
let s=fs.readFileSync(workspace,'utf8');s=s.replace('import {LargeLeadImport}',"import {ManualServices} from './manual-services';\nimport {LargeLeadImport}");
const marker='<label className="sales-full">{tr("Approved monthly membership")}';if(!s.includes(marker))throw Error('Missing application field');s=s.replace(marker,'<ManualServices values={form.services.filter(s=>!services.includes(s))} onChange={custom=>{setForm({...form,services:[...form.services.filter(s=>services.includes(s)),...custom]});setDirty(true);}}/>'+marker);fs.writeFileSync(workspace,s);
s=fs.readFileSync(owner,'utf8');s="import {ManualServices} from './manual-services';\n"+s;
const ownerMarker='<div className="sales-actions"><button className="sales-secondary" type="submit" value="draft">';if(!s.includes(ownerMarker))throw Error('Missing owner form');s=s.replace(ownerMarker,'<ManualServices initial={app?.details.services?.filter(s=>!enrollmentServices.includes(s))||[]}/>'+ownerMarker);fs.writeFileSync(owner,s);
