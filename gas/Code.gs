// ======================================
// 設定・定数
// ======================================

const SPREADSHEET_ID = '1gXbUbf4y9yHB7TNAtJ3Skz1dkpx7sUImQSWUeasjX48';

const SHEET_NAMES = {
  input: '入力データ',
  categoryMaster: 'カテゴリマスタ',
  budgetMaster: '予算マスタ',
  monthlyBudgetHistory: '月別予算履歴',
  asset: '財産データ'
};

const CATEGORY_TYPES = {
  fixed: '固定費',
  monthly: '月予算',
  yearly: '年予算',
  income: '収入'
};

const BUDGET_TYPES = {
  monthly: '月予算',
  yearly: '年予算'
};

const INTERNAL_TRANSFER_MEMOS = {
  expenseToCommon: '共通繰入',
  incomeFromPersonal: '繰入'
};

// ======================================
// Webアプリ入口
// ======================================

function doGet() {
  return HtmlService
    .createTemplateFromFile('index')
    .evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ======================================
// ホーム画面
// ======================================

let viewerRequestAuthorized_ = false;

function requireViewerAccess_() {
  if (!viewerRequestAuthorized_) {
    const error = new Error('認証が必要です。');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }
}

function verifyViewerToken_(provided) {
  const expected = PropertiesService.getScriptProperties().getProperty('ETSURAN_ACCESS_TOKEN');
  if (!expected || expected.length < 16) {
    const error = new Error('GASのスクリプトプロパティにETSURAN_ACCESS_TOKEN（16文字以上）を設定してください。');
    error.code = 'AUTH_NOT_CONFIGURED';
    throw error;
  }
  const value = typeof provided === 'string' ? provided : '';
  let difference = expected.length ^ value.length;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ (value.charCodeAt(i) || 0);
  if (difference !== 0) {
    const error = new Error('アクセスコードを確認してください。');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }
}

function getAllHomeData() {
  requireViewerAccess_();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const data = loadAllData(ss);

  const categoryMap = buildCategoryMap(data.categoryValues);
  const persons = ['共通', 'くる', 'ぐんま', '合計'];

  const monthlyBudgetHistoryMap =
    buildMonthlyBudgetHistoryMap(data.monthlyBudgetHistoryValues);

  const monthBounds =
    getHomeMonthBounds(data.inputValues, data.monthlyBudgetHistoryValues);

  const totalsIndex = buildHomeTotalsIndex(data.inputValues, categoryMap);
  const result = {};

  for (let year = monthBounds.minYear; year <= monthBounds.maxYear; year++) {
    const startMonth = year === monthBounds.minYear ? monthBounds.minMonth : 0;
    const endMonth = year === monthBounds.maxYear ? monthBounds.maxMonth : 11;

    for (let month = startMonth; month <= endMonth; month++) {
      const key = makeMonthKey(year, month);
      const sheetMonthKey = makeSheetMonthKey(year, month);

      const totalsMap =
        getIndexedHomeTotals(totalsIndex, year, month);
      const budgetsByPerson = calculateHomeBudgets(data.budgetValues, sheetMonthKey);

      result[key] = {};

      persons.forEach(function (person) {
        const budgets = budgetsByPerson[person];
        const totals = totalsMap[person];

        const monthlyBudgetInfo =
          getHomeMonthlyBudgetInfo(monthlyBudgetHistoryMap, sheetMonthKey, person);

        result[key][person] =
          buildHomeResponse(budgets, totals, year, month, monthlyBudgetInfo);
      });
    }
  }

  return {
    homeData: result,
    monthBounds: monthBounds
  };
}

function makeMonthKey(year, month) {
  return year + '-' + month;
}

function makeSheetMonthKey(year, month) {
  return year + '-' + String(month + 1).padStart(2, '0');
}

function normalizeSheetMonthKey(value) {
  if (!value) return '';

  if (value instanceof Date) {
    return value.getFullYear() + '-' + String(value.getMonth() + 1).padStart(2, '0');
  }

  // 先頭の ' や ’（文字列扱いにするための記号）は取り除く
  const text = String(value).trim().replace(/^['’‘]/, '');

  const match = text.match(/^(\d{4})[-\/](\d{1,2})$/);
  if (!match) return text;

  return match[1] + '-' + String(Number(match[2])).padStart(2, '0');
}

function parseSheetMonthKey(value) {
  const key = normalizeSheetMonthKey(value);
  const match = key.match(/^(\d{4})-(\d{2})$/);

  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]) - 1
  };
}

function buildMonthlyBudgetHistoryMap(values) {
  const map = {};

  if (!values || values.length <= 1) {
    return map;
  }

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    const targetMonth = normalizeSheetMonthKey(row[0]);
    const person = row[1];

    if (!targetMonth || !person) continue;

    if (!map[targetMonth]) {
      map[targetMonth] = {};
    }

    map[targetMonth][person] = {
      targetMonth: targetMonth,
      person: person,
      baseMonthBudget: Number(row[2]) || 0,
      carryover: Number(row[3]) || 0,
      monthBudget: Number(row[4]) || 0,
      sourceMonth: normalizeSheetMonthKey(row[5]),
      sourceMonthBudget: row[6] === '' ? null : Number(row[6]),
      sourceDailyTotal: row[7] === '' ? null : Number(row[7]),
      calculatedAt: row[8] || ''
    };
  }

  return map;
}

