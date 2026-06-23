

const API_URL = 'https://script.google.com/macros/s/AKfycbyLL7ZKPhH_XIHJh_zsCfaWrkTmbsCwC0WekUxpjBI_gcB2TLpnpYpnHHCYH0XuofiN1w/exec';

function getCategoryFilterMasterApi() {
  return callApi('getCategoryFilterMaster');
}

function getMonthlyTrendDataApi() {
  return callApi('getMonthlyTrendData');
}

function getBalanceDataApi() {
  return callApi('getBalanceData');
}

function getRankingDataApi() {
  return callApi('getRankingData');
}

function getAssetDataApi(selectedPerson) {
  return callApi('getAssetData', {
    selectedPerson: selectedPerson
  });
}

function getCalendarDataApi(
  targetYear,
  targetMonth,
  selectedPerson,
  selectedCategories
) {
  return callApi('getCalendarData', {
    targetYear,
    targetMonth,
    selectedPerson,
    selectedCategories
  });
}

function getMonthlyExpenseListApi(
  targetYear,
  targetMonth,
  selectedPerson
) {
  return callApi('getMonthlyExpenseList', {
    targetYear,
    targetMonth,
    selectedPerson
  });
}

function callApi(action, params = {}) {
  return fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: action,
      params: params
    })
  })
    .then(function(response) {
      return response.json();
    })
    .then(function(result) {
      if (!result.success) {
        throw new Error(result.message || 'APIエラー');
      }

      return result.data;
    });
}

// ======================================
// 共通処理
// ======================================

function openKakeibo(){
  window.location.href =
    "https://script.google.com/macros/s/AKfycbxeMor57OdXyu96EhZLmlIttYje5BwxW-OwC7Jm_5zUVyOW9EdwTsI8VNizWZvwMb0UFA/exec",
    "kakeibo"
}

    function formatMoney(value) {
      const num = Number(value);
      return Math.abs(num).toLocaleString() + '円';
    }

function formatSignedMoney(value) {
  const num = Number(value);
  const sign = num > 0 ? '+' : num < 0 ? '-' : '';
  return sign + Math.abs(num).toLocaleString() + '円';
}

function getBalanceClass(value) {
  const num = Number(value);

  if (num > 0) return 'positive';
  if (num < 0) return 'negative';
  return 'zero';
}

function getCurrentMonthLabel() {
const now = new Date();
return now.getFullYear() + '年' + (now.getMonth() + 1) + '月';
}

function setBar(id, rate, statusText) {
  const bar = document.getElementById(id);
  const width = Math.min(Number(rate), 100);

  bar.style.width = width + '%';

  bar.classList.remove('warning');
  bar.classList.remove('caution');
  bar.classList.remove('future');

  if (statusText === '予定支出を表示中') {
  bar.classList.add('future');
  return;
  }

  if (statusText === '使いすぎです') {
    bar.classList.add('warning');
  } else if (statusText === '少し使いすぎです') {
    bar.classList.add('caution');
  }
}

function setYearBar(id, rate) {
  const bar = document.getElementById(id);
  const width = Math.min(Number(rate), 100);

  bar.style.width = width + '%';

  bar.classList.remove('warning');
  bar.classList.remove('caution');

  if (Number(rate) >= 100) {
    bar.classList.add('warning');
  } else if (Number(rate) >= 70) {
    bar.classList.add('caution');
  }
}

function setStatus(statusText) {
  const status = document.getElementById('budgetStatus');

  status.textContent = statusText;

  status.classList.remove('warning');
  status.classList.remove('caution');

  if (statusText === '使いすぎです') {
    status.classList.add('warning');
  } else if (statusText === '少し使いすぎです') {
    status.classList.add('caution');
  }
}

function setHeroStatus(statusText) {
  const hero = document.querySelector('.hero');

  hero.classList.remove('caution');
  hero.classList.remove('warning');
  hero.classList.remove('future');

  const status = document.getElementById('budgetStatus');

  status.classList.remove('caution');
  status.classList.remove('warning');
  status.classList.remove('future');

  if (statusText === '予定支出を表示中') {
  hero.classList.add('future');
  status.classList.add('future');
  return;
}

  if (statusText === '使いすぎです') {
    hero.classList.add('warning');
  } else if (statusText === '少し使いすぎです') {
    hero.classList.add('caution');
  }
}

// ======================================
// ホーム画面表示
// ======================================

    function setLoading() {

document.getElementById('prevMonthButton').disabled = true;
document.getElementById('nextMonthButton').disabled = true;

      document.getElementById('monthRemainingLabel').textContent = '残り予算';
      document.getElementById('monthBudgetRemaining').textContent = '読み込み中...';
      document.getElementById('dailyTotal').textContent = '読み込み中...';
      document.getElementById('monthBudgetText').textContent = '月予算 読み込み中...';
      document.getElementById('monthBudgetRate').textContent = '--%消化';
      document.getElementById('budgetStatus').textContent = '読み込み中...';

      document.getElementById('yearRemainingLabel').textContent = '残り予算';
      document.getElementById('yearBudgetRemaining').textContent = '読み込み中...';
      document.getElementById('specialYearTotal').textContent = '支出 読み込み中...';

      document.getElementById('yearBudgetRate').textContent = '--%消化';

      document.getElementById('allTotal').textContent = '読み込み中...';
      document.getElementById('monthlyBreakdown').textContent = '読み込み中...';

      setBar('monthBudgetBar', 0);
      setBar('yearBudgetBar', 0);
    }

    function renderHomeData(data) {
      if (Number(data.monthBudgetRemaining) < 0) {
        document.getElementById('monthRemainingLabel').textContent = '予算オーバー';
      } else {
        document.getElementById('monthRemainingLabel').textContent = '残り予算';
      }

      document.getElementById('monthBudgetRemaining').textContent =
        formatMoney(data.monthBudgetRemaining);

      document.getElementById('dailyTotal').textContent =
        formatMoney(data.dailyTotal);

      document.getElementById('monthBudgetText').textContent =
        '月予算 ' + formatMoney(data.monthBudget);

      document.getElementById('monthBudgetRate').textContent =
        data.monthBudgetRate + '%消化';

      setHeroStatus(data.budgetStatus);
      setStatus(data.budgetStatus);

      setBar('monthBudgetBar', data.monthBudgetRate, data.budgetStatus);

     renderSpecialCard(data);

      document.getElementById('allTotal').textContent =
        formatMoney(data.allTotal);

      document.getElementById('monthlyBreakdown').innerHTML =
  '<div class="breakdown-row"><span>固定費</span><span>' + formatMoney(data.fixedMonthTotal) + '</span></div>' +
  '<div class="breakdown-row"><span>日常費</span><span>' + formatMoney(data.monthlyMonthTotal) + '</span></div>' +
  '<div class="breakdown-row"><span>特別費</span><span>' + formatMoney(data.specialMonthTotal) + '</span></div>';
    }

  function renderSpecialCard(data) {
  const title = document.getElementById('specialCardTitle');
  const label = document.getElementById('yearRemainingLabel');
  const value = document.getElementById('yearBudgetRemaining');
  const status = document.getElementById('specialYearTotal');
  const rate = document.getElementById('yearBudgetRate');
  const card = document.querySelector('.special-card');

  card.classList.remove('month-mode');

  value.classList.remove('danger');
  status.classList.remove('danger');

  if (specialDisplayMode === 'month') {
    card.classList.add('month-mode');
    title.textContent = '🧳 今月の特別費';
    label.textContent = '支出';
    value.textContent = formatMoney(data.specialMonthTotal);
    status.textContent = '年予算残り ' + formatMoney(data.yearBudgetRemaining);
    rate.textContent = '年予算 ' + data.yearBudgetRate + '%消化';
    setYearBar('yearBudgetBar', data.yearBudgetRate);
    return;
  }

  title.textContent = '🎒 今年の特別費';
  label.textContent = '支出';
  value.textContent = formatMoney(data.specialYearTotal);

  if (Number(data.yearBudgetRemaining) < 0) {
    status.textContent =
      formatMoney(data.yearBudgetRemaining) + 'オーバー';
    status.classList.add('danger');
  } else {
    status.textContent =
      '残り予算 ' + formatMoney(data.yearBudgetRemaining);
  }

  rate.textContent = data.yearBudgetRate + '%消化';

  setYearBar('yearBudgetBar', data.yearBudgetRate);
}

function toggleSpecialMode() {
  specialDisplayMode =
    specialDisplayMode === 'year' ? 'month' : 'year';

  renderSelectedPerson(currentPerson);
}

// ======================================
// ホーム状態・月切替
// ======================================

let homeDataCache = null;
let currentPerson = null;

let trendDataCache = null;
let currentTrendPerson = '共通';
let balanceDataCache = null;
let currentBalancePerson = '共通';

let rankingDataCache = null;
let currentRankingPerson = '共通';
let currentRankingPeriod = 'currentMonth';

let currentCalendarPerson = '共通';
let selectedCalendarYear = null;
let selectedCalendarMonth = null;
let currentCalendarData = null;

