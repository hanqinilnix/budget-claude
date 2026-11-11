import { useMemo, useState } from 'react';
import { useSpending } from '../context/SpendingContext.jsx';
import {
  bigThings,
  dailyTotals,
  elapsed,
  everydayLines,
  monthlyChecklist,
  nameWhatWent,
  ownLineCategoryIds,
  splitByPace,
  sumOf,
  usualForWeekday,
} from '../lenses.js';
import { PERIODS, containsDate, getComparison, getRange, getRangeLabel, shiftAnchor } from '../periods.js';
import {
  formatCurrency,
  formatDayMonth,
  formatDayRange,
  formatMonthName,
  formatWeekdayDayMonth,
  formatWeekdayLong,
  ordinal,
  todayISO,
} from '../utils.js';
import DayColumns from './DayColumns.jsx';
import Chevron from './Chevron.jsx';
import TransactionRow from './TransactionRow.jsx';

function compareText(total, previousTotal, words, currency) {
  if (previousTotal <= 0) return null;
  const difference = total - previousTotal;
  if (Math.abs(difference) < 0.005) return <>The same as {words}</>;
  return <><b>{formatCurrency(Math.abs(difference), currency)} {difference > 0 ? 'more' : 'less'}</b> than {words}</>;
}

function listNames(names) {
  const shown = names.length > 3 ? [...names.slice(0, 2), `${names.length - 2} more`] : names;
  return shown.length > 1 ? `${shown.slice(0, -1).join(', ')} and ${shown.at(-1)}` : (shown[0] ?? '');
}

