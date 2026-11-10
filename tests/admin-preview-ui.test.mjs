import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url);
function component(file,imports={}){const js=ts.transpileModule(fs.readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};new Function('require','module','exports',js)(id=>imports[id]||require(id),module,module.exports);return module.exports;}
const runtime=component('../src/components/admin/preview-runtime.tsx');
function env(width){const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/admin/preview/session/view/app',pretendToBeVisual:true});const saved=new Map();for(const key of ['window','document','location','MutationObserver','HTMLElement','Event','FormData','IS_REACT_ACT_ENVIRONMENT']){saved.set(key,globalThis[key]);globalThis[key]=key==='IS_REACT_ACT_ENVIRONMENT'?true:dom.window[key];}Object.defineProperty(dom.window,'innerWidth',{value:width});const root=createRoot(document.getElementById('root'));return {dom,root,close(){act(()=>root.unmount());dom.window.close();for(const[key,value]of saved)if(value===undefined)delete globalThis[key];else globalThis[key]=value;}};}
for(const width of [390,1280])test(`preview navigation keeps public/private/dynamic/hash/query links in session at ${width}px`,async()=>{
 const e=env(width);const originalFetch=globalThis.fetch,ops=[];globalThis.fetch=async(url,options)=>{assert.ok(String(url).startsWith('/admin/api/preview/session'));ops.push(JSON.parse(options.body));return new Response(JSON.stringify({ok:true}));};
 try{const paths=['/','/plans#startup','/carrier-setup?package=startup','/app','/admin/carriers/test-carrier-Basic','/documents/test-doc-0/file?download=1','/forgot-password'];act(()=>e.root.render(React.createElement(runtime.PreviewRuntime,{id:'session',role:'Basic',scenario:'populated'},React.createElement('div',null,...paths.map(path=>React.createElement('a',{key:path,href:path},path)),React.createElement('a',{href:'mailto:customer@example.test',id:'external'},'Email')))));
  for(const a of document.querySelectorAll('a:not(#external)'))assert.ok(a.getAttribute('href').startsWith('/admin/preview/session/view'),a.href);assert.equal(document.querySelector('a[href*="documents"]').target,'_self');
  act(()=>document.getElementById('external').dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true})));await act(async()=>{});assert.equal(ops[0].op,'external');assert.match(document.querySelector('[role="status"]').textContent,/blocked/);
 }finally{globalThis.fetch=originalFetch;e.close();}
});
test('actual upload component uses test adapter and does not construct live Supabase client',async()=>{
 const e=env(390);let calls=0,live=0;const Upload=component('../src/components/document-upload-form.tsx',{'@/components/admin/preview-runtime':{usePreview:()=>({call:async(op,data)=>{assert.equal(op,'upload');assert.equal(data.carrierId,'test-company');calls++;return {ok:true};}})},'next/navigation':{useRouter:()=>({refresh(){}})},'@/lib/supabase/client':{createClient:()=>{live++;throw Error('Live provider must not be reached');}}}).DocumentUploadForm;
 try{act(()=>e.root.render(React.createElement(Upload,{carrierId:'test-company',types:[{id:'sample-type',name:'USDOT',renews_every_months:null}]})));const select=document.querySelector('select');act(()=>{select.value='sample-type';select.dispatchEvent(new Event('change',{bubbles:true}));});const file=document.querySelector('input[type=file]');const sample=new window.File(['SAMPLE'],'sample.txt',{type:'text/plain'});Object.defineProperty(file,'files',{value:[sample]});
  // Use the browser FormData interface with an explicit sample File for this isolated DOM.
  const Base=globalThis.FormData;globalThis.FormData=class extends Base{constructor(form){super(form);this.set('file',sample);}};
  await act(async()=>document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.equal(calls,1);assert.equal(live,0);assert.match(document.body.textContent,/Saved USDOT/);
 }finally{e.close();}
});
test('viewport controls and Exit Preview are persistent around the real iframe',async()=>{
 const e=env(1280),originalFetch=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({role:'Basic',events:[]}));
 const Frame=component('../src/components/admin/preview-frame.tsx',{'next/link':{default:({href,children,...props})=>React.createElement('a',{href,...props},children)},'@/lib/admin/policy':{PREVIEW_ROLES:['visitor','Basic','driver','owner'],TEST_PASSWORD:'Test only'}}).PreviewFrame;
 try{act(()=>e.root.render(React.createElement(Frame,{id:'session',initialRole:'Basic',initialPath:'/app',scenario:'populated'})));const buttons=[...document.querySelectorAll('button')];act(()=>buttons.find(b=>b.textContent==='Mobile · 390px').click());assert.equal(document.querySelector('iframe').style.width,'390px');assert.match(document.querySelector('.preview-banner').textContent,/Viewing as Basic/);assert.equal(document.querySelector('a[href="/admin"]').textContent,'Exit Preview');act(()=>buttons.find(b=>b.textContent==='Desktop').click());assert.equal(document.querySelector('iframe').style.width,'100%');
 }finally{globalThis.fetch=originalFetch;e.close();}
});
