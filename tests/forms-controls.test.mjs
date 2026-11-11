import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
import React,{act} from 'react';

import {JSDOM} from 'jsdom';
import * as accountFlow from '../src/lib/account-flow.ts';
import * as policy from '../src/lib/admin/policy.ts';
const inventory=JSON.parse(fs.readFileSync(new URL('../src/lib/admin/inventory.json',import.meta.url),'utf8'));
// Initialize the browser event feature checks before importing ReactDOM.
const bootstrap=new JSDOM('<!doctype html>'),initialWindow=globalThis.window,initialDocument=globalThis.document;
globalThis.window=bootstrap.window;globalThis.document=bootstrap.window.document;
const {createRoot}=await import('react-dom/client');
if(initialWindow===undefined)delete globalThis.window;else globalThis.window=initialWindow;
if(initialDocument===undefined)delete globalThis.document;else globalThis.document=initialDocument;bootstrap.window.close();
const require=createRequire(import.meta.url);
function component(file,preview,extra={}){
 const source=ts.transpileModule(fs.readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,module={exports:{}};
 const imports={'@/lib/account-flow':accountFlow,'@/components/admin/preview-runtime':{usePreview:()=>preview},'@/lib/config':{authConfigured:()=>false},'@/components/site-shell':{Brand:()=>React.createElement('a',{href:'/'},'OliverFee 360')},'next/navigation':{useRouter:()=>({refresh(){},replace(){throw Error('Live router must not be reached');}})},'@/lib/supabase/client':{createClient(){throw Error('Live SDK must not be reached');}},'next/link':{default:({children,href,...props})=>React.createElement('a',{href,...props},children)},'@/app/actions/leads':{submitContact(){throw Error('Live contact must not be reached');}}};
 new Function('require','module','exports',source)(name=>extra[name]||imports[name]||require(name),module,module.exports);return module.exports;
}
function environment(width){
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://preview.test/admin/preview/test/view/login',pretendToBeVisual:true}),saved=new Map();
 for(const key of ['window','document','HTMLElement','Event','FormData','IS_REACT_ACT_ENVIRONMENT']){saved.set(key,globalThis[key]);globalThis[key]=key==='IS_REACT_ACT_ENVIRONMENT'?true:dom.window[key];}Object.defineProperty(window,'innerWidth',{value:width});const root=createRoot(document.getElementById('root'));
 return {root,input(name,value){document.querySelector(`[name="${name}"]`).value=value;},async click(text){const button=[...document.querySelectorAll('button')].find(x=>x.textContent.includes(text));assert.ok(button,text);await act(async()=>{button.click();await new Promise(r=>setTimeout(r,0));});},close(){act(()=>root.unmount());dom.window.close();for(const [key,value]of saved)if(value===undefined)delete globalThis[key];else globalThis[key]=value;}};
}
for(const width of [390,1280]){
 test(`real login/password/recovery controls use test transport and recover from errors at ${width}px`,async()=>{
  const e=environment(width),calls=[],paths=[];let fail=false;
  const preview={scenario:'populated',call:async(op,data)=>{calls.push({op,data});if(fail)throw Error('Simulated failure');return {ok:true};},navigate:path=>paths.push(path)};
  try{
   const Login=component('../src/app/login/page.tsx',preview).default;act(()=>e.root.render(React.createElement(Login)));e.input('email','basic@example.test');e.input('password','Preview-Only-2026!');fail=true;await e.click('Sign in');assert.match(document.body.textContent,/Wrong email or password/);assert.equal(document.querySelector('button').disabled,false);fail=false;await e.click('Sign in');assert.equal(calls.at(-1).op,'login');assert.equal(paths.at(-1),'/dashboard');
   const Password=component('../src/app/set-password/page.tsx',preview).default;act(()=>e.root.render(React.createElement(Password)));e.input('password','short');e.input('confirm','short');await e.click('Save password');assert.match(document.body.textContent,/at least 10/);e.input('password','Preview-Only-2026!');e.input('confirm','Different-2026!');await e.click('Save password');assert.match(document.body.textContent,/don't match/);e.input('confirm','Preview-Only-2026!');await e.click('Save password');assert.equal(calls.at(-1).op,'password');assert.equal(paths.at(-1),'/dashboard');
   const Forgot=component('../src/app/forgot-password/page.tsx',preview).default;act(()=>e.root.render(React.createElement(Forgot)));e.input('email','basic@example.test');fail=true;await e.click('Send reset');assert.match(document.querySelector('[role="alert"]').textContent,/try again/);assert.equal(document.querySelector('button').disabled,false);fail=false;await e.click('Send reset');assert.equal(calls.at(-1).op,'recovery');assert.match(document.body.textContent,/If that email has an account/);
  }finally{e.close();}
 });
 test(`real contact submit button saves only a test request at ${width}px`,async()=>{
  const e=environment(width),calls=[];const preview={scenario:'populated',call:async(op,data)=>{calls.push({op,data});return {ok:true,message:'Test request saved unpaid'};}};
  try{const Contact=component('../src/components/contact-form.tsx',preview).ContactForm;act(()=>e.root.render(React.createElement(Contact)));e.input('name','Sample Carrier');e.input('company','Test Transport');e.input('email','sample@example.test');await e.click('Get my free');assert.equal(calls.length,1);assert.equal(calls[0].op,'contact');assert.equal(calls[0].data.company,'Test Transport');assert.match(document.body.textContent,/saved unpaid/);}finally{e.close();}
 });
}

for(const width of [390,1280]){
 test('Site Explorer search, area filter and role/item launch buttons at '+width+'px',async()=>{
  const e=environment(width),before=globalThis.fetch,calls=[];globalThis.fetch=async(url,init)=>{assert.equal(url,'/admin/api/preview');calls.push(JSON.parse(init.body));return Response.json({error:'Test transport retry message'},{status:503});};
  const set=(element,value)=>act(()=>{const descriptor=Object.getOwnPropertyDescriptor(element.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype,'value');descriptor.set.call(element,value);element.dispatchEvent(new Event(element.tagName==='SELECT'?'change':'input',{bubbles:true}));});
  try{
   const Explorer=component('../src/components/admin/site-explorer.tsx',null,{'@/lib/admin/inventory.json':{default:inventory},'@/lib/admin/policy':policy}).SiteExplorer;act(()=>e.root.render(React.createElement(Explorer)));
   assert.equal(document.querySelectorAll('.explorer-entry').length,inventory.entries.length);
   const search=document.querySelector('.admin-filters input');set(search,'bid');assert.ok(document.querySelectorAll('.explorer-entry').length>0);assert.ok(document.querySelectorAll('.explorer-entry').length<inventory.entries.length);set(search,'');
   set(document.querySelector('.admin-filters select'),'Driver portal');assert.ok(document.querySelectorAll('.explorer-entry').length>0);assert.ok([...document.querySelectorAll('.explorer-entry')].every(x=>x.textContent.includes('Driver portal')));set(document.querySelector('.admin-filters select'),'All');
   set(document.querySelector('.admin-launch select'),'driver');await e.click('Start role');assert.equal(calls.at(-1).role,'driver');assert.match(document.querySelector('[role="alert"]').textContent,/retry/);assert.equal(document.querySelector('.admin-launch button').disabled,false);
   await act(async()=>{document.querySelector('[data-entry="route:/bid-calculator"] button').click();await new Promise(r=>setTimeout(r,0));});assert.equal(calls.at(-1).path,'/bid-calculator');assert.equal(calls.at(-1).role,'visitor');
  }finally{globalThis.fetch=before;e.close();}
 });
 test('lead add/save buttons work in preview and live records are read-only at '+width+'px',async()=>{
  const e=environment(width),calls=[];let refreshes=0;const preview={call:async(op,data)=>{calls.push({op,data});return {ok:true};}};
  const lead={id:'test-lead',name:'Sample',company:'Test',email:'test@example.test',phone:null,source:'preview',status:'new',quoted_price:1250,notes:'test',created_at:'2026-11-10',message:'test',usdot:'TEST'};
  try{
   const router={'next/navigation':{useRouter:()=>({refresh(){refreshes++;}})}},Desk=component('../src/components/admin/lead-desk.tsx',preview,router).LeadDesk;act(()=>e.root.render(React.createElement(Desk,{leads:[lead]})));
   e.input('name','Test lead');await e.click('Add lead');assert.equal(calls.at(-1).op,'addLead');e.input('notes','Updated test note');e.input('status','quoted');await e.click('Save test record');assert.equal(calls.at(-1).op,'updateLead');assert.equal(calls.at(-1).data.id,lead.id);assert.equal(calls.at(-1).data.notes,'Updated test note');assert.equal(calls.at(-1).data.status,'quoted');assert.equal(refreshes,2);
   const ReadOnly=component('../src/components/admin/lead-desk.tsx',null,router).LeadDesk;act(()=>e.root.render(React.createElement(ReadOnly,{leads:[lead]})));assert.equal(document.querySelectorAll('button').length,0);assert.ok([...document.querySelectorAll('select,input,textarea')].filter(x=>x.type!=='hidden').every(x=>x.disabled));
  }finally{e.close();}
 });
}

for(const width of [390,1280])test('Create account controls validate, retry and confirm safely at '+width+'px',async()=>{
 const e=environment(width),calls=[];let fail=true;
 const preview={scenario:'populated',call:async(op,data)=>{calls.push({op,data});if(fail)throw Error('Test signup failed');return {confirmationPath:'/auth/confirm?token_hash=test-signup&type=signup&next=/account'};}};
 try{const Signup=component('../src/app/signup/page.tsx',preview).default;act(()=>e.root.render(React.createElement(Signup)));e.input('name','Test Carrier');e.input('email','test@example.test');e.input('password','Preview-Only-2026!');e.input('confirm','Different-2026!');await e.click('Create account');assert.match(document.body.textContent,/don't match/);assert.equal(calls.length,0);e.input('confirm','Preview-Only-2026!');await e.click('Create account');assert.match(document.body.textContent,/Test signup failed/);assert.equal(document.querySelector('button').disabled,false);fail=false;await e.click('Create account');assert.equal(calls.at(-1).op,'signup');assert.match(document.body.textContent,/Check your inbox/);assert.match(document.querySelector('a[href*="token_hash"]').href,/test-signup/);assert.match(document.body.textContent,/does not grant admin access/);}finally{e.close();}
});
test('signup payload cannot grant privileges and routing isolates pending accounts',()=>{
 const p=accountFlow.signupPayload(' Test Carrier ','TEST@example.test','Preview-Only-2026!','https://oliverfee360.com');assert.deepEqual(p.options.data,{full_name:'Test Carrier'});assert.equal(p.email,'test@example.test');assert.match(p.options.emailRedirectTo,/oliverfee360.com\/auth\/confirm/);assert.throws(()=>accountFlow.signupPayload('X','invalid','short','https://example.test'));assert.equal(accountFlow.accountDestination({role:'carrier'}),'/account');assert.equal(accountFlow.accountDestination({role:'admin'}),'/admin');assert.equal(accountFlow.accountDestination({role:'carrier',carrier_id:'linked'}),'/app');assert.equal(accountFlow.accountDestination(null),'/login');for(const path of ['https://evil.test','//evil.test','/%2f%2fevil.test','/\\evil.test','/%00bad'])assert.equal(accountFlow.safeAuthPath(path),'/dashboard');assert.equal(accountFlow.safeAuthPath('/account'),'/account');
});

for(const width of [390,1280])test('Owner and staff login uses only email/password and owner redirect at '+width+'px',async()=>{
 const e=environment(width),calls=[],paths=[];
 try{const Login=component('../src/app/login/page.tsx',null,{'@/lib/config':{authConfigured:()=>true},'@/lib/supabase/client':{createClient:()=>({auth:{signInWithPassword:async value=>{calls.push(value);return {error:null};}}})},'next/navigation':{useRouter:()=>({replace:path=>paths.push(path),refresh(){}})}}).default;act(()=>e.root.render(React.createElement(Login)));e.input('email','oliverfee360@gmail.com');e.input('password','Chosen-By-Owner-Only!');await e.click('Sign in with email');assert.deepEqual(calls,[{email:'oliverfee360@gmail.com',password:'Chosen-By-Owner-Only!'}]);assert.equal(paths.at(-1),'/dashboard');assert.equal(accountFlow.accountDestination({role:'admin',carrier_id:null}),'/admin');assert.match(document.body.textContent,/No ChatGPT account or matching ChatGPT email is required/);assert.match(document.body.textContent,/Owner & Staff Login/);
 const Shell=component('../src/components/site-shell.tsx',null,{'next/navigation':{usePathname:()=>'/login'}}).SiteShell;act(()=>e.root.render(React.createElement(Shell,null,'Test page')));assert.ok([...document.querySelectorAll('a[href="/login"]')].some(a=>a.textContent.includes('Owner & Staff Login')));
 }finally{e.close();}
});

for(const width of [390,1280])test('Owner chooses own password, network failure permits retry, then opens dashboard at '+width+'px',async()=>{
 const e=environment(width),calls=[],paths=[];let fail=true;
 try{const Password=component('../src/app/set-password/page.tsx',null,{'@/lib/supabase/client':{createClient:()=>({auth:{updateUser:async value=>{calls.push(value);if(fail)throw Error('Temporary test network failure');return {error:null};}}})},'next/navigation':{useRouter:()=>({replace:path=>paths.push(path),refresh(){}})}}).default;act(()=>e.root.render(React.createElement(Password)));e.input('password','My-Own-Chosen-Password!');e.input('confirm','My-Own-Chosen-Password!');await e.click('Save password');assert.match(document.body.textContent,/Temporary test network failure/);assert.equal(document.querySelector('button').disabled,false);fail=false;await e.click('Save password');assert.deepEqual(calls.at(-1),{password:'My-Own-Chosen-Password!'});assert.equal(paths.at(-1),'/dashboard');}finally{e.close();}
});
