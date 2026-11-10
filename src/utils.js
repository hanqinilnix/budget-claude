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

export function formatCurrency(amount, currency = 'USD') {
  const cfg = CURRENCIES[currency] || CURRENCIES.USD;
  try {
    return new Intl.NumberFormat(cfg.locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${cfg.symbol}${amount.toFixed(2)}`;
  }
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

export function formatMonthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDateWeekday(dateStr, withYear = false) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

export function formatDateWithYear(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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
