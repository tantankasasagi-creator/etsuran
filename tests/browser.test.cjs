const path = require('node:path');
const appRoot = process.env.SITE_ROOT || path.resolve(__dirname, '..');
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];const requests=[];let failing=false;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://etsuran.test/**',r=>{const name=new URL(r.request().url()).pathname.slice(1)||'index.html';let body=fs.readFileSync(path.join(appRoot, name));if(process.env.GAS_PACKAGE==='1' && name==='index.html'){body=fs.readFileSync(path.join(appRoot,'gas','index.html'),'utf8').replace(/<\?!= include\('([^']+)'\); \?>/g,(_,file)=>fs.readFileSync(path.join(appRoot,'gas',file+'.html'),'utf8'));}return r.fulfill({body,contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html'});});
 await page.route('https://script.google.com/**',async route=>{
  const {action,params}=route.request().postDataJSON();requests.push({action,params,time:Date.now()});
  await new Promise(r=>setTimeout(r,action==='getCategoryFilterMaster'?180:100));
  if(failing)return route.fulfill({status:503,body:'Unavailable'});
  const now=new Date();const year=now.getFullYear(),month=now.getMonth();
  let data={};
  if(action==='getAllHomeData') data={homeData:{[year+'-'+month]:Object.fromEntries(['共通','くる','ぐんま','合計'].map(p=>[p,{monthBudgetCalculated:false,dailyTotal:1000,allTotal:2000}]))},monthBounds:{minYear:year,minMonth:0,maxYear:year,maxMonth:11}};
  if(action==='getCategoryFilterMaster')data={fixed:{categories:[]},monthly:{categories:['食費']},yearly:{categories:['旅行']}};
  if(action==='getAssetData')data={summary:{targetLabel:'今月',total:100,monthDiff:0,yearDiff:0},details:[],trend:[]};
  if(action==='getBudgetData')data={persons:{'共通':{calculated:false,baseMonthBudget:10000}}};
  if(action==='getMonthlyTrendData')data={'共通':[]};
  if(action==='getMonthlyExpenseList')data={monthly:[{date:'10/1',category:'食費',memo:'<img src=x onerror="window.injected=true">',amount:100}]};
  return route.fulfill({json:{success:true,data}});
 });
 await page.goto('https://etsuran.test/');
 await page.waitForFunction(()=>document.getElementById('connectionStatus').textContent.startsWith('更新'));
 assert.equal(await page.locator('#allTotal').innerText(),'2,000円');
 await page.evaluate(()=>{showTrendScreen();showHomeScreen()});
 await page.waitForFunction(()=>activeApiRequests===0);
 assert.equal(await page.locator('#homeScreen').evaluate(e=>e.classList.contains('hidden')),false);
 const master=requests.find(r=>r.action==='getCategoryFilterMaster');const trend=requests.find(r=>r.action==='getMonthlyTrendData');
 assert.ok(Math.abs(master.time-trend.time)<150,'independent requests start together');
 await page.evaluate(()=>showTrendScreen());await page.waitForFunction(()=>activeApiRequests===0);
 assert.equal(requests.filter(r=>r.action==='getMonthlyTrendData').length,1);
 await page.evaluate(()=>{showCalendarScreen()});await page.waitForFunction(()=>activeApiRequests===0);
 await page.evaluate(()=>{changeCalendarMonth(-1);changeCalendarMonth(-1)});await page.waitForFunction(()=>activeApiRequests===0);
 assert.equal(await page.evaluate(()=>selectedCalendarMonth),(new Date().getMonth()+10)%12);
 await page.evaluate(()=>showHomeScreen());
 const before=requests.filter(r=>r.action==='getAllHomeData').length;
 await page.click('#refreshDataButton');await page.waitForFunction(()=>activeApiRequests===0);
 assert.equal(requests.filter(r=>r.action==='getAllHomeData').length,before+1);
 failing=true;await page.click('#refreshDataButton');await page.waitForFunction(()=>activeApiRequests===0);
 assert.match(await page.locator('#connectionStatus').innerText(),/取得できません/);
 failing=false;await page.click('#refreshDataButton');await page.waitForFunction(()=>activeApiRequests===0);
 await page.evaluate(()=>openExpenseList());await page.waitForFunction(()=>activeApiRequests===0);
 assert.equal(await page.locator('#expenseListContent img').count(),0);
 assert.match(await page.locator('#expenseListContent').innerText(),/<img/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);

 await page.evaluate(()=>closeExpenseList());
 const cachedExpense = await page.evaluate(()=>{openExpenseList();return document.getElementById('expenseListContent').textContent.includes('<img')});
 assert.equal(cachedExpense,true,'cached expenses render synchronously');
 await page.evaluate(()=>closeExpenseList());
 await page.evaluate(()=>showBudgetScreen());
 assert.equal(await page.locator('#budgetActionButton').isDisabled(),true,'budget button disabled until data arrives');
 await page.waitForFunction(()=>activeApiRequests===0);
 assert.equal(await page.locator('#budgetActionButton').isDisabled(),false);
 const budgetCount=requests.filter(r=>r.action==='getBudgetData').length;
 assert.equal(await page.evaluate(()=>{loadBudgetData();return document.getElementById('budgetCard').textContent.includes('共通の予算')}),true);
 assert.equal(requests.filter(r=>r.action==='getBudgetData').length,budgetCount);
 await page.evaluate(()=>{showCalendarScreen()});await page.waitForFunction(()=>activeApiRequests===0);
 assert.equal(await page.evaluate(()=>{loadCalendarData();return !!document.querySelector('.calendar-grid')}),true);
 // Touching the period panel must not manipulate the expense modal.
 await page.evaluate(()=>{
  const panel=document.querySelector('#periodModal .sheet-panel');
  if(!panel) throw new Error('period panel missing');
  panel.dispatchEvent(new TouchEvent('touchstart',{touches:[new Touch({identifier:1,target:panel,clientY:200})]}));
  panel.dispatchEvent(new TouchEvent('touchend',{changedTouches:[new Touch({identifier:1,target:panel,clientY:100})]}));
 });
 assert.equal(await page.locator('#expenseModal').evaluate(e=>e.classList.contains('fullscreen')),false);
 await page.evaluate(()=>{Storage.prototype.getItem=()=>{throw new Error('storage blocked')};Storage.prototype.setItem=()=>{throw new Error('storage blocked')};initializePerson()});
 await page.waitForFunction(()=>activeApiRequests===0);
 assert.equal(await page.evaluate(()=>currentPerson),'共通');

 // Empty results finish loading and never show invalid chart geometry.
 await page.evaluate(()=>showTrendScreen());await page.waitForFunction(()=>activeApiRequests===0);
 assert.equal(await page.locator('#trendChartCard .empty-state').count(),1);
 await page.evaluate(()=>showBalanceScreen());await page.waitForFunction(()=>activeApiRequests===0);
 assert.equal(await page.locator('#balanceSummaryCard .empty-state').count(),1);
 assert.equal(await page.locator('#balanceMonthlyTable').innerText(),'');
 await page.evaluate(()=>showRankingScreen());await page.waitForFunction(()=>activeApiRequests===0);
 assert.equal(await page.locator('#rankingTop3 .empty-state').count(),1);
 assert.equal(await page.locator('#rankingList').getAttribute('aria-busy'),null);
 // Each read error can be retried locally without resetting the application.
 await page.evaluate(()=>invalidateApiCache());failing=true;
 await page.evaluate(()=>showCalendarScreen());
 assert.equal(await page.locator('#calendarContainer .loading-placeholder').count(),1);
 await page.waitForFunction(()=>activeApiRequests===0);
 assert.equal(await page.locator('#calendarContainer .retry-button').count(),1);
 failing=false;await page.click('#calendarContainer .retry-button');await page.waitForFunction(()=>activeApiRequests===0);
 assert.equal(await page.locator('.calendar-grid').count(),1);
 // Identical asset data reuses the existing chart nodes.
 await page.evaluate(()=>showAssetScreen());await page.waitForFunction(()=>activeApiRequests===0);
 assert.equal(await page.evaluate(()=>{const node=document.getElementById('assetTrendInSummary');loadAssetData();return node===document.getElementById('assetTrendInSummary')}),true);
 // A closed modal unlocks background scrolling and restores keyboard focus.
 await page.evaluate(()=>showHomeScreen());await page.waitForFunction(()=>activeApiRequests===0);
 await page.locator('.total-card').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>activeApiRequests===0);
 assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('modal-open')),true);
 assert.equal(await page.locator('#expenseModal').getAttribute('aria-modal'),'true');
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('modal-open')),false);
 assert.equal(await page.locator('.total-card').evaluate(e=>e===document.activeElement),true);
 // Scrolling the expense body does not close it; a header swipe does.
 await page.evaluate(()=>openExpenseList());await page.waitForFunction(()=>activeApiRequests===0);
 const swipe=async selector=>page.evaluate(selector=>{
  const target=document.querySelector(selector);
  target.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[new Touch({identifier:1,target,clientX:50,clientY:100})]}));
  target.dispatchEvent(new TouchEvent('touchend',{bubbles:true,changedTouches:[new Touch({identifier:1,target,clientX:50,clientY:200})]}));
 },selector);
 await swipe('#expenseListContent');assert.equal(await page.locator('#expenseModal').evaluate(e=>e.classList.contains('open')),true);
 await swipe('#expenseModal .sheet-header');assert.equal(await page.locator('#expenseModal').evaluate(e=>e.classList.contains('open')),false);
 // Prefetch only reads, respects data saver, and is reused on demand.
 await page.evaluate(()=>{invalidateApiCache();Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:true,effectiveType:'4g'}})});
 let count=requests.length;await page.evaluate(()=>prefetchView('trend'));assert.equal(requests.length,count);
 await page.evaluate(()=>{Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:false,effectiveType:'2g'}});prefetchView('trend')});assert.equal(requests.length,count);
 await page.evaluate(()=>{Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:false,effectiveType:'4g'}});prefetchView('trend')});
 await page.waitForFunction(()=>activeApiRequests===0);
 assert.deepEqual(requests.slice(count).map(r=>r.action).sort(),['getCategoryFilterMaster','getMonthlyTrendData']);
 count=requests.length;await page.evaluate(()=>showTrendScreen());await page.waitForFunction(()=>activeApiRequests===0);assert.equal(requests.length,count);
 // Speculation failure does not replace a working screen with an error.
 await page.evaluate(()=>{invalidateApiCache();latestApiError=''});failing=true;
 await page.evaluate(()=>prefetchView('balance'));await page.waitForFunction(()=>activeApiRequests===0);
 assert.equal(await page.evaluate(()=>latestApiError),'');failing=false;
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);
 console.log('PASS: prefetch/data-saver/failure isolation, empty states, inline retry, asset DOM reuse, keyboard modal closing/focus restoration, header-only swipes;  mobile home rendering, parallel fetch, cache reuse, navigation during fetch, calendar switching, forced refresh, failure/retry, expense text escaping, no horizontal overflow or JS errors; synchronous cached views, budget loading guard, touch panel isolation, blocked storage recovery');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
