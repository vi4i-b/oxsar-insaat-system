/**
 * Asia/Baku (+04:00) saat qurşağı üçün tarix köməkçiləri
 */

function getBakuToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Baku',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getBakuMonthStart() {
  return `${getBakuToday().slice(0, 7)}-01`;
}

function formatDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

function addDaysToDateStr(dateStr, days) {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function parseDateOnlyUTC(dateStr) {
  return new Date(`${String(dateStr).slice(0, 10)}T00:00:00.000Z`);
}

module.exports = {
  getBakuToday,
  getBakuMonthStart,
  formatDateOnly,
  addDaysToDateStr,
  parseDateOnlyUTC,
};
