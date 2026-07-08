import { openDB } from 'idb';

const DB_NAME = 'budget-db';
const DB_VERSION = 1;

const DEFAULT_CATEGORIES = [
  { name: 'Groceries', icon: '🛒', budget: 400, color: '#22c55e' },
  { name: 'Dining Out', icon: '🍔', budget: 150, color: '#f97316' },
  { name: 'Transport', icon: '🚗', budget: 120, color: '#3b82f6' },
  { name: 'Housing', icon: '🏠', budget: 1200, color: '#a855f7' },
  { name: 'Utilities', icon: '💡', budget: 150, color: '#eab308' },
  { name: 'Entertainment', icon: '🎬', budget: 80, color: '#ec4899' },
  { name: 'Health', icon: '💊', budget: 100, color: '#14b8a6' },
  { name: 'Shopping', icon: '🛍️', budget: 100, color: '#f43f5e' },
  { name: 'Income', icon: '💰', budget: 0, color: '#84cc16' },
  { name: 'Other', icon: '📦', budget: 50, color: '#64748b' },
];

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('transactions')) {
          const store = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
          store.createIndex('by-date', 'date');
          store.createIndex('by-category', 'categoryId');
        }
      },
    });
  }
  return dbPromise;
}

export async function seedDefaultCategoriesIfEmpty() {
  const db = await getDB();
  const tx = db.transaction('categories', 'readwrite');
  const count = await tx.store.count();
  if (count === 0) {
    await Promise.all(DEFAULT_CATEGORIES.map((c) => tx.store.add(c)));
  }
  await tx.done;
}

export async function getCategories() {
  const db = await getDB();
  return db.getAll('categories');
}

export async function addCategory(category) {
  const db = await getDB();
  return db.add('categories', category);
}

export async function updateCategory(category) {
  const db = await getDB();
  return db.put('categories', category);
}

export async function deleteCategory(id) {
  const db = await getDB();
  return db.delete('categories', id);
}

export async function getTransactions() {
  const db = await getDB();
  const all = await db.getAll('transactions');
  return all.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

export async function addTransaction(transaction) {
  const db = await getDB();
  return db.add('transactions', transaction);
}

export async function updateTransaction(transaction) {
  const db = await getDB();
  return db.put('transactions', transaction);
}

export async function deleteTransaction(id) {
  const db = await getDB();
  return db.delete('transactions', id);
}

export async function exportAllData() {
  const [categories, transactions] = await Promise.all([getCategories(), getTransactions()]);
  return {
    exportedAt: new Date().toISOString(),
    version: DB_VERSION,
    categories,
    transactions,
  };
}

export async function importAllData(data) {
  const db = await getDB();
  const tx = db.transaction(['categories', 'transactions'], 'readwrite');
  await tx.objectStore('categories').clear();
  await tx.objectStore('transactions').clear();
  for (const c of data.categories || []) {
    const { id, ...rest } = c;
    await tx.objectStore('categories').add({ ...rest, id });
  }
  for (const t of data.transactions || []) {
    const { id, ...rest } = t;
    await tx.objectStore('transactions').add({ ...rest, id });
  }
  await tx.done;
}

export async function clearAllData() {
  const db = await getDB();
  const tx = db.transaction(['categories', 'transactions'], 'readwrite');
  await tx.objectStore('categories').clear();
  await tx.objectStore('transactions').clear();
  await tx.done;
  await seedDefaultCategoriesIfEmpty();
}
