import {execFileSync} from 'node:child_process';import crypto from 'node:crypto';
const entries=JSON.parse(execFileSync(process.execPath,['scripts/release-payload.mjs'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));
const hash=crypto.createHash('sha256').update(JSON.stringify(entries)).digest('hex');
if(entries.length!==48||hash!=='e7db15e7d54a2469debb7cf719a6b750159e36af86adec167045181c3a6954f6')throw Error('Approved package changed');
execFileSync('git',['add','--',...entries.map(e=>e.path)],{stdio:['ignore','pipe','ignore']});
const staged=execFileSync('git',['diff','--cached','--name-only'],{encoding:'utf8'}).trim().split(/\r?\n/);
if(staged.length!==48||staged.some(p=>!entries.some(e=>e.path===p)))throw Error('Unexpected staged files');
execFileSync('git',['commit','-m','Release verified live baseline, editable sales roster and homepage confirmation redirects'],{stdio:'inherit'});