function getHomeMonthlyBudgetInfo(monthlyBudgetHistoryMap, sheetMonthKey, person) {
  const monthMap = monthlyBudgetHistoryMap[sheetMonthKey] || {};

  if (person === '合計') {
    const persons = ['共通', 'くる', 'ぐんま'];

    const allCalculated = persons.every(function (name) {
      return !!monthMap[name];
    });

    if (!allCalculated) {
      return {
        calculated: false,
        monthBudget: null
      };
    }

    const total = persons.reduce(function (sum, name) {
      return sum + Number(monthMap[name].monthBudget || 0);
    }, 0);

    return {
      calculated: true,
      monthBudget: total
    };
  }

  if (!monthMap[person]) {
    return {
      calculated: false,
      monthBudget: null
    };
  }

  return {
    calculated: true,
    monthBudget: Number(monthMap[person].monthBudget || 0)
  };
}

function createEmptyHomeTotals() {
  return {
    dailyTotal: 0,
    allTotal: 0,
    fixedMonthTotal: 0,
    monthlyMonthTotal: 0,
    specialMonthTotal: 0,
    specialYearTotal: 0
  };
}

// Build monthly totals once, in input order. Annual special-expense totals
// are added to at most 12 months per row, also preserving input order.
// This keeps floating-point addition and the existing month-end cutoff intact.
function buildHomeTotalsIndex(inputValues, categoryMap) {
  const persons = ['共通', 'くる', 'ぐんま', '合計'];
  const monthly = new Map();
  const yearly = new Map();

  for (let i = 1; i < inputValues.length; i++) {
    const row = inputValues[i];
    const date = row[0];
    const person = row[1];
    const category = row[2];
    const amount = Number(row[4]);
    if (!date || !category || !amount || !persons.includes(person)) continue;

    const type = categoryMap[category];
    if (type === CATEGORY_TYPES.income) continue;
    const d = new Date(date);
    if (isNaN(d.getTime())) continue;
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = makeMonthKey(year, month);
    const includeInTotal = !isInternalTransferExpense(person, row[3]);

    if (!monthly.has(key)) {
      const totals = {};
      persons.forEach(function (name) { totals[name] = createEmptyHomeTotals(); });
      monthly.set(key, totals);
    }
    const monthTotals = monthly.get(key);
    addHomeAmount(monthTotals[person], type, amount, true, false);
    if (includeInTotal) addHomeAmount(monthTotals['合計'], type, amount, true, false);

    if (type !== CATEGORY_TYPES.yearly) continue;
    if (!yearly.has(year)) {
      const months = [];
      for (let m = 0; m < 12; m++) {
        const totals = {};
        persons.forEach(function (name) { totals[name] = 0; });
        months.push({ end: new Date(year, m + 1, 0), totals: totals });
      }
      yearly.set(year, months);
    }
    const yearMonths = yearly.get(year);
    for (let m = month; m < 12; m++) {
      if (d > yearMonths[m].end) continue;
      yearMonths[m].totals[person] += amount;
      if (includeInTotal) yearMonths[m].totals['合計'] += amount;
    }
  }
  return { monthly: monthly, yearly: yearly };
}

function getIndexedHomeTotals(index, year, month) {
  const totals = {};
  const monthly = index.monthly.get(makeMonthKey(year, month));
  const yearly = index.yearly.get(year);
  ['共通', 'くる', 'ぐんま', '合計'].forEach(function (person) {
    totals[person] = monthly ? Object.assign({}, monthly[person]) : createEmptyHomeTotals();
    totals[person].specialYearTotal = yearly ? yearly[month].totals[person] : 0;
  });
  return totals;
}

function calculateHomeBudgets(budgetValues, sheetMonthKey) {
  const budgets = { '合計': { monthBudget: 0, yearBudget: 0 } };
  ['共通', 'くる', 'ぐんま'].forEach(function (person) {
    budgets[person] = calculateBudgets(budgetValues, person, sheetMonthKey);
    budgets['合計'].monthBudget += budgets[person].monthBudget;
    budgets['合計'].yearBudget += budgets[person].yearBudget;
  });
  return budgets;
}

function calculateAllHomeTotals(inputValues, categoryMap, targetYear, targetMonth) {
  const monthEnd = new Date(targetYear, targetMonth + 1, 0);

  const totalsMap = {
    '共通': createEmptyHomeTotals(),
    'くる': createEmptyHomeTotals(),
    'ぐんま': createEmptyHomeTotals(),
    '合計': createEmptyHomeTotals()
  };

  for (let i = 1; i < inputValues.length; i++) {
    const row = inputValues[i];

    const date = row[0];
    const person = row[1];
    const category = row[2];
    const memo = row[3];
    const amount = Number(row[4]);

    if (!date || !category || !amount) continue;
    if (!totalsMap[person]) continue;

    const type = categoryMap[category];
    if (type === CATEGORY_TYPES.income) continue;

    const d = new Date(date);

    const isThisMonth =
      d.getFullYear() === targetYear &&
      d.getMonth() === targetMonth;

    const isThisYearUntilMonthEnd =
      d.getFullYear() === targetYear &&
      d <= monthEnd;

    addHomeAmount(totalsMap[person], type, amount, isThisMonth, isThisYearUntilMonthEnd);

    if (!isInternalTransferExpense(person, memo)) {
      addHomeAmount(totalsMap['合計'], type, amount, isThisMonth, isThisYearUntilMonthEnd);
    }
  }

  return totalsMap;
}

function addHomeAmount(totals, type, amount, isThisMonth, isThisYear) {
  if (isThisMonth) {
    totals.allTotal += amount;

    if (type === CATEGORY_TYPES.fixed) {
      totals.fixedMonthTotal += amount;
    }

    if (type === CATEGORY_TYPES.monthly) {
      totals.dailyTotal += amount;
      totals.monthlyMonthTotal += amount;
    }

    if (type === CATEGORY_TYPES.yearly) {
      totals.specialMonthTotal += amount;
    }
  }

  if (isThisYear && type === CATEGORY_TYPES.yearly) {
    totals.specialYearTotal += amount;
  }
}

