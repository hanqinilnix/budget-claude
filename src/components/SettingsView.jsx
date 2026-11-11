import { useRef, useState } from 'react';
import { useSpending } from '../context/SpendingContext.jsx';
import { parseSpendingsCsv } from '../csvImport.js';
import { CURRENCIES } from '../utils.js';
import ConfirmDialog from './ConfirmDialog.jsx';

export default function SettingsView({ onAddCategory, onEditCategory }) {
  const { categories, currency, setCurrency, exportData, importData, importCsvRows, clearAllData } = useSpending();
  const fileInputRef = useRef(null);
  const csvInputRef = useRef(null);
  const [message, setMessage] = useState('');
  const [confirmingClear, setConfirmingClear] = useState(false);

  const handleExport = async () => {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spendings-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data.categories) || !Array.isArray(data.transactions)) {
        throw new Error('Invalid backup file');
      }
      await importData(data);
      setMessage('Data imported successfully.');
    } catch {
      setMessage('Could not import that file — is it a valid backup?');
    } finally {
      e.target.value = '';
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleCsvFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = parseSpendingsCsv(await file.text());
      const { added, skipped, newCategories } = await importCsvRows(rows);
      setMessage([
        `Added ${added.toLocaleString()} ${added === 1 ? 'entry' : 'entries'}`,
        newCategories > 0 && `${newCategories} new ${newCategories === 1 ? 'category' : 'categories'}`,
        skipped > 0 && `skipped ${skipped.toLocaleString()} already here`,
      ].filter(Boolean).join(', ') + '.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      e.target.value = '';
      setTimeout(() => setMessage(''), 6000);
    }
  };

  const handleClear = async () => {
    setConfirmingClear(false);
    await clearAllData();
    setMessage('All data cleared.');
    setTimeout(() => setMessage(''), 4000);
  };

  return (
    <div className="view">
      <header className="view-header">
        <h1>Settings</h1>
      </header>

      <section className="section">
        <h2 className="section-title">Currency</h2>
        <select className="settings-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {Object.keys(CURRENCIES).map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
      </section>

      {[
        { title: 'Everyday categories', forTrips: false },
        { title: 'Travel categories', forTrips: true },
      ].map((group) => (
        <section key={group.title} className="section">
          <div className="section-header">
            <h2 className="section-title">{group.title}</h2>
            <button type="button" className="btn small primary" onClick={() => onAddCategory(group.forTrips)} aria-label={`Add to ${group.title}`}>+ Category</button>
          </div>
          <div className="card-list">
            {categories.filter((c) => Boolean(c.forTrips) === group.forTrips).map((c) => (
              <button key={c.id} type="button" className="category-row" onClick={() => onEditCategory(c)}>
                <span className="tx-icon" style={{ background: c.color }}>{c.icon}</span>
                <span className="tx-info">
                  <span className="tx-name">{c.name}</span>
                </span>
                <span className="category-chevron">›</span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <section className="section">
        <h2 className="section-title">Backup</h2>
        <p className="settings-hint">Your data is stored only on this device. Export a backup regularly, especially before clearing browser data. Backups include your receipt photos, so they can get large.</p>
        <div className="settings-actions">
          <button type="button" className="btn primary" onClick={handleExport}>Export a backup</button>
          <button type="button" className="btn ghost" onClick={handleImportClick}>Import a backup</button>
          <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImportFile} />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Spreadsheet</h2>
        <p className="settings-hint">Add entries from a .csv file with date, category and amount columns, and optionally remarks. This keeps what's already here and skips rows it has seen before.</p>
        <div className="settings-actions">
          <button type="button" className="btn ghost" onClick={() => csvInputRef.current?.click()}>Import a spreadsheet</button>
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleCsvFile} />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Danger zone</h2>
        <button type="button" className="btn danger" onClick={() => setConfirmingClear(true)}>Clear all data</button>
      </section>

      {confirmingClear && (
        <ConfirmDialog
          message="This will permanently delete all spending, trips and categories."
          confirmLabel="Clear all data"
          onCancel={() => setConfirmingClear(false)}
          onConfirm={handleClear}
        />
      )}

      {message && <p className="settings-message">{message}</p>}

      <p className="settings-footer">Spendings · works offline · your data stays on this device, and only currency codes and dates go out to look up exchange rates</p>
    </div>
  );
}
