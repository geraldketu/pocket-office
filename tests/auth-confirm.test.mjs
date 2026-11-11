import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as accountFlow from '../src/lib/account-flow.ts';

function confirmation(auth,configured=true){
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(new URL('../src/app/auth/confirm/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const imports={'next/server':{NextResponse:{redirect:url=>new Response(null,{status:307,headers:{Location:String(url)}})}},'@/lib/supabase/server':{createClient:async()=>({auth})},'@/lib/account-flow':accountFlow,'@/lib/config':{authConfigured:()=>configured}};
 new Function('require','module','exports',code)(name=>{assert.ok(imports[name],name);return imports[name];},module,module.exports);
 return async path=>module.exports.GET({url:'https://pocket-office-test.vercel.app'+path,nextUrl:new URL('https://pocket-office-test.vercel.app'+path)});
}
test('private invitation verifies one-time token and opens password setup; reuse and expiration fail closed',async()=>{
 const used=new Set(),calls=[];
 const get=confirmation({async verifyOtp(value){calls.push(value);const invalid=value.token_hash!=='synthetic-one-time-token'||used.has(value.token_hash);used.add(value.token_hash);return {error:invalid?Error('expired'):null};}});
 const path='/auth/confirm?token_hash=synthetic-one-time-token&type=invite&next=/set-password';
 assert.equal((await get(path)).headers.get('location'),'https://pocket-office-test.vercel.app/set-password');
 assert.equal((await get(path)).headers.get('location'),'https://pocket-office-test.vercel.app/login?error=link-expired');
 assert.equal((await get(path.replace('synthetic-one-time-token','expired'))).headers.get('location'),'https://pocket-office-test.vercel.app/login?error=link-expired');
 assert.deepEqual(calls[0],{type:'invite',token_hash:'synthetic-one-time-token'});
});
test('password recovery callback supports PKCE and rejects external next redirects or absent credentials',async()=>{
 const get=confirmation({async exchangeCodeForSession(code){assert.equal(code,'test-code');return {error:null};}});
 assert.equal((await get('/auth/confirm?code=test-code&next=/set-password')).headers.get('location'),'https://pocket-office-test.vercel.app/set-password');
 assert.equal((await get('/auth/confirm?code=test-code&next=https://evil.test')).headers.get('location'),'https://pocket-office-test.vercel.app/dashboard');
 assert.match((await get('/auth/confirm')).headers.get('location'),/link-expired/);
 assert.match((await confirmation({},false)('/auth/confirm?code=test-code')).headers.get('location'),/unavailable/);
});