let categoryMasterCache = null;
let trendSelectedCategories = [];
let calendarSelectedCategories = [];
let categorySheetMode = 'ranking';
let customRankingStartDate = null;
let customRankingEndDate = null;

let periodApplyCallback = null;

let selectedTrendYear = null;
let selectedTrendMonth = null;

let selectedYear = new Date().getFullYear();
let selectedMonth = new Date().getMonth();

let minYear = null;
let minMonth = null;
let maxYear = null;
let maxMonth = null;

let selectedCategories = [];
let specialDisplayMode = 'year';

let selectedCalendarDay = null;

let currentAssetPerson = '共通';
let assetDataCache = {};

function getAllCategoriesFromMaster(master) {
  let categories = [];

  Object.keys(master).forEach(function(groupKey) {
    categories = categories.concat(
      master[groupKey].categories
    );
  });

  return categories;
}

function getTrendAllCategoriesFromMaster() {
  let categories = [];

  ['fixed', 'monthly', 'yearly'].forEach(function(groupKey) {
    categories = categories.concat(
      categoryMasterCache[groupKey].categories
    );
  });

  return categories;
}

function getActiveSelectedCategories() {
  if (categorySheetMode === 'trend') {
    return trendSelectedCategories;
  }

  if (categorySheetMode === 'calendar') {
    return calendarSelectedCategories;
  }

  return selectedCategories;
}

function setActiveSelectedCategories(categories) {
  if (categorySheetMode === 'trend') {
    trendSelectedCategories = categories;
    return;
  }

  if (categorySheetMode === 'calendar') {
    calendarSelectedCategories = categories;
    return;
  }

  selectedCategories = categories;
}

function getFilteredTrendData(data) {
  return data.map(function(item) {
    const filtered = {
      year: item.year,
      month: item.month,
      label: item.label,
      fixed: 0,
      monthly: 0,
      yearly: 0,
      total: 0,
      monthBudget: item.monthBudget,
      categories: item.categories
    };

    trendSelectedCategories.forEach(function(category) {
      const amount = Number(item.categories[category] || 0);
      if (!amount) return;

      if (categoryMasterCache.fixed.categories.includes(category)) {
        filtered.fixed += amount;
      }

      if (categoryMasterCache.monthly.categories.includes(category)) {
        filtered.monthly += amount;
      }

      if (categoryMasterCache.yearly.categories.includes(category)) {
        filtered.yearly += amount;
      }

      filtered.total += amount;
    });

    return filtered;
  });
}

function getCurrentTrendData() {
  return getFilteredTrendData(
    trendDataCache[currentTrendPerson]
  );
}

function getCategoryButtonLabel() {

  if (!categoryMasterCache) {
    return 'カテゴリ：すべて ▼';
  }

  const allCategories =
    getAllCategoriesFromMaster(categoryMasterCache);

  if (selectedCategories.length === 0) {
    return 'カテゴリ：未選択 ▼';
  }

  if (selectedCategories.length === allCategories.length) {
    return 'カテゴリ：すべて ▼';
  }

  const fixedCategories =
    categoryMasterCache.fixed.categories;

  const monthlyCategories =
    categoryMasterCache.monthly.categories;

  const yearlyCategories =
    categoryMasterCache.yearly.categories;

  const fixedAll =
    fixedCategories.every(function(category) {
      return selectedCategories.includes(category);
    });

  const monthlyAll =
    monthlyCategories.every(function(category) {
      return selectedCategories.includes(category);
    });

  const yearlyAll =
    yearlyCategories.every(function(category) {
      return selectedCategories.includes(category);
    });

  const selectedGroupNames = [];

  if (
    fixedAll &&
    fixedCategories.every(function(category) {
      return selectedCategories.includes(category);
    })
  ) {
    selectedGroupNames.push('固定費');
  }

  if (
    monthlyAll &&
    monthlyCategories.every(function(category) {
      return selectedCategories.includes(category);
    })
  ) {
    selectedGroupNames.push('日常費');
  }

  if (
    yearlyAll &&
    yearlyCategories.every(function(category) {
      return selectedCategories.includes(category);
    })
  ) {
    selectedGroupNames.push('特別費');
  }

  const groupCategoryCount =
    (fixedAll ? fixedCategories.length : 0) +
    (monthlyAll ? monthlyCategories.length : 0) +
    (yearlyAll ? yearlyCategories.length : 0);

  if (
    selectedGroupNames.length > 0 &&
    groupCategoryCount === selectedCategories.length
  ) {
    return 'カテゴリ：' +
      selectedGroupNames.join('＋') +
      ' ▼';
  }

  if (selectedCategories.length <= 2) {
    return 'カテゴリ：' +
      selectedCategories.join('・') +
      ' ▼';
  }

  return (
    'カテゴリ：' +
    selectedCategories[0] +
    'ほか' +
    (selectedCategories.length - 1) +
    '件 ▼'
  );
}

function getTrendCategoryButtonLabel() {
  const allCategories = getTrendAllCategoriesFromMaster();

  if (trendSelectedCategories.length === 0) {
    return '未選択';
  }

  if (trendSelectedCategories.length === allCategories.length) {
    return 'すべて';
  }

  const fixedCategories = categoryMasterCache.fixed.categories;
  const monthlyCategories = categoryMasterCache.monthly.categories;
  const yearlyCategories = categoryMasterCache.yearly.categories;

  const fixedAll =
    fixedCategories.every(function(category) {
      return trendSelectedCategories.includes(category);
    });

  const monthlyAll =
    monthlyCategories.every(function(category) {
      return trendSelectedCategories.includes(category);
    });

  const yearlyAll =
    yearlyCategories.every(function(category) {
      return trendSelectedCategories.includes(category);
    });

  const groupNames = [];

  if (fixedAll) groupNames.push('固定費');
  if (monthlyAll) groupNames.push('日常費');
  if (yearlyAll) groupNames.push('特別費');

  const groupCategoryCount =
    (fixedAll ? fixedCategories.length : 0) +
    (monthlyAll ? monthlyCategories.length : 0) +
    (yearlyAll ? yearlyCategories.length : 0);

  if (
    groupNames.length > 0 &&
    groupCategoryCount === trendSelectedCategories.length
  ) {
    return groupNames.join('＋');
  }

  if (trendSelectedCategories.length <= 2) {
    return trendSelectedCategories.join('・');
  }

  return (
    trendSelectedCategories[0] +
    'ほか' +
    (trendSelectedCategories.length - 1) +
    '件'
  );
}

function getCalendarCategoryButtonLabel() {
  if (!categoryMasterCache) {
    return '日常費＋特別費';
  }

  if (calendarSelectedCategories.length === 0) {
    return '未選択';
  }

  const allCategories = getTrendAllCategoriesFromMaster();

  if (calendarSelectedCategories.length === allCategories.length) {
    return 'すべて';
  }

  const fixedCategories = categoryMasterCache.fixed.categories;
  const monthlyCategories = categoryMasterCache.monthly.categories;
  const yearlyCategories = categoryMasterCache.yearly.categories;

  const fixedAll =
    fixedCategories.every(function(category) {
      return calendarSelectedCategories.includes(category);
    });

  const monthlyAll =
    monthlyCategories.every(function(category) {
      return calendarSelectedCategories.includes(category);
    });

  const yearlyAll =
    yearlyCategories.every(function(category) {
      return calendarSelectedCategories.includes(category);
    });

  const groupNames = [];

  if (fixedAll) groupNames.push('固定費');
  if (monthlyAll) groupNames.push('日常費');
  if (yearlyAll) groupNames.push('特別費');

  const groupCategoryCount =
    (fixedAll ? fixedCategories.length : 0) +
    (monthlyAll ? monthlyCategories.length : 0) +
    (yearlyAll ? yearlyCategories.length : 0);

  if (
    groupNames.length > 0 &&
    groupCategoryCount === calendarSelectedCategories.length
  ) {
    return groupNames.join('＋');
  }

  if (calendarSelectedCategories.length <= 2) {
    return calendarSelectedCategories.join('・');
  }

  return (
    calendarSelectedCategories[0] +
    'ほか' +
    (calendarSelectedCategories.length - 1) +
    '件'
  );
}

function getRankingPeriodShortLabel() {
  if (currentRankingPeriod === 'currentMonth') return '今月';
  if (currentRankingPeriod === 'currentYear') return '今年';
  if (currentRankingPeriod === 'all') return '全期間';

  if (currentRankingPeriod === 'custom') {
    return customRankingStartDate + '～' + customRankingEndDate;
  }

  return '今月';
}

function getRankingCategoryShortLabel() {
  return getCategoryButtonLabel()
    .replace('カテゴリ：', '')
    .replace(' ▼', '');
}

function updateRankingConditionCard() {
  const text = document.getElementById('rankingConditionText');
  if (!text) return;

  text.textContent =
    getRankingCategoryShortLabel() +
    ' ｜ ' +
    getRankingPeriodShortLabel();
}

function updateMonthLabel() {
  document.getElementById('monthLabel').textContent =
    selectedYear + '年' + (selectedMonth + 1) + '月';

  const prevButton = document.getElementById('prevMonthButton');
  const nextButton = document.getElementById('nextMonthButton');

  prevButton.disabled =
    selectedYear === minYear &&
    selectedMonth === minMonth;

  nextButton.disabled =
    selectedYear === maxYear &&
    selectedMonth === maxMonth;
}

