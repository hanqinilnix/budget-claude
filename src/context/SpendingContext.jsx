import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as db from '../db.js';
import { stageOf } from '../journals.js';
import { todayISO } from '../utils.js';

const SpendingContext = createContext(null);

// Keeps the old key on purpose, so the saved currency carries over.
const CURRENCY_KEY = 'budget-currency';

export function SpendingProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [journals, setJournals] = useState([]);
  const [currency, setCurrencyState] = useState(() => localStorage.getItem(CURRENCY_KEY) || 'SGD');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [cats, txs, trips] = await Promise.all([db.getCategories(), db.getTransactions(), db.getJournals()]);
    setCategories(cats);
    setTransactions(txs);
    setJournals(trips);
  }, []);

  useEffect(() => {
    (async () => {
      await db.seedDefaultCategoriesIfEmpty();
      await reload();
      setLoading(false);
    })();
  }, [reload]);

  const setCurrency = useCallback((code) => {
    localStorage.setItem(CURRENCY_KEY, code);
    setCurrencyState(code);
  }, []);

  const value = useMemo(() => {
    const thenReload = (write) => async (arg) => {
      const result = await write(arg);
      await reload();
      return result;
    };
    const today = todayISO();
    return {
      categories,
      transactions,
      journals,
      categoryById: new Map(categories.map((c) => [c.id, c])),
      journalById: new Map(journals.map((j) => [j.id, j])),
      // The trip you're on right now. Any number can be planned at once, but
      // only a started one takes over the app. Journals are newest-first, so
      // if two overlap, the one that began most recently wins.
      activeJournal: journals.find((j) => stageOf(j, today) === 'trip') ?? null,
      currency,
      loading,
      setCurrency,
      addTransaction: thenReload(db.addTransaction),
      updateTransaction: thenReload(db.updateTransaction),
      deleteTransaction: thenReload(db.deleteTransaction),
      addReceipt: db.addReceipt,
      getReceipt: db.getReceipt,
      deleteReceipt: db.deleteReceipt,
      addCategory: thenReload(db.addCategory),
      updateCategory: thenReload(db.updateCategory),
      deleteCategory: thenReload(db.deleteCategory),
      addJournal: thenReload(db.addJournal),
      updateJournal: thenReload(db.updateJournal),
      deleteJournal: thenReload(db.deleteJournal),
      importData: thenReload(db.importAllData),
      clearAllData: thenReload(db.clearAllData),
      exportData: db.exportAllData,
    };
  }, [categories, transactions, journals, currency, loading, setCurrency, reload]);

  return <SpendingContext.Provider value={value}>{children}</SpendingContext.Provider>;
}

export function useSpending() {
  const ctx = useContext(SpendingContext);
  if (!ctx) throw new Error('useSpending must be used within SpendingProvider');
  return ctx;
}
