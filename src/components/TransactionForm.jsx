import { useEffect, useRef, useState } from 'react';
import { useSpending } from '../context/SpendingContext.jsx';
import { fetchDailyRate } from '../exchangeRates.js';
import { TRIP_PHASES, phaseOf, stageOf } from '../journals.js';
import { shrinkReceiptImage } from '../receipts.js';
import { formatCurrency, formatDateShort, formatRate, roundCents, todayISO } from '../utils.js';
import Page from './Page.jsx';
import ReceiptField from './ReceiptField.jsx';

export default function TransactionForm({ transaction, defaultJournalId = null, defaultDate = null, defaultPaidHome = false, defaultPhase = null, onClose }) {
  const {
    categories,
    currency,
    journalById,
    activeJournal,
    addTransaction,
    updateTransaction,
    updateJournal,
    deleteTransaction,
    addReceipt,
    deleteReceipt,
  } = useSpending();
  const isEdit = Boolean(transaction);

  const savedJournalId = isEdit ? transaction.journalId : defaultJournalId;
  // The trip this entry can belong to: its own, or else whichever is open.
  const trip = journalById.get(savedJournalId) ?? activeJournal;

  const foreignCurrency = transaction?.foreignCurrency ?? trip?.currency ?? null;
  const canPayForeign = Boolean(foreignCurrency);

  // Income entries from before this became a spending-only tracker can still
  // be edited, but nothing new gets filed under Income.
  const categoriesFor = (forTrip) => categories.filter((c) => Boolean(c.forTrips) === forTrip && c.name !== 'Income');
  const startsInTrip = journalById.has(savedJournalId);

  const itemKey = useRef(0);
  const newItem = (name = '', price = '') => ({ key: ++itemKey.current, name, price });

  const [mode, setMode] = useState(transaction?.items?.length || transaction?.receiptId ? 'receipt' : 'entry');
  const [inTrip, setInTrip] = useState(startsInTrip);
  const [phase, setPhase] = useState(() => {
    if (transaction && trip) return phaseOf(trip, transaction);
    return defaultPhase ?? (trip ? stageOf(trip, todayISO()) : 'trip');
  });
  const [paidForeign, setPaidForeign] = useState(isEdit ? transaction.foreignCurrency != null : canPayForeign && !defaultPaidHome);
  const [amount, setAmount] = useState(transaction ? String(transaction.foreignAmount ?? transaction.amount) : '');
  // Prices are in whichever currency the receipt was paid in. Kept as typed
  // text, like the amount, so a half-typed "1." isn't reformatted.
  const [items, setItems] = useState(() => {
    if (transaction?.items?.length) return transaction.items.map((i) => newItem(i.name, String(i.price)));
    // A photo saved before receipts had items opens with its total as one line.
    if (transaction?.receiptId) return [newItem('Total', String(transaction.foreignAmount ?? transaction.amount))];
    return [newItem()];
  });
  const [focusItemKey, setFocusItemKey] = useState(null);
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? categoriesFor(startsInTrip)[0]?.id ?? '');
  const [date, setDate] = useState(transaction?.date || defaultDate || todayISO());
  const [lookup, setLookup] = useState(null); // { date, rate } from the last rate lookup
  const [note, setNote] = useState(transaction?.note || '');
  const [error, setError] = useState('');
  const [pendingReceipt, setPendingReceipt] = useState(null);
  const [savedReceiptRemoved, setSavedReceiptRemoved] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState(false);

  const isReceipt = mode === 'receipt';
  const savedReceiptId = savedReceiptRemoved ? null : (transaction?.receiptId ?? null);

  const pickReceipt = async (file) => {
    setReceiptBusy(true);
    setError('');
    try {
      setPendingReceipt(await shrinkReceiptImage(file));
    } catch {
      setError("Couldn't read that image. Try a different photo.");
    } finally {
      setReceiptBusy(false);
    }
  };

  const removeReceipt = () => {
    setPendingReceipt(null);
    setSavedReceiptRemoved(true);
  };

  const addItem = () => {
    const item = newItem();
    setItems((current) => [...current, item]);
    setFocusItemKey(item.key);
  };

  const changeItem = (key, field, value) => {
    setItems((current) => current.map((i) => (i.key === key ? { ...i, [field]: value } : i)));
  };

  const removeItem = (key) => {
    setItems((current) => (current.length === 1 ? [newItem()] : current.filter((i) => i.key !== key)));
  };

  const ownCategory = categories.find((c) => c.id === transaction?.categoryId);
  const visibleCategories = categoriesFor(inTrip);
  if (ownCategory && !visibleCategories.includes(ownCategory)) visibleCategories.push(ownCategory);

  // One rate per day: the one saved for that date, or else looked up for it.
  const dailyRates = trip?.dailyRates ?? {};
  const savedDayRate = dailyRates[date] ?? null;
  const lookedUpRate = lookup?.date === date ? lookup.rate : null;
  const rate = savedDayRate ?? lookedUpRate;

  const lastConversion = useRef(null);
  const usesForeign = inTrip && paidForeign && canPayForeign;
  const isLookingUp = usesForeign && !savedDayRate && lookup?.date !== date;

  useEffect(() => {
    if (!usesForeign || savedDayRate) return undefined;
    let current = true;
    fetchDailyRate(currency, foreignCurrency, date).then((found) => {
      if (current) setLookup({ date, rate: found });
    });
    return () => {
      current = false;
    };
  }, [usesForeign, savedDayRate, currency, foreignCurrency, date]);

  const itemsTotal = roundCents(items.reduce((sum, i) => sum + (parseFloat(i.price) > 0 ? parseFloat(i.price) : 0), 0));
  const typedAmount = isReceipt ? itemsTotal : parseFloat(amount);
  const amountCurrency = usesForeign ? foreignCurrency : currency;

  // Keeps the same money when the currency being typed in changes, so 4000 JPY
  // doesn't quietly become 4000 SGD. With no rate to convert with, the numbers
  // would be wrong in the other currency, so they're cleared instead.
  const changePayment = (nextInTrip, nextPaidForeign) => {
    const nextUsesForeign = nextInTrip && nextPaidForeign && canPayForeign;
    if (nextUsesForeign !== usesForeign) {
      const convert = (text) => {
        const value = parseFloat(text);
        if (!(value > 0)) return text;
        if (!rate) return '';
        return String(roundCents(nextUsesForeign ? value * rate : value / rate));
      };
      // Switching straight back restores what was typed, not a rounded copy of it.
      const snapshot = JSON.stringify({ amount, items });
      const next = lastConversion.current?.shown === snapshot
        ? lastConversion.current.typed
        : { amount: convert(amount), items: items.map((i) => ({ ...i, price: convert(i.price) })) };
      lastConversion.current = { shown: JSON.stringify(next), typed: { amount, items } };
      setAmount(next.amount);
      setItems(next.items);
    }
    if (nextInTrip !== inTrip) {
      const nextCategories = categoriesFor(nextInTrip);
      if (!nextCategories.some((c) => c.id === categoryId)) setCategoryId(nextCategories[0]?.id ?? '');
    }
    setInTrip(nextInTrip);
    setPaidForeign(nextPaidForeign);
  };

  const handleSubmit = async (e, requestClose) => {
    e.preventDefault();
    const filledItems = items.filter((i) => i.name.trim() || i.price !== '');
    if (isReceipt) {
      const unpriced = filledItems.find((i) => !(parseFloat(i.price) > 0));
      if (unpriced) {
        setError(`Enter a price for ${unpriced.name.trim() || 'every item'}`);
        return;
      }
      if (filledItems.length === 0) {
        setError('Add at least one item with a price');
        return;
      }
    } else if (!typedAmount || typedAmount <= 0) {
      setError('Enter an amount greater than 0');
      return;
    }
    if (!categoryId) {
      setError('Choose a category');
      return;
    }
    const parsed = typedAmount;
    // Stored only now, so cancelling the form leaves no stray photo behind.
    // A photo belongs to receipt mode, so saving as a plain entry drops it.
    const receiptId = !isReceipt ? null : pendingReceipt ? await addReceipt(pendingReceipt) : savedReceiptId;
    const payload = {
      receiptId,
      items: isReceipt ? filledItems.map((i) => ({ name: i.name.trim(), price: parseFloat(i.price) })) : null,
      type: transaction?.type || 'expense',
      // amount is always home currency, so every total adds up without converting.
      // It stays 0 for foreign entries until their day has a rate.
      amount: usesForeign ? (rate ? roundCents(parsed / rate) : 0) : parsed,
      foreignAmount: usesForeign ? parsed : null,
      foreignCurrency: usesForeign ? foreignCurrency : null,
      categoryId: Number(categoryId),
      date,
      note: note.trim(),
      journalId: inTrip ? trip.id : null,
      phase: inTrip ? phase : null,
    };
    if (isEdit) {
      await updateTransaction({ ...transaction, ...payload });
    } else {
      await addTransaction(payload);
    }
    if (transaction?.receiptId && transaction.receiptId !== receiptId) {
      await deleteReceipt(transaction.receiptId);
    }
    if (usesForeign && rate && !savedDayRate) {
      await updateJournal({ ...trip, dailyRates: { ...dailyRates, [date]: rate } });
    }
    requestClose();
  };

  const handleDelete = async (requestClose) => {
    await deleteTransaction(transaction.id);
    requestClose();
  };

  const conversionHint = usesForeign && typedAmount > 0 && rate && (
    <span className="field-hint">
      About {formatCurrency(roundCents(typedAmount / rate), currency)}
    </span>
  );

  const noteField = (
    <label className="field">
      <span>{isReceipt ? 'Store (optional)' : 'Note (optional)'}</span>
      <input
        type="text"
        placeholder={isReceipt ? 'e.g. FairPrice' : 'e.g. Weekly groceries'}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </label>
  );

  return (
    <Page onClose={onClose}>
      {(requestClose) => (
        <form onSubmit={(e) => handleSubmit(e, requestClose)} className="tx-form">
          <div className="type-toggle">
            <button type="button" className={isReceipt ? '' : 'active'} onClick={() => setMode('entry')}>
              Entry
            </button>
            <button type="button" className={isReceipt ? 'active' : ''} onClick={() => setMode('receipt')}>
              🧾 Receipt
            </button>
          </div>

          {trip && (
            <div className="field">
              <span>✈️ {trip.name}</span>
              <div className="type-toggle">
                <button type="button" className={inTrip ? '' : 'active'} onClick={() => changePayment(false, paidForeign)}>
                  Main
                </button>
                {TRIP_PHASES.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className={inTrip && phase === p.key ? 'active' : ''}
                    onClick={() => {
                      setPhase(p.key);
                      changePayment(true, paidForeign);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {inTrip && canPayForeign && (
            <div className="type-toggle">
              <button type="button" className={paidForeign ? 'active' : ''} onClick={() => changePayment(true, true)}>
                {foreignCurrency}
              </button>
              <button type="button" className={paidForeign ? '' : 'active'} onClick={() => changePayment(true, false)}>
                {currency}
              </button>
            </div>
          )}

          {isReceipt ? (
            <>
              {noteField}

              <div className="field">
                <span>Items{canPayForeign ? ` (${amountCurrency})` : ''}</span>
                <div className="receipt-items">
                  {items.map((item) => (
                    <div key={item.key} className="receipt-item">
                      <input
                        type="text"
                        placeholder="Item"
                        aria-label="Item name"
                        value={item.name}
                        onChange={(e) => changeItem(item.key, 'name', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.preventDefault();
                        }}
                        autoFocus={item.key === focusItemKey}
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        aria-label={`Price of ${item.name || 'item'}`}
                        value={item.price}
                        onChange={(e) => changeItem(item.key, 'price', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return;
                          e.preventDefault();
                          addItem();
                        }}
                      />
                      <button type="button" className="receipt-item-remove" onClick={() => removeItem(item.key)} aria-label={`Remove ${item.name || 'item'}`}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" className="btn ghost receipt-add" onClick={addItem}>+ Add item</button>
              </div>

              <div className="field">
                <div className="receipt-total">
                  <span>Total</span>
                  <span>{formatCurrency(itemsTotal, amountCurrency)}</span>
                </div>
                {conversionHint}
              </div>
            </>
          ) : (
            <label className="field">
              <span>Amount{canPayForeign ? ` (${amountCurrency})` : ''}</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
              {conversionHint}
            </label>
          )}

          {usesForeign && (
            <div className="field">
              <span className="field-hint">
                {rate && `Rate on ${date === todayISO() ? 'today' : formatDateShort(date)}: ${formatRate(currency, rate, foreignCurrency)}`}
                {!rate && isLookingUp && 'Looking up the exchange rate…'}
                {!rate && !isLookingUp && "Can't reach the exchange rate right now. This will convert by itself once you're online."}
              </span>
            </div>
          )}

          {!isReceipt && noteField}

          {isReceipt && (
            <ReceiptField
              savedId={savedReceiptId}
              pendingBlob={pendingReceipt}
              busy={receiptBusy}
              onPick={pickReceipt}
              onRemove={removeReceipt}
            />
          )}

          <div className="field">
            <span>Category</span>
            <div className="category-grid">
              {visibleCategories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={`category-choice ${categoryId === c.id ? 'selected' : ''}`}
                  onClick={() => setCategoryId(c.id)}
                >
                  <span className="category-choice-icon" style={{ background: c.color }}>{c.icon}</span>
                  <span className="category-choice-name">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayISO()} />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            {isEdit && (
              <button type="button" className="btn danger" onClick={() => handleDelete(requestClose)}>
                Delete
              </button>
            )}
            <button type="button" className="btn ghost" onClick={requestClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={receiptBusy}>
              {isEdit ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      )}
    </Page>
  );
}