function changeMonth(diff) {
  let newYear = selectedYear;
  let newMonth = selectedMonth + diff;

  if (newMonth < 0) {
    newMonth = 11;
    newYear--;
  }

  if (newMonth > 11) {
    newMonth = 0;
    newYear++;
  }

  selectedYear = newYear;
  selectedMonth = newMonth;

  updateMonthLabel();
renderSelectedPerson(currentPerson);
}

// ======================================
// ホームデータ取得・区分切替
// ======================================

function loadAllHomeData(initialPerson) {
  setLoading();

  callApi('getAllHomeData')
    .then(function(result) {
      homeDataCache = result.homeData;

      minYear = result.monthBounds.minYear;
      minMonth = result.monthBounds.minMonth;
      maxYear = result.monthBounds.maxYear;
      maxMonth = result.monthBounds.maxMonth;

      updateMonthLabel();
      renderSelectedPerson(initialPerson);
    })
    .catch(function(error) {
      document.getElementById('budgetStatus').textContent =
        'エラー: ' + error.message;
    });
}

function renderSelectedPerson(person) {
  currentPerson = person;

  const key = selectedYear + '-' + selectedMonth;

  if (
    !homeDataCache ||
    !homeDataCache[key] ||
    !homeDataCache[key][person]
  ) {
    return;
  }

  renderHomeData(homeDataCache[key][person]);
}

function changePerson(person, element) {
  localStorage.setItem('etsuranSelectedPerson', person);

  document.querySelectorAll('[data-person]').forEach(function(tab) {
  tab.classList.remove('active');
});

  element.classList.add('active');

  if (homeDataCache) {
    renderSelectedPerson(person);
  } else {
    loadAllHomeData(person);
  }
}

function initializePerson() {
  const savedPerson =
    localStorage.getItem('etsuranSelectedPerson') || '共通';

  const initialTab =
    document.querySelector('[data-person="' + savedPerson + '"]');

  if (initialTab) {
    changePerson(savedPerson, initialTab);
  } else {
    loadAllHomeData(savedPerson);
  }
}

// ======================================
// 画面切替
// ======================================

function hideAllScreens() {
  const screenIds = [
    'homeScreen',
    'trendScreen',
    'balanceScreen',
    'rankingScreen',
    'calendarScreen',
    'assetScreen'

  ];

  screenIds.forEach(function(id) {
    const screen = document.getElementById(id);
    if (screen) {
      screen.classList.add('hidden');
    }
  });
}

function showTrendScreen() {
  hideAllScreens();

  document.getElementById('trendScreen').classList.remove('hidden');

if (!categoryMasterCache) {
  getCategoryFilterMasterApi()
  .then(function(master) {
    categoryMasterCache = master;
    trendSelectedCategories = getTrendAllCategoriesFromMaster();
    showTrendScreen();
  })
  .catch(function(error) {
    document.getElementById('trendChartCard').textContent =
      'エラー: ' + error.message;
  });

  return;
}

if (trendSelectedCategories.length === 0) {
  trendSelectedCategories = getTrendAllCategoriesFromMaster();
}

const trendButton =
  document.getElementById('trendCategoryFilterButton');

if (trendButton) {
  trendButton.textContent =
    getTrendCategoryButtonLabel()
}

currentTrendPerson = currentPerson || '共通';
setTrendPersonTab(currentTrendPerson);



  if (trendDataCache) {
    renderTrendChart();
    return;
  }

  getMonthlyTrendDataApi()
  .then(function(data) {
    trendDataCache = data;
    renderTrendChart();
  })
  .catch(function(error) {
      document.getElementById('trendChartCard').textContent =
  'エラー: ' + error.message;
    })
    
}
// ======================================
// 月別推移
// ======================================

function renderTrendChart() {
  const chart = document.getElementById('trendChartCard');

  if (!trendDataCache || !trendDataCache[currentTrendPerson]) {
    chart.textContent = 'データがありません';
    return;
  }

  const data = getCurrentTrendData();

  const maxValue = Math.max.apply(null, data.map(function(item) {
  return item.total;
}));

const scaleMax = getNiceScaleMax(maxValue);
const chartHeight = 220;

const isMonthlyOnlySelected =
  categoryMasterCache.monthly.categories.length === trendSelectedCategories.length &&
  categoryMasterCache.monthly.categories.every(function(category) {
    return trendSelectedCategories.includes(category);
  });

const budgetLine =
  isMonthlyOnlySelected && data.length > 0
    ? Number(data[0].monthBudget)
    : null;

  const scaleLabels = [
    scaleMax,
    scaleMax * 0.75,
    scaleMax * 0.5,
    scaleMax * 0.25,
    0
  ];

  let html = '';

  html += '<div id="trendTooltip" class="trend-selected-value">棒をタップすると金額を表示します</div>';

  html += '<div class="trend-chart-area">';

  html += '<div class="trend-scale">';
  scaleLabels.forEach(function(value) {
    html += '<div>' + formatScaleLabel(value) + '</div>';
  });
  html += '</div>';

  html += '<div class="trend-plot">';

  html += '<div class="trend-grid">';
  scaleLabels.forEach(function() {
    html += '<div class="trend-grid-line"></div>';
  });
  html += '</div>';

if (budgetLine) {
  const budgetTop =
    chartHeight - ((budgetLine / scaleMax) * chartHeight);

  html +=
    '<div class="trend-budget-line" style="top:' +
    budgetTop +
    'px;">' +
      '<span class="trend-budget-label">予算 ' +
      formatMoney(budgetLine) +
      '</span>' +
    '</div>';
}

  html += '<div class="trend-real-chart">';

  data.forEach(function(item) {
    const isSelected =
      item.year === selectedTrendYear &&
      item.month === selectedTrendMonth;

    html += '<div class="trend-real-column' +
      (isSelected ? ' selected' : '') +
      '" data-trend-year="' + item.year + '"' +
      ' data-trend-month="' + item.month + '"' +
      ' onclick="showTrendValue(' + item.year + ',' + item.month + ')">';

    html += '<div class="trend-real-bar">';

    if (isTrendWholeGroupSelection()) {
  const fixedHeight = scaleMax ? (item.fixed / scaleMax) * chartHeight : 0;
  const monthlyHeight = scaleMax ? (item.monthly / scaleMax) * chartHeight : 0;
  const yearlyHeight = scaleMax ? (item.yearly / scaleMax) * chartHeight : 0;

  html += '<div class="trend-segment trend-fixed" style="height:' + fixedHeight + 'px;"></div>';
  html += '<div class="trend-segment trend-monthly" style="height:' + monthlyHeight + 'px;"></div>';
  html += '<div class="trend-segment trend-yearly" style="height:' + yearlyHeight + 'px;"></div>';
} else {
  trendSelectedCategories.forEach(function(category, index) {
    const amount = Number(item.categories[category] || 0);
    const height = scaleMax ? (amount / scaleMax) * chartHeight : 0;

    html +=
      '<div class="trend-segment" style="height:' +
        height +
        'px; background:' +
        getTrendCategoryColor(index) +
      ';"></div>';
  });
}

    html += '</div>';
    html += '<div class="trend-real-label">' + item.label + '</div>';
    html += '</div>';
  });

  html += '</div>'; // trend-real-chart
  html += '</div>'; // trend-plot
  html += '</div>'; // trend-chart-area

  html += renderTrendLegend();

  chart.innerHTML = html;

  let target = null;

  if (selectedTrendYear !== null && selectedTrendMonth !== null) {
    target = data.find(function(item) {
      return item.year === selectedTrendYear &&
        item.month === selectedTrendMonth;
    });
  }

  if (!target) {
    target = data[data.length - 1];
  }

  if (target) {
    showTrendValue(target.year, target.month);
  }
}

function getNiceScaleMax(value) {
  if (!value || value <= 0) return 10000;

  const roughMax = value * 1.1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughMax)));
  const normalized = roughMax / magnitude;

  let niceNormalized;

  if (normalized <= 1) {
    niceNormalized = 1;
  } else if (normalized <= 2) {
    niceNormalized = 2;
  } else if (normalized <= 5) {
    niceNormalized = 5;
  } else {
    niceNormalized = 10;
  }

  return niceNormalized * magnitude;
}

function getNiceAssetScaleMax(value) {
  if (!value || value <= 0) return 10000;

  const roughMax = value * 1.08;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughMax)));
  const normalized = roughMax / magnitude;

  let niceNormalized;

  if (normalized <= 1) {
    niceNormalized = 1;
  } else if (normalized <= 1.5) {
    niceNormalized = 1.5;
  } else if (normalized <= 2) {
    niceNormalized = 2;
  } else if (normalized <= 2.5) {
    niceNormalized = 2.5;
  } else if (normalized <= 3) {
    niceNormalized = 3;
  } else if (normalized <= 4) {
    niceNormalized = 4;
  } else if (normalized <= 5) {
    niceNormalized = 5;
  } else if (normalized <= 7.5) {
    niceNormalized = 7.5;
  } else {
    niceNormalized = 10;
  }

  return niceNormalized * magnitude;
}

