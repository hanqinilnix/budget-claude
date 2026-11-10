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
    <Page onClose={onClose}>
      {(requestClose) => (
        <form onSubmit={(e) => handleSubmit(e, requestClose)} className="tx-form">
          <label className="field">
            <span>Trip name</span>
            <input type="text" placeholder="e.g. Kyushu" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>

          <label className="field">
            <span>First day</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>

          {hasEnded && (
            <label className="field">
              <span>Last day</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} max={todayISO()} />
            </label>
          )}

          <label className="field">
            <span>Currency on this trip</span>
            <select value={tripCurrency} onChange={(e) => setTripCurrency(e.target.value)} disabled={foreignEntries.length > 0}>
              <option value="">Same as home ({homeCurrency})</option>
              {Object.keys(CURRENCIES)
                .filter((code) => code !== homeCurrency)
                .map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
            {foreignEntries.length > 0 && <span className="field-hint">Fixed now that entries are logged in it.</span>}
            {!isEdit && tripCurrency && <span className="field-hint">Each day's exchange rate is looked up for you.</span>}
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            {isEdit && (
              <button type="button" className="btn danger" onClick={() => setConfirmingDelete(true)}>
                Delete
              </button>
            )}
            <button type="button" className="btn ghost" onClick={requestClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary">
              {isEdit ? 'Save' : 'Start pre-trip'}
            </button>
          </div>

          {confirmingDelete && (
            <ConfirmDialog
              message={`Delete "${journal.name}"? Its entries stay in your main spending as ordinary entries.${deleteWarning}`}
              confirmLabel="Delete trip"
              onCancel={() => setConfirmingDelete(false)}
              onConfirm={() => handleDelete(requestClose)}
            />
          )}
        </form>
      )}
    </Page>
  );
}
