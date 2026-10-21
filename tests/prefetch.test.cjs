const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
(async () => {
 const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
 const page = await browser.newPage();
 await page.addInitScript(()=>sessionStorage.setItem('etsuranViewerToken','test-access-code-only'));
 const requests = [], errors = []; let inFlight = 0, peak = 0, balanceDelay = 80;
 page.on('pageerror', error => errors.push(error.message));
 await page.route('https://etsuran.test/**', route => {
   const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
   return route.fulfill({ body: fs.readFileSync(path.join(root, name)), contentType: name.endsWith('.js') ? 'application/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html' });
 });
 await page.route('https://script.google.com/**', async route => {
   const { action, params } = route.request().postDataJSON();
   assert.ok(action.startsWith('get'), 'prefetch never writes');
   const record = { action, params, start: Date.now() }; requests.push(record); peak = Math.max(peak, ++inFlight);
   await new Promise(resolve => setTimeout(resolve, action === 'getBalanceData' ? balanceDelay : 80));
   let data = {};
   if (action === 'getViewerAccess') data = {authorized:true};
   if (action === 'getAllHomeData') { const now = new Date(); data = { homeData: {}, monthBounds: { minYear: now.getFullYear(), maxYear: now.getFullYear(), minMonth: 0, maxMonth: 11 } }; }
   if (action === 'getCategoryFilterMaster') data = { fixed: { categories: [] }, monthly: { categories: ['食費'] }, yearly: { categories: ['旅行'] } };
   if (action === 'getRankingData') data = { all: { '共通': [] }, currentYearNumber: 2026, currentMonthNumber: 9 };
   if (action === 'getBalanceData') data = { '共通': [] };
   record.end = Date.now(); inFlight--;
   await route.fulfill({ json: { success: true, data } });
 });
 await page.goto('https://etsuran.test/');
 await page.waitForFunction(() => prefetchPlanKey !== '' && prefetchQueue.size === 0 && !prefetchRunning && activeApiRequests === 0);
 assert.deepEqual(requests.map(r => r.action), ['getViewerAccess','getAllHomeData','getCategoryFilterMaster','getRankingData','getMonthlyTrendData','getBalanceData','getCalendarData','getAssetData','getBudgetData','getMonthlyExpenseList']);
 assert.equal(peak, 1, 'background sequence never runs concurrent reads');
 const calendar = requests.find(r => r.action === 'getCalendarData');
 assert.deepEqual(calendar.params.selectedCategories, ['食費','旅行']);
 assert.equal(calendar.params.selectedPerson, '共通');
 // After the plan finishes, it must not periodically reload data.
 const count = requests.length;
 await page.waitForTimeout(450); assert.equal(requests.length, count);
 // Start a fresh plan, then request a different screen during the first background read.
 balanceDelay = 700;
 await page.evaluate(() => { invalidateApiCache(); scheduleHomePrefetch(); });
 await page.waitForFunction(() => activeSpeculativeRequests === 1);
 await page.evaluate(() => showBalanceScreen());
 await page.waitForFunction(() => activeApiRequests === 0 && !prefetchRunning && prefetchQueue.size === 0);
 const recent = requests.slice(count), foreground = recent.find(r => r.action === 'getBalanceData');
 const ranking = recent.find(r => r.action === 'getRankingData');
 assert.ok(ranking.start >= foreground.end, 'remaining background work waits for the selected screen');
 assert.equal(recent.filter(r => r.action === 'getBalanceData').length, 1, 'cached foreground result is not fetched again');
 // Hidden tabs preserve their queue and resume only when visible again.
 await page.evaluate(() => { invalidateApiCache(); Object.defineProperty(document, 'visibilityState', {configurable:true,get:()=> 'hidden'}); scheduleHomePrefetch(); });
 const hiddenCount = requests.length; await page.waitForTimeout(400); assert.equal(requests.length, hiddenCount);
 await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', {configurable:true,get:()=> 'visible'}); document.dispatchEvent(new Event('visibilitychange')); });
 await page.waitForFunction(() => activeApiRequests === 0 && !prefetchRunning && prefetchQueue.size === 0);
 assert.ok(requests.length > hiddenCount);
 assert.deepEqual(errors, []);
 console.log('PASS: all screens prefetched sequentially, correct month/person/category parameters, foreground priority, no duplicate fetch/polling/writes, hidden-tab pause and resume.');
 await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
