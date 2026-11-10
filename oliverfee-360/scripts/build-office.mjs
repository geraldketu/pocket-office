import fs from 'node:fs';
import path from 'node:path';
const assets={};
const rules=fs.readFileSync('worker/rules.mjs','utf8').replace(/export /g,'');
fs.writeFileSync('web/rules.js',rules+'\nglobalThis.OfficeRules={RULE_SOURCES,decision,weightResults,newMexicoPlanning,evaluateHazmat,buildQuote};\n');
for(const file of fs.readdirSync('web')){
 const ext=path.extname(file);
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'}[ext];
 if(mime)assets['/'+file]={body:fs.readFileSync(path.join('web',file),'utf8'),mime};
}
const manifest=JSON.parse(fs.readFileSync('.openai/hosting.json','utf8'));
if(manifest.static||manifest.d1!=='DB'||manifest.r2!=='BUCKET')throw new Error('Expected server-backed DB and BUCKET bindings');
fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/.openai',{recursive:true});
// These former static build outputs are now preserved under web/ and embedded in the Worker.
for(const file of fs.readdirSync('web'))if(fs.statSync(path.join('web',file)).isFile()&&fs.existsSync(path.join('dist',file)))fs.unlinkSync(path.join('dist',file));
fs.writeFileSync('dist/server/index.js','const ASSETS='+JSON.stringify(assets)+';\n'+rules+'\n'+fs.readFileSync('worker/index.mjs','utf8').replace("import {buildQuote} from './rules.mjs';",''));
fs.writeFileSync('dist/.openai/hosting.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Built authenticated carrier offices with embedded existing UI.');
