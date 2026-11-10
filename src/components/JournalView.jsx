import { useEffect, useMemo, useState } from 'react';
import { useSpending } from '../context/SpendingContext.jsx';
import { fetchDailyRate } from '../exchangeRates.js';
import { TRIP_PHASES, stageOf, summarizeJournal } from '../journals.js';
import { dayBuckets, fillBuckets, tripDayLabel } from '../periods.js';
import { daysBetweenISO, formatCurrency, formatDateShort, formatDateWeekday, formatDateWithYear, formatRate, roundRate, todayISO } from '../utils.js';
import CategoryBreakdown, { UNKNOWN_CATEGORY } from './CategoryBreakdown.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import TransactionRow from './TransactionRow.jsx';
import TrendBars from './TrendBars.jsx';

export default function JournalView({ journal, phase: phaseKey, onPhaseChange, onEditTransaction, onEditJournal, onEditDayRate, onBack, onBeforeReopen }) {
  const { categoryById, transactions, activeJournal, updateJournal, currency } = useSpending();
  const today = todayISO();
  const isOpen = !journal.endDate;
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  const { end, days, total, uncountedForeign, unconverted, missingDates, averageRate, phases } = useMemo(
    () => summarizeJournal(journal, transactions, today),
    [journal, transactions, today]
  );
  const phase = phases[phaseKey];
  const stage = stageOf(journal, today);
  const daysMissingRate = missingDates.length;

  // Entries logged offline, or before the day's rate was published, convert
  // themselves as soon as a rate can be reached. A rate set by hand is kept.
  const datesToLookUp = journal.currency ? missingDates.filter((date) => !journal.dailyRates?.[date]).join(',') : '';
  useEffect(() => {
    if (!datesToLookUp) return undefined;
    let current = true;
    const lookUp = async () => {
      const found = {};
      for (const date of datesToLookUp.split(',')) {
        const rate = await fetchDailyRate(currency, journal.currency, date);
        if (rate) found[date] = rate;
      }
      if (current && Object.keys(found).length > 0) {
        await updateJournal({ ...journal, dailyRates: { ...journal.dailyRates, ...found } });
      }
    };
    lookUp();
    window.addEventListener('online', lookUp);
    return () => {
      current = false;
      window.removeEventListener('online', lookUp);
    };
  }, [datesToLookUp, currency, journal, updateJournal]);

  // With a day still missing its rate, the two currencies can't be added
  // together, so that part of the trip reads in the trip's own currency.
  const shownCurrency = phase.unconverted ? journal.currency : currency;
  const shownTotal = phase.unconverted ? phase.foreignTotal : phase.total;
  const shownEntries = useMemo(
    () => phase.entries.map((t) => ({ ...t, amount: phase.unconverted ? (t.foreignAmount ?? 0) : t.amount })),
    [phase]
  );

  const buckets = useMemo(
    () => fillBuckets(dayBuckets(journal.startDate, end, tripDayLabel), shownEntries),
    [journal.startDate, end, shownEntries]
  );

  const rows = useMemo(() => {
    const totals = new Map();
    for (const t of shownEntries) {
      if (t.amount > 0) totals.set(t.categoryId, (totals.get(t.categoryId) || 0) + t.amount);
    }
    return [...totals.entries()]
      .map(([id, amount]) => ({ id, amount, category: categoryById.get(id) || UNKNOWN_CATEGORY }))
      .sort((a, b) => b.amount - a.amount);
  }, [shownEntries, categoryById]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const t of shownEntries) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date).push(t);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [shownEntries]);

  // Rows show the saved entry, so its real amount and currency stay visible.
  const entryById = useMemo(() => new Map(phase.entries.map((t) => [t.id, t])), [phase]);

  const dayHeading = (date) =>
    phaseKey === 'trip' && date >= journal.startDate
      ? `Day ${daysBetweenISO(journal.startDate, date) + 1} · ${formatDateWeekday(date)}`
      : formatDateWeekday(date);

  const missingRateWarning = daysMissingRate > 0
    ? ` ${daysMissingRate === 1 ? '1 day has' : `${daysMissingRate} days have`} no exchange rate yet. They'll convert once you're online.`
    : '';

  const endTrip = async () => {
    await updateJournal({ ...journal, endDate: today });
  };

  const reopen = async () => {
    onBeforeReopen();
    await updateJournal({ ...journal, endDate: null });
  };

  const dates = {
    pre: `Pre-trip · starts ${formatDateWithYear(journal.startDate)}`,
    trip: `Started ${formatDateWithYear(journal.startDate)} · Day ${days}`,
    post: `${formatDateShort(journal.startDate)} – ${formatDateWithYear(journal.endDate ?? end)} · ${days} ${days === 1 ? 'day' : 'days'}`,
  }[stage];

  const emptyHint = {
    pre: 'Nothing before the trip yet. Tap + to add bookings like flights or hotels.',
    trip: 'Nothing logged on this trip yet. Tap + to add the first entry.',
    post: 'Nothing after the trip yet. Tap + to add costs like the ride home.',
  }[phaseKey];

  return (
    <div className="view">
      {onBack && <button type="button" className="back-link" onClick={onBack}>‹ Trips</button>}
      <header className="view-header">
        <div className="view-title">
          <h1>✈️ {journal.name}</h1>
          <p className="view-sub">{dates}</p>
          {journal.currency && !isOpen && averageRate && (
            <p className="view-sub">Average rate: {formatRate(currency, roundRate(averageRate), journal.currency)}</p>
          )}
          {journal.currency && isOpen && journal.dailyRates?.[today] && (
            <p className="view-sub">Today: {formatRate(currency, journal.dailyRates[today], journal.currency)}</p>
          )}
        </div>
        <button type="button" className="btn small ghost" onClick={() => onEditJournal(journal)}>Edit</button>
      </header>

      <div className="trip-total">
        <span className="summary-label">Whole trip</span>
        <span className="trip-total-value">{formatCurrency(total, currency)}</span>
        {unconverted && (
          <span className="trip-total-note">Plus {formatCurrency(uncountedForeign, journal.currency)} without a rate yet</span>
        )}
      </div>

      <div className="segmented">
        {TRIP_PHASES.map((p) => (
          <button key={p.key} type="button" className={phaseKey === p.key ? 'active' : ''} onClick={() => onPhaseChange(p.key)}>
            {p.label}
          </button>
        ))}
      </div>

      {phaseKey === 'trip' ? (
        <div className="summary-cards">
          {journal.currency ? (
            <>
              <div className="summary-card">
                <span className="summary-label">{journal.currency}</span>
                <span className="summary-value">{formatCurrency(phase.foreignTotal, journal.currency)}</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">{currency}</span>
                <span className="summary-value">{formatCurrency(phase.total, currency)}</span>
              </div>
            </>
          ) : (
            <div className="summary-card">
              <span className="summary-label">Spent</span>
              <span className="summary-value">{formatCurrency(phase.total, currency)}</span>
            </div>
          )}
          <div className="summary-card">
            <span className="summary-label">Per day</span>
            <span className="summary-value">
              {formatCurrency(phase.unconverted ? phase.foreignPerDay : phase.perDay, shownCurrency)}
            </span>
          </div>
          {!journal.currency && (
            <div className="summary-card">
              <span className="summary-label">{isOpen ? 'Day' : 'Days'}</span>
              <span className="summary-value">{days}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="summary-cards single">
          <div className="summary-card">
            <span className="summary-label">{phaseKey === 'pre' ? 'Before the trip' : 'After the trip'}</span>
            <span className="summary-value">{formatCurrency(phase.total, currency)}</span>
          </div>
        </div>
      )}

      {phase.unconverted && (
        <p className="journal-note">
          {phase.homePaid > 0 && `Includes ${formatCurrency(phase.homePaid, currency)} paid in ${currency}. `}
          Waiting for {daysMissingRate === 1 ? "a day's" : "some days'"} exchange rate. This converts to {currency} automatically once you're online.
        </p>
      )}

      {phase.entries.length === 0 ? (
        <p className="empty-hint">{emptyHint}</p>
      ) : (
        <>
          {phaseKey === 'trip' && days >= 2 && (
            <section className="section">
              <h2 className="section-title">By day</h2>
              <div className="trend-card">
                <TrendBars buckets={buckets} currency={shownCurrency} today={today} caption="Tap a bar to see that day" />
              </div>
            </section>
          )}

          {rows.length > 0 && (
            <section className="section">
              <h2 className="section-title">By category</h2>
              <CategoryBreakdown key={phaseKey} rows={rows} total={shownTotal} currency={shownCurrency} />
            </section>
          )}

          {groups.map(([date, items]) => {
            const dayTotal = items.reduce((sum, t) => sum + t.amount, 0);
            return (
              <div key={date} className="tx-group">
                <div className="tx-group-date journal-day">
                  <span>{dayHeading(date)}</span>
                  {dayTotal > 0 && <span>{formatCurrency(dayTotal, shownCurrency)}</span>}
                </div>
                {items.some((t) => t.foreignAmount != null) && (
                  <button type="button" className="day-rate" onClick={() => onEditDayRate(journal, date)}>
                    {journal.dailyRates?.[date] ? formatRate(currency, journal.dailyRates[date], journal.currency) : 'Add exchange rate'} ›
                  </button>
                )}
                <ul className="tx-list">
                  {items.map((t) => <TransactionRow key={t.id} transaction={entryById.get(t.id)} onEdit={onEditTransaction} showTrip={false} />)}
                </ul>
              </div>
            );
          })}
        </>
      )}

      <div className="journal-actions">
        {stage === 'pre' ? (
          <p className="settings-hint">The trip begins automatically on {formatDateShort(journal.startDate)}. Plans changed? Move the first day with Edit.</p>
        ) : isOpen ? (
          <button type="button" className="btn ghost" onClick={() => setConfirmingEnd(true)}>End trip</button>
        ) : activeJournal ? (
          <p className="settings-hint">End {activeJournal.name} to reopen this trip.</p>
        ) : (
          <button type="button" className="btn ghost" onClick={reopen}>Reopen trip</button>
        )}
      </div>

      {confirmingEnd && (
        <ConfirmDialog
          message={`End "${journal.name}"? You'll go back to the main view, and this trip stays in Trips.${missingRateWarning}`}
          confirmLabel="End trip"
          onCancel={() => setConfirmingEnd(false)}
          onConfirm={endTrip}
        />
      )}
    </div>
  );
}