function formatScaleLabel(value) {
  const rounded = Math.round(value);

  if (rounded >= 10000) {
    const man = rounded / 10000;

    if (man % 1 === 0) {
      return man + '万';
    }

    return man.toFixed(1) + '万';
  }

  return rounded.toLocaleString();
}

function changeTrendPerson(person, element) {
  currentTrendPerson = person;

  document.querySelectorAll('[data-trend-person]').forEach(function(tab) {
    tab.classList.remove('active');
  });

  element.classList.add('active');

  renderTrendChart();
}

function setTrendPersonTab(person) {
  document.querySelectorAll('[data-trend-person]').forEach(function(tab) {
    tab.classList.remove('active');

    if (tab.dataset.trendPerson === person) {
      tab.classList.add('active');
    }
  });
}

function showTrendValue(year, month) {
selectedTrendYear = year;
selectedTrendMonth = month;

  const tooltip = document.getElementById('trendTooltip');
  const data = getCurrentTrendData();

  const item = data.find(function(row) {
    return row.year === year && row.month === month;
  });

  if (!item) return;

  const value = item.total;

  tooltip.className = 'trend-tooltip';

tooltip.innerHTML =
  '<div class="trend-tooltip-header compact">' +
  year + '年' + (month + 1) + '月　' + formatMoney(value) +
  '</div>' +
  renderTrendTooltipCompact(item) +
  '<div class="trend-detail-link compact" onclick="openTrendExpenseList()">明細を見る ›</div>';

  updateSelectedTrendBar();  
}

function renderTrendTooltipCompact(item) {
  const allCategories = getTrendAllCategoriesFromMaster();

  const fixedCategories = categoryMasterCache.fixed.categories;
  const monthlyCategories = categoryMasterCache.monthly.categories;
  const yearlyCategories = categoryMasterCache.yearly.categories;

  const selectedCount = trendSelectedCategories.length;

  const fixedAll =
    fixedCategories.every(function(category) {
      return trendSelectedCategories.includes(category);
    });

  const monthlyAll =
    monthlyCategories.every(function(category) {
      return trendSelectedCategories.includes(category);
    });

  const yearlyAll =
    yearlyCategories.every(function(category) {
      return trendSelectedCategories.includes(category);
    });

  if (selectedCount === allCategories.length) {
    return (
      '<div class="trend-tooltip-row">' +
        '<span>合計</span>' +
        '<span>' + formatMoney(item.total) + '</span>' +
      '</div>'
    );
  }

  if (fixedAll && selectedCount === fixedCategories.length) {
    return (
      '<div class="trend-tooltip-row">' +
        '<span>固定費合計</span>' +
        '<span>' + formatMoney(item.fixed) + '</span>' +
      '</div>'
    );
  }

  if (monthlyAll && selectedCount === monthlyCategories.length) {
    return (
      '<div class="trend-tooltip-row">' +
        '<span>日常費合計</span>' +
        '<span>' + formatMoney(item.monthly) + '</span>' +
      '</div>'
    );
  }

  if (yearlyAll && selectedCount === yearlyCategories.length) {
    return (
      '<div class="trend-tooltip-row">' +
        '<span>特別費合計</span>' +
        '<span>' + formatMoney(item.yearly) + '</span>' +
      '</div>'
    );
  }

  const rows = [];

  trendSelectedCategories.forEach(function(category) {
    const amount = Number(item.categories[category] || 0);

    if (!amount) return;

    rows.push(
      '<div class="trend-tooltip-row">' +
        '<span>' + category + '</span>' +
        '<span>' + formatMoney(amount) + '</span>' +
      '</div>'
    );
  });

  if (rows.length === 0) {
    return (
      '<div class="trend-tooltip-row">' +
        '<span>該当なし</span>' +
        '<span>0円</span>' +
      '</div>'
    );
  }

  return rows.join('');
}

function updateSelectedTrendBar() {
  document.querySelectorAll('.trend-real-column').forEach(function(column) {
    column.classList.remove('selected');

    if (
      Number(column.dataset.trendYear) === selectedTrendYear &&
      Number(column.dataset.trendMonth) === selectedTrendMonth
    ) {
      column.classList.add('selected');
    }
  });
}

function getTrendTypeLabel(type) {
  if (type === 'total') return '合計';
  if (type === 'fixed') return '固定費';
  if (type === 'monthly') return '日常費';
  if (type === 'yearly') return '特別費';
  return '合計';
}

function isSameCategorySet(a, b) {
  if (a.length !== b.length) return false;

  return b.every(function(category) {
    return a.includes(category);
  });
}

function isTrendWholeGroupSelection() {
  const fixedCategories = categoryMasterCache.fixed.categories;
  const monthlyCategories = categoryMasterCache.monthly.categories;
  const yearlyCategories = categoryMasterCache.yearly.categories;

  const groups = [];

  if (fixedCategories.every(function(category) {
    return trendSelectedCategories.includes(category);
  })) {
    groups.push(fixedCategories);
  }

  if (monthlyCategories.every(function(category) {
    return trendSelectedCategories.includes(category);
  })) {
    groups.push(monthlyCategories);
  }

  if (yearlyCategories.every(function(category) {
    return trendSelectedCategories.includes(category);
  })) {
    groups.push(yearlyCategories);
  }

  let groupCategoryCount = 0;

  groups.forEach(function(group) {
    groupCategoryCount += group.length;
  });

  return groupCategoryCount === trendSelectedCategories.length;
}

function getTrendCategoryColor(index) {
  const colors = [
    '#5b8def',
    '#f59e0b',
    '#10b981',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#84cc16',
    '#f97316',
    '#64748b'
  ];

  return colors[index % colors.length];
}

function renderTrendLegend() {
  let html = '<div class="trend-legend">';

  if (isTrendWholeGroupSelection()) {
    const fixedSelected =
      categoryMasterCache.fixed.categories.every(function(category) {
        return trendSelectedCategories.includes(category);
      });

    const monthlySelected =
      categoryMasterCache.monthly.categories.every(function(category) {
        return trendSelectedCategories.includes(category);
      });

    const yearlySelected =
      categoryMasterCache.yearly.categories.every(function(category) {
        return trendSelectedCategories.includes(category);
      });

    if (fixedSelected) {
      html +=
        '<div class="trend-legend-item">' +
          '<span class="trend-legend-color trend-fixed"></span>固定費' +
        '</div>';
    }

    if (monthlySelected) {
      html +=
        '<div class="trend-legend-item">' +
          '<span class="trend-legend-color trend-monthly"></span>日常費' +
        '</div>';
    }

    if (yearlySelected) {
      html +=
        '<div class="trend-legend-item">' +
          '<span class="trend-legend-color trend-yearly"></span>特別費' +
        '</div>';
    }

    html += '</div>';
    return html;
  }

  trendSelectedCategories.forEach(function(category, index) {
    html +=
      '<div class="trend-legend-item">' +
        '<span class="trend-legend-color" style="background:' +
          getTrendCategoryColor(index) +
        ';"></span>' +
        category +
      '</div>';
  });

  html += '</div>';
  return html;
}

// ======================================
// 財産目録
// ======================================

function showAssetScreen() {
  hideAllScreens();

  document.getElementById('assetScreen').classList.remove('hidden');

  currentAssetPerson = currentPerson || '共通';
  setAssetPersonTab(currentAssetPerson);
  loadAssetData();
}

function setAssetPersonTab(person) {
  document.querySelectorAll('[data-asset-person]').forEach(function(tab) {
    tab.classList.remove('active');

    if (tab.dataset.assetPerson === person) {
      tab.classList.add('active');
    }
  });
}

function changeAssetPerson(person, element) {
  currentAssetPerson = person;

  document.querySelectorAll('[data-asset-person]').forEach(function(tab) {
    tab.classList.remove('active');
  });

  element.classList.add('active');

  loadAssetData();
}

function loadAssetData() {
  const summary = document.getElementById('assetSummaryCard');
  summary.textContent = '読み込み中...';

  if (assetDataCache[currentAssetPerson]) {
    renderAssetScreen(assetDataCache[currentAssetPerson]);
    return;
  }

  getAssetDataApi(currentAssetPerson)
  .then(function(data) {
    assetDataCache[currentAssetPerson] = data;
    renderAssetScreen(data);
  })
  .catch(function(error) {
    summary.textContent = 'エラー: ' + error.message;
  });
}

function renderAssetScreen(data) {
  renderAssetSummary(data.summary, data.details, data.trend);
}

