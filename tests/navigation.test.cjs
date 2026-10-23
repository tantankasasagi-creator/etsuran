const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.SITE_ROOT||path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[],requests=[],failedActions=new Set();const now=new Date(),year=now.getFullYear(),month=now.getMonth();
await page.addInitScript(()=>{sessionStorage.setItem('etsuranViewerToken','test-access-only');Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:true}})});
page.on('pageerror',e=>errors.push(e.message));
await page.route('https://etsuran.test/**',r=>{const name=new URL(r.request().url()).pathname.slice(1)||'index.html';return r.fulfill({body:fs.readFileSync(path.join(root,name)),contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html'})});
const persons=['共通','くる','ぐんま','合計'];
await page.route('https://script.google.com/**',async r=>{const {action,params}=r.request().postDataJSON();requests.push({action,params});if(failedActions.has(action)){await r.fulfill({status:503,body:'temporary failure'});return;}assert.ok(action.startsWith('get'),'read-only test');let data={};
if(action==='getViewerAccess')data={authorized:true};
if(action==='getAllHomeData'){const item={monthBudgetCalculated:true,monthBudget:10000,monthBudgetRemaining:8000,monthBudgetRate:20,budgetStatus:'順調です',dailyTotal:2000,allTotal:3200,fixedMonthTotal:1000,monthlyMonthTotal:2000,specialMonthTotal:200,specialYearTotal:5000,yearBudget:20000,yearBudgetRemaining:15000,yearBudgetRate:25};data={homeData:{},monthBounds:{minYear:year-1,maxYear:year,minMonth:0,maxMonth:month}};for(let y=year-1;y<=year;y++)for(let m=0;m<12;m++)data.homeData[y+'-'+m]=Object.fromEntries(persons.map(p=>[p,item]));}
if(action==='getCategoryFilterMaster')data={fixed:{categories:['家賃']},monthly:{categories:['食費']},yearly:{categories:['旅行']}};
if(action==='getMonthlyTrendData'){const months=[];for(let i=7;i>=0;i--){const d=new Date(year,month-i,1);months.push({year:d.getFullYear(),month:d.getMonth(),label:(d.getMonth()+1)+'月',total:3200,fixed:1000,monthly:2000,yearly:200,monthBudget:10000+i*100,categories:{'家賃':1000,'食費':2000,'旅行':200}})}for(let i=1;i<=18;i++){const d=new Date(year,month+i,1);months.push({year:d.getFullYear(),month:d.getMonth(),label:(d.getMonth()+1)+'月',total:0,fixed:0,monthly:0,yearly:0,monthBudget:999999,categories:{}})}data=Object.fromEntries(persons.map(p=>[p,months]));}
if(action==='getRankingData')data={all:Object.fromEntries(persons.map(p=>[p,[{year,month,amount:2000,category:'食費',date:'10/1',memo:'test',title:'test'}]])),currentYearNumber:year,currentMonthNumber:month};
if(action==='getBalanceData')data=Object.fromEntries(persons.map(p=>[p,[{year,month,label:(month+1)+'月',income:10000,expense:3200,balance:6800}]]));
if(action==='getMonthlyExpenseList')data={fixed:[{date:'10/1',category:'家賃',memo:'test',amount:1000}],monthly:[{date:'10/2',category:'食費',memo:'test',amount:2000}],yearly:[{date:'10/3',category:'旅行',memo:'test',amount:200}]};
if(action==='getBudgetData')data={persons:{'共通':{calculated:true,baseMonthBudget:10000,monthBudget:10000}}};
if(action==='getAssetData')data={summary:{targetLabel:'今月',total:100000,monthDiff:0,yearDiff:0},details:[],trend:[]};
if(action==='getCalendarData')data={'1':{total:2000,colorLevel:2,items:[{category:'食費',memo:'test',amount:2000}]}};
await r.fulfill({json:{success:true,data}})});
const settle=()=>page.waitForFunction(()=>activeApiRequests===0);
await page.goto('https://etsuran.test/');await page.waitForFunction(()=>!document.body.hasAttribute('data-locked')&&activeApiRequests===0);
assert.deepEqual(await page.locator('.bottom-nav button').allTextContents(),['ホーム','収支','分析','その他']);
assert.equal(await page.locator('#homeScreen .menu-item').count(),0);
assert.equal(await page.locator('#monthBudgetRemaining').innerText(),'8,000円');assert.equal(await page.locator('#yearBudgetRemaining').innerText(),'15,000円');
assert.equal(await page.locator('#specialExpenseTotal').innerText(),'5,000円');
assert.equal(await page.locator('#monthRemainingLabel').innerText(),'残り予算');
assert.equal(await page.locator('#yearRemainingLabel').innerText(),'残り予算');
assert.equal(await page.locator('#monthBudgetText').innerText(),'月予算 10,000円');
assert.equal(await page.locator('#yearBudgetText').innerText(),'年予算 20,000円');
const alignedBudgetColumns=()=>page.evaluate(()=>{
  const x=id=>document.getElementById(id).getBoundingClientRect().left;
  return Math.abs(x('dailyTotal')-x('specialExpenseTotal'))<1 && Math.abs(x('monthBudgetRemaining')-x('yearBudgetRemaining'))<1;
});
assert.equal(await alignedBudgetColumns(),true,'both budget cards use the same spending/remaining columns');
await page.click('.special-card');
assert.equal(await page.locator('#specialExpenseTotal').innerText(),'200円');
assert.equal(await page.locator('#yearBudgetRemaining').innerText(),'15,000円','monthly view keeps annual remaining in the remaining column');
assert.equal(await page.locator('#yearRemainingLabel').innerText(),'年間の残り予算');
assert.equal(await alignedBudgetColumns(),true);
await page.click('.special-card');

assert.equal(await page.evaluate(()=>document.querySelector('#homeScreen .month-detail-actions').getBoundingClientRect().bottom <= document.querySelector('.bottom-nav').getBoundingClientRect().top),true,'home detail actions remain above the bottom navigation');
await page.screenshot({path:'/workspace/work/new-home.png',fullPage:true});
await page.click('#homeScreen .calendar-shortcut');await settle();
let last=requests.filter(r=>r.action==='getCalendarData').at(-1);assert.equal(last.params.targetYear,year);assert.equal(last.params.targetMonth,month);assert.equal(last.params.selectedPerson,'共通');assert.deepEqual(last.params.selectedCategories,['家賃','食費','旅行']);
await page.click('#calendarScreen .back-button');assert.equal(await page.locator('#homeScreen').isVisible(),true);
await page.click('[data-nav=analysis]');await settle();assert.equal(await page.locator('#trendScreen').isVisible(),true);assert.equal(await page.locator('.trend-real-column').count(),6);assert.equal(await page.locator('.analysis-value').innerText(),'2,200円');
assert.equal(await page.locator('#trendCategoryFilterButton').innerText(),'日常費＋特別費');
assert.deepEqual(await page.evaluate(()=>[selectedTrendYear,selectedTrendMonth]),[year,month],'initial selection is this month even when API includes future months');
assert.equal(await page.evaluate(()=>getCurrentTrendData().every(r=>r.year*12+r.month<=new Date().getFullYear()*12+new Date().getMonth())),true,'future placeholders cannot replace recent history');

assert.equal(await page.locator('.trend-budget-line').count(),0,'combined expenses do not use the daily-only budget scale');
assert.match(await page.locator('#trendLegend').innerText(),/日常費 2,000円/);
assert.match(await page.locator('#trendLegend').innerText(),/特別費 200円/);
for (const [width,height] of [[320,640],[360,640],[390,700],[390,844]]) {
  await page.setViewportSize({width,height});
  for (const nav of ['home','analysis']) {
    await page.click('[data-nav='+nav+']');await settle();
    if(nav==='home') await page.evaluate(()=>renderHomeData({monthBudgetCalculated:true,monthBudget:100000,monthBudgetRemaining:87655,monthBudgetRate:12,budgetStatus:'順調です',dailyTotal:12345,allTotal:987654,fixedMonthTotal:111111,monthlyMonthTotal:12345,specialMonthTotal:864198,specialYearTotal:111111,yearBudget:222222,yearBudgetRemaining:111111,yearBudgetRate:50}));
    if(nav==='home') assert.equal(await alignedBudgetColumns(),true,'budget columns align at '+width+'px');
    assert.equal(await page.evaluate(nav=>{
      const screen=document.querySelector(nav==='home'?'#homeScreen':'#trendScreen');
      const footer=screen.querySelector('.month-detail-actions').getBoundingClientRect();
      const bar=document.querySelector('.bottom-nav').getBoundingClientRect();
      return scrollY===0 && footer.bottom<=bar.top && document.documentElement.scrollHeight<=innerHeight;
    },nav),true,nav+' fits without scrolling at '+width+'x'+height);
  }
  assert.equal(await page.evaluate(()=>{
    const plot=document.querySelector('.trend-chart-area').getBoundingClientRect();
    const segments=[...document.querySelectorAll('.trend-monthly,.trend-yearly')].filter(e=>e.classList.contains('trend-segment'));
    return segments.length===12 && segments.every(e=>{const r=e.getBoundingClientRect();return r.width>8 && r.height>5 && r.top>=plot.top-.5 && r.bottom<=plot.bottom && r.bottom<innerHeight;});
  }),true,'both expense groups are painted in the visible chart');
}
// The budget rule must use the same height and scale as the bars after selection changes.
await page.evaluate(()=>{trendSelectedCategories=categoryMasterCache.monthly.categories.slice();renderTrendChart()});
assert.equal(await page.locator('.trend-budget-line').count(),1);
assert.equal(await page.evaluate(()=>{
  const card=document.getElementById('trendChartCard');
  const data=getCurrentTrendData().at(-1),height=Number(card.dataset.chartHeight),scale=Number(card.dataset.scaleMax);
  const top=parseFloat(document.querySelector('.trend-budget-line').style.top);
  const segment=document.querySelector('.trend-segment.trend-monthly');
  return Math.abs(top-(height-data.monthBudget/scale*height))<.01 && Math.abs(segment.getBoundingClientRect().height-(data.monthly/scale*height))<1;
}),true,'daily budget and expense bar share the same coordinate system');
await page.evaluate(()=>{trendSelectedCategories=categoryMasterCache.monthly.categories.concat(categoryMasterCache.yearly.categories);renderTrendChart()});
await page.setViewportSize({width:390,height:844});
// Long histories remain contained, with the selected recent month visible.
await page.evaluate(()=>{
  window.savedTrendRows=trendDataCache[currentTrendPerson];
  const now=new Date(),sample=getCurrentTrendData().at(-1);
  trendDataCache[currentTrendPerson]=Array.from({length:36},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-35+i,1);return {...sample,year:d.getFullYear(),month:d.getMonth(),label:(d.getMonth()+1)+'月'}});
});
await page.selectOption('#trendRange','0');
assert.equal(await page.evaluate(()=>{
  const plot=document.querySelector('.trend-plot'),selected=document.querySelector('.trend-real-column.selected');
  const p=plot.getBoundingClientRect(),r=selected.getBoundingClientRect();
  return plot.scrollWidth>plot.clientWidth && plot.scrollHeight<=plot.clientHeight && r.left>=p.left-1 && r.right<=p.right+1 && scrollY===0 && document.documentElement.scrollWidth<=innerWidth;
}),true,'all-period chart keeps labels and the selected month visible without page overflow');
await page.evaluate(()=>{trendDataCache[currentTrendPerson]=window.savedTrendRows;delete window.savedTrendRows});
await page.selectOption('#trendRange','6');
await page.click('#trendScreen [data-trend-person="くる"]');
await page.click('#trendScreen [data-analysis-tab=ranking]');await settle();assert.equal(await page.evaluate(()=>currentRankingPerson),'くる');
await page.click('#rankingScreen [data-analysis-tab=trend]');await settle();assert.equal(await page.evaluate(()=>currentTrendPerson),'くる');
await page.selectOption('#trendRange','12');assert.equal(await page.locator('.trend-real-column').count(),8);
await page.selectOption('#trendRange','6');
const previous=new Date(year,month-1,1),previousMonth=previous.getMonth(),previousYear=previous.getFullYear();
await page.click(`.trend-real-column[data-trend-year="${previousYear}"][data-trend-month="${previousMonth}"]`);
assert.match(await page.locator('#trendDetailLabel').innerText(),new RegExp((previousMonth+1)+'月'));
await page.screenshot({path:'/workspace/work/new-analysis.png',fullPage:true});
await page.click('#trendChartCard .calendar-shortcut');await settle();last=requests.filter(r=>r.action==='getCalendarData').at(-1);
assert.equal(last.params.targetMonth,previousMonth);assert.equal(last.params.targetYear,previousYear);assert.equal(last.params.selectedPerson,'くる');assert.deepEqual(last.params.selectedCategories,['食費','旅行']);
await page.click('#calendarScreen .back-button');await settle();assert.equal(await page.locator('#trendScreen').isVisible(),true);assert.equal(await page.evaluate(()=>selectedTrendMonth),previousMonth);
await page.click('#trendChartCard .text-link');await settle();
assert.equal(await page.locator('#expenseListContent .expense-row').count(),2,'trend detail list uses the selected categories');
assert.equal(await page.locator('#expenseListContent').innerText().then(t=>t.includes('家賃')),false);
assert.equal(await page.locator('#expenseModal').evaluate(e=>e.classList.contains('open')),true);
await page.click('#expenseModal .calendar-shortcut');await settle();assert.equal(await page.locator('#calendarScreen').isVisible(),true);assert.equal(await page.evaluate(()=>currentCalendarPerson),'くる');
await page.click('[data-nav=balance]');await settle();assert.equal(await page.locator('#balanceScreen').isVisible(),true);assert.equal(await page.locator('[data-nav=balance]').getAttribute('aria-current'),'page');
await page.evaluate(()=>{
  const year=new Date().getFullYear();
  const rows=Array.from({length:12},(_,month)=>({year,month,label:(month+1)+'月',income:345678,expense:234567,balance:111111}));
  renderBalanceSummary(rows);renderBalanceTable(rows);
});
for(const [width,height] of [[320,640],[390,700]]){
  await page.setViewportSize({width,height});
  assert.equal(await page.evaluate(()=>document.getElementById('balanceMonthlyTable').getBoundingClientRect().bottom<=document.querySelector('.bottom-nav').getBoundingClientRect().top && document.documentElement.scrollHeight<=innerHeight && document.documentElement.scrollWidth<=innerWidth),true,'full-year balance fits at '+width+'x'+height);
}
await page.screenshot({path:'/workspace/work/new-balance.png',fullPage:true});
await page.setViewportSize({width:390,height:844});
await page.click('[data-nav=other]');assert.equal(await page.locator('#otherScreen').isVisible(),true);
await page.click('#otherScreen button:has-text("財産目録")');await settle();await page.click('#assetScreen .back-button');assert.equal(await page.locator('#otherScreen').isVisible(),true);
await page.click('#otherScreen button:has-text("予算")');await settle();await page.click('#budgetScreen .back-button');
await page.evaluate(()=>localStorage.setItem('etsuranKakeiboUrl','https://kakeibo-auu.pages.dev/connected.html#key=test-only'));
await page.click('#otherScreen button:has-text("接続設定")');await page.locator('#kakeiboConnectionDialog button:has-text("キャンセル")').click();assert.match(await page.evaluate(()=>localStorage.getItem('etsuranKakeiboUrl')),/test-only$/);
failedActions.add('getMonthlyTrendData');await page.evaluate(()=>invalidateApiCache());await page.click('[data-nav=analysis]');await settle();assert.equal(await page.locator('#trendChartCard .retry-button').count(),1);failedActions.clear();await page.click('#trendChartCard .retry-button');await settle();assert.equal(await page.evaluate(()=>typeof currentTrendPerson),'string');assert.equal(await page.locator('.trend-real-column').count(),6,'analysis retry preserves a valid person');
for(const width of [320,390,768]){await page.setViewportSize({width,height:844});for(const selector of ['[data-nav=home]','[data-nav=balance]','[data-nav=analysis]','[data-nav=other]']){await page.click(selector);await settle();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,selector+' width '+width)}}
assert.deepEqual(errors,[]);assert.equal(await page.locator('.error-state:visible').count(),0);assert.equal((await page.locator('body').innerText()).includes('NaN'),false);
console.log('PASS: compact home/analysis/balance fit 320x640–390x844 without scrolling, visible stacked bars and matching budget scale, long-period selected month stays visible, combined default, home redesign, four primary destinations, analysis tabs/person/range, same-context list/calendar and return, other/settings pages, no writes, JS errors or overflow at 320/390/768px.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
