import { useRef, useState } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import { CURRENCIES } from '../utils.js';

export default function SettingsView() {
  const { currency, setCurrency, exportData, importData, clearAllData } = useBudget();
  const fileInputRef = useRef(null);
  const [message, setMessage] = useState('');

  const handleExport = async () => {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-backup-${new Date().toISOString().slice(0, 10)}.json`;
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

  const handleClear = async () => {
    if (!window.confirm('This will permanently delete all transactions and categories. Continue?')) return;
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

      <section className="section">
        <h2 className="section-title">Backup</h2>
        <p className="settings-hint">Your data is stored only on this device. Export a backup regularly, especially before clearing browser data.</p>
        <div className="settings-actions">
          <button type="button" className="btn primary" onClick={handleExport}>Export data (.json)</button>
          <button type="button" className="btn ghost" onClick={handleImportClick}>Import data</button>
          <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImportFile} />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Danger zone</h2>
        <button type="button" className="btn danger" onClick={handleClear}>Clear all data</button>
      </section>

      {message && <p className="settings-message">{message}</p>}

      <p className="settings-footer">Budget PWA · works offline · your data never leaves this device</p>
    </div>
  );
}