function renderAssetSummary(summary, details, trend) {
  const card = document.getElementById('assetSummaryCard');

  card.innerHTML =
    '<div class="asset-summary-label">' + summary.targetLabel + '</div>' +
    '<div class="asset-summary-title">総資産</div>' +

    '<div class="asset-main-row">' +
      '<div class="asset-main-value">' + formatMoney(summary.total) + '</div>' +
      '<div class="asset-inline-detail-link" onclick="toggleAssetInlineDetails()">' +
        '<span id="assetDetailToggleText">明細を見る ›</span>' +
      '</div>' +
    '</div>' +

    '<div class="asset-diff-row">' +
      '<span>↑ 前月</span>' +
      '<span class="' + getBalanceClass(summary.monthDiff || 0) + '">' +
        formatAssetDiff(summary.monthDiff) +
      '</span>' +
    '</div>' +
    '<div class="asset-diff-row">' +
      '<span>↑ 前年</span>' +
      '<span class="' + getBalanceClass(summary.yearDiff || 0) + '">' +
        formatAssetDiff(summary.yearDiff) +
      '</span>' +
    '</div>' +

    '<div id="assetInlineDetails" class="asset-inline-details hidden">' +
      renderAssetInlineDetailRows(details) +
    '</div>' +

    '<div id="assetTrendInSummary">' +
      renderAssetTrendHtml(trend) +
    '</div>';
}

function renderAssetInlineDetailRows(details) {
  if (!details || details.length === 0) {
    return '<div class="asset-detail-row">データがありません</div>';
  }

  let html = '';

  details.forEach(function(item) {
    html +=
      '<div class="asset-detail-row">' +
        '<div>' +
          '<div class="asset-detail-name">' + item.name + '</div>' +
          '<div class="asset-detail-type">' + item.type + '</div>' +
        '</div>' +
        '<div class="asset-detail-amount">' + formatMoney(item.amount) + '</div>' +
      '</div>';
  });

  return html;
}

function toggleAssetInlineDetails() {
  const details = document.getElementById('assetInlineDetails');
  const text = document.getElementById('assetDetailToggleText');

  if (!details || !text) return;

  details.classList.toggle('hidden');

  if (details.classList.contains('hidden')) {
    text.textContent = '明細を見る ▶';
  } else {
    text.textContent = '明細を閉じる ▼ ';
  }
}

function formatAssetDiff(value) {
  if (value === null || value === undefined) {
    return 'データなし';
  }

  return formatSignedMoney(value);
}

function renderAssetTrend(trend) {
  const chart = document.getElementById('assetTrendCard');

  if (!chart) return;

  chart.innerHTML = renderAssetTrendHtml(trend);
}

function renderAssetTrendHtml(trend) {
  if (!trend || trend.length === 0) {
    return 'データがありません';
  }

  const assetTypes = ['預金', '投資', '財形', '現金', '負債'];

  const maxValue = Math.max.apply(null, trend.map(function(item) {
    return Math.abs(Number(item.total || 0));
  }));

  const scaleMax = getNiceAssetScaleMax(maxValue);
  const chartHeight = 130;

  let html = '';

  html += '<div class="asset-chart-grid-wrap">';

  html += '<div class="asset-grid-lines">';
  html += '<div class="asset-grid-line top"><span>' + formatScaleLabel(scaleMax) + '</span></div>';
  html += '<div class="asset-grid-line middle"><span>' + formatScaleLabel(scaleMax / 2) + '</span></div>';
  html += '<div class="asset-grid-line bottom"><span>0</span></div>';
  html += '</div>';

  html += '<div class="asset-chart-scroll compact">';
  html += '<div class="asset-chart-inner compact">';

  trend.forEach(function(item) {
    html +=
      '<div class="asset-column" onclick="showAssetMonthDetail(' +
      item.year + ',' + item.month + ')">';

    html += '<div class="asset-bar compact">';

    assetTypes.forEach(function(type) {
      const amount = Number(item.types[type] || 0);
      if (!amount) return;

      const height = scaleMax ? (Math.abs(amount) / scaleMax) * chartHeight : 0;

      html +=
        '<div class="asset-segment asset-type-' +
        type +
        '" style="height:' + height + 'px;"></div>';
    });

    html += '</div>';
    html += '<div class="asset-chart-label">' + item.label + '</div>';
    html += '</div>';
  });

  html += '</div>';
  html += '</div>';

  html += '<div class="asset-legend">';
  html += '<div class="asset-legend-item"><span class="asset-legend-color asset-type-預金"></span>預金</div>';
  html += '<div class="asset-legend-item"><span class="asset-legend-color asset-type-投資"></span>投資</div>';
  html += '<div class="asset-legend-item"><span class="asset-legend-color asset-type-財形"></span>財形</div>';
  html += '<div class="asset-legend-item"><span class="asset-legend-color asset-type-現金"></span>現金</div>';
  html += '</div>';

  html += '</div>';

  html += '<div id="assetMonthDetail" class="asset-month-detail compact">棒をタップすると内訳を表示します</div>';

  return html;
}

function showAssetMonthDetail(year, month) {
  const data = assetDataCache[currentAssetPerson];
  if (!data || !data.trend) return;

  const item = data.trend.find(function(row) {
    return row.year === year && row.month === month;
  });

  if (!item) return;

  const detail = document.getElementById('assetMonthDetail');

  const rows = Object.keys(item.types)
    .map(function(type) {
      const amount = item.types[type];
      const ratio = item.total ? Math.round((amount / item.total) * 100) : 0;

      return {
        type: type,
        amount: amount,
        ratio: ratio
      };
    })
    .sort(function(a, b) {
      return Math.abs(b.amount) - Math.abs(a.amount);
    });

  let html = '';

  html += '<div class="asset-month-title">' +
    year + '年' + (month + 1) + '月　' +
    formatMoney(item.total) +
    '</div>';

  rows.forEach(function(row) {
    html +=
      '<div class="asset-breakdown-row">' +
        '<span>' + row.type + '</span>' +
        '<span>' + formatMoney(row.amount) + '（' + row.ratio + '%）</span>' +
      '</div>';
  });

  detail.innerHTML = html;
}

function renderAssetDetails(details) {
  const card = document.getElementById('assetDetailCard');

  if (!details || details.length === 0) {
    card.textContent = 'データがありません';
    return;
  }

  let html = '';

  html +=
    '<div class="asset-detail-open-row" onclick="toggleAssetDetailInline()">' +
      '<span>明細を見る</span>' +
      '<span>›</span>' +
    '</div>';

  html += '<div id="assetDetailInlineList" class="asset-detail-inline-list hidden">';

  details.forEach(function(item) {
    html +=
      '<div class="asset-detail-row">' +
        '<div>' +
          '<div class="asset-detail-name">' + item.name + '</div>' +
          '<div class="asset-detail-type">' + item.type + '</div>' +
        '</div>' +
        '<div class="asset-detail-amount">' + formatMoney(item.amount) + '</div>' +
      '</div>';
  });

  html += '</div>';

  card.innerHTML = html;
}

function toggleAssetDetailInline() {
  const list = document.getElementById('assetDetailInlineList');
  if (!list) return;

  list.classList.toggle('hidden');
}

function showHomeScreen() {
  hideAllScreens();

  document.getElementById('homeScreen').classList.remove('hidden');
}

function showRankingScreen() {
  hideAllScreens();

  document.getElementById('rankingScreen').classList.remove('hidden');

  if (!categoryMasterCache) {
    getCategoryFilterMasterApi()
  .then(function(master) {
    categoryMasterCache = master;

    selectedCategories = [];

    master.monthly.categories.forEach(function(category) {
      selectedCategories.push(category);
    });

    master.yearly.categories.forEach(function(category) {
      selectedCategories.push(category);
    });

    showRankingScreen();
  })
  .catch(function(error) {
    document.getElementById('rankingList').textContent =
      'エラー: ' + error.message;
  });

    return;
  }

  if (selectedCategories.length === 0) {
  categoryMasterCache.monthly.categories.forEach(function(category) {
    selectedCategories.push(category);
  });

  categoryMasterCache.yearly.categories.forEach(function(category) {
    selectedCategories.push(category);
  });
}

  currentRankingPerson = currentPerson || '共通';
  currentRankingPeriod = 'currentMonth';

  updateRankingConditionCard();

  setRankingPersonTab(currentRankingPerson);

  if (rankingDataCache) {
    renderRankingScreen();
    return;
  }

  getRankingDataApi()
  .then(function(data) {
    rankingDataCache = data;
    renderRankingScreen();
  })
  .catch(function(error) {
    document.getElementById('rankingList').textContent =
      'エラー: ' + error.message;
  });
}

// ======================================
// 支出カレンダー
// ======================================

function showCalendarScreen() {
  hideAllScreens();

  document.getElementById('calendarScreen').classList.remove('hidden'); 

  currentCalendarPerson = currentPerson || '共通';
  selectedCalendarYear = selectedYear;
  selectedCalendarMonth = selectedMonth;

  updateCalendarMonthLabel();

  setCalendarPersonTab(currentCalendarPerson);

if (!categoryMasterCache) {
  getCategoryFilterMasterApi()
  .then(function(master) {
    categoryMasterCache = master;

    calendarSelectedCategories = [];

    master.monthly.categories.forEach(function(category) {
      calendarSelectedCategories.push(category);
    });

    master.yearly.categories.forEach(function(category) {
      calendarSelectedCategories.push(category);
    });

    showCalendarScreen();
  })
  .catch(function(error) {
    document.getElementById('calendarContainer').textContent =
      'エラー: ' + error.message;
  });

  return;
}

if (calendarSelectedCategories.length === 0) {
  categoryMasterCache.monthly.categories.forEach(function(category) {
    calendarSelectedCategories.push(category);
  });

  categoryMasterCache.yearly.categories.forEach(function(category) {
    calendarSelectedCategories.push(category);
  });
}

const calendarButton =
  document.getElementById('calendarCategoryFilterButton');

if (calendarButton) {
  calendarButton.textContent =
    getCalendarCategoryButtonLabel();
}

  loadCalendarData();
}

