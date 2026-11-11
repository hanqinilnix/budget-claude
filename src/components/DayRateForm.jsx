import { useState } from 'react';
import { useSpending } from '../context/SpendingContext.jsx';
import { latestRateBefore } from '../journals.js';
import { formatCurrency, formatWeekdayDayMonth, roundCents } from '../utils.js';
import Page from './Page.jsx';

export default function DayRateForm({ journal, date, onClose }) {
  const { currency, transactions, updateJournal } = useSpending();
  const saved = journal.dailyRates?.[date];
  const [rate, setRate] = useState(String(saved ?? latestRateBefore(journal, date)?.rate ?? ''));
  const [error, setError] = useState('');

  const parsed = parseFloat(rate);
  const dayForeign = transactions
    .filter((t) => t.journalId === journal.id && t.date === date && t.foreignAmount != null)
    .reduce((sum, t) => sum + t.foreignAmount, 0);

  const handleSubmit = async (e, requestClose) => {
    e.preventDefault();
    if (!(parsed > 0)) {
      setError(`Enter how much ${journal.currency} you got for 1 ${currency}`);
      return;
    }
    await updateJournal({ ...journal, dailyRates: { ...journal.dailyRates, [date]: parsed } });
    requestClose();
  };

  return (
    <Page onClose={onClose} className="trip">
      {(requestClose) => (
        <form onSubmit={(e) => handleSubmit(e, requestClose)}>
          <header className="top">
            <div className="title">
              <h1>Exchange rate</h1>
              <button type="button" className="pill" onClick={requestClose}>Cancel</button>
            </div>
            <div className="note">{journal.name}, {formatWeekdayDayMonth(date)}</div>
          </header>

          <div className="body">
            <label className="lbl" htmlFor="day-rate">1 {currency} = how many {journal.currency}?</label>
            <input id="day-rate" className="input" type="text" inputMode="decimal" placeholder="e.g. 117.5" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ''))} autoFocus />
            {parsed > 0 && (
              <span className="field-hint">
                {formatCurrency(dayForeign, journal.currency)} on this day comes to about {formatCurrency(roundCents(dayForeign / parsed), currency)}
              </span>
            )}

            {error && <p className="form-error" role="alert">{error}</p>}

            <button type="submit" className="cta">Save rate</button>
          </div>
        </form>
      )}
    </Page>
  );
}
