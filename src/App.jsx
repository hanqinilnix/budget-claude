import { useState } from 'react';
import { SpendingProvider, useSpending } from './context/SpendingContext.jsx';
import NavBar, { tabHasAddButton } from './components/NavBar.jsx';
import SpendingView from './components/SpendingView.jsx';
import TransactionsView from './components/TransactionsView.jsx';
import TripsView from './components/TripsView.jsx';
import JournalView from './components/JournalView.jsx';
import SettingsView from './components/SettingsView.jsx';
import TransactionForm from './components/TransactionForm.jsx';
import CategoryForm from './components/CategoryForm.jsx';
import TripForm from './components/TripForm.jsx';
import DayRateForm from './components/DayRateForm.jsx';
import { stageOf } from './journals.js';
import { todayISO } from './utils.js';

function AppShell() {
  const { loading, journals, activeJournal } = useSpending();
  // Null until a tab is chosen: the app opens on a trip that is under way,
  // and on Spending otherwise. Deliberately not saved between launches.
  const [chosenTab, setChosenTab] = useState(null);
  // Held here because the Spending page unmounts while a form is open, and
  // editing an old entry shouldn't jump you back to today.
  const [spendingView, setSpendingView] = useState({ period: 'rolling', anchor: null });
  // What the Trips tab shows: null for the trip under way (or the list when
  // there is none), 'list' for the list, or the id of a trip opened from it.
  const [tripShown, setTripShown] = useState(null);
  const [formState, setFormState] = useState(null); // null | { transaction, tripId, defaults }
  const [categoryFormState, setCategoryFormState] = useState(null); // null | { category, forTrips, pace }
  const [tripFormState, setTripFormState] = useState(null); // null | { journal }
  const [dayRateState, setDayRateState] = useState(null); // null | { journal, date }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    );
  }

  const today = todayISO();
  const tab = chosenTab ?? (activeJournal ? 'trips' : 'spending');
  const openedTrip = typeof tripShown === 'number' ? journals.find((j) => j.id === tripShown) : null;
  const journal = tab !== 'trips' ? null : openedTrip ?? (tripShown === null ? activeJournal : null);

  // The add form starts on its likeliest answers: on a trip page, that trip
  // and wherever it has got to; anywhere else, everyday spending.
  const openAddForm = () => {
    if (!journal) {
      setFormState({ transaction: null, tripId: activeJournal?.id ?? null, defaults: { part: 'none' } });
      return;
    }
    const part = stageOf(journal, today);
    setFormState({ transaction: null, tripId: journal.id, defaults: { part, paidForeign: part === 'trip' } });
  };

  const openEditForm = (transaction) => setFormState({ transaction, tripId: transaction.journalId, defaults: null });
  const closeForm = () => setFormState(null);

  const goToTab = (key) => {
    setChosenTab(key);
    setTripShown(null);
  };

  const openTrip = (j) => {
    setChosenTab('trips');
    setTripShown(j.id === activeJournal?.id ? null : j.id);
  };

  if (formState) {
    return <TransactionForm transaction={formState.transaction} tripId={formState.tripId} defaults={formState.defaults} onClose={closeForm} />;
  }

  if (categoryFormState) {
    return <CategoryForm {...categoryFormState} onClose={() => setCategoryFormState(null)} />;
  }

  if (tripFormState) {
    return <TripForm journal={tripFormState.journal} onStarted={(id) => openTrip({ id })} onClose={() => setTripFormState(null)} />;
  }

  if (dayRateState) {
    return <DayRateForm journal={dayRateState.journal} date={dayRateState.date} onClose={() => setDayRateState(null)} />;
  }

  const showAdd = Boolean(journal) || tabHasAddButton(tab);

  return (
    <div className={`app ${journal ? 'trip' : ''}`}>
      <main className={`app-content ${showAdd ? 'with-fab' : ''}`}>
        {journal ? (
          <JournalView
            key={journal.id}
            journal={journal}
            onEditTransaction={openEditForm}
            onEditJournal={(j) => setTripFormState({ journal: j })}
            onEditDayRate={(j, date) => setDayRateState({ journal: j, date })}
            onBack={() => setTripShown('list')}
            backLabel="All trips"
            onBeforeEnd={() => goToTab('spending')}
            onBeforeReopen={() => setTripShown(null)}
          />
        ) : (
          <>
            {tab === 'spending' && (
              <SpendingView view={spendingView} onViewChange={setSpendingView} onEditTransaction={openEditForm} onOpenTrip={openTrip} />
            )}
            {tab === 'transactions' && <TransactionsView onEditTransaction={openEditForm} />}
            {tab === 'trips' && <TripsView onStartTrip={() => setTripFormState({ journal: null })} onOpenTrip={openTrip} />}
            {tab === 'settings' && (
              <SettingsView
                onAddCategory={(forTrips, pace) => setCategoryFormState({ category: null, forTrips, pace })}
                onEditCategory={(category) => setCategoryFormState({ category, forTrips: Boolean(category.forTrips) })}
              />
            )}
          </>
        )}
      </main>
      <NavBar tab={tab} tripLabel={activeJournal?.name} showAdd={showAdd} onChange={goToTab} onAdd={openAddForm} />
    </div>
  );
}

export default function App() {
  return (
    <SpendingProvider>
      <AppShell />
    </SpendingProvider>
  );
}