function loadAllData(ss) {
  const monthlyBudgetHistorySheet =
    ss.getSheetByName(SHEET_NAMES.monthlyBudgetHistory);

  return {
    inputValues: ss.getSheetByName(SHEET_NAMES.input).getDataRange().getValues(),
    categoryValues: ss.getSheetByName(SHEET_NAMES.categoryMaster).getDataRange().getValues(),
    budgetValues: ss.getSheetByName(SHEET_NAMES.budgetMaster).getDataRange().getValues(),
    monthlyBudgetHistoryValues: monthlyBudgetHistorySheet
      ? monthlyBudgetHistorySheet.getDataRange().getValues()
      : []
  };
}

function loadCalendarSourceData(ss) {
  return {
    inputValues: ss.getSheetByName(SHEET_NAMES.input).getDataRange().getValues(),
    categoryValues: ss.getSheetByName(SHEET_NAMES.categoryMaster).getDataRange().getValues()
  };
}

function buildCategoryMap(categoryValues) {
  const map = {};

  for (let i = 1; i < categoryValues.length; i++) {
    const category = categoryValues[i][0];
    const type = categoryValues[i][1];

    if (category) {
      map[category] = type;
    }
  }

  return map;
}

function getCategoryFilterMaster() {
  requireViewerAccess_();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const values =
    ss.getSheetByName(SHEET_NAMES.categoryMaster)
      .getDataRange()
      .getValues();

  const result = {
    fixed: {
      label: '固定費',
      categories: []
    },
    monthly: {
      label: '日常費',
      categories: []
    },
    yearly: {
      label: '特別費',
      categories: []
    },
    income: {
      label: '収入',
      categories: []
    }
  };

  for (let i = 1; i < values.length; i++) {
    const category = values[i][0];
    const type = values[i][1];

    if (!category || !type) continue;

    if (type === CATEGORY_TYPES.fixed) {
      result.fixed.categories.push(category);
    }

    if (type === CATEGORY_TYPES.monthly) {
      result.monthly.categories.push(category);
    }

    if (type === CATEGORY_TYPES.yearly) {
      result.yearly.categories.push(category);
    }

    if (type === CATEGORY_TYPES.income) {
      result.income.categories.push(category);
    }
  }

  return result;
}

function calculateBudgets(budgetValues, selectedPerson, sheetMonthKey) {
  let monthBudget = 0;
  let yearBudget = 0;

  ['共通', 'くる', 'ぐんま'].forEach(function (person) {
    if (!isTargetPerson(selectedPerson, person)) return;

    const monthRow =
      findBudgetMasterRow(budgetValues, BUDGET_TYPES.monthly, person, sheetMonthKey);
    const yearRow =
      findBudgetMasterRow(budgetValues, BUDGET_TYPES.yearly, person, sheetMonthKey);

    if (monthRow) monthBudget += monthRow.amount;
    if (yearRow) yearBudget += yearRow.amount;
  });

  return {
    monthBudget,
    yearBudget
  };
}

// 予算マスタから、指定した月に適用される行を探す
// ・開始年月〜終了年月の範囲に入っている行だけ使う（終了年月が空欄なら現在の予算）
// ・複数当てはまる場合は開始年月が一番新しい行を使う
function findBudgetMasterRow(budgetValues, budgetType, person, sheetMonthKey) {
  if (!budgetValues || budgetValues.length <= 1) {
    return null;
  }

  let found = null;

  for (let i = 1; i < budgetValues.length; i++) {
    const row = budgetValues[i];

    if (row[0] !== budgetType || row[1] !== person) continue;

    const startKey = normalizeSheetMonthKey(row[3]);
    const endKey = normalizeSheetMonthKey(row[4]);

    if (startKey && sheetMonthKey < startKey) continue;
    if (endKey && sheetMonthKey > endKey) continue;

    if (!found || startKey > found.startKey) {
      found = {
        amount: Number(row[2]) || 0,
        startKey: startKey,
        endKey: endKey
      };
    }
  }

  return found;
}

function buildHomeResponse(budgets, totals, targetYear, targetMonth, monthlyBudgetInfo) {
  const monthBudgetCalculated =
    !!monthlyBudgetInfo && monthlyBudgetInfo.calculated === true;

  const monthBudget = monthBudgetCalculated
    ? Number(monthlyBudgetInfo.monthBudget)
    : null;

  const monthBudgetRemaining = monthBudgetCalculated
    ? monthBudget - totals.dailyTotal
    : null;

  const monthBudgetRate = monthBudgetCalculated
    ? calculateRate(totals.dailyTotal, monthBudget)
    : null;

  const budgetStatus = monthBudgetCalculated
    ? getBudgetStatus(monthBudgetRate, targetYear, targetMonth)
    : '予算未計算';

  const yearBudgetRemaining = budgets.yearBudget - totals.specialYearTotal;
  const yearBudgetRate = calculateRate(totals.specialYearTotal, budgets.yearBudget);

  return {
    dailyTotal: totals.dailyTotal,
    allTotal: totals.allTotal,

    fixedMonthTotal: totals.fixedMonthTotal,
    monthlyMonthTotal: totals.monthlyMonthTotal,
    specialMonthTotal: totals.specialMonthTotal,

    monthBudgetCalculated: monthBudgetCalculated,
    monthBudget: monthBudget,
    monthBudgetRemaining: monthBudgetRemaining,
    monthBudgetRate: monthBudgetRate,
    budgetStatus: budgetStatus,

    yearBudget: budgets.yearBudget,
    specialYearTotal: totals.specialYearTotal,
    yearBudgetRemaining,
    yearBudgetRate
  };
}

function isTargetPerson(selectedPerson, person) {
  return selectedPerson === '合計' || person === selectedPerson;
}

function isInternalTransferExpense(person, memo) {
  return (
    (person === 'くる' || person === 'ぐんま') &&
    String(memo).trim() === INTERNAL_TRANSFER_MEMOS.expenseToCommon
  );
}

