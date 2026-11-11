import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import * as rules from '../src/lib/interview-rules.ts';
const require=createRequire(import.meta.url),compiled=ts.transpileModule(fs.readFileSync(new URL('../src/components/bid-calculator.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};new Function('require','module','exports',compiled)(name=>name==='@/lib/interview-rules'?rules:require(name),module,module.exports);
const {BidCalculator}=module.exports;
for(const width of [390,1280])test(`actual bid button, editable mileage, costs, recalculation and rate confirmation at ${width}px`,()=>{
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://preview.test/bid-calculator',pretendToBeVisual:true}),saved=new Map();
 for(const key of ['window','document','HTMLElement','Event','FormData','IS_REACT_ACT_ENVIRONMENT']){saved.set(key,globalThis[key]);globalThis[key]=key==='IS_REACT_ACT_ENVIRONMENT'?true:dom.window[key];}
 Object.defineProperty(dom.window,'innerWidth',{value:width});const root=createRoot(document.getElementById('root'));
 try{
  act(()=>root.render(React.createElement(BidCalculator)));
  const field=name=>document.querySelector(`[name="${name}"]`),run=()=>act(()=>document.querySelector('button').click()),quotes=()=>[...document.querySelectorAll('.calc-result b')].map(x=>x.textContent);
  assert.match(field('miles').closest('label').textContent,/Total trip mileage \(miles\)/);assert.equal(field('miles').disabled,false);assert.equal(field('miles').readOnly,false);
  for(const [name,value]of Object.entries({offer:500,miles:300,rate:2.5,tolls:50,other:0}))field(name).value=String(value);
  run();assert.deepEqual(quotes(),['$550.00','$675.00','$800.00']);
  field('miles').value='400';run();assert.deepEqual(quotes(),['$550.00','$800.00','$1,050.00']);
  field('other').value='25';run();assert.deepEqual(quotes(),['$575.00','$825.00','$1,075.00']);
  field('rate').value='30';run();assert.match(document.querySelector('[role="alert"]').textContent,/above \$25/);assert.deepEqual(quotes(),[]);
  act(()=>field('confirmed').click());run();assert.deepEqual(quotes(),['$575.00','$6,325.00','$12,075.00']);assert.equal(document.querySelector('[role="alert"]'),null);
  field('miles').value='0';act(()=>document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.deepEqual(quotes(),[]);
  field('rate').value='2.5';field('miles').value='300';run();assert.deepEqual(quotes(),['$575.00','$700.00','$825.00']);
  field('tolls').value='-1';act(()=>document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.match(document.querySelector('[role="alert"]').textContent,/valid, non-negative/);assert.deepEqual(quotes(),[]);
 }finally{act(()=>root.unmount());dom.window.close();for(const [key,value]of saved)if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});
test('bid midpoint stays finite for large finite amounts and preserves quote ordering',()=>{
 const result=rules.calculateBid(1e308,1,1,0,0);assert.ok(Object.values(result).every(Number.isFinite));assert.equal(result.middle,1e308);
 for(const values of [[0,1,.01,0,0],[1000,300,2.5,50,25],[.1,3,.2,.03,.04]]){const q=rules.calculateBid(...values);assert.ok(q.minimum<=q.middle&&q.middle<=q.goal);}
});
