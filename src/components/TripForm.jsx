import { useState } from 'react';
import { useSpending } from '../context/SpendingContext.jsx';
import { CURRENCIES, addDaysISO, todayISO } from '../utils.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import Page from './Page.jsx';

export default function TripForm({ journal, onClose, onStarted }) {
  const { currency: homeCurrency, transactions, addJournal, updateJournal, deleteJournal } = useSpending();
  const isEdit = Boolean(journal);
  const hasEnded = Boolean(journal?.endDate);

  const foreignEntries = transactions.filter((t) => t.journalId === journal?.id && t.foreignAmount != null);

  const [name, setName] = useState(journal?.name || '');
  // Tomorrow by default, because a new trip begins in its pre-trip stage.
  const [startDate, setStartDate] = useState(journal?.startDate || addDaysISO(todayISO(), 1));
  const [endDate, setEndDate] = useState(journal?.endDate || '');
  const [tripCurrency, setTripCurrency] = useState(journal?.currency || '');
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleSubmit = async (e, requestClose) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Give the trip a name');
      return;
    }
    if (!startDate || (hasEnded && (!endDate || endDate < startDate))) {
      setError('The trip has to end on or after the day it starts');
      return;
    }
    const details = { name: name.trim(), startDate, currency: tripCurrency || null };
    if (isEdit) {
      await updateJournal({
        ...journal,
        ...details,
        endDate: hasEnded ? endDate : null,
        // Rates are quoted against one currency, so they don't survive a change of it.
        dailyRates: tripCurrency === journal.currency ? journal.dailyRates : {},
      });
    } else {
      onStarted(await addJournal({ ...details, endDate: null, dailyRates: {} }));
    }
    requestClose();
  };

  const deleteWarning = foreignEntries.some((t) => t.amount === 0)
    ? ' Those on days with no exchange rate would count as nothing until you edit them.'
    : '';

  const handleDelete = async (requestClose) => {
    await deleteJournal(journal.id);
    requestClose();
  };

  return (
    <Page onClose={onClose} className="trip">
      {(requestClose) => (
        <form onSubmit={(e) => handleSubmit(e, requestClose)}>
          <header className="top">
            <div className="title">
              <h1>{isEdit ? 'Edit trip' : 'Start a trip'}</h1>
              <button type="button" className="pill" onClick={requestClose}>Cancel</button>
            </div>
            {!isEdit && <div className="note">It begins as a plan, and starts by itself on its first day.</div>}
          </header>

          <div className="body">
            <label className="lbl" htmlFor="trip-name">Trip name</label>
            <input id="trip-name" className="input" type="text" placeholder="e.g. Kyushu" value={name} onChange={(e) => setName(e.target.value)} autoFocus={!isEdit} />

            <label className="lbl" htmlFor="trip-start">First day</label>
            <input id="trip-start" className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />

            {hasEnded && (
              <>
                <label className="lbl" htmlFor="trip-end">Last day</label>
                <input id="trip-end" className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} max={todayISO()} />
              </>
            )}

            <label className="lbl" htmlFor="trip-currency">Currency on this trip</label>
            <select id="trip-currency" className="input" value={tripCurrency} onChange={(e) => setTripCurrency(e.target.value)} disabled={foreignEntries.length > 0}>
              <option value="">Same as home ({homeCurrency})</option>
              {Object.keys(CURRENCIES)
                .filter((code) => code !== homeCurrency)
                .map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
            {foreignEntries.length > 0 && <span className="field-hint">Fixed now that entries are logged in it.</span>}
            {!isEdit && tripCurrency && <span className="field-hint">Each day's exchange rate is looked up for you.</span>}

            {error && <p className="form-error" role="alert">{error}</p>}

            <button type="submit" className="cta">{isEdit ? 'Save changes' : 'Start planning'}</button>
            {isEdit && <button type="button" className="text-btn" onClick={() => setConfirmingDelete(true)}>Delete trip</button>}

            {confirmingDelete && (
              <ConfirmDialog
                message={`Delete "${journal.name}"? Its entries stay in your spending as ordinary entries.${deleteWarning}`}
                confirmLabel="Delete trip"
                onCancel={() => setConfirmingDelete(false)}
                onConfirm={() => handleDelete(requestClose)}
              />
            )}
          </div>
        </form>
      )}
    </Page>
  );
}
