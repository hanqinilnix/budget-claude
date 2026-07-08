import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as db from '../db.js';

const BudgetContext = createContext(null);

const CURRENCY_KEY = 'budget-currency';

export function BudgetProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [currency, setCurrencyState] = useState(() => localStorage.getItem(CURRENCY_KEY) || 'SGD');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [cats, txs] = await Promise.all([db.getCategories(), db.getTransactions()]);
    setCategories(cats);
    setTransactions(txs);
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

  const addTransaction = useCallback(async (t) => {
    await db.addTransaction(t);
    await reload();
  }, [reload]);

  const updateTransaction = useCallback(async (t) => {
    await db.updateTransaction(t);
    await reload();
  }, [reload]);

  const deleteTransaction = useCallback(async (id) => {
    await db.deleteTransaction(id);
    await reload();
  }, [reload]);

  const addCategory = useCallback(async (c) => {
    await db.addCategory(c);
    await reload();
  }, [reload]);

  const updateCategory = useCallback(async (c) => {
    await db.updateCategory(c);
    await reload();
  }, [reload]);

  const deleteCategory = useCallback(async (id) => {
    await db.deleteCategory(id);
    await reload();
  }, [reload]);

  const importData = useCallback(async (data) => {
    await db.importAllData(data);
    await reload();
  }, [reload]);

  const clearAllData = useCallback(async () => {
    await db.clearAllData();
    await reload();
  }, [reload]);

  const value = useMemo(() => ({
    categories,
    transactions,
    currency,
    loading,
    setCurrency,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    importData,
    clearAllData,
    exportData: db.exportAllData,
  }), [categories, transactions, currency, loading, setCurrency, addTransaction, updateTransaction, deleteTransaction, addCategory, updateCategory, deleteCategory, importData, clearAllData]);

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used within BudgetProvider');
  return ctx;
}
