import { useEffect, useMemo, useRef, useState } from 'react';
import { useSpending } from '../context/SpendingContext.jsx';
import { fetchDailyRate } from '../exchangeRates.js';
import { phaseOf } from '../journals.js';
import { shrinkReceiptImage } from '../receipts.js';
import { CURRENCIES, addDaysISO, formatCurrency, formatDayMonth, formatRate, roundCents, todayISO } from '../utils.js';
import Page from './Page.jsx';
import ReceiptField from './ReceiptField.jsx';

const PARTS = [
  { key: 'pre', label: 'Before' },
  { key: 'trip', label: 'During' },
  { key: 'post', label: 'After' },
  { key: 'none', label: 'Not this trip' },
];

const MONEY_ICONS = { JPY: '💴', CNY: '💴', EUR: '💶', GBP: '💷' };
const moneyIcon = (code) => MONEY_ICONS[code] ?? (CURRENCIES[code]?.symbol.includes('$') ? '💵' : '💱');

// Typed amounts stay as text, so a half-typed "1." isn't reformatted.
const cleanAmount = (text) => text.replace(/,/g, '.').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');

// One row of answers under the amount: when, which currency, which part of
// the trip, and whether it's split into items. Each starts as the likeliest
// answer, so most entries need none of them touched, and one that has been
// changed turns honey.
export default function TransactionForm({ transaction, tripId = null, defaults = null, onClose }) {
  const {
    categories,
    currency,
    transactions,
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
  const today = todayISO();

  // The trip this entry can belong to: its own, or else whichever is open.
  const trip = journalById.get(isEdit ? transaction.journalId : tripId) ?? activeJournal ?? null;
  const foreignCurrency = transaction?.foreignCurrency ?? trip?.currency ?? null;
  const canPayForeign = Boolean(foreignCurrency);

  // What each answer started as, so a changed one can be marked.
  const [start] = useState(() => {
    const inSavedTrip = isEdit && transaction.journalId != null && journalById.has(transaction.journalId);
    return {
      date: transaction?.date ?? today,
      part: !trip ? 'none' : isEdit ? (inSavedTrip ? phaseOf(trip, transaction) : 'none') : (defaults?.part ?? 'none'),
      paidForeign: isEdit ? transaction.foreignCurrency != null : canPayForeign && Boolean(defaults?.paidForeign),
      itemized: Boolean(transaction?.items?.length || transaction?.receiptId),
    };
  });

  // Newest-used first, so the category you want is usually already chosen.
  const lastUsed = useMemo(() => {
    const map = new Map();
    for (const t of transactions) if (!map.has(t.categoryId) || map.get(t.categoryId) < t.date) map.set(t.categoryId, t.date);
    return map;
  }, [transactions]);
  // Income entries from before this became a spending-only tracker can still
  // be edited, but nothing new gets filed under Income.
  const categoriesFor = (forTrip) =>
    categories
      .filter((c) => Boolean(c.forTrips) === forTrip && c.name !== 'Income')
      .sort((a, b) => (lastUsed.get(b.id) ?? '').localeCompare(lastUsed.get(a.id) ?? ''));

  const itemKey = useRef(0);
  const newItem = (name = '', price = '') => ({ key: ++itemKey.current, name, price });

  const [part, setPart] = useState(start.part);
  const [paidForeign, setPaidForeign] = useState(start.paidForeign);
  const [itemized, setItemized] = useState(start.itemized);
  const [date, setDate] = useState(start.date);
  const [amount, setAmount] = useState(transaction ? String(transaction.foreignAmount ?? transaction.amount) : '');
  // Prices are in whichever currency the receipt was paid in.
  const [items, setItems] = useState(() => {
    if (transaction?.items?.length) return transaction.items.map((i) => newItem(i.name, String(i.price)));
    // A photo saved before receipts had items opens with its total as one line.
    if (transaction?.receiptId) return [newItem('Total', String(transaction.foreignAmount ?? transaction.amount))];
    return [newItem()];
  });
  const [focusItemKey, setFocusItemKey] = useState(null);
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? categoriesFor(start.part !== 'none')[0]?.id ?? '');
  const [lookup, setLookup] = useState(null); // { date, rate } from the last rate lookup
  const [note, setNote] = useState(transaction?.note || '');
  const [error, setError] = useState('');
  const [pendingReceipt, setPendingReceipt] = useState(null);
  const [savedReceiptRemoved, setSavedReceiptRemoved] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState(false);

  const inTrip = part !== 'none';
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
  if (ownCategory && !visibleCategories.includes(ownCategory)) visibleCategories.unshift(ownCategory);

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
  const typedAmount = itemized ? itemsTotal : parseFloat(amount);
  const amountCurrency = usesForeign ? foreignCurrency : currency;

  // Keeps the same money when the currency being typed in changes, so 4000 JPY
  // doesn't quietly become 4000 SGD. With no rate to convert with, the numbers
  // would be wrong in the other currency, so they're cleared instead.
  const changePayment = (nextPart, nextPaidForeign) => {
    const nextInTrip = nextPart !== 'none';
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
    setPart(nextPart);
    setPaidForeign(nextPaidForeign);
  };

  const stepPart = () => {
    const next = PARTS[(PARTS.findIndex((p) => p.key === part) + 1) % PARTS.length].key;
    changePayment(next, paidForeign);
  };

  // Turning items on starts the list from the amount already typed.
  const toggleItems = () => {
    if (!itemized && !items.some((i) => i.name || i.price) && parseFloat(amount) > 0) {
      setItems([newItem('', amount)]);
    }
    if (itemized && itemsTotal > 0) setAmount(String(itemsTotal));
    setItemized(!itemized);
  };

  const handleSubmit = async (e, requestClose) => {
    e.preventDefault();
    const filledItems = items.filter((i) => i.name.trim() || i.price !== '');
    if (itemized) {
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
    const parsed = roundCents(typedAmount);
    // Stored only now, so cancelling the form leaves no stray photo behind.
    // A photo belongs with items, so saving as a single amount drops it.
    const receiptId = !itemized ? null : pendingReceipt ? await addReceipt(pendingReceipt) : savedReceiptId;
    const payload = {
      receiptId,
      items: itemized ? filledItems.map((i) => ({ name: i.name.trim(), price: parseFloat(i.price) })) : null,
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
      phase: inTrip ? part : null,
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

  const filledCount = items.filter((i) => parseFloat(i.price) > 0).length;
  const dateLabel = date === today ? 'Today' : date === addDaysISO(today, -1) ? 'Yesterday' : formatDayMonth(date, today);
  const changed = {
    date: date !== start.date,
    currency: paidForeign !== start.paidForeign,
    part: part !== start.part,
    items: itemized !== start.itemized,
  };
  const symbol = CURRENCIES[amountCurrency]?.symbol ?? amountCurrency;
  const title = isEdit ? 'Edit entry' : inTrip ? `Add to ${trip.name}` : 'Add spending';

  return (
    <Page onClose={onClose} className={inTrip ? 'trip' : ''}>
      {(requestClose) => (
        <form onSubmit={(e) => handleSubmit(e, requestClose)}>
          <header className="top">
            <div className="title">
              <h1>{title}</h1>
              <button type="button" className="pill" onClick={requestClose}>Cancel</button>
            </div>
            <label className="amount">
              <span className="amount-cur" aria-hidden="true">{symbol}</span>
              <input
                type="text"
                inputMode="decimal"
                aria-label={`Amount in ${amountCurrency}`}
                placeholder="0"
                value={itemized ? (itemsTotal > 0 ? String(itemsTotal) : '') : amount}
                readOnly={itemized}
                onChange={(e) => setAmount(cleanAmount(e.target.value))}
                autoFocus={!isEdit && !itemized}
              />
              {usesForeign && typedAmount > 0 && rate && (
                <span className="note">about {formatCurrency(roundCents(typedAmount / rate), currency)}</span>
              )}
            </label>
            {itemized && <div className="note amount-hint">The total of the items below</div>}
          </header>

          <div className="body">
            <div className="tiles">
              <span className={`tile ${changed.date ? 'on' : ''}`}>
                <i aria-hidden="true">📅</i>
                <span>{dateLabel}</span>
                <input type="date" aria-label="Date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
              </span>
              {inTrip && canPayForeign && (
                <button type="button" className={`tile ${changed.currency ? 'on' : ''}`} onClick={() => changePayment(part, !paidForeign)} aria-label={`Paid in ${amountCurrency}. Tap for ${usesForeign ? currency : foreignCurrency}`}>
                  <i aria-hidden="true">{moneyIcon(amountCurrency)}</i>
                  <span>{amountCurrency}</span>
                </button>
              )}
              {trip && (
                <button type="button" className={`tile ${changed.part ? 'on' : ''}`} onClick={stepPart} aria-label={`${trip.name}: ${PARTS.find((p) => p.key === part).label}. Tap to change`}>
                  <i aria-hidden="true">{inTrip ? '✈️' : '🏠'}</i>
                  <span>{PARTS.find((p) => p.key === part).label}</span>
                </button>
              )}
              <button type="button" className={`tile ${changed.items ? 'on' : ''}`} onClick={toggleItems} aria-pressed={itemized}>
                <i aria-hidden="true">🧾</i>
                <span>{itemized ? (filledCount > 0 ? `${filledCount} ${filledCount === 1 ? 'item' : 'items'}` : 'Items') : 'No items'}</span>
              </button>
            </div>

            {usesForeign && (
              <p className="field-hint">
                {rate && `${date === today ? 'Today' : formatDayMonth(date, today)}: ${formatRate(currency, rate, foreignCurrency)}`}
                {!rate && isLookingUp && 'Looking up the exchange rate…'}
                {!rate && !isLookingUp && "Can't reach the exchange rate right now. This converts by itself once you're online."}
              </p>
            )}

            {itemized && (
              <>
                <span className="lbl">Items{canPayForeign ? ` in ${amountCurrency}` : ''}</span>
                <div className="items">
                  {items.map((item) => (
                    <div key={item.key} className="item">
                      <input
                        className="input"
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
                        className="input"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        aria-label={`Price of ${item.name || 'item'}`}
                        value={item.price}
                        onChange={(e) => changeItem(item.key, 'price', cleanAmount(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return;
                          e.preventDefault();
                          addItem();
                        }}
                      />
                      <button type="button" className="item-remove" onClick={() => removeItem(item.key)} aria-label={`Remove ${item.name || 'item'}`}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" className="add-item" onClick={addItem}>+ Add item</button>
                <ReceiptField
                  savedId={savedReceiptId}
                  pendingBlob={pendingReceipt}
                  busy={receiptBusy}
                  onPick={pickReceipt}
                  onRemove={removeReceipt}
                />
              </>
            )}

            <span className="lbl">Category</span>
            <div className="cat-grid" role="radiogroup" aria-label="Category">
              {visibleCategories.map((c) => (
                <button type="button" key={c.id} role="radio" aria-checked={categoryId === c.id} className={`cat-tile ${categoryId === c.id ? 'on' : ''}`} onClick={() => setCategoryId(c.id)}>
                  <i aria-hidden="true">{c.icon}</i>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>

            <label className="lbl" htmlFor="entry-note">{itemized ? 'Store' : 'Note'}</label>
            <input
              id="entry-note"
              className="input"
              type="text"
              placeholder={itemized ? 'e.g. FairPrice' : 'e.g. Chicken rice'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            {error && <p className="form-error" role="alert">{error}</p>}

            <button type="submit" className="cta" disabled={receiptBusy}>{isEdit ? 'Save changes' : 'Add spending'}</button>
            {isEdit && <button type="button" className="text-btn" onClick={() => handleDelete(requestClose)}>Delete entry</button>}
          </div>
        </form>
      )}
    </Page>
  );
}
