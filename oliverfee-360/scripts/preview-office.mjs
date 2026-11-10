// Loopback-only development preview. Mock identity is never part of the deployed Worker.
import fs from 'node:fs';
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker/index.mjs';
globalThis.ASSETS={};for(const file of fs.readdirSync('web')){const ext=file.split('.').pop();const mime={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml'}[ext];if(mime)ASSETS['/'+file]={body:fs.readFileSync('web/'+file,'utf8'),mime}}
const sql=new DatabaseSync(':memory:');for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+file,'utf8'));
const DB={prepare(text){let args=[];return {bind(...values){args=values;return this},async first(){return sql.prepare(text).get(...args)||null},async all(){return {results:sql.prepare(text).all(...args)}},async run(){const result=sql.prepare(text).run(...args);return {meta:{changes:Number(result.changes)}}}}},async batch(statements){const results=[];for(const statement of statements)results.push(await statement.run());return results}};
const objects=new Map(),env={DB,OWNER_EMAIL:'local-preview@example.test',BUCKET:{async put(k,v){objects.set(k,new Uint8Array(v))},async get(k){return objects.has(k)?{body:objects.get(k)}:null},async delete(k){objects.delete(k)}}};
http.createServer(async(req,res)=>{
 try{
  const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','local-preview');headers.set('oai-authenticated-user-email','local-preview@example.test');
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const request=new Request('http://127.0.0.1:4173'+req.url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
  const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){res.writeHead(500);res.end(error.message)}
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173 — local mock sign-in, in-memory test data only'));
