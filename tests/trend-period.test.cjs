const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8')
  .match(/function getCurrentTrendData\(\) \{[\s\S]*?\n\}/)[0];
const key = row => row.year * 12 + row.month;
let today = new Date(2026, 11, 31, 23, 59);
const rows = Array.from({ length: 27 }, (_, i) => {
  const date = new Date(2026, 3 + i, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}).reverse();
const original = JSON.stringify(rows);
const context = vm.createContext({
  Date: class extends Date {
    constructor(...args) { super(...(args.length ? args : [today.getTime()])); }
  },
  trendDataCache: { '共通': rows },
  currentTrendPerson: '共通',
  trendRange: 6,
  getFilteredTrendData: data => data
});
vm.runInContext(source, context);
const months = () => Array.from(vm.runInContext('getCurrentTrendData()', context), key);
const consecutive = (year, month, count) => Array.from({ length: count }, (_, i) => year * 12 + month - count + 1 + i);

assert.deepEqual(months(), consecutive(2026, 11, 6), 'December history ends in December, even with future years in the response');
today = new Date(2027, 0, 1);
assert.deepEqual(months(), consecutive(2027, 0, 6), 'January rolls over naturally and preserves previous-year history');
context.trendRange = 12;
assert.deepEqual(months(), consecutive(2027, 0, 10), 'shorter histories retain all available past months');
context.trendRange = 0;
assert.deepEqual(months(), consecutive(2027, 0, 10), 'all-period view still excludes future placeholders');
assert.equal(JSON.stringify(rows), original, 'history sorting never mutates the shared API cache');
today = new Date(2025, 11, 31);
assert.deepEqual(months(), [], 'future-only data produces an empty history');
console.log('PASS: future months excluded before selecting the range, December/January rollover, 6/12/all periods, chronological order, immutable cache, future-only response.');
