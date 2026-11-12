import { useRef, useState } from 'react';
import { useSpending } from '../context/SpendingContext.jsx';
import { parseSpendingsCsv } from '../csvImport.js';
import { PACES, paceOf } from '../pace.js';
import { CURRENCIES } from '../utils.js';
import Chevron from './Chevron.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { setFitReadout, showFitReadout } from './FitReadout.jsx';

const SHOWN_PER_GROUP = 3;

export default function SettingsView({ onAddCategory, onEditCategory }) {
  const { categories, currency, setCurrency, exportData, importData, importCsvRows, clearAllData } = useSpending();
  const fileInputRef = useRef(null);
  const csvInputRef = useRef(null);
  const [message, setMessage] = useState('');
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [openGroups, setOpenGroups] = useState(() => new Set());

  const toggleGroup = (key) => {
    const next = new Set(openGroups);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setOpenGroups(next);
  };

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

  const everyday = categories.filter((c) => !c.forTrips);
  const groups = [
    ...PACES.map((p) => ({ key: p.key, title: p.label, forTrips: false, pace: p.key, list: everyday.filter((c) => paceOf(c) === p.key) })),
    { key: 'trips', title: 'Travel categories', forTrips: true, pace: null, list: categories.filter((c) => c.forTrips) },
  ];

  return (
    <div className="view">
      <header className="top">
        <div className="title"><h1>Settings</h1></div>
      </header>

      <div className="body">
        <label className="lbl" htmlFor="home-currency">Home currency</label>
        <select id="home-currency" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {Object.keys(CURRENCIES).map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>

        {groups.map((group) => {
          const open = openGroups.has(group.key);
          const shown = open ? group.list : group.list.slice(0, SHOWN_PER_GROUP);
          return (
            <section key={group.key}>
              <h2 className="h">
                {group.title}
                <small>
                  {group.list.length} {group.list.length === 1 ? 'category' : 'categories'} ·{' '}
                  <button type="button" className="link" onClick={() => onAddCategory(group.forTrips, group.pace)} aria-label={`Add to ${group.title}`}>Add</button>
                </small>
              </h2>
              <ul className="rows">
                {shown.map((c) => (
                  <li key={c.id}>
                    <button type="button" className="row" onClick={() => onEditCategory(c)}>
                      <span className="ico">{c.icon}</span>
                      <span className="grow"><b>{c.name}</b></span>
                      <span className="chev"><Chevron direction="right" size={14} /></span>
                    </button>
                  </li>
                ))}
              </ul>
              {group.list.length > SHOWN_PER_GROUP && (
                <button type="button" className="more link" onClick={() => toggleGroup(group.key)}>
                  {open ? 'Show fewer' : `Show ${group.list.length - SHOWN_PER_GROUP} more`}
                </button>
              )}
            </section>
          );
        })}

        <h2 className="h">Backup</h2>
        <p className="hint">Your data is stored only on this device. Export a backup regularly, especially before clearing browser data. Backups include your receipt photos, so they can get large.</p>
        <button type="button" className="cta" onClick={handleExport}>Export a backup</button>
        <button type="button" className="cta alt" onClick={handleImportClick}>Import a backup</button>
        <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImportFile} />

        <h2 className="h">Spreadsheet</h2>
        <p className="hint">Add entries from a .csv file with date, category and amount columns, and optionally remarks. This keeps what's already here and skips rows it has seen before.</p>
        <button type="button" className="cta alt" onClick={() => csvInputRef.current?.click()}>Import a spreadsheet</button>
        <input ref={csvInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleCsvFile} />

        {message && <p className="quiet" role="status">{message}</p>}

        <h2 className="h">Screen check</h2>
        <p className="hint">Shows the screen measurements along the top, for checking that the app fills the screen. Temporary, while that fix is checked on the phone.</p>
        <button type="button" className="cta alt" onClick={() => setFitReadout(!showFitReadout)}>
          {showFitReadout ? 'Hide the screen readout' : 'Show the screen readout'}
        </button>

        <h2 className="h">Danger zone</h2>
        <button type="button" className="cta danger" onClick={() => setConfirmingClear(true)}>Clear all data</button>

        <p className="hint footer">Spendings works offline, and your data stays on this device. Only currency codes and dates go out, to look up exchange rates.</p>
      </div>

      {confirmingClear && (
        <ConfirmDialog
          message="This will permanently delete all spending, trips and categories."
          confirmLabel="Clear all data"
          onCancel={() => setConfirmingClear(false)}
          onConfirm={handleClear}
        />
      )}
    </div>
  );
}
