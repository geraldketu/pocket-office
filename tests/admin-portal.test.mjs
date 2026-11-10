import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isOwner,labEnabled,previewAccess,PREVIEW_ROLES,startPage,safePreviewPath,roleProfile} from '../src/lib/admin/policy.ts';
import {sameOrigin,loopbackHost} from '../src/lib/admin/http.ts';
test('owner access fails closed: role alone, email, preview role, and missing allowlist do not grant access',()=>{
 const owner={id:'owner-uuid',email:'owner@example.test',role:'admin'};
 assert.equal(isOwner(owner,'owner-uuid'),true);assert.equal(isOwner(owner,''),false);assert.equal(isOwner({...owner,id:'another-admin'},'owner-uuid'),false);for(const role of ['carrier','driver','salesperson','owner'])assert.equal(isOwner({...owner,role},'owner-uuid'),false);assert.equal(isOwner(null,'owner-uuid'),false);
});
test('lab bypass is opt-in development only and never enabled in production',()=>{
 assert.equal(labEnabled({NODE_ENV:'production',OLIVERFEE_ADMIN_LAB:'1'}),false);assert.equal(labEnabled({NODE_ENV:'development'}),false);assert.equal(labEnabled({NODE_ENV:'development',OLIVERFEE_ADMIN_LAB:'1'}),true);
});
test('role switch starting paths and permissions use test actor, not owner actor',()=>{
 for(const role of PREVIEW_ROLES){assert.ok(startPage(role).startsWith('/'));assert.equal(previewAccess(role,'/admin/overview'),role==='owner');if(['Basic','Pro','Premium','Ultimate','new-customer','driver'].includes(role)){assert.equal(startPage(role),'/app');assert.equal(previewAccess(role,'/app'),true);}if(role.startsWith('archive-'))assert.equal(startPage(role),'/archive#member');}
 assert.equal(roleProfile('driver').role,'driver');assert.equal(previewAccess('visitor','/app'),false);assert.equal(previewAccess('salesperson','/admin/leads'),false);
});
test('same-origin and loopback checks reject cross-site / DNS-rebinding targets',()=>{
 assert.equal(sameOrigin(new Request('http://localhost:3004',{headers:{Origin:'http://localhost:3004',Host:'localhost:3004'}})),true);assert.equal(sameOrigin(new Request('http://localhost:3004',{headers:{Origin:'https://evil.test',Host:'localhost:3004'}})),false);assert.equal(loopbackHost(new Request('http://localhost',{headers:{Host:'evil.test'}})),false);
});
test('preview paths cannot escape to another origin or session API',()=>{
 for(const value of ['https://evil.test','//evil.test','/\\evil.test','/admin/api/overview','/admin/preview/other/view/app'])assert.equal(safePreviewPath(value),'/');assert.equal(safePreviewPath('/plans#startup'),'/plans#startup');
});
test('inventory covers actual routes and all original archived screen keys, without claiming missing pages exist',()=>{
 const inventory=JSON.parse(fs.readFileSync(new URL('../src/lib/admin/inventory.json',import.meta.url),'utf8')).entries;
 const paths=['/','/plans','/carrier-setup','/bid-calculator','/login','/forgot-password','/set-password','/dashboard','/app','/admin','/admin/leads','/admin/carriers/[id]','/documents/[id]/file','/auth/confirm','/auth/signout','/admin/overview'];for(const path of paths)assert.ok(inventory.some(e=>e.path===path&&e.status==='live'),path);
 assert.equal(inventory.filter(e=>e.id.startsWith('archive:')).length,15);assert.equal(inventory.find(e=>e.path==='/checkout').status,'missing');assert.ok(inventory.every(e=>e.previewPath&&e.role&&e.steps));
});
test('live admin mutation exports are guarded read-only and have no database/email provider',()=>{
 const source=fs.readFileSync(new URL('../src/app/admin/actions.ts',import.meta.url),'utf8');assert.ok(source.includes('requireOwner'));assert.ok(!source.includes('createAdminClient'));assert.ok(!source.includes('sendEmail'));assert.ok(source.includes('read-only'));
 const legacy=fs.readFileSync(new URL('../src/lib/admin/legacy.ts',import.meta.url),'utf8');assert.ok(legacy.includes('STRIPE_CHECKOUT_ENABLED:"false"'));assert.ok(!legacy.includes('process.env.STRIPE'));assert.ok(legacy.includes('new DatabaseSync(":memory:")'));
});
