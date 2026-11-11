export const CURRENCIES = {
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
  JPY: { symbol: '¥', locale: 'ja-JP' },
  SGD: { symbol: 'S$', locale: 'en-SG' },
  CNY: { symbol: '¥', locale: 'zh-CN' },
  INR: { symbol: '₹', locale: 'en-IN' },
  AUD: { symbol: 'A$', locale: 'en-AU' },
  CAD: { symbol: 'C$', locale: 'en-CA' },
  NZD: { symbol: 'NZ$', locale: 'en-NZ' },
  CHF: { symbol: 'CHF', locale: 'de-CH' },
  HKD: { symbol: 'HK$', locale: 'en-HK' },
  TWD: { symbol: 'NT$', locale: 'zh-TW' },
  KRW: { symbol: '₩', locale: 'ko-KR' },
  THB: { symbol: '฿', locale: 'th-TH' },
  MYR: { symbol: 'RM', locale: 'ms-MY' },
  IDR: { symbol: 'Rp', locale: 'id-ID' },
  VND: { symbol: '₫', locale: 'vi-VN' },
  PHP: { symbol: '₱', locale: 'en-PH' },
};

export function roundCents(value) {
  return Math.round(value * 100) / 100;
}

// Five significant figures reads well for 117.84 JPY and 0.7412 USD alike.
export function roundRate(rate) {
  return Number(rate.toPrecision(5));
}

// Written the way a money changer quotes it: 1 SGD = 117.5 JPY.
export function formatRate(home, rate, foreign) {
  return `1 ${home} = ${rate} ${foreign}`;
}

function fractionDigits(currency) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  } catch {
    return 2;
  }
}

// Always the currency's own symbol in front, as in S$27,795.15 or ¥48,200,
// so amounts read the same way on every screen. whole drops the cents, for
// rough figures such as "about S$137 a day".
export function formatCurrency(amount, currency = 'USD', { whole = false } = {}) {
  const symbol = CURRENCIES[currency]?.symbol ?? currency;
  const digits = whole ? 0 : fractionDigits(currency);
  const number = Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const gap = /^[A-Z]{3}$/.test(symbol) ? ' ' : '';
  return `${amount < 0 ? '-' : ''}${symbol}${gap}${number}`;
}

const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTHS = LONG_MONTHS.map((m) => m.slice(0, 3));
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function partsOf(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day, weekday: new Date(year, month - 1, day).getDay() };
}

// "5 Nov", with the year added when it isn't this year's.
export function formatDayMonth(dateStr, today = todayISO()) {
  const { year, month, day } = partsOf(dateStr);
  return `${day} ${SHORT_MONTHS[month - 1]}${String(year) === today.slice(0, 4) ? '' : ` ${year}`}`;
}

// "Thu 5 Nov".
export function formatWeekdayDayMonth(dateStr, today = todayISO()) {
  return `${WEEKDAYS[partsOf(dateStr).weekday]} ${formatDayMonth(dateStr, today)}`;
}

// "Tuesday".
export function formatWeekdayLong(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long' });
}

// "2 to 8 Nov", or "30 Nov to 6 Dec" across a month.
export function formatDayRange(start, end, today = todayISO()) {
  const s = partsOf(start);
  const e = partsOf(end);
  const left = s.month === e.month && s.year === e.year ? String(s.day) : s.year === e.year ? `${s.day} ${SHORT_MONTHS[s.month - 1]}` : formatDayMonth(start, `${e.year}`);
  return `${left} to ${formatDayMonth(end, today)}`;
}

export function formatMonthName(key) {
  const [year, month] = key.split('-').map(Number);
  return `${LONG_MONTHS[month - 1]} ${year}`;
}

// "1st", "22nd".
export function ordinal(n) {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

export function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysISO(dateStr, delta) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return toISO(new Date(year, month - 1, day + delta));
}

// Monday of the week containing dateStr.
export function startOfWeekISO(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const weekday = new Date(year, month - 1, day).getDay(); // 0 = Sunday
  return addDaysISO(dateStr, -((weekday + 6) % 7));
}

export function startOfMonthISO(dateStr) {
  return `${dateStr.slice(0, 7)}-01`;
}

export function endOfMonthISO(dateStr) {
  const [year, month] = dateStr.split('-').map(Number);
  return toISO(new Date(year, month, 0)); // day 0 of next month = last day of this one
}

export function monthKey(dateStr) {
  return dateStr.slice(0, 7); // YYYY-MM
}

export function currentMonthKey() {
  return todayISO().slice(0, 7);
}

// Moves by whole months, landing on the last day when the month is too short.
export function shiftMonthsISO(dateStr, delta) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const lastDay = new Date(year, month + delta, 0).getDate();
  return toISO(new Date(year, month - 1 + delta, Math.min(day, lastDay)));
}

export function daysBetweenISO(start, end) {
  const toUTC = (s) => {
    const [year, month, day] = s.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUTC(end) - toUTC(start)) / 86400000);
}

export function shiftMonthKey(key, delta) {
  const [year, month] = key.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
