const TABS = [
  { key: 'spending', label: 'Spending', icon: '🥧' },
  { key: 'transactions', label: 'History', icon: '📋' },
  { key: 'trips', label: 'Trips', icon: '✈️' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

// Trips and Settings have their own actions, so the add button would be a
// non-sequitur there.
const TABS_WITH_ADD = new Set(['spending', 'transactions']);

export function tabHasAddButton(tab) {
  return TABS_WITH_ADD.has(tab);
}

export default function NavBar({ tab, showAdd, onChange, onAdd }) {
  return (
    <>
      {showAdd && (
        <button type="button" className="navbar-fab" onClick={onAdd} aria-label="Add spending">
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
