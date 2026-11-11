import test from 'node:test';
import assert from 'node:assert/strict';
import {target,assertReleaseTarget,verifyReleaseTarget} from '../scripts/verify-release-target.mjs';
const project=()=>({id:target.projectId,accountId:target.teamId,name:target.projectName,rootDirectory:null,link:{type:'github',org:'geraldketu',repo:'pocket-office',productionBranch:'main'}});
const domains=()=>[{name:target.domain,projectId:target.projectId,verified:true,gitBranch:null}];
test('release requires the exact Vercel team, project, linked repository, branch and production domain',()=>{
 assert.equal(assertReleaseTarget(project(),domains()),target);
 for(const key of ['id','accountId','name','rootDirectory'])assert.throws(()=>assertReleaseTarget({...project(),[key]:'wrong'},domains()));
 for(const key of ['type','org','repo','productionBranch'])assert.throws(()=>assertReleaseTarget({...project(),link:{...project().link,[key]:'wrong'}},domains()));
 for(const patch of [{name:'other.com'},{projectId:'wrong'},{verified:false},{gitBranch:'feature'},{customEnvironmentId:'preview'},{redirect:'other.com'}])assert.throws(()=>assertReleaseTarget(project(),[{...domains()[0],...patch}]));
 assert.throws(()=>assertReleaseTarget(project(),[]));
});
test('release target verification fails before network access when credentials or repository do not match',async()=>{
 const noFetch=()=>{throw Error('must not fetch');};await assert.rejects(verifyReleaseTarget({},noFetch),/authorization/);
 const env={VERCEL_TOKEN:'test-only',VERCEL_PROJECT_ID:target.projectId,VERCEL_ORG_ID:target.teamId,GITHUB_REPOSITORY:target.repository};
 await assert.rejects(verifyReleaseTarget({...env,GITHUB_REPOSITORY:'other/repo'},noFetch),/does not match/);
 const requests=[];const result=await verifyReleaseTarget(env,async url=>{requests.push(url);return Response.json(url.includes('/domains')?{domains:domains()}:project());});assert.equal(result,target);assert.equal(requests.length,2);assert.ok(requests.every(url=>url.includes(target.projectId)&&url.includes(target.teamId)));
});
