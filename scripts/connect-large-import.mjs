import fs from 'node:fs';
const file='src/components/sales/workspace.tsx';let s=fs.readFileSync(file,'utf8');
s=s.replace('import {CallWorkflow}',"import {LargeLeadImport} from './large-import';\nimport {BulkLeadAssignment} from './bulk-assignment';\nimport {CallWorkflow}");
const start=s.indexOf('<section className="sales-panel"><div className="sales-panel-title"><h2>FMCSA CSV import</h2>'),end=s.indexOf('<section className="sales-panel"><h2>Assign / reassign prospects</h2>',start);
if(start<0||end<0)throw Error('Import panel not found');
s=s.slice(0,start)+'<LargeLeadImport preview={preview} onComplete={()=>refresh(0)}/><BulkLeadAssignment representatives={data.representatives} preview={preview} onComplete={()=>refresh()}/>'+s.slice(end);
s=s.replace(",[csv,setCsv]=useState(''),[importResult,setImportResult]=useState<Record<string,unknown>|null>(null)",",[,setImportResult]=useState<Record<string,unknown>|null>(null)");
fs.writeFileSync(file,s);
