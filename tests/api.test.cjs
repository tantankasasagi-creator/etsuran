const path = require('node:path');
const appRoot = path.resolve(__dirname, '..');
const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(appRoot, 'app.js'),'utf8').split('function openKakeibo')[0];
let calls = 0, fail = false;
const ctx = vm.createContext({document:{getElementById:()=>null},AbortController,setTimeout,clearTimeout,fetch:async()=>{
  calls++; await new Promise(r=>setTimeout(r,5));
  return {ok:!fail,status:fail?503:200,json:async()=>({success:true,data:{value:calls}})};
}});
vm.runInContext('let homeDataCache,trendDataCache,balanceDataCache,rankingDataCache,assetDataCache,budgetDataCache;'+source,ctx);
const run = code=>vm.runInContext(code,ctx);
(async()=>{
 const [a,b]=await Promise.all([run("callApi('getTest',{month:1})"),run("callApi('getTest',{month:1})")]);
 assert.equal(calls,1); assert.equal(a,b);
 await run("callApi('getTest',{month:1})"); assert.equal(calls,1);
 await run("callApi('getTest',{month:2})"); assert.equal(calls,2);
 await run("callApi('upsertMonthlyBudget')");
 await run("callApi('getTest',{month:1})"); assert.equal(calls,4);
 fail=true; await assert.rejects(run("callApi('getFailure')"),/503/);
 fail=false; await run("callApi('getFailure')"); assert.equal(calls,6);
 assert.equal(run("(()=>{const old=beginViewRequest('calendar');const latest=beginViewRequest('calendar');return !old() && latest()})()"),true);
 console.log('PASS: request deduplication, cache reuse, parameter isolation, mutation invalidation, HTTP failure/retry, stale response guard');
})().catch(e=>{console.error(e);process.exitCode=1});