function setCalendarPersonTab(person) {
  document.querySelectorAll('[data-calendar-person]').forEach(function(tab) {
    tab.classList.remove('active');

    if (tab.dataset.calendarPerson === person) {
      tab.classList.add('active');
    }
  });
}

function changeCalendarPerson(person, element) {
  currentCalendarPerson = person;

  document.querySelectorAll('[data-calendar-person]').forEach(function(tab) {
    tab.classList.remove('active');
  });

  element.classList.add('active');

  loadCalendarData();
}

function updateCalendarMonthLabel() {
  document.getElementById('calendarMonthLabel').textContent =
    selectedCalendarYear + '年' + (selectedCalendarMonth + 1) + '月';
}

function changeCalendarMonth(diff) {
  let newYear = selectedCalendarYear;
  let newMonth = selectedCalendarMonth + diff;

  if (newMonth < 0) {
    newMonth = 11;
    newYear--;
  }

  if (newMonth > 11) {
    newMonth = 0;
    newYear++;
  }

  selectedCalendarYear = newYear;
  selectedCalendarMonth = newMonth;

  updateCalendarMonthLabel();
  selectedCalendarDay = null;
  loadCalendarData();
}

function loadCalendarData() {
  const container = document.getElementById('calendarContainer');
  container.textContent = '読み込み中...';

  getCalendarDataApi(
  selectedCalendarYear,
  selectedCalendarMonth,
  currentCalendarPerson,
  calendarSelectedCategories
)
  .then(function(data) {
    currentCalendarData = data;
    renderCalendarSkeleton(data);
  })
  .catch(function(error) {
    container.textContent = 'エラー: ' + error.message;
  });
}

function renderCalendarSkeleton(calendarData) {
  const container = document.getElementById('calendarContainer');

  const year = selectedCalendarYear;
  const month = selectedCalendarMonth;

  const firstDate = new Date(year, month, 1);

  const firstDay = firstDate.getDay();
  const mondayStartOffset = (firstDay + 6) % 7;

  const startDate = new Date(year, month, 1 - mondayStartOffset);

  const dayLabels = ['月', '火', '水', '木', '金', '土', '日'];

  let html = '';

  html += '<div class="calendar-week-header">';
  dayLabels.forEach(function(label) {
    html += '<div class="calendar-weekday">' + label + '</div>';
  });
  html += '</div>';

  html += '<div class="calendar-grid">';

  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);

    const isCurrentMonth = d.getMonth() === month;
    const day = d.getDate();
    const dayData =
      isCurrentMonth && calendarData
        ? calendarData[String(day)]
        : null;
    
    const colorLevel = dayData ? Number(dayData.colorLevel || 0) : 0;

const isSelected =
  isCurrentMonth &&
  Number(selectedCalendarDay) === Number(day);

html +=
  '<div class="calendar-day calendar-level-' +
    colorLevel +
    (isSelected ? ' selected' : '') +
    (isCurrentMonth ? '' : ' outside-month') +
    (dayData ? ' has-data' : '') +
    '"' +
    (dayData ? ' onclick="showCalendarDayDetail(' + day + ')"' : '') +
  '>' +
    '<div class="calendar-day-number">' + day + '</div>';

    if (dayData) {
      html +=
        '<div class="calendar-day-amount">' +
          formatCalendarAmount(dayData.total) +
        '</div>' +
        '<div class="calendar-day-count">' +
          dayData.count + '件' +
        '</div>';
    }

    html += '</div>';
  }

 html += '</div>';

  html += '<div id="calendarDayDetail" class="calendar-day-detail">';
  html += '日付をタップすると明細を表示します';
  html += '</div>';

  container.innerHTML = html; 
}

function formatCalendarAmount(value) {
  const num = Number(value || 0);

  if (num >= 10000) {
    return Math.round(num / 10000) + '万';
  }

  return num.toLocaleString();
}

function showCalendarDayDetail(day) {
  selectedCalendarDay = day;
  renderCalendarSkeleton(currentCalendarData);

  const detail = document.getElementById('calendarDayDetail');
  if (!detail || !currentCalendarData) return;

  const dayData = currentCalendarData[String(day)];

  if (!dayData || !dayData.items || dayData.items.length === 0) {
    detail.innerHTML = 'この日の支出はありません';
    return;
  }

  let html = '';

  html +=
    '<div class="calendar-detail-title">' +
      (selectedCalendarMonth + 1) + '/' + day +
      '　' + formatMoney(dayData.total) +
      '　' + dayData.count + '件' +
    '</div>';

  dayData.items.forEach(function(item) {
    html +=
  '<div class="calendar-detail-row">' +
    '<div class="calendar-detail-memo">' +
      (item.memo || '内容なし') +
      '（' + item.category + '）' +
    '</div>' +
    '<div class="calendar-detail-amount">' +
      formatMoney(item.amount) +
    '</div>' +
  '</div>';
  });

  detail.innerHTML = html;
}

// ======================================
// ランキング
// ======================================

function setRankingPersonTab(person) {
  document.querySelectorAll('[data-ranking-person]').forEach(function(tab) {
    tab.classList.remove('active');

    if (tab.dataset.rankingPerson === person) {
      tab.classList.add('active');
    }
  });
}

function renderRankingScreen() {
  if (!rankingDataCache) return;

  let items = [];

  if (currentRankingPeriod === 'custom') {
    if (!rankingDataCache.all || !rankingDataCache.all[currentRankingPerson]) {
      return;
    }

    items = filterRankingItemsByPeriod(
      rankingDataCache.all[currentRankingPerson],
      customRankingStartDate,
      customRankingEndDate
    );
   } else {
    if (
      !rankingDataCache[currentRankingPeriod] ||
      !rankingDataCache[currentRankingPeriod][currentRankingPerson]
    ) {
      return;
    }

    items = rankingDataCache[currentRankingPeriod][currentRankingPerson];
  }

  items = items.filter(function(item) {
    return selectedCategories.includes(item.category);
  });

  renderRankingTop3(items);
  renderRankingList(items);
}

function filterRankingItemsByPeriod(items, startDate, endDate) {
  if (!startDate || !endDate) return [];

  const startKey = dateInputToKey(startDate);
  const endKey = dateInputToKey(endDate);

  return items.filter(function(item) {
    const day = Number(String(item.date).split('/')[1]);

    const itemKey =
      Number(item.year) * 10000 +
      (Number(item.month) + 1) * 100 +
      day;

    return itemKey >= startKey && itemKey <= endKey;
  });
}

function dateInputToKey(value) {
  const parts = value.split('-');

  return (
    Number(parts[0]) * 10000 +
    Number(parts[1]) * 100 +
    Number(parts[2])
  );
}

function renderRankingTop3(items) {
  const top3 = document.getElementById('rankingTop3');

  if (!items || items.length === 0) {
    top3.innerHTML =
      '<div class="placeholder-card">ランキング対象の支出がありません</div>';
    return;
  }

  const first = items[0];
  const second = items[1];
  const third = items[2];

  let html = '';

  // 1位
  if (first) {
    html +=
      '<div class="ranking-top-card rank-1">' +
        '<div class="ranking-medal">🥇 1位</div>' +
        '<div class="ranking-amount">' + formatMoney(first.amount) + '</div>' +
        '<div class="ranking-title">' + first.title + '</div>' +
        '<div class="ranking-meta">' + first.date + '　' + first.category + '</div>' +
      '</div>';
  }

  // 2位3位横並び
  html += '<div class="ranking-second-row">';

  if (second) {
    html +=
      '<div class="ranking-top-card rank-2">' +
        '<div class="ranking-medal">🥈 2位</div>' +
        '<div class="ranking-amount">' + formatMoney(second.amount) + '</div>' +
        '<div class="ranking-title">' + second.title + '</div>' +
        '<div class="ranking-meta">' + second.date + '　' + second.category + '</div>' +
      '</div>';
  }

  if (third) {
    html +=
      '<div class="ranking-top-card rank-3">' +
        '<div class="ranking-medal">🥉 3位</div>' +
        '<div class="ranking-amount">' + formatMoney(third.amount) + '</div>' +
        '<div class="ranking-title">' + third.title + '</div>' +
        '<div class="ranking-meta">' + third.date + '　' + third.category + '</div>' +
      '</div>';
  }

  html += '</div>';

  top3.innerHTML = html;
}

function renderRankingList(items) {
  const list = document.getElementById('rankingList');

  const rest = items.slice(3, 20);

  if (rest.length === 0) {
    list.innerHTML = '';
    return;
  }

  let html = '';

  rest.forEach(function(item, index) {
    const rank = index + 4;

    html +=
      '<div class="ranking-list-row">' +
        '<div class="ranking-list-rank">' + rank + '位</div>' +
        '<div class="ranking-list-main">' +
          '<div class="ranking-list-title">' + item.title + '</div>' +
          '<div class="ranking-list-meta">' + item.date + '　' + item.category + '</div>' +
        '</div>' +
        '<div class="ranking-list-amount">' + formatMoney(item.amount) + '</div>' +
      '</div>';
  });

  list.innerHTML = html;
}

