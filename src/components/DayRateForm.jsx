import { useState } from 'react';
import { useSpending } from '../context/SpendingContext.jsx';
import { latestRateBefore } from '../journals.js';
import { formatCurrency, formatDateWeekday, roundCents } from '../utils.js';
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
    <Page onClose={onClose}>
      {(requestClose) => (
        <form onSubmit={(e) => handleSubmit(e, requestClose)} className="tx-form">
          <h1 className="form-title">{formatDateWeekday(date)}</h1>

          <label className="field">
            <span>Exchange rate: 1 {currency} = ? {journal.currency}</span>
            <input type="number" inputMode="decimal" step="any" min="0" placeholder="e.g. 117.5" value={rate} onChange={(e) => setRate(e.target.value)} autoFocus />
            {parsed > 0 && (
              <span className="field-hint">
                {formatCurrency(dayForeign, journal.currency)} on this day comes to about {formatCurrency(roundCents(dayForeign / parsed), currency)}
              </span>
            )}
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={requestClose}>Cancel</button>
            <button type="submit" className="btn primary">Save</button>
          </div>
        </form>
      )}
    </Page>
  );
}
