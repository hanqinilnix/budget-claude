const TABS = [
  { key: 'spending', label: 'Spending', icon: '🥧' },
  { key: 'dashboard', label: 'Summary', icon: '📊' },
  { key: 'transactions', label: 'History', icon: '📋' },
  { key: 'budgets', label: 'Budgets', icon: '🎯' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function NavBar({ tab, onChange, onAdd }) {
  return (
    <>
      <button type="button" className="navbar-fab" onClick={onAdd} aria-label="Add transaction">
        <span className="navbar-fab-icon" />
      </button>
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