function isInternalTransferIncome(person, category, memo) {
  return (
    person === '共通' &&
    category === CATEGORY_TYPES.income &&
    String(memo).trim() === INTERNAL_TRANSFER_MEMOS.incomeFromPersonal
  );
}

function calculateRate(used, budget) {
  if (!budget) return 0;
  return Math.round((used / budget) * 100);
}

function getBudgetStatus(rate, targetYear, targetMonth) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const targetKey = targetYear * 12 + targetMonth;
  const currentKey = currentYear * 12 + currentMonth;

  if (targetKey > currentKey) {
    return '予定支出を表示中';
  }

  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

  let elapsedRate;

  if (targetYear === currentYear && targetMonth === currentMonth) {
    elapsedRate = Math.round((today.getDate() / daysInMonth) * 100);
  } else {
    elapsedRate = 100;
  }

  const diff = rate - elapsedRate;

  if (diff <= -20) return '余裕があります';
  if (diff <= 5) return '順調です';
  if (diff <= 20) return '少し使いすぎです';
  return '使いすぎです';
}

function getDataMonthBounds(inputValues) {
  let minDate = null;
  let maxDate = null;
  const today = new Date();

  for (let i = 1; i < inputValues.length; i++) {
    const date = inputValues[i][0];
    if (!date) continue;

    const d = new Date(date);

    if (!minDate || d < minDate) {
      minDate = d;
    }

    if (!maxDate || d > maxDate) {
      maxDate = d;
    }
  }

  if (!minDate) {
    minDate = today;
  }

  if (!maxDate) {
    maxDate = today;
  }

  return {
    minYear: minDate.getFullYear(),
    minMonth: minDate.getMonth(),
    maxYear: maxDate.getFullYear(),
    maxMonth: maxDate.getMonth()
  };
}

