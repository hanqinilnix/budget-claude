import { useSpending } from '../context/SpendingContext.jsx';
import { stageOf, summarizeJournal } from '../journals.js';
import { daysBetweenISO, formatCurrency, formatDayMonth, formatDayRange, todayISO } from '../utils.js';

function plural(n, word, words = `${word}s`) {
  return `${n} ${n === 1 ? word : words}`;
}

export default function TripsView({ onStartTrip, onOpenTrip }) {
  const { journals, transactions, currency } = useSpending();
  const today = todayISO();
  const year = today.slice(0, 4);

  const summaries = new Map(journals.map((j) => [j.id, summarizeJournal(j, transactions, today)]));
  const inStage = (stage) => journals.filter((j) => stageOf(j, today) === stage);
  const onNow = inStage('trip');
  const planned = inStage('pre').reverse(); // journals are newest-first, so this is soonest-first
  const past = inStage('post');

  const thisYear = transactions
    .filter((t) => t.type === 'expense' && t.journalId != null && t.date.startsWith(year))
    .reduce((sum, t) => sum + t.amount, 0);

  // A trip still waiting on a day's rate can't be added up at home, so its
  // own currency shows instead.
  const amountOf = (j) => {
    const s = summaries.get(j.id);
    return s.unconverted ? formatCurrency(s.foreignTotal, j.currency) : formatCurrency(s.total, currency);
  };

  return (
    <div className="view">
      <header className="top">
        <div className="title">
          <h1>Trips</h1>
          <button type="button" className="pill fill" onClick={onStartTrip}>Start a trip</button>
        </div>
        <div className="note">
          {thisYear > 0 ? <><b>{formatCurrency(thisYear, currency)}</b> on trips in {year}</> : `No trips logged in ${year} yet`}
        </div>
      </header>

      <div className="body">
        {onNow.length > 0 && (
          <section>
            <h2 className="h">On now</h2>
            {onNow.map((j) => (
              <button key={j.id} type="button" className="card live" onClick={() => onOpenTrip(j)}>
                <span><b>{j.name}</b><span className="sub">Day {summaries.get(j.id).days}, started {formatDayMonth(j.startDate, today)}</span></span>
                <span className="amt">{amountOf(j)}</span>
              </button>
            ))}
          </section>
        )}

        {planned.length > 0 && (
          <section>
            <h2 className="h">Planned</h2>
            {planned.map((j) => {
              const toGo = daysBetweenISO(today, j.startDate);
              return (
                <button key={j.id} type="button" className="card plan" onClick={() => onOpenTrip(j)}>
                  <span><b>{j.name}</b><span className="sub">Starts {formatDayMonth(j.startDate, today)}, {toGo === 1 ? 'tomorrow' : `${toGo} days to go`}</span></span>
                  <span className="amt">{amountOf(j)}</span>
                </button>
              );
            })}
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="h">Past</h2>
            <ul className="rows">
              {past.map((j) => (
                <li key={j.id}>
                  <button type="button" className="row" onClick={() => onOpenTrip(j)}>
                    <span className="grow">
                      <b>{j.name}</b>
                      <span className="sub">{formatDayRange(j.startDate, j.endDate, '')}, {plural(summaries.get(j.id).days, 'day')}</span>
                    </span>
                    <span className="amt">{amountOf(j)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {journals.length === 0 && (
          <p className="hint">
            Plan as many trips as you like. Once a trip begins, the app opens on it until you end it, even after you close it. Everything logged on a trip also counts in Spending, where a trip is one line on Year.
          </p>
        )}
      </div>
    </div>
  );
}
