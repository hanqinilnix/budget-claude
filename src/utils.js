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
};

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

export function shiftMonthKey(key, delta) {
  const [year, month] = key.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