function getHomeMonthBounds(inputValues, monthlyBudgetHistoryValues) {
  let minDate = null;
  let maxDate = null;
  const today = new Date();

  function addDate(d) {
    if (!d) return;

    if (!minDate || d < minDate) {
      minDate = d;
    }

    if (!maxDate || d > maxDate) {
      maxDate = d;
    }
  }

  for (let i = 1; i < inputValues.length; i++) {
    const date = inputValues[i][0];
    if (!date) continue;

    const d = new Date(date);
    addDate(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  if (monthlyBudgetHistoryValues && monthlyBudgetHistoryValues.length > 1) {
    for (let i = 1; i < monthlyBudgetHistoryValues.length; i++) {
      const parsed = parseSheetMonthKey(monthlyBudgetHistoryValues[i][0]);
      if (!parsed) continue;

      addDate(new Date(parsed.year, parsed.month, 1));
    }
  }

  addDate(new Date(today.getFullYear(), today.getMonth(), 1));

  return {
    minYear: minDate.getFullYear(),
    minMonth: minDate.getMonth(),
    maxYear: maxDate.getFullYear(),
    maxMonth: maxDate.getMonth()
  };
}

// ======================================
// 財産目録
// ======================================

function getAssetData(selectedPerson) {
  requireViewerAccess_();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const values = ss.getSheetByName(SHEET_NAMES.asset).getDataRange().getValues();

  const monthMap = {};

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    const date = row[0];
    const person = row[1];
    const type = row[2];
    const name = row[3];
    let amount = Number(row[4]);

    if (!date || !person || !type || !name || !amount) continue;
    if (!isTargetPerson(selectedPerson, person)) continue;

    const d = new Date(date);
    const key = d.getFullYear() + '-' + d.getMonth();

    if (!monthMap[key]) {
      monthMap[key] = {
        year: d.getFullYear(),
        month: d.getMonth(),
        label: (d.getMonth() + 1) + '月',
        total: 0,
        types: {},
        details: []
      };
    }

    if (type === '負債') {
      amount = -Math.abs(amount);
    }

    if (!monthMap[key].types[type]) {
      monthMap[key].types[type] = 0;
    }

    monthMap[key].types[type] += amount;
    monthMap[key].total += amount;

    monthMap[key].details.push({
      type: type,
      name: name,
      amount: amount
    });
  }

  const trend = Object.keys(monthMap)
    .map(function (key) {
      return monthMap[key];
    })
    .sort(function (a, b) {
      return (a.year * 12 + a.month) - (b.year * 12 + b.month);
    });

  if (trend.length === 0) {
    return {
      summary: {
        total: 0,
        monthDiff: null,
        yearDiff: null,
        targetLabel: 'データなし'
      },
      trend: [],
      breakdown: [],
      details: []
    };
  }

  const current = trend[trend.length - 1];

  const previousMonth = trend.find(function (item) {
    return item.year * 12 + item.month === current.year * 12 + current.month - 1;
  });

  const previousYear = trend.find(function (item) {
    return item.year === current.year - 1 &&
      item.month === current.month;
  });

  const breakdown = Object.keys(current.types)
    .map(function (type) {
      const amount = current.types[type];
      return {
        type: type,
        amount: amount,
        ratio: current.total ? Math.round((amount / current.total) * 100) : 0
      };
    })
    .sort(function (a, b) {
      return Math.abs(b.amount) - Math.abs(a.amount);
    });

  current.details.sort(function (a, b) {
    return Math.abs(b.amount) - Math.abs(a.amount);
  });

  return {
    summary: {
      total: current.total,
      monthDiff: previousMonth ? current.total - previousMonth.total : null,
      yearDiff: previousYear ? current.total - previousYear.total : null,
      targetLabel: current.year + '年' + (current.month + 1) + '月時点'
    },
    trend: trend,
    breakdown: breakdown,
    details: current.details
  };
}

// ======================================
// 支出一覧
// ======================================

function getMonthlyExpenseList(targetYear, targetMonth, selectedPerson) {
  requireViewerAccess_();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const data = loadCalendarSourceData(ss);
  const categoryMap = buildCategoryMap(data.categoryValues);

  const groups = {
    fixed: [],
    monthly: [],
    yearly: []
  };

  for (let i = 1; i < data.inputValues.length; i++) {
    const row = data.inputValues[i];

    const date = row[0];
    const person = row[1];
    const category = row[2];
    const memo = row[3];
    const amount = Number(row[4]);

    if (!date || !category || !amount) continue;
    if (!isTargetPerson(selectedPerson, person)) continue;

    if (
      selectedPerson === '合計' &&
      isInternalTransferExpense(person, memo)
    ) continue;

    const d = new Date(date);

    if (
      d.getFullYear() !== Number(targetYear) ||
      d.getMonth() !== Number(targetMonth)
    ) continue;

    const type = categoryMap[category];
    if (type === CATEGORY_TYPES.income) continue;

    const item = {
      date: Utilities.formatDate(d, 'Asia/Tokyo', 'M/d'),
      category: category,
      memo: memo || '',
      amount: amount
    };

    if (type === CATEGORY_TYPES.fixed) groups.fixed.push(item);
    if (type === CATEGORY_TYPES.monthly) groups.monthly.push(item);
    if (type === CATEGORY_TYPES.yearly) groups.yearly.push(item);
  }

  Object.keys(groups).forEach(function (key) {
    groups[key].sort(function (a, b) {
      return b.sortKey - a.sortKey;
    });
  });

  return groups;
}


function getCalendarData(targetYear, targetMonth, selectedPerson, selectedCategories) {
  requireViewerAccess_();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const data = loadCalendarSourceData(ss);

  const categoryMap = buildCategoryMap(data.categoryValues);

  const days = {};
  const allColorTotalsByDate = {};

  for (let i = 1; i < data.inputValues.length; i++) {
    const row = data.inputValues[i];

    const date = row[0];
    const person = row[1];
    const category = row[2];
    const memo = row[3];
    const amount = Number(row[4]);

    if (
      selectedCategories &&
      selectedCategories.length === 0
    ) continue;

    if (
      selectedCategories &&
      selectedCategories.length > 0 &&
      !selectedCategories.includes(category)
    ) continue;

    if (!date || !category || !amount) continue;
    if (!isTargetPerson(selectedPerson, person)) continue;

    if (
      selectedPerson === '合計' &&
      isInternalTransferExpense(person, memo)
    ) continue;

    const type = categoryMap[category];

    if (type === CATEGORY_TYPES.income) continue;

    const d = new Date(date);

    const dateKey = Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy-MM-dd');

    if (!allColorTotalsByDate[dateKey]) {
      allColorTotalsByDate[dateKey] = 0;
    }

    allColorTotalsByDate[dateKey] += amount;

    if (
      d.getFullYear() !== Number(targetYear) ||
      d.getMonth() !== Number(targetMonth)
    ) continue;

    const day = d.getDate();
    const key = String(day);

    if (!days[key]) {
      days[key] = {
        total: 0,
        colorTotal: 0,
        count: 0,
        colorLevel: 0,
        items: []
      };
    }

    const item = {
      date: Utilities.formatDate(d, 'Asia/Tokyo', 'M/d'),
      category: category,
      memo: memo || '',
      amount: amount,
      type: type
    };

    days[key].total += amount;
    days[key].colorTotal += amount;
    days[key].count += 1;
    days[key].items.push(item);
  }

  const allColorTotals = Object.keys(allColorTotalsByDate).map(function (key) {
    return allColorTotalsByDate[key];
  });

  const thresholds = buildCalendarPercentileThresholds(allColorTotals);

  Object.keys(days).forEach(function (day) {
    days[day].items.sort(function (a, b) {
      return Number(b.amount) - Number(a.amount);
    });

    days[day].colorLevel =
      getCalendarColorLevel(days[day].colorTotal, thresholds);
  });

  return days;
}

function buildCalendarPercentileThresholds(values) {
  const sorted = values
    .filter(function (value) {
      return Number(value) > 0;
    })
    .sort(function (a, b) {
      return Number(a) - Number(b);
    });

  return {
    p20: getCalendarPercentileValue(sorted, 20),
    p40: getCalendarPercentileValue(sorted, 40),
    p60: getCalendarPercentileValue(sorted, 60),
    p80: getCalendarPercentileValue(sorted, 80),
    p95: getCalendarPercentileValue(sorted, 95)
  };
}

function getCalendarPercentileValue(sortedValues, percentile) {
  if (!sortedValues || sortedValues.length === 0) {
    return 0;
  }

  const index =
    Math.ceil((percentile / 100) * sortedValues.length) - 1;

  const safeIndex = Math.max(
    0,
    Math.min(index, sortedValues.length - 1)
  );

  return Number(sortedValues[safeIndex]);
}

function getCalendarColorLevel(value, thresholds) {
  const amount = Number(value || 0);

  if (amount <= 0) return 0;
  if (amount <= thresholds.p20) return 1;
  if (amount <= thresholds.p40) return 2;
  if (amount <= thresholds.p60) return 3;
  if (amount <= thresholds.p80) return 4;
  if (amount <= thresholds.p95) return 5;
  return 6;
}

// ======================================
// 月別推移
// ======================================

function addBalanceIncome(months, date, amount) {
  const target = findMonthItem(months, date);
  if (!target) return;

  target.income += amount;
}

function addBalanceExpense(months, date, amount) {
  const target = findMonthItem(months, date);
  if (!target) return;

  target.expense += amount;
}

// Each array is indexed once per execution; no cross-request or shared cache.
const monthItemIndexes = new WeakMap();

function findMonthItem(months, date) {
  let index = monthItemIndexes.get(months);
  if (!index) {
    index = new Map();
    months.forEach(function (item) {
      const key = makeMonthKey(item.year, item.month);
      if (!index.has(key)) index.set(key, item);
    });
    monthItemIndexes.set(months, index);
  }
  return index.get(makeMonthKey(date.getFullYear(), date.getMonth()));
}

function getBalanceData() {
  requireViewerAccess_();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const data = loadCalendarSourceData(ss);
  const categoryMap = buildCategoryMap(data.categoryValues);
  const monthBounds = getDataMonthBounds(data.inputValues);

  const persons = ['共通', 'くる', 'ぐんま', '合計'];
  const result = {};

  persons.forEach(function (person) {
    result[person] = createEmptyBalanceMonths(monthBounds);
  });

  for (let i = 1; i < data.inputValues.length; i++) {
    const row = data.inputValues[i];

    const date = row[0];
    const person = row[1];
    const category = row[2];
    const memo = row[3];
    const amount = Number(row[4]);

    if (!date || !category || !amount) continue;
    if (!result[person]) continue;

    const type = categoryMap[category];
    const d = new Date(date);

    if (type === CATEGORY_TYPES.income) {
      addBalanceIncome(result[person], d, amount);

      if (!isInternalTransferIncome(person, category, memo)) {
        addBalanceIncome(result['合計'], d, amount);
      }

      continue;
    }

    addBalanceExpense(result[person], d, amount);

    if (!isInternalTransferExpense(person, memo)) {
      addBalanceExpense(result['合計'], d, amount);
    }
  }

  persons.forEach(function (person) {
    result[person].forEach(function (item) {
      item.balance = item.income - item.expense;
    });
  });

  return result;
}

function getRankingData(compact) {
  requireViewerAccess_();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const data = loadCalendarSourceData(ss);
  const categoryMap = buildCategoryMap(data.categoryValues);

  const persons = ['共通', 'くる', 'ぐんま', '合計'];

  const result = {
    currentMonth: {},
    currentYear: {},
    all: {}
  };

  persons.forEach(function (person) {
    result.currentMonth[person] = [];
    result.currentYear[person] = [];
    result.all[person] = [];
  });

  const dateLabels = new Map();
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  for (let i = 1; i < data.inputValues.length; i++) {
    const row = data.inputValues[i];

    const date = row[0];
    const person = row[1];
    const category = row[2];
    const memo = row[3];
    const amount = Number(row[4]);

    if (!date || !category || !amount) continue;
    if (!result.all[person]) continue;

    const type = categoryMap[category];

    if (
      type !== CATEGORY_TYPES.monthly &&
      type !== CATEGORY_TYPES.yearly &&
      type !== CATEGORY_TYPES.fixed
    ) continue;

    const d = new Date(date);

    const timestamp = d.getTime();
    if (!dateLabels.has(timestamp)) dateLabels.set(timestamp, Utilities.formatDate(d, 'Asia/Tokyo', 'M/d'));
    const item = {
      date: dateLabels.get(timestamp),
      sortKey:
        d.getFullYear() * 10000 +
        (d.getMonth() + 1) * 100 +
        d.getDate(),
      year: d.getFullYear(),
      month: d.getMonth(),
      category: category,
      memo: memo || '',
      title: memo || category,
      amount: amount
    };

    result.all[person].push(item);

    if (!isInternalTransferExpense(person, memo)) {
      result.all['合計'].push(item);
    }
  }

  persons.forEach(function (person) {
    result.all[person].sort(function (a, b) { return Number(b.amount) - Number(a.amount); });
  });
  if (compact === true) {
    return { all: result.all, currentYearNumber: currentYear, currentMonthNumber: currentMonth };
  }
  persons.forEach(function (person) {
    result.currentYear[person] = result.all[person].filter(function (item) { return item.year === currentYear; });
    result.currentMonth[person] = result.currentYear[person].filter(function (item) { return item.month === currentMonth; });
  });

  return result;
}

function addRankingItem(result, person, item, date, currentYear, currentMonth) {
  result.all[person].push(item);

  if (date.getFullYear() === currentYear) {
    result.currentYear[person].push(item);
  }

  if (
    date.getFullYear() === currentYear &&
    date.getMonth() === currentMonth
  ) {
    result.currentMonth[person].push(item);
  }
}

function sortRankingResult(result) {
  Object.keys(result).forEach(function (periodKey) {
    Object.keys(result[periodKey]).forEach(function (person) {
      result[periodKey][person].sort(function (a, b) {
        return Number(b.amount) - Number(a.amount);
      });
    });
  });
}

function getMonthlyTrendData() {
  requireViewerAccess_();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const data = loadCalendarSourceData(ss);
  data.budgetValues = ss.getSheetByName(SHEET_NAMES.budgetMaster).getDataRange().getValues();
  const categoryMap = buildCategoryMap(data.categoryValues);
  const monthBounds = getDataMonthBounds(data.inputValues);

  const persons = ['共通', 'くる', 'ぐんま', '合計'];
  const result = {};

  persons.forEach(function (person) {
    result[person] = createEmptyTrendMonths(monthBounds, data.budgetValues, person);
  });

  for (let i = 1; i < data.inputValues.length; i++) {
    const row = data.inputValues[i];

    const date = row[0];
    const person = row[1];
    const category = row[2];
    const memo = row[3];
    const amount = Number(row[4]);

    if (!date || !category || !amount) continue;
    if (!result[person]) continue;

    const type = categoryMap[category];
    if (type === CATEGORY_TYPES.income) continue;

    const d = new Date(date);

    addTrendAmount(result[person], d, type, amount, category);

    if (!isInternalTransferExpense(person, memo)) {
      addTrendAmount(result['合計'], d, type, amount, category);
    }
  }

  return result;
}

function createEmptyBalanceMonths(monthBounds) {
  const months = [];

  for (let year = monthBounds.minYear; year <= monthBounds.maxYear; year++) {
    const startMonth = year === monthBounds.minYear ? monthBounds.minMonth : 0;
    const endMonth = year === monthBounds.maxYear ? monthBounds.maxMonth : 11;

    for (let month = startMonth; month <= endMonth; month++) {
      months.push({
        year: year,
        month: month,
        label: (month + 1) + '月',
        income: 0,
        expense: 0,
        balance: 0
      });
    }
  }

  return months;
}

function createEmptyTrendMonths(monthBounds, budgetValues, person) {
  const months = [];

  for (let year = monthBounds.minYear; year <= monthBounds.maxYear; year++) {
    const startMonth = year === monthBounds.minYear ? monthBounds.minMonth : 0;
    const endMonth = year === monthBounds.maxYear ? monthBounds.maxMonth : 11;

    for (let month = startMonth; month <= endMonth; month++) {
      const monthBudget =
        calculateBudgets(budgetValues, person, makeSheetMonthKey(year, month)).monthBudget;

      months.push({
        year: year,
        month: month,
        label: (month + 1) + '月',
        fixed: 0,
        monthly: 0,
        yearly: 0,
        total: 0,
        monthBudget: monthBudget,
        categories: {}
      });
    }
  }

  return months;
}

function addTrendAmount(months, date, type, amount, category) {
  const target = findMonthItem(months, date);

  if (!target) return;

  if (type === CATEGORY_TYPES.fixed) {
    target.fixed += amount;
  }

  if (type === CATEGORY_TYPES.monthly) {
    target.monthly += amount;
  }

  if (type === CATEGORY_TYPES.yearly) {
    target.yearly += amount;
  }

  if (!target.categories[category]) {
    target.categories[category] = 0;
  }

  target.categories[category] += amount;

  target.total += amount;
}

function doPost(e) {
  viewerRequestAuthorized_ = false;
  try {

    const request = JSON.parse(e.postData.contents);
    verifyViewerToken_(request.authToken);
    viewerRequestAuthorized_ = true;

    const action = request.action;
    const params = request.params || {};

    let result;

    switch (action) {
      case 'getViewerAccess':
        result = { authorized: true };
        break;

      case 'getAllHomeData':
        result = getAllHomeData();
        break;

      case 'getCategoryFilterMaster':
        result = getCategoryFilterMaster();
        break;

      case 'getMonthlyTrendData':
        result = getMonthlyTrendData();
        break;

      case 'getBalanceData':
        result = getBalanceData();
        break;

      case 'getRankingData':
        result = getRankingData(params.compact === true);
        break;

      case 'getAssetData':
        result = getAssetData(params.selectedPerson);
        break;

      case 'getCalendarData':
        result = getCalendarData(
          params.targetYear,
          params.targetMonth,
          params.selectedPerson,
          params.selectedCategories
        );
        break;

      case 'getMonthlyExpenseList':
        result = getMonthlyExpenseList(
          params.targetYear,
          params.targetMonth,
          params.selectedPerson
        );
        break;

      case 'getBudgetData':
        result = getBudgetData(params.targetYear, params.targetMonth);
        break;

      case 'upsertMonthlyBudget':
        result = upsertMonthlyBudget(
          params.targetYear,
          params.targetMonth,
          params.selectedPerson
        );
        break;

      default:
        throw new Error('Unknown action: ' + action);
    }

    return ContentService
      .createTextOutput(
        JSON.stringify({
          success: true,
          data: result
        })
      )
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {

    return ContentService
      .createTextOutput(
        JSON.stringify({
          success: false,
          code: error.code || 'API_ERROR',
          message: error.message
        })
      )
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    viewerRequestAuthorized_ = false;
  }
}

const BUDGET_PERSONS = ['共通', 'くる', 'ぐんま'];
const BUDGET_ALL = 'すべて';

function buildBudgetPersonView(person, baseBudget, history, sourceMonthKey, targetMonthKey) {
  if (!history) {
    return {
      person: person,
      calculated: false,
      message: getDisplayMonthTextFromKey(targetMonthKey) + 'の予算はまだありません。',
      statusText: '未作成',
      buttonText: '予算を作成',
      baseMonthBudget: baseBudget,
      carryover: null,
      monthBudget: null,
      sourceMonthKey: sourceMonthKey,
      sourceText: ''
    };
  }

  return {
    person: person,
    calculated: true,
    message: getSourceMonthDisplayText(history.sourceMonth || sourceMonthKey) + '実績から作成済み',
    statusText: '作成済み',
    buttonText: '再計算',
    baseMonthBudget: Number(history.baseMonthBudget || 0),
    carryover: Number(history.carryover || 0),
    monthBudget: Number(history.monthBudget || 0),
    sourceMonthKey: history.sourceMonth || sourceMonthKey,
    sourceText: getSourceMonthDisplayText(history.sourceMonth || sourceMonthKey) + '実績から作成済み'
  };
}

function getBudgetData(targetYear, targetMonth) {
  requireViewerAccess_();
  targetYear = Number(targetYear);
  targetMonth = Number(targetMonth);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const data = loadAllData(ss);

  const sheetMonthKey = makeSheetMonthKey(targetYear, targetMonth);
  const sourceMonth = getPreviousMonth(targetYear, targetMonth);
  const sourceMonthKey = makeSheetMonthKey(sourceMonth.year, sourceMonth.month);

  const monthlyBudgetHistoryMap =
    buildMonthlyBudgetHistoryMap(data.monthlyBudgetHistoryValues);

  const monthMap = monthlyBudgetHistoryMap[sheetMonthKey] || {};

  const persons = {};

  BUDGET_PERSONS.forEach(function(person) {
    const baseBudget = getBaseMonthBudget(data.budgetValues, person, sheetMonthKey);
    const history = monthMap[person] || null;

    persons[person] = buildBudgetPersonView(
      person,
      baseBudget,
      history,
      sourceMonthKey,
      sheetMonthKey
    );
  });

  const allCalculated = BUDGET_PERSONS.every(function(person) {
    return persons[person].calculated;
  });

  const hasUncreated = BUDGET_PERSONS.some(function(person) {
    return !persons[person].calculated;
  });

  return {
    targetYear: targetYear,
    targetMonth: targetMonth,
    targetMonthKey: sheetMonthKey,
    sourceMonthKey: sourceMonthKey,
    persons: persons,
    all: {
      calculated: allCalculated,
      hasUncreated: hasUncreated,
      buttonText: hasUncreated ? 'まとめて作成' : 'まとめて再計算'
    }
  };
}

function upsertMonthlyBudget(targetYear, targetMonth, selectedPerson) {
  requireViewerAccess_();
  targetYear = Number(targetYear);
  targetMonth = Number(targetMonth);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const data = loadAllData(ss);

  const sheet = ss.getSheetByName(SHEET_NAMES.monthlyBudgetHistory);
  if (!sheet) {
    throw new Error('月別予算履歴シートが見つかりません。');
  }

  const targetMonthKey = makeSheetMonthKey(targetYear, targetMonth);
  const sourceMonth = getPreviousMonth(targetYear, targetMonth);
  const sourceMonthKey = makeSheetMonthKey(sourceMonth.year, sourceMonth.month);

  const persons = selectedPerson === BUDGET_ALL
    ? BUDGET_PERSONS
    : [selectedPerson];

  persons.forEach(function (person) {
    if (BUDGET_PERSONS.indexOf(person) === -1) {
      throw new Error('対象外の区分です: ' + person);
    }
  });

  const categoryMap = buildCategoryMap(data.categoryValues);
  const sourceTotalsMap =
    calculateAllHomeTotals(data.inputValues, categoryMap, sourceMonth.year, sourceMonth.month);

  const historyMap = buildMonthlyBudgetHistoryMap(data.monthlyBudgetHistoryValues);
  const sourceMonthMap = historyMap[sourceMonthKey] || {};

  const rows = sheet.getDataRange().getValues();

  persons.forEach(function (person) {
    const budgetRow =
      findBudgetMasterRow(data.budgetValues, BUDGET_TYPES.monthly, person, targetMonthKey);

    if (!budgetRow) {
      throw new Error(
        '予算マスタに' + targetMonthKey + 'の' + person + 'の月予算がありません。'
      );
    }

    const baseMonthBudget = budgetRow.amount;

    const sourceHistory = sourceMonthMap[person];

    if (!sourceHistory) {
      throw new Error(
        targetMonthKey + '予算を作成するには、先に' +
        sourceMonthKey + '予算を作成してください。'
      );
    }

    const sourceMonthBudget = Number(sourceHistory.monthBudget || 0);
    const sourceDailyTotal = Number(sourceTotalsMap[person].dailyTotal || 0);

    const carryover = sourceMonthBudget - sourceDailyTotal;
    const monthBudget = baseMonthBudget + carryover;

    const newRow = [
      targetMonthKey,
      person,
      baseMonthBudget,
      carryover,
      monthBudget,
      sourceMonthKey,
      sourceMonthBudget,
      sourceDailyTotal,
      new Date()
    ];

    upsertMonthlyBudgetHistoryRow(sheet, rows, targetMonthKey, person, newRow);
  });

  return {
    success: true,
    targetMonthKey: targetMonthKey,
    selectedPerson: selectedPerson,
    updatedPersons: persons,
    budgetData: getBudgetData(targetYear, targetMonth)
  };
}

function upsertMonthlyBudgetHistoryRow(sheet, rows, targetMonthKey, person, newRow) {
  let targetRowIndex = -1;

  for (let i = 1; i < rows.length; i++) {
    const rowMonthKey = normalizeSheetMonthKey(rows[i][0]);
    const rowPerson = rows[i][1];

    if (rowMonthKey === targetMonthKey && rowPerson === person) {
      targetRowIndex = i + 1;
      break;
    }
  }

  if (targetRowIndex === -1) {
    targetRowIndex = sheet.getLastRow() + 1;
  }

  const range = sheet.getRange(targetRowIndex, 1, 1, newRow.length);

  range.setNumberFormats([[
    '@',                    // 対象年月
    '@',                    // 区分
    '#,##0',                // 基本月予算
    '#,##0',                // 前月までの繰越
    '#,##0',                // 今月予算
    '@',                    // 計算元年月
    '#,##0',                // 計算元月予算
    '#,##0',                // 計算元日常費実績
    'yyyy/MM/dd HH:mm:ss'   // 計算日時
  ]]);

  range.setValues([newRow]);
}

function getBaseMonthBudget(budgetValues, person, sheetMonthKey) {
  const row =
    findBudgetMasterRow(budgetValues, BUDGET_TYPES.monthly, person, sheetMonthKey);

  return row ? row.amount : 0;
}

function getPreviousMonth(year, month) {
  if (month === 0) {
    return {
      year: year - 1,
      month: 11
    };
  }

  return {
    year: year,
    month: month - 1
  };
}

function getSourceMonthDisplayText(monthKey) {
  const parsed = parseSheetMonthKey(monthKey);

  if (!parsed) {
    return '';
  }

  return String(parsed.month + 1) + '月';
}

function getDisplayMonthTextFromKey(monthKey) {
  const parsed = parseSheetMonthKey(monthKey);

  if (!parsed) {
    return '';
  }

  return String(parsed.month + 1) + '月';
}