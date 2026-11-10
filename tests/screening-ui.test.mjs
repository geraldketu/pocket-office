import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import * as rules from '../src/lib/screening.ts';
import * as pricing from '../src/lib/interview-rules.ts';
const require=createRequire(import.meta.url);
function compile(path,imports){const source=fs.readFileSync(new URL(path,import.meta.url),'utf8');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};new Function('require','module','exports',js)(id=>imports[id]||require(id),module,module.exports);return module.exports;}
const ui=compile('../src/components/screening-workspace.tsx',{'@/lib/screening':rules});
const {CarrierInterview}=compile('../src/components/carrier-interview.tsx',{'@/components/admin/preview-runtime':{usePreview:()=>null},'@/lib/screening':rules,'@/lib/interview-rules':pricing,'@/components/screening-workspace':ui,'@/app/actions/interview':{submitInterview:()=>{throw Error('No real submissions in UI tests');}}});
function environment(width){
 const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost/carrier-setup',pretendToBeVisual:true});
 const keys=['window','document','HTMLElement','HTMLDialogElement','Event','MouseEvent','IS_REACT_ACT_ENVIRONMENT'];const previous=keys.map(k=>globalThis[k]);
 for(const k of keys)globalThis[k]=k==='IS_REACT_ACT_ENVIRONMENT'?true:dom.window[k];
 Object.defineProperty(dom.window,'innerWidth',{value:width});
 // jsdom has no native dialog implementation: tests verify wiring/content, not browser focus trapping or layout.
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 const root=createRoot(dom.window.document.getElementById('root'));
 return {root,dom,doc:dom.window.document,click:el=>act(()=>el.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}))),change:(el,value)=>act(()=>{el.value=value;el.dispatchEvent(new dom.window.Event('change',{bubbles:true}));}),close:()=>{act(()=>root.unmount());dom.window.close();keys.forEach((k,i)=>previous[i]===undefined?delete globalThis[k]:globalThis[k]=previous[i]);}};
}
for(const width of [390,1280])test(`onboarding state controls, California questions, answer reuse/edit and estimate ? at ${width}px DOM viewport`,()=>{
 const e=environment(width);try{
  act(()=>e.root.render(React.createElement(CarrierInterview,{available:false})));
  const buttons=()=>[...e.doc.querySelectorAll('button')];
  e.click(e.doc.querySelector('input[aria-label="California"]'));assert.equal(e.doc.querySelectorAll('.state-results').length,1);assert.ok(e.doc.querySelector('[data-rule="CA-MCP"]'));assert.ok(e.doc.querySelector('[data-rule="CA-CTC"]'));
  e.click(buttons().find(b=>b.textContent==='Select All 50 States'));assert.equal(e.doc.querySelectorAll('.state-options input:checked').length,50);assert.equal(e.doc.querySelectorAll('.state-results').length,50);
  e.click(buttons().find(b=>b.textContent==='Clear All'));assert.equal(e.doc.querySelectorAll('.state-options input:checked').length,0);assert.equal(e.doc.querySelectorAll('.state-results').length,0);
  e.click(e.doc.querySelector('input[aria-label="California"]'));
  const ca=e.doc.querySelector('[data-rule="CA-CTC"]');e.click(ca.querySelector('.requirement-help'));let dialog=e.doc.querySelector('dialog[open]');assert.ok(dialog);assert.match(dialog.textContent,/Questions to Ask the Carrier/);assert.match(dialog.textContent,/Needs review/);assert.match(dialog.textContent,/Not sure/);assert.ok(dialog.querySelector('a[href*="arb.ca.gov"]'));
  const exception=[...dialog.querySelectorAll('label')].find(l=>l.textContent.includes('Clean Truck Check exception')).querySelector('select');e.change(exception,'No');assert.ok(![...e.doc.querySelectorAll('dialog .call-questions label')].some(l=>l.textContent.includes('Clean Truck Check exception')));
  e.click([...e.doc.querySelectorAll('dialog button')].find(b=>b.textContent==='Review / edit collected answers'));assert.equal([...e.doc.querySelectorAll('dialog label')].find(l=>l.textContent.includes('Clean Truck Check exception')).querySelector('select').value,'No');
  e.click([...e.doc.querySelectorAll('dialog button')].find(b=>b.textContent==='Close'));assert.equal(e.doc.querySelector('dialog'),null);
  e.change(ca.querySelector('select'),'help');const estimate=e.doc.querySelector('.estimate-item');assert.ok(estimate);assert.match(estimate.textContent,/Fee to be confirmed/);e.click(estimate.querySelector('.requirement-help'));assert.match(e.doc.querySelector('dialog').textContent,/Clean Truck Check/);e.click([...e.doc.querySelectorAll('dialog button')].find(b=>b.textContent==='Close'));
  assert.match(e.doc.querySelector('.request-summary').textContent,/All charges must be paid upfront/);assert.match(e.doc.querySelector('.request-summary').textContent,/checkout disabled/);
 }finally{e.close();}
});
for(const width of [390,1280])test(`every rule has working checklist AND estimate question buttons at ${width}px DOM viewport (all 50 states)`,()=>{
 const e=environment(width);try{
  const c={states:rules.STATE_CODES,base:'GA',scope:'Across state lines (interstate)',answers:{},vehicles:[]};const results=rules.screen(c);
  function Harness(){const [active,setActive]=React.useState(null);const buttons=React.useMemo(()=>results.flatMap(r=>['checklist','estimate'].map(location=>React.createElement(ui.HelpButton,{key:r.rule.id+location,result:r,onOpen:setActive,location}))),[]);return React.createElement(React.Fragment,null,...buttons,active&&React.createElement(ui.QuestionPanel,{key:active,result:results.find(r=>r.rule.id===active),context:c,onAnswer:()=>{},onVehicles:()=>{},onContext:()=>{},onClose:()=>setActive(null)}));}
  act(()=>e.root.render(React.createElement(Harness)));
  assert.equal(e.doc.querySelectorAll('.requirement-help').length,results.length*2);
  for(let i=0;i<results.length*2;i++){
   const button=e.doc.querySelectorAll('.requirement-help')[i];assert.ok(button.getAttribute('aria-label').includes('Questions to Ask the Carrier'));assert.equal(button.getAttribute('aria-haspopup'),'dialog');
   e.click(button);const dialog=e.doc.querySelector('dialog[open]');assert.ok(dialog);assert.match(dialog.textContent,/Questions to Ask the Carrier/);assert.ok(dialog.querySelector('.call-questions label'));assert.ok(dialog.querySelector('a[href^="https://"]'));assert.ok(dialog.textContent.includes('Not sure'));
   const r=results[Math.floor(i/2)];assert.ok(dialog.textContent.includes(r.rule.label));assert.ok(dialog.textContent.includes(r.rule.verifiedOn||'not verified'));e.click([...dialog.querySelectorAll('button')].find(b=>b.textContent==='Close'));assert.equal(e.doc.querySelector('dialog'),null);
  }
 }finally{e.close();}
});