function changeRankingPerson(person, element) {
  currentRankingPerson = person;

  document.querySelectorAll('[data-ranking-person]').forEach(function(tab) {
    tab.classList.remove('active');
  });

  element.classList.add('active');

  renderRankingScreen();
}

function focusPeriodEndDate() {
  const endInput = document.getElementById('periodEndDate');
  if (!endInput) return;

  endInput.focus();

  if (typeof endInput.showPicker === 'function') {
    endInput.showPicker();
  }
}

function openPeriodSheet(callback) {
  periodApplyCallback = callback;

  document.getElementById('periodModal').classList.add('open');
}

function closePeriodSheet() {
  document.getElementById('periodModal').classList.remove('open');
}

function openTrendCategorySheet() {
  categorySheetMode = 'trend';
  openCategorySheet();
}

function openCalendarCategorySheet() {
  categorySheetMode = 'calendar';
  openCategorySheet();
}

function openRankingConditionSheet() {
  categorySheetMode = 'ranking';
  openCategorySheet();
}

// ======================================
// カテゴリフィルタ
// ======================================

function openCategorySheet() {

  if (!categorySheetMode) {
  categorySheetMode = 'ranking';
  }

  if (categoryMasterCache) {
    renderCategorySheet();

    document.getElementById('categoryModal').classList.add('open');
    return;
  }

  getCategoryFilterMasterApi()
  .then(function(master) {
    categoryMasterCache = master;

    selectedCategories = [];

    master.monthly.categories.forEach(function(category) {
      selectedCategories.push(category);
    });

    master.yearly.categories.forEach(function(category) {
      selectedCategories.push(category);
    });

    renderCategorySheet();

    document.getElementById('categoryModal').classList.add('open');
  })
  .catch(function(error) {
    alert('カテゴリ取得エラー: ' + error.message);
  });
}

function selectRankingPeriodInSheet(period) {
  currentRankingPeriod = period;

  if (period === 'custom') {
    closeCategorySheet();
    openPeriodSheet(function(startDate, endDate) {
      currentRankingPeriod = 'custom';
      customRankingStartDate = startDate;
      customRankingEndDate = endDate;

      updateRankingConditionCard();
      renderRankingScreen();
    });
    return;
  }

  renderCategorySheet();
}

function renderCategorySheet() {
  const content = document.getElementById('categorySheetContent');

  if (!categoryMasterCache) {
    return;
  }

  let html = '';

  if (categorySheetMode === 'ranking') {
    html +=
      '<div class="condition-section">' +

        '<div class="condition-period-options">' +
          '<button class="condition-period-button' +
            (currentRankingPeriod === 'currentMonth' ? ' active' : '') +
            '" onclick="selectRankingPeriodInSheet(\'currentMonth\')">今月</button>' +

          '<button class="condition-period-button' +
            (currentRankingPeriod === 'currentYear' ? ' active' : '') +
            '" onclick="selectRankingPeriodInSheet(\'currentYear\')">今年</button>' +

          '<button class="condition-period-button' +
            (currentRankingPeriod === 'all' ? ' active' : '') +
            '" onclick="selectRankingPeriodInSheet(\'all\')">全期間</button>' +

          '<button class="condition-period-button' +
            (currentRankingPeriod === 'custom' ? ' active' : '') +
            '" onclick="selectRankingPeriodInSheet(\'custom\')">期間指定</button>' +
        '</div>' +
      '</div>' +

      '<div class="condition-divider"></div>';
  }

  html +=
    '<div class="category-group">' +
      '<div class="category-group-title">' +
        '<input type="checkbox"' +
        ' id="allCategoryCheckbox"' +
        (isAllCategoriesSelected() ? ' checked' : '') +
        ' onclick="toggleAllCategories(this)">' +
        '<span>すべて選択</span>' +
      '</div>' +
    '</div>';

  const groupKeys = Object.keys(categoryMasterCache).filter(function(groupKey) {
    return groupKey !== 'income';
  });

  groupKeys.forEach(function(groupKey) {
    const group = categoryMasterCache[groupKey];

    const groupSelectedCount =
    group.categories.filter(function(category) {
    return getActiveSelectedCategories().includes(category);
    }).length;

    const shouldOpenGroup =
    groupSelectedCount > 0 &&
    groupSelectedCount < group.categories.length;

    const categoryItemsClass =
    shouldOpenGroup
    ? 'category-items'
    : 'category-items hidden';

    const toggleMark =
    shouldOpenGroup ? '▼' : '▶';  

    html +=
      '<div class="category-group">' +
        '<div class="category-group-title" onclick="toggleCategoryGroup(this)">' +

          '<input type="checkbox"' +
          ' class="category-group-checkbox"' +
          ' data-group="' + groupKey + '"' +
          (isCategoryGroupFullySelected(groupKey) ? ' checked' : '') +
          ' onclick="event.stopPropagation(); toggleCategoryGroupCheck(this)">' +

          '<span>' + group.label + '</span>' +
          '<span class="category-toggle-mark">' + toggleMark + '</span>' +
        '</div>' +

        '<div class="' + categoryItemsClass + '">';

    group.categories.forEach(function(category) {
      html +=
        '<label class="category-item">' +
          '<input type="checkbox"' +
          ' class="category-item-checkbox"' +
          ' data-category="' + category + '"' +
          (getActiveSelectedCategories().includes(category) ? ' checked' : '') +
          ' onchange="toggleCategoryItem(this)">' +
          '<span>' + category + '</span>' +
        '</label>';
    });

    html +=
        '</div>' +
      '</div>';
  });

  content.innerHTML = html;
}

function toggleCategoryGroup(element) {
  const group = element.closest('.category-group');
  const items = group.querySelector('.category-items');
  const mark = group.querySelector('.category-toggle-mark');

  items.classList.toggle('hidden');
  mark.textContent = items.classList.contains('hidden') ? '▶' : '▼';
}

function toggleCategoryGroupCheck(checkbox) {
  const groupKey = checkbox.dataset.group;
  const isChecked = checkbox.checked;

  const group = checkbox.closest('.category-group');
  const itemCheckboxes = group.querySelectorAll('.category-item-checkbox');

  let activeCategories = getActiveSelectedCategories();

  itemCheckboxes.forEach(function(itemCheckbox) {
    const category = itemCheckbox.dataset.category;

    itemCheckbox.checked = isChecked;

    if (isChecked) {
      if (!activeCategories.includes(category)) {
        activeCategories.push(category);
      }
    } else {
      activeCategories = activeCategories.filter(function(item) {
        return item !== category;
      });
    }
  });

  setActiveSelectedCategories(activeCategories);
  updateAllCategoryCheckbox();
}

function toggleCategoryItem(checkbox) {
  const category = checkbox.dataset.category;

  let activeCategories = getActiveSelectedCategories();

  if (checkbox.checked) {
    if (!activeCategories.includes(category)) {
      activeCategories.push(category);
    }
  } else {
    activeCategories = activeCategories.filter(function(item) {
      return item !== category;
    });
  }

  setActiveSelectedCategories(activeCategories);

  syncCategoryGroupCheck(checkbox);
}

function syncCategoryGroupCheck(checkbox) {
  const group = checkbox.closest('.category-group');
  const groupCheckbox = group.querySelector('.category-group-checkbox');
  const itemCheckboxes = group.querySelectorAll('.category-item-checkbox');

  const allChecked = Array.from(itemCheckboxes).every(function(itemCheckbox) {
    return itemCheckbox.checked;
  });

  groupCheckbox.checked = allChecked;
  updateAllCategoryCheckbox();
}

function updateAllCategoryCheckbox() {
  const allCheckbox =
    document.getElementById('allCategoryCheckbox');

  if (!allCheckbox) return;

  allCheckbox.checked = isAllCategoriesSelected();
}

function isCategoryGroupFullySelected(groupKey) {
  const activeCategories = getActiveSelectedCategories();
  const groupCategories = categoryMasterCache[groupKey].categories;

  return groupCategories.every(function(category) {
    return activeCategories.includes(category);
  });
}

function isAllCategoriesSelected() {
  if (!categoryMasterCache) return false;

  const activeCategories = getActiveSelectedCategories();
  const allCategories = getTrendAllCategoriesFromMaster();

  return allCategories.every(function(category) {
    return activeCategories.includes(category);
  });
}

function toggleAllCategories(checkbox) {
  let activeCategories = [];

  if (checkbox.checked) {
    Object.keys(categoryMasterCache).forEach(function(groupKey) {
      if (groupKey === 'income') {
        return;
      }

      categoryMasterCache[groupKey].categories.forEach(function(category) {
        activeCategories.push(category);
      });
    });
  }

  setActiveSelectedCategories(activeCategories);
  renderCategorySheet();
}

