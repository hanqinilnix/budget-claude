// Trips and Settings have their own actions, so the add button would be a
// non-sequitur there. A trip page has it, for adding to that trip.
const TABS_WITH_ADD = new Set(['spending', 'transactions']);

export function tabHasAddButton(tab) {
  return TABS_WITH_ADD.has(tab);
}

// While a trip is under way, the Trips tab carries its name.
export default function NavBar({ tab, tripLabel, showAdd, onChange, onAdd }) {
  const tabs = [
    { key: 'spending', label: 'Spending', icon: '🥧' },
    { key: 'transactions', label: 'History', icon: '📋' },
    { key: 'trips', label: tripLabel ?? 'Trips', icon: '✈️' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ];
  return (
    <>
      {showAdd && (
        <button type="button" className="navbar-fab" onClick={onAdd} aria-label="Add spending">+</button>
      )}
      <nav className="navbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`navbar-item ${tab === t.key ? 'active' : ''}`}
            aria-current={tab === t.key ? 'page' : undefined}
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
