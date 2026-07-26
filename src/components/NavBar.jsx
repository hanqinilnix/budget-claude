// Split either side of the centred add button, so the button stays centred
// however many destinations each side holds.
const LEFT_TABS = [
  { key: 'spending', label: 'Spending', icon: '🥧' },
  { key: 'dashboard', label: 'Summary', icon: '📊' },
];

const RIGHT_TABS = [
  { key: 'transactions', label: 'History', icon: '📋' },
  { key: 'budgets', label: 'Budgets', icon: '🎯' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function NavBar({ tab, onChange, onAdd }) {
  const renderGroup = (tabs) => (
    <div className="navbar-group">
      {tabs.map((t) => (
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
    </div>
  );

  return (
    <nav className="navbar">
      {renderGroup(LEFT_TABS)}
      <button type="button" className="navbar-fab" onClick={onAdd} aria-label="Add transaction">
        <span className="navbar-fab-icon" />
      </button>
      {renderGroup(RIGHT_TABS)}
    </nav>
  );
}
