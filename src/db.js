import { openDB } from 'idb';
import { roundCents } from './utils.js';

// Keeps the old name on purpose: renaming the database would strand everything
// already saved on the phone.
const DB_NAME = 'budget-db';
const DB_VERSION = 3;

// Receipts are kept apart from entries, and handled separately in backups,
// so that loading the entry list never has to read every photo.
const STORES = ['categories', 'transactions', 'journals'];
const ALL_STORES = [...STORES, 'receipts'];

const DEFAULT_CATEGORIES = [
  { name: 'Groceries', icon: '🛒', color: '#22c55e' },
  { name: 'Dining Out', icon: '🍔', color: '#f97316' },
  { name: 'Transport', icon: '🚗', color: '#3b82f6' },
  { name: 'Housing', icon: '🏠', color: '#a855f7' },
  { name: 'Utilities', icon: '💡', color: '#eab308' },
  { name: 'Entertainment', icon: '🎬', color: '#ec4899' },
  { name: 'Health', icon: '💊', color: '#14b8a6' },
  { name: 'Shopping', icon: '🛍️', color: '#f43f5e' },
  { name: 'Other', icon: '📦', color: '#64748b' },
];

// Trips have their own list, because what you spend on while travelling isn't
// what you spend on at home.
const DEFAULT_TRAVEL_CATEGORIES = [
  { name: 'Flights', icon: '✈️', color: '#3b82f6' },
  { name: 'Accommodation', icon: '🏨', color: '#a855f7' },
  { name: 'Food & Drinks', icon: '🍜', color: '#f97316' },
  { name: 'Transport', icon: '🚆', color: '#14b8a6' },
  { name: 'Activities', icon: '🎟️', color: '#ec4899' },
  { name: 'Shopping', icon: '🛍️', color: '#f43f5e' },
  { name: 'Data & SIM', icon: '📶', color: '#eab308' },
  { name: 'Insurance', icon: '🛡️', color: '#22c55e' },
  { name: 'Other', icon: '📦', color: '#64748b' },
].map((c) => ({ ...c, forTrips: true }));

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
        // A journal is { id, name, startDate, endDate, currency, dailyRates },
        // and endDate stays null while the trip is open. Being saved here rather than held in memory
        // is what keeps a trip open after the app is closed.
        if (!db.objectStoreNames.contains('journals')) {
          db.createObjectStore('journals', { keyPath: 'id', autoIncrement: true });
        }
        // A receipt is { id, type, bytes }. Raw bytes rather than a Blob,
        // because iOS has had bugs with Blobs saved in IndexedDB.
        if (!db.objectStoreNames.contains('receipts')) {
          db.createObjectStore('receipts', { keyPath: 'id', autoIncrement: true });
        }
      },
      // Lets a future version upgrade the database while this one is open.
      blocking(_current, _blocked, event) {
        event.target.close();
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

export async function seedDefaultCategoriesIfEmpty() {
  const db = await getDB();
  const tx = db.transaction('categories', 'readwrite');
  const existing = await tx.store.getAll();
  // Each list is checked by itself, so installs and backups from before trips
  // had categories pick up the travel list without touching their own.
  const missing = [
    ...(existing.some((c) => !c.forTrips) ? [] : DEFAULT_CATEGORIES),
    ...(existing.some((c) => c.forTrips) ? [] : DEFAULT_TRAVEL_CATEGORIES),
  ];
  await Promise.all(missing.map((c) => tx.store.add(c)));
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
  const tx = db.transaction(['transactions', 'receipts'], 'readwrite');
  const transaction = await tx.objectStore('transactions').get(id);
  if (transaction?.receiptId) await tx.objectStore('receipts').delete(transaction.receiptId);
  await tx.objectStore('transactions').delete(id);
  await tx.done;
}

export async function addReceipt(blob) {
  const db = await getDB();
  const bytes = await blob.arrayBuffer();
  return db.add('receipts', { type: blob.type, bytes });
}

export async function getReceipt(id) {
  const db = await getDB();
  const receipt = await db.get('receipts', id);
  return receipt ? new Blob([receipt.bytes], { type: receipt.type }) : null;
}

export async function deleteReceipt(id) {
  const db = await getDB();
  return db.delete('receipts', id);
}

function toDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function getJournals() {
  const db = await getDB();
  const all = await db.getAll('journals');
  return all.sort((a, b) => b.startDate.localeCompare(a.startDate) || b.id - a.id);
}

export async function addJournal(journal) {
  const db = await getDB();
  return db.add('journals', journal);
}

// A trip has one exchange rate per day, so saving the trip also works out what
// its foreign entries cost at home. Entries on a day with no rate stay at an
// amount of 0, which keeps them out of every home-currency total.
export async function updateJournal(journal) {
  const db = await getDB();
  const tx = db.transaction(['journals', 'transactions'], 'readwrite');
  const transactions = tx.objectStore('transactions');
  for (const t of await transactions.getAll()) {
    const rate = journal.dailyRates?.[t.date];
    if (t.journalId === journal.id && t.foreignAmount != null && rate) {
      await transactions.put({ ...t, amount: roundCents(t.foreignAmount / rate) });
    }
  }
  await tx.objectStore('journals').put(journal);
  await tx.done;
}

// The trip goes but its spending doesn't: entries stay in the main view as
// ordinary spending.
export async function deleteJournal(id) {
  const db = await getDB();
  const tx = db.transaction(['journals', 'transactions'], 'readwrite');
  const transactions = tx.objectStore('transactions');
  for (const t of await transactions.getAll()) {
    if (t.journalId === id) await transactions.put({ ...t, journalId: null });
  }
  await tx.objectStore('journals').delete(id);
  await tx.done;
}

export async function exportAllData() {
  const db = await getDB();
  const [categories, transactions, journals, savedReceipts] = await Promise.all([
    getCategories(),
    getTransactions(),
    getJournals(),
    db.getAll('receipts'),
  ]);
  const receipts = await Promise.all(
    savedReceipts.map(async ({ id, type, bytes }) => ({ id, dataUrl: await toDataUrl(new Blob([bytes], { type })) }))
  );
  return {
    exportedAt: new Date().toISOString(),
    version: DB_VERSION,
    categories,
    transactions,
    journals,
    receipts,
  };
}

export async function importAllData(data) {
  // Decoded before the transaction starts, because IndexedDB closes a
  // transaction that waits on anything other than itself.
  const receipts = await Promise.all(
    (data.receipts || []).map(async ({ id, dataUrl }) => {
      const blob = await (await fetch(dataUrl)).blob();
      return { id, type: blob.type, bytes: await blob.arrayBuffer() };
    })
  );
  const db = await getDB();
  const tx = db.transaction(ALL_STORES, 'readwrite');
  await tx.objectStore('receipts').clear();
  for (const receipt of receipts) await tx.objectStore('receipts').add(receipt);
  for (const name of STORES) {
    const store = tx.objectStore(name);
    await store.clear();
    // Backups made before trips existed have no journals list.
    for (const record of data[name] || []) {
      const { id, ...rest } = record;
      await store.add({ ...rest, id });
    }
  }
  await tx.done;
  await seedDefaultCategoriesIfEmpty();
}

export async function clearAllData() {
  const db = await getDB();
  const tx = db.transaction(ALL_STORES, 'readwrite');
  await Promise.all(ALL_STORES.map((name) => tx.objectStore(name).clear()));
  await tx.done;
  await seedDefaultCategoriesIfEmpty();
}