const NARROW_WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const NARROW_MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export default function SpendingView({ view, onViewChange, onEditTransaction, onOpenTrip }) {
  const { categoryById, journalById, transactions, currency } = useSpending();
  const { period } = view;
  const today = todayISO();
  const anchor = view.anchor ?? today;

  const range = useMemo(() => getRange(period, anchor), [period, anchor]);
  const isCurrent = containsDate(range, today);

  const expenses = useMemo(() => transactions.filter((t) => t.type === 'expense'), [transactions]);
  const firstDate = useMemo(() => expenses.reduce((first, t) => (!first || t.date < first ? t.date : first), null), [expenses]);
  const inRange = useMemo(() => expenses.filter((t) => containsDate(range, t.date)), [expenses, range]);
  const split = useMemo(() => splitByPace(inRange, categoryById), [inRange, categoryById]);
  const ownLineIds = useMemo(() => ownLineCategoryIds(expenses, categoryById), [expenses, categoryById]);

  const go = (nextPeriod, nextAnchor) => onViewChange({ period: nextPeriod, anchor: nextAnchor > today ? null : nextAnchor });
  const setPeriod = (next) => onViewChange({ period: next, anchor: view.anchor });
  const step = (delta) => onViewChange({ period, anchor: shiftAnchor(period, anchor, delta) });
  // Somewhere inside this period, for opening the month or year around it.
  const inside = range.end < today ? range.end : today < range.start ? range.start : today;

  const leadsEveryday = period === 'day' || period === 'rolling' || period === 'week';
  const figure = leadsEveryday ? split.everyday.total : split.total;

  let note = null;
  if (period === 'day') {
    const usual = usualForWeekday(splitByPace(expenses, categoryById).everyday.entries, range.start, firstDate);
    if (usual != null) note = <>A usual {formatWeekdayLong(range.start)} is about <b>{formatCurrency(usual, currency, { whole: true })}</b></>;
  } else if (period !== 'month') {
    const comparison = getComparison(period, range, today);
    const before = splitByPace(expenses.filter((t) => containsDate(comparison, t.date)), categoryById);
    note = compareText(figure, leadsEveryday ? before.everyday.total : before.total, comparison.words, currency);
  }

  const shared = { split, range, today, isCurrent, period, currency, categoryById, journalById, expenses, firstDate, ownLineIds, onEditTransaction, onOpenTrip, go, inside };

  return (
    <div className="view">
      <header className="top">
        <div className="tabs" role="tablist">
          {PERIODS.map((p) => (
            <button key={p.key} type="button" role="tab" aria-selected={period === p.key} className={period === p.key ? 'on' : ''} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="step">
          <button type="button" onClick={() => step(-1)} aria-label="Earlier"><Chevron /></button>
          <span>{getRangeLabel(period, range, today)}</span>
          <button type="button" onClick={() => step(1)} aria-label="Later" disabled={today <= range.end}><Chevron direction="right" /></button>
        </div>
        <div className="fig">{formatCurrency(figure, currency)}</div>
        {period === 'month' && <MonthSplit split={split} />}
        {note && <div className="note">{note}</div>}
        {!isCurrent && (
          <div className="note">
            <button type="button" className="link" onClick={() => onViewChange({ period, anchor: null })}>Back to today</button>
          </div>
        )}
      </header>

      <div className="body">
        {expenses.length === 0 && <p className="empty-hint">Nothing logged yet. Tap + to add what you spend.</p>}
        {expenses.length > 0 && period === 'day' && <DayBody key={range.start} {...shared} />}
        {expenses.length > 0 && (period === 'rolling' || period === 'week') && <WeekBody key={`${period}-${range.start}`} {...shared} />}
        {expenses.length > 0 && period === 'month' && <MonthBody key={range.start} {...shared} />}
        {expenses.length > 0 && period === 'year' && <YearBody key={range.start} {...shared} />}
      </div>
    </div>
  );
}

function MonthSplit({ split }) {
  if (split.total <= 0) return null;
  const parts = [
    ['monthly', 'Every month'],
    ['everyday', 'Everyday'],
    ['occasional', 'Now and then'],
  ];
  return (
    <>
      <div className="split" aria-hidden="true">
        {parts.map(([key]) => split[key].total > 0 && <i key={key} className={key} style={{ flex: split[key].total }} />)}
      </div>
      <div className="key">
        {parts.map(([key, label]) => <span key={key} className={key}>{label}</span>)}
      </div>
    </>
  );
}

// What a period doesn't lead with, in a line, so nothing goes missing.
function LeftOut({ lead, monthly, occasional, categoryById, journalById, currency, onMonth, onYear }) {
  const monthlyTotal = sumOf(monthly);
  const occasionalTotal = sumOf(occasional);
  if (monthlyTotal <= 0 && occasionalTotal <= 0) return null;
  return (
    <p className="quiet">
      {lead}:{' '}
      {monthlyTotal > 0 && (
        <>
          <b>{formatCurrency(monthlyTotal, currency)}</b> on {listNames(nameWhatWent(monthly, categoryById, journalById))}, counted in the month.{' '}
          {onMonth && <button type="button" onClick={onMonth}>See Month</button>}{' '}
        </>
      )}
      {occasionalTotal > 0 && (
        <>
          {monthlyTotal > 0 ? 'And ' : ''}<b>{formatCurrency(occasionalTotal, currency)}</b> on {listNames(nameWhatWent(occasional, categoryById, journalById))}, counted in the year.{' '}
          {onYear && <button type="button" onClick={onYear}>See Year</button>}
        </>
      )}
    </p>
  );
}

function DayBody({ split, range, today, currency, categoryById, journalById, ownLineIds, onEditTransaction, go, inside }) {
  const lines = everydayLines(split.everyday.entries, ownLineIds, categoryById);
  const nothing = range.start === today ? 'Nothing today' : 'Nothing this day';
  return (
    <>
      {lines.map((line) => (
        <section key={line.key}>
          <h2 className="h">{line.label} <small>{line.total > 0 ? formatCurrency(line.total, currency) : nothing}</small></h2>
          {line.entries.length > 0 && (
            <ul className="rows">
              {line.entries.map((t) => <TransactionRow key={t.id} transaction={t} onEdit={onEditTransaction} showCategory={line.key === 'rest'} />)}
            </ul>
          )}
        </section>
      ))}
      <LeftOut
        lead={range.start === today ? 'Also today' : 'Also this day'}
        monthly={split.monthly.entries}
        occasional={split.occasional.entries}
        categoryById={categoryById}
        journalById={journalById}
        currency={currency}
        onMonth={() => go('month', inside)}
        onYear={() => go('year', inside)}
      />
      {split.monthly.entries.length + split.occasional.entries.length > 0 && (
        <ul className="rows">
          {[...split.monthly.entries, ...split.occasional.entries].map((t) => (
            <TransactionRow key={t.id} transaction={t} onEdit={onEditTransaction} inset />
          ))}
        </ul>
      )}
    </>
  );
}

function WeekBody({ split, range, today, period, currency, categoryById, journalById, ownLineIds, go, inside }) {
  const [picked, setPicked] = useState(null);
  const [openLine, setOpenLine] = useState(null);
  const days = dailyTotals(split.everyday.entries, range.start, range.end);
  const columns = days.map((d) => ({
    key: d.date,
    value: d.total,
    label: NARROW_WEEKDAYS[new Date(`${d.date}T00:00:00`).getDay()],
    title: `${formatWeekdayDayMonth(d.date, today)}: ${formatCurrency(d.total, currency)}`,
    isNow: d.date === today,
    disabled: d.date > today,
  }));
  const pickedDay = days.find((d) => d.date === picked);
  const pastDays = days.filter((d) => d.date <= today).length;

  const lines = everydayLines(split.everyday.entries, ownLineIds, categoryById);
  const widest = Math.max(...lines.map((l) => l.total), 0);

  return (
    <>
      <DayColumns
        columns={columns}
        picked={picked}
        onPick={setPicked}
        line={
          pickedDay ? (
            <>
              <span><b>{formatWeekdayDayMonth(pickedDay.date, today)}</b>, {formatCurrency(pickedDay.total, currency)}</span>
              <button type="button" className="link" onClick={() => go('day', pickedDay.date)}>View day</button>
            </>
          ) : (
            pastDays > 0 && split.everyday.total > 0 && <span>About {formatCurrency(split.everyday.total / pastDays, currency)} a day</span>
          )
        }
      />
      <ul className="rows">
        {lines.map((line) => {
          const open = openLine === line.key;
          const canOpen = line.parts && line.parts.length > 0;
          const detail = line.parts ? line.parts.slice(0, 2).map((p) => p.category.name).join(', ') : `${line.entries.length} ${line.entries.length === 1 ? 'entry' : 'entries'}`;
          return (
            <li key={line.key}>
              <button type="button" className="row" disabled={!canOpen} onClick={() => setOpenLine(open ? null : line.key)} aria-expanded={canOpen ? open : undefined}>
                <span className="ico">{line.icon}</span>
                <span className="grow">
                  <b>{line.label}</b>
                  <span className="bar"><i style={{ width: `${widest > 0 ? (line.total / widest) * 100 : 0}%` }} /></span>
                </span>
                <span className="amt">{formatCurrency(line.total, currency)}<small>{line.total > 0 ? detail : 'Nothing'}</small></span>
              </button>
              {open && (
                <ul className="rows">
                  {line.parts.map((p) => (
                    <li key={p.category.name} className="row inset">
                      <span className="ico small">{p.category.icon}</span>
                      <span className="grow"><b>{p.category.name}</b><span className="sub">{p.count} {p.count === 1 ? 'entry' : 'entries'}</span></span>
                      <span className="amt">{formatCurrency(p.total, currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <LeftOut
        lead={period === 'week' ? 'Left out of this week' : 'Left out of these 7 days'}
        monthly={split.monthly.entries}
        occasional={split.occasional.entries}
        categoryById={categoryById}
        journalById={journalById}
        currency={currency}
        onMonth={() => go('month', inside)}
        onYear={() => go('year', inside)}
      />
    </>
  );
}

function MonthBody({ split, range, today, isCurrent, currency, categoryById, journalById, expenses, firstDate, onEditTransaction, go }) {
  const [openKey, setOpenKey] = useState(null);
  const list = useMemo(() => monthlyChecklist(expenses, range.start, categoryById, firstDate), [expenses, range.start, categoryById, firstDate]);
  const { days } = elapsed(range.start, range.end, today, firstDate);
  const isPast = range.end < today;

  const toggle = (key) => setOpenKey(openKey === key ? null : key);
  const entriesOf = (key, entries) => openKey === key && entries.length > 0 && (
    <ul className="rows">
      {entries.map((t) => <TransactionRow key={t.id} transaction={t} onEdit={onEditTransaction} inset />)}
    </ul>
  );

  const occasionalNames = nameWhatWent(split.occasional.entries, categoryById, journalById);
  const hasMonthly = list.items.length + list.bars.length + list.others.length > 0;

  return (
    <>
      <h2 className="h">Every month <small>{formatCurrency(list.total, currency)}{isCurrent ? ' so far' : ''}</small></h2>
      {!hasMonthly && <p className="hint">Nothing monthly yet. Categories marked Every month in Settings show up here.</p>}
      <ul className="rows">
        {list.items.map((item) => {
          const sub = item.paid
            ? `Paid ${formatDayMonth(item.paidDate, today)}`
            : isPast ? 'Not paid this month' : `Usually around the ${ordinal(item.usualDay)}`;
          const open = item.entries.length > 1 && openKey === item.key;
          return (
            <li key={item.key}>
              <button
                type="button"
                className="row"
                disabled={!item.paid}
                onClick={() => (item.entries.length === 1 ? onEditTransaction(item.entries[0]) : toggle(item.key))}
              >
                <span className={`tick ${item.paid ? 'done' : isPast ? '' : 'wait'}`} aria-label={item.paid ? 'Paid' : 'Not paid'}>{item.paid ? '✓' : ''}</span>
                <span className="grow"><b>{item.label}</b><span className="sub">{sub}</span></span>
                <span className={`amt ${item.paid ? '' : 'faint'}`}>{formatCurrency(item.amount, currency)}</span>
              </button>
              {open && entriesOf(item.key, item.entries)}
            </li>
          );
        })}
        {list.bars.map((bar) => {
          const key = `bar-${bar.category.name}`;
          const fill = bar.usual > 0 ? Math.min(bar.total / bar.usual, 1) : bar.total > 0 ? 1 : 0;
          return (
            <li key={key}>
              <button type="button" className="row" disabled={bar.entries.length === 0} onClick={() => toggle(key)} aria-expanded={openKey === key}>
                <span className="ico">{bar.category.icon}</span>
                <span className="grow">
                  <b>{bar.category.name}</b>
                  <span className="bar"><i style={{ width: `${fill * 100}%` }} /></span>
                  {bar.usual >= 1 && <span className="sub">Usually about {formatCurrency(bar.usual, currency, { whole: true })} a month</span>}
                </span>
                <span className="amt">{formatCurrency(bar.total, currency)}</span>
              </button>
              {entriesOf(key, bar.entries)}
            </li>
          );
        })}
        {list.others.map((other) => {
          const key = `other-${other.category.name}`;
          return (
            <li key={key}>
              <button type="button" className="row" onClick={() => toggle(key)} aria-expanded={openKey === key}>
                <span className="ico">{other.category.icon}</span>
                <span className="grow"><b>{other.category.name}</b><span className="sub">Not on the checklist, {other.entries.length} {other.entries.length === 1 ? 'entry' : 'entries'}</span></span>
                <span className="amt">{formatCurrency(other.total, currency)}</span>
              </button>
              {entriesOf(key, other.entries)}
            </li>
          );
        })}
      </ul>

      <h2 className="h">The rest</h2>
      <ul className="rows">
        <li>
          <button type="button" className="row" onClick={() => go('week', isCurrent ? today : range.end)}>
            <span className="grow">
              <b>Everyday</b>
              <span className="sub">{days > 0 ? `${formatCurrency(split.everyday.total / days, currency)} a day${isCurrent ? ' so far' : ''}` : 'Nothing yet'}</span>
            </span>
            <span className="amt">{formatCurrency(split.everyday.total, currency)}</span>
          </button>
        </li>
        <li>
          <button type="button" className="row" onClick={() => go('year', isCurrent ? today : range.end)}>
            <span className="grow">
              <b>Now and then</b>
              <span className="sub">{occasionalNames.length > 0 ? listNames(occasionalNames) : `Nothing ${isCurrent ? 'yet ' : ''}this month`}</span>
            </span>
            <span className="amt">{formatCurrency(split.occasional.total, currency)}</span>
          </button>
        </li>
      </ul>
    </>
  );
}

const SHOWN_BIG_THINGS = 4;

function YearBody({ split, range, today, currency, categoryById, journalById, expenses, firstDate, onEditTransaction, onOpenTrip, go }) {
  const [picked, setPicked] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [openKey, setOpenKey] = useState(null);
  const year = range.start.slice(0, 4);

  const months = NARROW_MONTHS.map((label, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    const value = sumOf(expenses.filter((t) => t.date.startsWith(key)));
    return { key, value, label, title: `${formatMonthName(key)}: ${formatCurrency(value, currency)}`, isNow: today.startsWith(key), disabled: `${key}-01` > today };
  });
  const pickedMonth = months.find((m) => m.key === picked);
  const { days, months: monthCount } = elapsed(range.start, range.end, today, firstDate);

  const things = useMemo(() => bigThings(split.occasional.entries, categoryById, journalById), [split.occasional.entries, categoryById, journalById]);
  const shown = showAll ? things : things.slice(0, SHOWN_BIG_THINGS);

  const subOf = (thing) => {
    const count = thing.entries.length;
    if (thing.kind === 'trip' && thing.journal) {
      const end = thing.journal.endDate ?? (today < thing.journal.startDate ? thing.journal.startDate : today);
      return `Trip, ${formatDayRange(thing.journal.startDate, end, today)}`;
    }
    const name = thing.kind === 'travel' ? 'Travel' : thing.category.name;
    if (count === 1) return `${name}, ${formatDayMonth(thing.entries[0].date, today)}`;
    return `${name}, ${count} ${thing.kind === 'travel' ? 'entries' : 'payments'}`;
  };

  const open = (thing) => {
    if (thing.kind === 'trip' && thing.journal) onOpenTrip(thing.journal);
    else if (thing.entries.length === 1) onEditTransaction(thing.entries[0]);
    else setOpenKey(openKey === thing.key ? null : thing.key);
  };

  return (
    <>
      <DayColumns
        columns={months}
        picked={picked}
        onPick={setPicked}
        dense
        line={
          pickedMonth ? (
            <>
              <span><b>{formatMonthName(pickedMonth.key)}</b>, {formatCurrency(pickedMonth.value, currency)}</span>
              <button type="button" className="link" onClick={() => go('month', `${pickedMonth.key}-01`)}>View month</button>
            </>
          ) : (
            monthCount > 0 && split.total > 0 && <span>About {formatCurrency(split.total / monthCount, currency, { whole: true })} a month</span>
          )
        }
      />

      <h2 className="h">Now and then <small>{formatCurrency(split.occasional.total, currency, { whole: true })}</small></h2>
      {things.length === 0 && <p className="hint">Nothing large this year. Trips, and categories marked Now and then in Settings, show up here.</p>}
      <ul className="rows">
        {shown.map((thing) => (
          <li key={thing.key}>
            <button type="button" className="row" onClick={() => open(thing)} aria-expanded={thing.kind !== 'trip' && thing.entries.length > 1 ? openKey === thing.key : undefined}>
              <span className="ico">{thing.icon}</span>
              <span className="grow"><b>{thing.label}</b><span className="sub">{subOf(thing)}</span></span>
              <span className="amt">{formatCurrency(thing.total, currency)}</span>
            </button>
            {openKey === thing.key && (
              <ul className="rows">
                {thing.entries.map((t) => <TransactionRow key={t.id} transaction={t} onEdit={onEditTransaction} inset />)}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {things.length > SHOWN_BIG_THINGS && (
        <button type="button" className="more link" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show fewer' : `Show ${things.length - SHOWN_BIG_THINGS} more`}
        </button>
      )}

      <h2 className="h">The rest</h2>
      <ul className="rows">
        <li className="row">
          <span className="grow">
            <b>Every month</b>
            <span className="sub">{monthCount > 0 ? `${formatCurrency(split.monthly.total / monthCount, currency, { whole: true })} a month` : 'Nothing yet'}</span>
          </span>
          <span className="amt">{formatCurrency(split.monthly.total, currency)}</span>
        </li>
        <li className="row">
          <span className="grow">
            <b>Everyday</b>
            <span className="sub">{days > 0 ? `${formatCurrency(split.everyday.total / days, currency, { whole: true })} a day` : 'Nothing yet'}</span>
          </span>
          <span className="amt">{formatCurrency(split.everyday.total, currency)}</span>
        </li>
      </ul>
    </>
  );
}

