const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '..', 'gas', 'Code.gs'), 'utf8');
const context = vm.createContext({ Date });
vm.runInContext(source, context);
const run = expression => vm.runInContext(expression, context);
let checks = 0;
// Keep the existing single-month calculator as the reference: it is also used
// for budget carryover and must agree exactly with the new all-month index.
for (let seed = 1; seed <= 12; seed++) {
  let state = seed;
  const random = n => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) % n);
  const values = [['date', 'person', 'category', 'memo', 'amount']];
  const categories = { food: '月予算', travel: '年予算', rent: '固定費', salary: '収入' };
  for (let i = 0; i < 700; i++) {
    const year = 2021 + random(5), month = random(12);
    const date = i % 11 === 0 ? 'invalid' : new Date(year, month, i % 7 === 0 ? 0 : 1 + random(28), random(24), random(60));
    values.push([date, ['共通', 'くる', 'ぐんま', '合計', '不明'][random(5)],
      ['food', 'travel', 'rent', 'salary', 'unmapped', ''][random(6)],
      ['memo', '共通繰入', ' 共通繰入 ', '繰入', ''][random(5)],
      [100, -100, 0, 0.1, 0.2, 1000.25, '200', '', 'bad'][random(9)]]);
  }
  // Explicit month-end cutoff, leap day, unknown category, and transfer cases.
  values.push([new Date(2024, 1, 29, 0), '共通', 'travel', '', 0.1],
    [new Date(2024, 1, 29, 23, 59), 'くる', 'travel', '共通繰入', 0.2],
    [new Date(2024, 11, 31, 23, 59), 'ぐんま', 'travel', '', -100],
    [new Date(2024, 0, 2), '合計', 'unmapped', '', 2.5]);
  context.values = values; context.categories = categories;
  run('globalThis.index = buildHomeTotalsIndex(values, categories)');
  for (let year = 2020; year <= 2026; year++) for (let month = 0; month < 12; month++) {
    const expected = run(`JSON.stringify(calculateAllHomeTotals(values, categories, ${year}, ${month}))`);
    const actual = run(`JSON.stringify(getIndexedHomeTotals(index, ${year}, ${month}))`);
    assert.equal(actual, expected, `seed=${seed}, month=${year}-${month + 1}`);
    checks++;
  }
  // Reading a month must never mutate the index and affect the next lookup.
  run("getIndexedHomeTotals(index, 2024, 1)['共通'].allTotal = 999999");
  assert.equal(run("JSON.stringify(getIndexedHomeTotals(index, 2024, 1))"),
    run("JSON.stringify(calculateAllHomeTotals(values, categories, 2024, 1))"));
}
context.values = [['date', 'person', 'category', 'memo', 'amount']];
assert.equal(run("JSON.stringify(getIndexedHomeTotals(buildHomeTotalsIndex(values, {}), 2026, 0))"),
  run("JSON.stringify(calculateAllHomeTotals(values, {}, 2026, 0))"));
context.budgets = [['type', 'person', 'amount', 'start', 'end']];
for (const person of ['共通', 'くる', 'ぐんま']) for (const type of ['月予算', '年予算']) {
  context.budgets.push([type, person, 1000.1, '2020-01', '2024-06'],
    [type, person, 2000.2, '2024-03', ''], [type, person, 7777, '2024-03', ''],
    [type, person, -500, '2025-07', '2025-08']);
}
for (let year = 2019; year <= 2026; year++) for (let month = 0; month < 12; month++) {
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  context.key = key;
  for (const person of ['共通', 'くる', 'ぐんま', '合計']) {
    context.person = person;
    assert.equal(run('JSON.stringify(calculateHomeBudgets(budgets, key)[person])'),
      run('JSON.stringify(calculateBudgets(budgets, person, key))'));
    checks++;
  }
}
console.log(`PASS: ${checks + 1} exact-result comparisons; randomized row order, refunds, fractions, internal transfers, missing categories, leap/month/year boundaries, empty data, budget history ranges, and index isolation.`);
