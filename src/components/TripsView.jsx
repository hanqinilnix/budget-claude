import { useSpending } from '../context/SpendingContext.jsx';
import { stageOf, summarizeJournal } from '../journals.js';
import { formatCurrency, formatDateShort, formatDateWithYear, todayISO } from '../utils.js';

export default function TripsView({ onStartTrip, onOpenActive, onOpenTrip }) {
  const { journals, activeJournal, transactions, currency } = useSpending();
  const today = todayISO();

  const inStage = (stage) => journals.filter((j) => stageOf(j, today) === stage);
  const inProgress = inStage('trip');
  const planned = inStage('pre').reverse(); // journals are newest-first, so this is soonest-first
  const pastTrips = inStage('post');

  const row = (journal, note, onClick) => {
    const { total, foreignTotal, unconverted } = summarizeJournal(journal, transactions, today);
    return (
      <button key={journal.id} type="button" className="category-row" onClick={onClick}>
        <span className="tx-icon" style={{ background: '#0ea5e9' }}>✈️</span>
        <span className="tx-info">
          <span className="tx-name">{journal.name}</span>
          <span className="tx-note">{note}</span>
        </span>
        <span className="tx-amount expense">
          {unconverted ? formatCurrency(foreignTotal, journal.currency) : formatCurrency(total, currency)}
        </span>
        <span className="category-chevron">›</span>
      </button>
    );
  };

  const section = (title, trips, noteFor, onOpen) =>
    trips.length > 0 && (
      <section className="section">
        <h2 className="section-title">{title}</h2>
        <div className="card-list">
          {trips.map((j) => row(j, noteFor(j), () => onOpen(j)))}
        </div>
      </section>
    );

  return (
    <div className="view">
      <header className="view-header">
        <h1>Trips</h1>
      </header>

      <section className="section">
        <button type="button" className="btn primary trip-start" onClick={onStartTrip}>Start a trip</button>
        <p className="settings-hint trip-hint">
          Plan as many as you like. Once a trip begins, the app opens on it until you end it, even after you close it. Everything you log also counts in your main spending.
        </p>
      </section>

      {section('In progress', inProgress, (j) => `Started ${formatDateShort(j.startDate)}`, (j) => (j.id === activeJournal?.id ? onOpenActive() : onOpenTrip(j)))}
      {section('Planned', planned, (j) => `Starts ${formatDateWithYear(j.startDate)}`, onOpenTrip)}
      {section('Past trips', pastTrips, (j) => `${formatDateShort(j.startDate)} – ${formatDateWithYear(j.endDate)}`, onOpenTrip)}
    </div>
  );
}
