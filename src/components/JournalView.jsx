import { useEffect, useMemo, useState } from 'react';
import { useSpending } from '../context/SpendingContext.jsx';
import { fetchDailyRate } from '../exchangeRates.js';
import { stageOf, summarizeJournal } from '../journals.js';
import { daysBetweenISO, formatCurrency, formatDayMonth, formatDayRange, formatRate, formatWeekdayDayMonth, roundRate, todayISO } from '../utils.js';
import Chevron from './Chevron.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import TransactionRow from './TransactionRow.jsx';

function plural(n, word, words = `${word}s`) {
  return `${n} ${n === 1 ? word : words}`;
}

// One page with three chapters: before the trip, the trip's own days, newest
// first, and after the trip. The chapters either side fold into one line.
export default function JournalView({ journal, onEditTransaction, onEditJournal, onEditDayRate, onBack, backLabel, onBeforeEnd, onBeforeReopen }) {
  const { categoryById, transactions, activeJournal, updateJournal, currency } = useSpending();
  const today = todayISO();
  const isOpen = !journal.endDate;
  const stage = stageOf(journal, today);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [openChapter, setOpenChapter] = useState(stage === 'pre' ? 'pre' : null);

  const { end, days, total, uncountedForeign, unconverted, missingDates, averageRate, phases } = useMemo(
    () => summarizeJournal(journal, transactions, today),
    [journal, transactions, today]
  );
  const { pre, trip, post } = phases;
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

  const tripDays = useMemo(() => {
    const map = new Map();
    for (const t of trip.entries) map.set(t.date, [...(map.get(t.date) ?? []), t]);
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [trip.entries]);

  const foreign = journal.currency;
  const showForeign = (amount) => formatCurrency(amount, foreign);
  const home = (amount, whole = false) => formatCurrency(amount, currency, { whole });

  const dayHeading = (date) => {
    if (date < journal.startDate) return formatWeekdayDayMonth(date, today);
    const n = daysBetweenISO(journal.startDate, date) + 1;
    return date === today ? `Today, day ${n}` : `Day ${n}, ${formatWeekdayDayMonth(date, today)}`;
  };

  const dayTotal = (items) => {
    const foreignItems = items.filter((t) => t.foreignAmount != null);
    if (foreign && foreignItems.length === items.length) return showForeign(foreignItems.reduce((s, t) => s + t.foreignAmount, 0));
    if (items.some((t) => t.foreignAmount != null && t.amount === 0)) return null;
    return home(items.reduce((s, t) => s + t.amount, 0));
  };

  const startsIn = daysBetweenISO(today, journal.startDate);
  const when = {
    pre: `Starts ${formatDayMonth(journal.startDate, today)}, ${startsIn === 1 ? 'tomorrow' : `${startsIn} days to go`}`,
    trip: `Day ${days}, started ${formatDayMonth(journal.startDate, today)}`,
    post: `${formatDayRange(journal.startDate, journal.endDate ?? end, today)}, ${plural(days, 'day')}`,
  }[stage];

  let figure;
  let figureNote = null;
  if (stage === 'pre') {
    figure = home(pre.total);
    figureNote = <>Booked so far, in <b>{plural(pre.entries.length, 'entry', 'entries')}</b></>;
  } else if (stage === 'trip' && foreign) {
    figure = showForeign(trip.foreignTotal);
    figureNote = (
      <>
        About <b>{home(trip.total, true)}</b> so far, <b>{home(trip.perDay, true)} a day</b>
        {trip.unconverted && <>, not counting {showForeign(uncountedForeign)} waiting for a rate</>}.
        {journal.dailyRates?.[today] && <> Today {formatRate(currency, journal.dailyRates[today], foreign)}</>}
      </>
    );
  } else if (stage === 'trip') {
    figure = home(trip.total);
    figureNote = <><b>{home(trip.perDay, true)} a day</b> so far</>;
  } else {
    figure = home(total);
    figureNote = (
      <>
        The whole trip{foreign && <>, <b>{showForeign(trip.foreignTotal)}</b> while away</>}, <b>{home(trip.perDay, true)} a day</b>
        {unconverted && <>, not counting {showForeign(uncountedForeign)} waiting for a rate</>}.
        {foreign && averageRate && <> Average rate {formatRate(currency, roundRate(averageRate), foreign)}</>}
      </>
    );
  }

  const missingRateWarning = daysMissingRate > 0
    ? ` ${daysMissingRate === 1 ? '1 day has' : `${daysMissingRate} days have`} no exchange rate yet. They'll convert once you're online.`
    : '';

  const endTrip = async () => {
    onBeforeEnd();
    await updateJournal({ ...journal, endDate: today });
  };

  const reopen = async () => {
    onBeforeReopen();
    await updateJournal({ ...journal, endDate: null });
  };

  const chapter = (key, title, phase, emptyHint) => {
    const open = openChapter === key;
    const names = [...new Set(phase.entries.map((t) => categoryById.get(t.categoryId)?.name).filter(Boolean))].slice(0, 3).join(', ');
    return (
      <section className="chapter">
        <button type="button" className="row chapter-head" onClick={() => setOpenChapter(open ? null : key)} aria-expanded={open}>
          <span className="grow">
            <b>{title}</b>
            <span className="sub">{phase.entries.length > 0 ? `${names ? `${names}. ` : ''}${plural(phase.entries.length, 'entry', 'entries')}` : 'Nothing yet'}</span>
          </span>
          <span className="amt">{home(phase.total)}</span>
          <span className="chev"><Chevron direction={open ? 'up' : 'down'} size={14} /></span>
        </button>
        {open && (phase.entries.length > 0 ? (
          <ul className="rows">
            {phase.entries.map((t) => <TransactionRow key={t.id} transaction={t} onEdit={onEditTransaction} showTrip={false} inset />)}
          </ul>
        ) : (
          <p className="hint">{emptyHint}</p>
        ))}
      </section>
    );
  };

  return (
    <div className="view">
      <header className="top">
        {onBack && <button type="button" className="back" onClick={onBack}><Chevron size={12} /> {backLabel}</button>}
        <div className="title">
          <h1>{journal.name}</h1>
          <button type="button" className="pill" onClick={() => onEditJournal(journal)}>Edit</button>
        </div>
        <div className="note">{when}</div>
        <div className="fig">{figure}</div>
        {figureNote && <div className="note">{figureNote}</div>}
        {stage === 'trip' && pre.total + post.total > 0 && (
          <div className="note">With bookings, the whole trip is <b>{home(total)}</b></div>
        )}
      </header>

      <div className="body">
        {(stage === 'pre' || pre.entries.length > 0) && chapter('pre', 'Before the trip', pre, 'Nothing before the trip yet. Tap + to add bookings like flights or a hotel.')}

        {stage !== 'pre' && (
          tripDays.length === 0 ? (
            <p className="empty-hint">Nothing logged on this trip yet. Tap + to add the first entry.</p>
          ) : (
            tripDays.map(([date, items]) => {
              const rate = journal.dailyRates?.[date];
              const total = dayTotal(items);
              return (
                <section key={date}>
                  <h2 className="h">{dayHeading(date)} {total && <small>{total}</small>}</h2>
                  {items.some((t) => t.foreignAmount != null) && (
                    <button type="button" className="day-rate" onClick={() => onEditDayRate(journal, date)}>
                      {rate ? formatRate(currency, rate, foreign) : 'Add the exchange rate'}
                    </button>
                  )}
                  <ul className="rows">
                    {items.map((t) => <TransactionRow key={t.id} transaction={t} onEdit={onEditTransaction} showTrip={false} foreignFirst />)}
                  </ul>
                </section>
              );
            })
          )
        )}

        {(stage === 'post' || post.entries.length > 0) && chapter('post', 'After the trip', post, 'Nothing after the trip yet. Tap + to add costs like the ride home.')}

        {unconverted && (
          <p className="quiet">
            {plural(daysMissingRate, 'day')} still {daysMissingRate === 1 ? 'needs' : 'need'} an exchange rate. {showForeign(uncountedForeign)} is left out of the totals in {currency} until then, and converts by itself once you're online.
          </p>
        )}

        {stage === 'pre' ? (
          <p className="hint">The trip begins by itself on {formatDayMonth(journal.startDate, today)}. Plans changed? Move the first day with Edit.</p>
        ) : isOpen ? (
          <button type="button" className="cta alt" onClick={() => setConfirmingEnd(true)}>End trip</button>
        ) : activeJournal ? (
          <p className="hint">End {activeJournal.name} to reopen this trip.</p>
        ) : (
          <button type="button" className="cta alt" onClick={reopen}>Reopen trip</button>
        )}
      </div>

      {confirmingEnd && (
        <ConfirmDialog
          message={`End "${journal.name}"? You'll go back to everyday spending, and this trip stays in Trips.${missingRateWarning}`}
          confirmLabel="End trip"
          onCancel={() => setConfirmingEnd(false)}
          onConfirm={endTrip}
        />
      )}
    </div>
  );
}
