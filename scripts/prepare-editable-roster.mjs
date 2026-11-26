import fs from 'node:fs';
function edit(path,from,to){const old=fs.readFileSync(path,'utf8');if(!old.includes(from))throw Error('Missing expected source: '+path);fs.writeFileSync(path,old.replace(from,to));}
edit('src/lib/sales/server.ts',"import 'server-only';","import 'server-only';\nimport {representativeRoster} from './representative-roster';");
edit('src/lib/sales/server.ts',"client.from('sales_representatives').select('*').order('name').limit(500)","representativeRoster(client)");
edit('src/components/sales/workspace.tsx',"import {RemoteTeam,DncPanel}","import {DncPanel}");
edit('src/components/sales/workspace.tsx',"<RemoteTeam data={data} busy={busy} preview={preview} save={run}/>",'<section className="sales-panel"><h2>Your sales team</h2><p>Add individual salespeople as your team grows. There is no fixed team-size limit. Each person has a separate email, password and assigned leads.</p><p>{data.representatives.filter(r=>r.status!==\'inactive\').length} salespeople in your roster.</p></section>');
edit('src/components/sales/workspace.tsx',"if(action==='rep-update'){", "if(action==='rep-rename'){const r=next.representatives.find(r=>r.user_id===payload.id);if(r)r.name=String(payload.name).trim();}\n  if(action==='rep-update'){");
edit('src/components/sales/workspace.tsx',"<h2>{r.name}</h2><p>{r.rep_code} · {r.email}</p>",'<h2>{r.name}</h2><label>Salesperson name<input name="representative_name" defaultValue={r.name} minLength={2} maxLength={120} autoComplete="off" required/></label><button type="button" className="sales-secondary" disabled={busy} onClick={e=>{const form=e.currentTarget.form;if(form)void run(\'rep-rename\',{id:r.user_id,name:new FormData(form).get(\'representative_name\')},\'Salesperson name saved.\');}}>Save name</button><p>{r.rep_code} · {r.email}</p>');
for(const path of ['src/components/sales/login-form.tsx','src/app/login/page.tsx']){
 let source=fs.readFileSync(path,'utf8');source=source.replace(/autoComplete="email"/g,'autoComplete="off"').replace(/autoComplete="current-password"/g,'autoComplete="off"');
 source=source.replace('<form className="card space-y-4"','<form autoComplete="off" className="card space-y-4"').replace('<form onSubmit={onSubmit}','<form autoComplete="off" onSubmit={onSubmit}');fs.writeFileSync(path,source);
}
