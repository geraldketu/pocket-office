import {pathToFileURL} from 'node:url';

export const target=Object.freeze({repository:'geraldketu/pocket-office',branch:'main',teamId:'team_YfLkM1POJwWxWzlQca1W2A5l',projectId:'prj_2R7l9Fvg6cBUxlqKlGFzS5Txqm7x',projectName:'pocket-office',domain:'oliverfee360.com'});
export function assertReleaseTarget(project,domains){
 if(project.id!==target.projectId||project.accountId!==target.teamId||project.name!==target.projectName)throw Error('Wrong Vercel project/team. Deployment stopped.');
 if(project.link?.type!=='github'||`${project.link.org}/${project.link.repo}`!==target.repository||project.link.productionBranch!==target.branch)throw Error('Vercel must be linked to geraldketu/pocket-office with production branch main. Deployment stopped.');
 if(project.rootDirectory&&!['.','./'].includes(project.rootDirectory))throw Error('Vercel root directory must be the existing Next.js repository root. Deployment stopped.');
 const domain=domains.find(d=>d.name===target.domain);
 if(!domain||domain.projectId!==target.projectId||domain.verified!==true||domain.customEnvironmentId||domain.gitBranch&&domain.gitBranch!==target.branch)throw Error('oliverfee360.com is not verified on this production project. No domain settings were changed.');
 if(domain.redirect&&!['oliverfee360.com','www.oliverfee360.com'].includes(domain.redirect))throw Error('Production domain redirects outside OliverFee360. Deployment stopped.');
 return target;
}
export async function verifyReleaseTarget(env=process.env,transport=fetch){
 if(!env.VERCEL_TOKEN)throw Error('Vercel authorization is required. Add VERCEL_TOKEN to the existing repository Actions secrets; do not put it in source or chat.');
 if(env.VERCEL_PROJECT_ID!==target.projectId||env.VERCEL_ORG_ID!==target.teamId||env.GITHUB_REPOSITORY&&env.GITHUB_REPOSITORY!==target.repository)throw Error('Release environment does not match the approved OliverFee360 project/repository.');
 const get=async path=>{const r=await transport(`https://api.vercel.com/v9/projects/${target.projectId}${path}${path.includes('?')?'&':'?'}teamId=${target.teamId}`,{headers:{Authorization:`Bearer ${env.VERCEL_TOKEN}`},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`Cannot verify existing Vercel project (${r.status}). No deployment was attempted.`);return r.json();};
 const [project,result]=await Promise.all([get(''),get('/domains?production=true&limit=100')]);
 return assertReleaseTarget(project,result.domains||[]);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 await verifyReleaseTarget();console.log(`Verified ${target.repository} / ${target.branch} → SturdiHome / ${target.projectName} → https://${target.domain}.`);
}
