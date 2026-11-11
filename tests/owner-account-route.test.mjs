import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
import * as flow from '../src/lib/account-flow.ts';
const require=createRequire(import.meta.url);
function page(user,profile){
 const module={exports:{}},imports={'next/navigation':{redirect:path=>{throw Error('redirect:'+path);}},'@/lib/auth':{getProfile:async()=>profile},'@/lib/account-flow':flow,'@/lib/admin/owner-account':{designatedOwnerEmail:email=>email?.toLowerCase()==='oliverfee360@gmail.com'},'@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user}})}})},'@/components/account-status':{AccountStatus:()=>null}};
 const source=ts.transpileModule(fs.readFileSync(new URL('../src/app/account/page.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',source)(name=>imports[name]||require(name),module,module.exports);
 return module.exports.default;
}
test('provider owner identity receives admin entry even with missing or stale carrier profile',async()=>{
 for(const profile of [null,{role:'carrier',email:'old@example.test',carrier_id:null}]){const element=await page({email:'oliverfee360@gmail.com'},profile)();assert.equal(element.props.ownerRequested,true);assert.equal(element.props.email,'oliverfee360@gmail.com');}
});
test('ordinary accounts retain their normal routing and admins open admin directly',async()=>{
 const profile={role:'carrier',email:'carrier@example.test',carrier_id:null};const element=await page({email:profile.email},profile)();assert.equal(element.props.ownerRequested,undefined);
 await assert.rejects(page(null,null)(),/redirect:\/login/);
 await assert.rejects(page({email:'oliverfee360@gmail.com'},{role:'admin',carrier_id:null})(),/redirect:\/admin/);
 await assert.rejects(page({email:profile.email},{...profile,carrier_id:'their-company'})(),/redirect:\/app/);
});
