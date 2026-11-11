import test from 'node:test';
import assert from 'node:assert/strict';
import {OWNER_EMAIL,ownerInvitation} from '../scripts/owner-invitation.mjs';

const origin='https://pocket-office-owner-preview-sturdi-home.vercel.app';
function provider({users=[],admins=[],profile=null,sendError=false,profileError=false}={}){
 const calls=[];
 const client={from(table){assert.equal(table,'profiles');return {select(){return {eq(key,value){return key==='role'?Promise.resolve({data:admins}):{maybeSingle:async()=>({data:profile})};}};},async upsert(value){calls.push(['profile',value]);return {error:profileError?Error('test'):null};}};},auth:{admin:{async listUsers(){return {data:{users}};},async inviteUserByEmail(email,options){calls.push(['invite',email,options]);return {data:{user:{id:'owner-1',email}},error:sendError?Error('test'):null};}},async resetPasswordForEmail(email,options){calls.push(['recovery',email,options]);return {error:sendError?Error('test'):null};}}};
 return {client,calls};
}
test('owner invitation audit is read-only and pinned to the confirmed owner email',async()=>{
 const {client,calls}=provider();const status=await ownerInvitation(client,{origin});assert.equal(status.email,'oliverfee360@gmail.com');assert.equal(status.accountExists,false);assert.equal(status.invitationSent,false);assert.deepEqual(calls,[]);
});
test('new owner receives provider invitation without a password, only after template verification',async()=>{
 const p=provider();await assert.rejects(ownerInvitation(p.client,{origin,send:true}),/templates/);assert.deepEqual(p.calls,[]);
 const status=await ownerInvitation(p.client,{origin,send:true,templatesVerified:true});assert.equal(status.invitationSent,true);assert.equal(status.flow,'invite');assert.deepEqual(p.calls,[['invite',OWNER_EMAIL,{redirectTo:origin+'/auth/confirm'}],['profile',{id:'owner-1',email:OWNER_EMAIL,role:'admin',carrier_id:null}]]);
});
test('existing owner uses secure recovery and preserves identity without creating a second account',async()=>{
 const user={id:'owner-1',email:OWNER_EMAIL,email_confirmed_at:'verified'},p=provider({users:[user],admins:[{...user,role:'admin',carrier_id:null}],profile:{...user,role:'admin',carrier_id:null}});
 const status=await ownerInvitation(p.client,{origin,send:true,templatesVerified:true,ownerIds:'owner-1'});assert.equal(status.flow,'recovery');assert.equal(status.emailVerified,true);assert.equal(p.calls.some(c=>c[0]==='invite'),false);assert.deepEqual(p.calls.at(-1),['recovery',OWNER_EMAIL,{redirectTo:origin+'/auth/confirm'}]);
});
test('wrong administrator, stale allowlist, linked carrier and ambiguous identities fail closed',async()=>{
 for(const config of [{admins:[{id:'other',email:'other@example.test'}]},{admins:[{id:'one',email:OWNER_EMAIL},{id:'two',email:OWNER_EMAIL}]},{users:[{id:'owner-1',email:OWNER_EMAIL}],profile:{email:OWNER_EMAIL,carrier_id:'live-carrier'}},{users:[{id:'one',email:OWNER_EMAIL},{id:'two',email:OWNER_EMAIL}]}]){const p=provider(config);await assert.rejects(ownerInvitation(p.client,{origin,send:true,templatesVerified:true}));assert.deepEqual(p.calls,[]);}
 const p=provider();await assert.rejects(ownerInvitation(p.client,{origin,send:true,templatesVerified:true,ownerIds:'old-owner'}),/allowlist/);assert.deepEqual(p.calls,[]);
 for(const bad of ['https://oliverfee360.com.evil.test','http://pocket-office-test.vercel.app','https://evil.test','https://pocket-office-test.vercel.app/redirect','https://pocket-office-test.vercel.app?redirect=evil'])await assert.rejects(ownerInvitation(p.client,{origin:bad}));
});
test('provider and profile failures never report a successful owner invitation',async()=>{
 for(const opts of [{sendError:true},{profileError:true}]){const p=provider(opts);await assert.rejects(ownerInvitation(p.client,{origin,send:true,templatesVerified:true}));}
});

test('production owner setup uses the existing OliverFee360 domain and provider flow',async()=>{const p=provider();const status=await ownerInvitation(p.client,{origin:'https://oliverfee360.com',send:true,templatesVerified:true});assert.equal(status.invitationSent,true);assert.deepEqual(p.calls[0],['invite',OWNER_EMAIL,{redirectTo:'https://oliverfee360.com/auth/confirm'}]);});
