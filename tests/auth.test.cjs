const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../gas/Code.gs'),'utf8');
let secret=null,reads=0;
const ctx=vm.createContext({Date,PropertiesService:{getScriptProperties:()=>({getProperty:()=>secret})},SpreadsheetApp:{openById:()=>{reads++;throw new Error('Spreadsheet must not be touched in unauthorized requests')}},ContentService:{MimeType:{JSON:'json'},createTextOutput:body=>({body,setMimeType(){return this}})}});
vm.runInContext(source,ctx);
const run=code=>vm.runInContext(code,ctx);
const request=(action,token)=>{ctx.request={postData:{contents:JSON.stringify({action,authToken:token,params:{}})}};return JSON.parse(run('doPost(request).body'));};
for(const action of ['getAllHomeData','getCategoryFilterMaster','getAssetData','getMonthlyExpenseList','getCalendarData','getBalanceData','getRankingData','getMonthlyTrendData','getBudgetData','upsertMonthlyBudget']){
 assert.throws(()=>run(`${action}()`),/認証/,'direct RPC must not bypass the POST guard');
 assert.equal(request(action,'anything').code,'AUTH_NOT_CONFIGURED');
}
secret='a-test-only-secret-at-least-16-chars';
assert.equal(request('getViewerAccess','wrong').code,'AUTH_REQUIRED');
assert.equal(request('getViewerAccess',secret).data.authorized,true);
assert.equal(run('viewerRequestAuthorized_'),false,'authorization is reset after each request');
assert.equal(request('getAllHomeData',null).code,'AUTH_REQUIRED');
assert.equal(request('upsertMonthlyBudget','wrong').code,'AUTH_REQUIRED');
assert.equal(reads,0,'unauthorized reads/writes never reach Sheets');
console.log('PASS: fail-closed setup, wrong/missing access code, valid verification, direct RPC protection, per-request reset, no unauthorized Sheets access.');
