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
import { addDaysISO, todayISO } from './utils.js';

function AppShell() {
  const { loading, journals, activeJournal } = useSpending();
  const [tab, setTab] = useState('spending');
  // Held here because the Spending page unmounts while a form is open, and
  // editing an old entry shouldn't jump you back to today.
  const [spendingView, setSpendingView] = useState({ period: 'rolling', anchor: null });
  const [formState, setFormState] = useState(null); // null | { transaction: null|obj, journalId: null|id, ... }
  const [categoryFormState, setCategoryFormState] = useState(null); // null | { category: null|obj, forTrips: bool }
  const [tripFormState, setTripFormState] = useState(null); // null | { journal: null|obj }
  const [dayRateState, setDayRateState] = useState(null); // null | { journal: obj, date: iso }
  // Held here for the same reason as spendingView. Null follows the trip's own
  // stage, so opening the app mid-trip lands on the part you're actually in.
  const [journalPhase, setJournalPhase] = useState(null); // null | 'pre' | 'trip' | 'post'
  // A planned or finished trip opened from the Trips tab.
  const [openedTripId, setOpenedTripId] = useState(null);
  // Deliberately not saved. Every launch starts null, so the app opens on a
  // trip that has begun, and on Main during pre-trip. Any other choice is just
  // for this session.
  const [chosenSide, setChosenSide] = useState(null); // null | 'main' | 'trip'

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    );
  }

  const today = todayISO();
  const openedTrip = journals.find((j) => j.id === openedTripId && j.id !== activeJournal?.id);
  const showActiveTrip = chosenSide ? chosenSide === 'trip' : Boolean(activeJournal);
  const journal = openedTrip ?? (activeJournal && showActiveTrip ? activeJournal : null);
  const showSwitch = Boolean(activeJournal) && !openedTrip;
  const phase = journal ? (journalPhase ?? stageOf(journal, today)) : null;

  // Pre-trip and post-trip costs are normally paid at home, so entries added
  // from those tabs start in home currency.
  const openAddForm = () => {
    if (!journal) {
      setFormState({ transaction: null, journalId: null });
      return;
    }
    const dayBefore = addDaysISO(journal.startDate, -1);
    const defaultDate = { pre: dayBefore < today ? dayBefore : today, trip: journal.endDate, post: today }[phase];
    setFormState({ transaction: null, journalId: journal.id, defaultDate, defaultPaidHome: phase !== 'trip', defaultPhase: phase });
  };

  const openEditForm = (transaction) => setFormState({ transaction, journalId: null });
  const closeForm = () => setFormState(null);

  const openAddCategory = (forTrips) => setCategoryFormState({ category: null, forTrips });
  const openEditCategory = (category) => setCategoryFormState({ category, forTrips: Boolean(category.forTrips) });
  const closeCategoryForm = () => setCategoryFormState(null);

  const enterActiveTrip = () => {
    setOpenedTripId(null);
    setChosenSide('trip');
    setJournalPhase(null);
  };

  const beginNewTrip = (id) => {
    setOpenedTripId(id);
    setChosenSide('trip');
    setJournalPhase('pre');
  };

  const backToTrips = () => {
    setOpenedTripId(null);
    setChosenSide('main');
    setTab('trips');
  };

  // The tabs are the main app, so using one leaves the trip page. The trip
  // stays open and the switch at the top goes straight back to it.
  const goToTab = (key) => {
    setOpenedTripId(null);
    setChosenSide('main');
    setTab(key);
  };

  if (formState) {
    return (
      <TransactionForm
        transaction={formState.transaction}
        defaultJournalId={formState.journalId}
        defaultDate={formState.defaultDate}
        defaultPaidHome={formState.defaultPaidHome}
        defaultPhase={formState.defaultPhase}
        onClose={closeForm}
      />
    );
  }

  if (categoryFormState) {
    return <CategoryForm category={categoryFormState.category} forTrips={categoryFormState.forTrips} onClose={closeCategoryForm} />;
  }

  if (tripFormState) {
    return <TripForm journal={tripFormState.journal} onStarted={beginNewTrip} onClose={() => setTripFormState(null)} />;
  }

  if (dayRateState) {
    return <DayRateForm journal={dayRateState.journal} date={dayRateState.date} onClose={() => setDayRateState(null)} />;
  }

  const showAdd = Boolean(journal) || tabHasAddButton(tab);
  const contentClasses = ['app-content', showSwitch ? 'below-switch' : '', showAdd ? 'with-fab' : ''].join(' ');

  return (
    <div className="app">
      {showSwitch && (
        <div className="mode-switch">
          <div className="segmented">
            <button type="button" className={journal ? '' : 'active'} onClick={() => setChosenSide('main')}>Main</button>
            <button type="button" className={journal ? 'active' : ''} onClick={() => setChosenSide('trip')}>✈️ {activeJournal.name}</button>
          </div>
        </div>
      )}
      <main className={contentClasses}>
        {journal ? (
          <JournalView
            key={journal.id}
            journal={journal}
            phase={phase}
            onPhaseChange={setJournalPhase}
            onEditTransaction={openEditForm}
            onEditJournal={(j) => setTripFormState({ journal: j })}
            onEditDayRate={(j, date) => setDayRateState({ journal: j, date })}
            onBack={openedTrip ? backToTrips : null}
            onBeforeReopen={enterActiveTrip}
          />
        ) : (
          <>
            {tab === 'spending' && <SpendingView view={spendingView} onViewChange={setSpendingView} onEditTransaction={openEditForm} />}
            {tab === 'transactions' && <TransactionsView onEditTransaction={openEditForm} />}
            {tab === 'trips' && (
              <TripsView
                onStartTrip={() => setTripFormState({ journal: null })}
                onOpenActive={enterActiveTrip}
                onOpenTrip={(j) => {
                  setOpenedTripId(j.id);
                  setJournalPhase(j.endDate ? 'trip' : null);
                }}
              />
            )}
            {tab === 'settings' && <SettingsView onAddCategory={openAddCategory} onEditCategory={openEditCategory} />}
          </>
        )}
      </main>
      <NavBar tab={journal ? 'trips' : tab} showAdd={showAdd} onChange={goToTab} onAdd={openAddForm} />
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