function closeCategorySheet() {
  document.getElementById('categoryModal').classList.remove('open');

  if (categorySheetMode === 'trend') {
    const button =
      document.getElementById('trendCategoryFilterButton');

    if (button) {
      button.textContent =
      getTrendCategoryButtonLabel()
      }

    renderTrendChart();
    categorySheetMode = 'ranking';
    return;
  }

  if (categorySheetMode === 'calendar') {
  const button =
    document.getElementById('calendarCategoryFilterButton');

  if (button) {
    button.textContent =
  getCalendarCategoryButtonLabel();
  }

  loadCalendarData();

  categorySheetMode = 'ranking';
  return;
}

  updateRankingConditionCard();

  if (!document.getElementById('rankingScreen').classList.contains('hidden')) {
    renderRankingScreen();
  }
}

function applyPeriodSheet() {
  const startDate = document.getElementById('periodStartDate').value;
  const endDate = document.getElementById('periodEndDate').value;

  if (!startDate || !endDate) {
    alert('開始日と終了日を入力してください');
    return;
  }

  if (startDate > endDate) {
    alert('終了日は開始日以降にしてください');
    return;
  }

  closePeriodSheet();

  if (periodApplyCallback) {
    periodApplyCallback(startDate, endDate);
  }
}

// ======================================
// 収支
// ======================================
function showBalanceScreen() {
  hideAllScreens();

  document.getElementById('balanceScreen').classList.remove('hidden');

  currentBalancePerson = currentPerson || '共通';
  setBalancePersonTab(currentBalancePerson);

  if (balanceDataCache) {
    renderBalanceScreen();
    return;
  }

  getBalanceDataApi()
  .then(function(data) {
    balanceDataCache = data;
    renderBalanceScreen();
  })
  .catch(function(error) {
    document.getElementById('balanceSummaryCard').textContent =
      'エラー: ' + error.message;
  });
}

function setBalancePersonTab(person) {
  document.querySelectorAll('[data-balance-person]').forEach(function(tab) {
    tab.classList.remove('active');

    if (tab.dataset.balancePerson === person) {
      tab.classList.add('active');
    }
  });
}

function changeBalancePerson(person, element) {
  currentBalancePerson = person;

  document.querySelectorAll('[data-balance-person]').forEach(function(tab) {
    tab.classList.remove('active');
  });

  element.classList.add('active');

  renderBalanceScreen();
}

function renderBalanceScreen() {
  if (!balanceDataCache || !balanceDataCache[currentBalancePerson]) {
    return;
  }

  const data = balanceDataCache[currentBalancePerson];

  renderBalanceSummary(data);
  renderBalanceTable(data);
}

function renderBalanceSummary(data) {

  const summary = document.getElementById('balanceSummaryCard');
  const currentYear = new Date().getFullYear();

  const yearData = data.filter(function(item) {
    return item.year === currentYear;
  });

  const totalIncome = yearData.reduce(function(sum, item) {
    return sum + Number(item.income);
  }, 0);

  const totalExpense = yearData.reduce(function(sum, item) {
    return sum + Number(item.expense);
  }, 0);

  const totalBalance = totalIncome - totalExpense;

summary.innerHTML =
  '<div class="balance-summary-title">' +
    currentYear + '年累計' +
  '</div>' +

  '<div class="balance-main-value ' + getBalanceClass(totalBalance) + '">' +
  formatSignedMoney(totalBalance) +
'</div>' +


  '<div class="balance-summary-split">' +
    '<div>' +
      '<div class="balance-small-label">収入</div>' +
      '<div class="balance-small-value">' + formatMoney(totalIncome) + '</div>' +
    '</div>' +
    '<div>' +
      '<div class="balance-small-label">支出</div>' +
      '<div class="balance-small-value">' + formatMoney(totalExpense) + '</div>' +
    '</div>' +
  '</div>';
}

function renderBalanceTable(data) {
  const table = document.getElementById('balanceMonthlyTable');
  const currentYear = new Date().getFullYear();

  const yearData = data.filter(function(item) {
    return item.year === currentYear;
  });

  let html = '';

  html += '<div class="balance-table-header">';
  html += '<span>月</span>';
  html += '<span>収入</span>';
  html += '<span>支出</span>';
  html += '<span>収支</span>';
  html += '</div>';

  yearData.forEach(function(item) {
    html += '<div class="balance-table-row">';
    html += '<span>' + item.label + '</span>';
    html += '<span>' + formatMoney(item.income) + '</span>';
    html += '<span>' + formatMoney(item.expense) + '</span>';
    html += '<span class="' + getBalanceClass(item.balance) + '">' +
  formatSignedMoney(item.balance) +
  '</span>';
    html += '</div>';
  });

  table.innerHTML = html;
}

// ======================================
// 支出一覧モーダル
// ======================================
function openTrendExpenseList() {
  if (selectedTrendYear === null || selectedTrendMonth === null) {
    return;
  }

 openExpenseList(
  selectedTrendYear,
  selectedTrendMonth,
  currentTrendPerson,
  'total',
  'trend'
);
}

let sheetTouchStartY = 0;

function openExpenseList(
  year = selectedYear,
  month = selectedMonth,
  person = currentPerson,
  type = 'total',
  source = 'home'
  ) { 
  const modal = document.getElementById('expenseModal');
  const content = document.getElementById('expenseListContent');

  modal.classList.add('open');
  modal.classList.remove('fullscreen');
  content.textContent = '読み込み中...';

  getMonthlyExpenseListApi(
  year,
  month,
  person
)
  .then(function(groups) {
    renderExpenseList(groups, year, month, person, type, source);
  })
  .catch(function(error) {
    content.textContent = 'エラー: ' + error.message;
  });
}

function closeExpenseList() {
  document.getElementById('expenseModal').classList.remove('open');
}

function handleSheetTouchStart(event) {
  sheetTouchStartY = event.touches[0].clientY;
}

function handleSheetTouchEnd(event) {
  const endY = event.changedTouches[0].clientY;
  const diffY = sheetTouchStartY - endY;

  const modal = document.getElementById('expenseModal');
  const panel = document.querySelector('.sheet-panel');

  if (diffY > 60) {
    modal.classList.add('fullscreen');
  }

  if (diffY < -60 && panel.scrollTop === 0) {
    modal.classList.remove('fullscreen');
    modal.classList.remove('open');
  }
}

function renderExpenseList(groups, year, month, person, type, source) {
  const content = document.getElementById('expenseListContent');
  const typeLabel = getTrendTypeLabel(type);

  content.innerHTML =
    '<div class="expense-page-title">' +
    year + '年' +
    (month + 1) + '月　' +
    getPersonDisplayName(person) + '　' +
    typeLabel +
    '</div>' +
    renderExpenseSectionsByType(groups, type, source);
}

function filterExpenseItemsByTrendCategories(items) {
  if (!items) return [];

  return items.filter(function(item) {
    return trendSelectedCategories.includes(item.category);
  });
}


function renderExpenseSectionsByType(groups, type, source) {
  const shouldFilterByTrendCategories = source === 'trend';

  const fixedItems = shouldFilterByTrendCategories
    ? filterExpenseItemsByTrendCategories(groups.fixed)
    : (groups.fixed || []);

  const monthlyItems = shouldFilterByTrendCategories
    ? filterExpenseItemsByTrendCategories(groups.monthly)
    : (groups.monthly || []);

  const yearlyItems = shouldFilterByTrendCategories
    ? filterExpenseItemsByTrendCategories(groups.yearly)
    : (groups.yearly || []);

  if (type === 'fixed') {
    return renderExpenseSection('固定費', fixedItems);
  }

  if (type === 'monthly') {
    return renderExpenseSection('日常費', monthlyItems);
  }

  if (type === 'yearly') {
    return renderExpenseSection('特別費', yearlyItems);
  }

  return (
    renderExpenseSection('固定費', fixedItems) +
    renderExpenseSection('日常費', monthlyItems) +
    renderExpenseSection('特別費', yearlyItems)
  );
}

function getPersonDisplayName(person) {
  if (person === 'ぐんま') return 'ぐん';
  return person;
}

function renderExpenseSection(title, items) {

  if (!items || items.length === 0) {
    return '';
  }

  const total = items.reduce(function(sum, item) {
    return sum + Number(item.amount);
  }, 0);

  let html = '';

  html += '<div class="expense-section">';
  html +=
  '<div class="expense-total">' +
  '<span>' + title + '合計</span>' +
  '<span>' + formatMoney(total) + '</span>' +
  '</div>';

  items.forEach(function(item) {

    html += '<div class="expense-row">';

    html += '<div class="expense-left">';
    html += item.date +
      '　' +
      item.category +
      '　' +
      item.memo;
    html += '</div>';

    html += '<div class="expense-amount">';
    html += formatMoney(item.amount);
    html += '</div>';

    html += '</div>';
  });

  html += '</div>';

  return html;
}

// ======================================
// 初期化
// ======================================

document
  .querySelector('.sheet-panel')
  .addEventListener('touchstart', handleSheetTouchStart);

document
  .querySelector('.sheet-panel')
  .addEventListener('touchend', handleSheetTouchEnd);

initializePerson();



