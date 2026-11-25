import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
test('model route configuration, authentication, upstream response and throttling',async()=>{
 const names=['RESEARCH_ACCESS_TOKEN','RESEARCH_LLM_URL','RESEARCH_LLM_KEY','RESEARCH_LLM_MODEL'];const original=names.map(k=>process.env[k]);const originalFetch=globalThis.fetch;
 try{
 for(const k of names)delete process.env[k];const source=await readFile(new URL('../app/api/research/route.ts',import.meta.url),'utf8');const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;const {POST}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
 const request=token=>new Request('https://local/api/research',{method:'POST',headers:token?{Authorization:`Bearer ${token}`}:{},body:JSON.stringify({evidence:'财报来源P1：经营现金流30，净利润24。'})});
 assert.equal((await POST(request())).status,503);
 process.env.RESEARCH_ACCESS_TOKEN='test-token-123456789';process.env.RESEARCH_LLM_URL='https://provider.example/v1/chat/completions';process.env.RESEARCH_LLM_KEY='server-only-key';process.env.RESEARCH_LLM_MODEL='test-model';assert.equal((await POST(request('bad'))).status,401);
 globalThis.fetch=async(url,options)=>{assert.equal(url.hostname,'provider.example');assert.equal(options.headers.Authorization,'Bearer server-only-key');const body=JSON.parse(options.body);assert.match(body.messages[0].content,/不能修改评分/);return Response.json({choices:[{message:{content:'现金流覆盖净利润，但存在风险。[财报P1]'}}]});};
 const response=await POST(request('test-token-123456789'));assert.equal(response.status,200);const data=await response.json();assert.equal(data.status,'pending');assert.match(data.answer,/风险/);assert.equal((await POST(request('test-token-123456789'))).status,429);
 }finally{globalThis.fetch=originalFetch;names.forEach((k,i)=>{if(original[i]===undefined)delete process.env[k];else process.env[k]=original[i];});}
});
