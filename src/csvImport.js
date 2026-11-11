import { roundCents } from './utils.js';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// How the categories from the spending spreadsheet look in the app. Anything
// else in a file still imports, with the plain look below, and can be restyled
// in Settings.
const CATEGORY_LOOKS = {
  'food & drinks': { icon: '🍜', color: '#f97316' },
  transport: { icon: '🚗', color: '#3b82f6' },
  travel: { icon: '✈️', color: '#0ea5e9' },
  'bills & subscriptions': { icon: '📱', color: '#eab308' },
  entertainment: { icon: '🎬', color: '#ec4899' },
  games: { icon: '🎮', color: '#8b5cf6' },
  hobby: { icon: '🧸', color: '#d946ef' },
  fashion: { icon: '👕', color: '#f43f5e' },
  electronics: { icon: '💻', color: '#06b6d4' },
  home: { icon: '🏠', color: '#a855f7' },
  'health & personal care': { icon: '💊', color: '#14b8a6' },
  gifts: { icon: '🎁', color: '#ef4444' },
  parent: { icon: '👪', color: '#22c55e' },
  insurance: { icon: '🛡️', color: '#84cc16' },
  investment: { icon: '📈', color: '#10b981' },
  tax: { icon: '🧾', color: '#78716c' },
  'student loan': { icon: '🎓', color: '#6366f1' },
  miscellaneous: { icon: '📦', color: '#64748b' },
};
const PLAIN_LOOK = { icon: '📦', color: '#64748b' };

export function newCategoryFromCsv(name) {
  return { name, ...(CATEGORY_LOOKS[name.toLowerCase()] ?? PLAIN_LOOK) };
}

// Splits text into rows of fields, keeping the line each row started on so a
// bad row can be pointed out. Quoted fields can hold commas, doubled quotes
// and line breaks.
function readRows(text) {
  const rows = [];
  let fields = [];
  let field = '';
  let quoted = false;
  let line = 1;
  let rowLine = 1;

  const endRow = () => {
    fields.push(field);
    if (fields.some((f) => f.trim())) rows.push({ line: rowLine, fields });
    fields = [];
    field = '';
    rowLine = line;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\n') line++;
    if (quoted) {
      if (ch !== '"') field += ch;
      else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      fields.push(field);
      field = '';
    } else if (ch === '\n') endRow();
    else if (ch !== '\r') field += ch;
  }
  endRow();
  return rows;
}

// Takes "02 Oct 2024", "2-Oct-2024" or "2024-10-02". Slashed dates are refused
// because 02/10/2024 could be either of two days.
function readDate(text) {
  const named = text.match(/^(\d{1,2})[ -]([a-z]{3})[a-z]*[ -](\d{4})$/i);
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  let year;
  let month;
  let day;
  if (named) {
    day = Number(named[1]);
    month = MONTHS.indexOf(named[2].toLowerCase()) + 1;
    year = Number(named[3]);
  } else if (iso) {
    [year, month, day] = iso.slice(1).map(Number);
  } else {
    return null;
  }
  // Date rolls 31 Feb over into March, so a day that changes wasn't a real one.
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Returns [{ date, category, amount, note }]. Throws a message fit to show if
// any row can't be read, so that a bad file saves nothing rather than half.
export function parseSpendingsCsv(text) {
  const [header, ...rows] = readRows(text.replace(/^﻿/, ''));
  const columns = (header?.fields ?? []).map((name) => name.trim().toLowerCase());
  const column = {
    date: columns.indexOf('date'),
    category: columns.indexOf('category'),
    amount: columns.indexOf('amount'),
    note: Math.max(columns.indexOf('remarks'), columns.indexOf('note')),
  };
  if (column.date < 0 || column.category < 0 || column.amount < 0) {
    throw new Error('That CSV needs date, category and amount columns.');
  }
  if (rows.length === 0) throw new Error('That CSV has no entries in it.');

  return rows.map(({ line, fields }) => {
    const get = (index) => (index < 0 ? '' : (fields[index] ?? '').trim());
    const date = readDate(get(column.date));
    if (!date) throw new Error(`Line ${line}: couldn't read the date "${get(column.date)}".`);
    const category = get(column.category);
    if (!category) throw new Error(`Line ${line}: the category is empty.`);
    const amount = Number(get(column.amount).replace(/[$,\s]/g, ''));
    if (!(amount > 0)) throw new Error(`Line ${line}: couldn't read the amount "${get(column.amount)}".`);
    return { date, category, amount: roundCents(amount), note: get(column.note) };
  });
}
