const TABS = [
  { key: 'spending', label: 'Spending', icon: '🥧' },
  { key: 'dashboard', label: 'Summary', icon: '📊' },
  { key: 'transactions', label: 'History', icon: '📋' },
  { key: 'budgets', label: 'Budgets', icon: '🎯' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

// Budgets and Settings have their own actions, so the add button would be a
// non-sequitur there.
const TABS_WITH_ADD = new Set(['spending', 'dashboard', 'transactions']);

export function tabHasAddButton(tab) {
  return TABS_WITH_ADD.has(tab);
}

export default function NavBar({ tab, onChange, onAdd }) {
  return (
    <>
      {tabHasAddButton(tab) && (
        <button type="button" className="navbar-fab" onClick={onAdd} aria-label="Add transaction">
          <span className="navbar-fab-icon" />
        </button>
      )}
      <nav className="navbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`navbar-item ${tab === t.key ? 'active' : ''}`}
            onClick={() => onChange(t.key)}
          >
            <span className="navbar-icon">{t.icon}</span>
            <span className="navbar-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
