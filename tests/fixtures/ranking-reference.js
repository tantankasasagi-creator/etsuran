function getRankingDataReference() {
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

    const item = {
      date: Utilities.formatDate(d, 'Asia/Tokyo', 'M/d'),
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

    addRankingItem(result, person, item, d, currentYear, currentMonth);

    if (!isInternalTransferExpense(person, memo)) {
      addRankingItem(result, '合計', item, d, currentYear, currentMonth);
    }
  }

  sortRankingResult(result);

  return result;
}

