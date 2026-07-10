import { useState } from 'react';
import { BudgetProvider, useBudget } from './context/BudgetContext.jsx';
import NavBar from './components/NavBar.jsx';
import Dashboard from './components/Dashboard.jsx';
import TransactionsView from './components/TransactionsView.jsx';
import BudgetsView from './components/BudgetsView.jsx';
import SettingsView from './components/SettingsView.jsx';
import TransactionForm from './components/TransactionForm.jsx';
import CategoryForm from './components/CategoryForm.jsx';

function AppShell() {
  const { loading } = useBudget();
  const [tab, setTab] = useState('dashboard');
  const [formState, setFormState] = useState(null); // null | { transaction: null|obj }
  const [categoryFormState, setCategoryFormState] = useState(null); // null | { category: null|obj }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    );
  }

  const openAddForm = () => setFormState({ transaction: null });
  const openEditForm = (transaction) => setFormState({ transaction });
  const closeForm = () => setFormState(null);

  const openAddCategory = () => setCategoryFormState({ category: null });
  const openEditCategory = (category) => setCategoryFormState({ category });
  const closeCategoryForm = () => setCategoryFormState(null);

  if (formState) {
    return <TransactionForm transaction={formState.transaction} onClose={closeForm} />;
  }

  if (categoryFormState) {
    return <CategoryForm category={categoryFormState.category} onClose={closeCategoryForm} />;
  }

  return (
    <div className="app">
      <main className="app-content">
        {tab === 'dashboard' && <Dashboard onEditTransaction={openEditForm} onAdd={openAddForm} />}
        {tab === 'transactions' && <TransactionsView onEditTransaction={openEditForm} />}
        {tab === 'budgets' && <BudgetsView onAddCategory={openAddCategory} onEditCategory={openEditCategory} />}
        {tab === 'settings' && <SettingsView />}
      </main>
      <NavBar tab={tab} onChange={setTab} onAdd={openAddForm} />
    </div>
  );
}

export default function App() {
  return (
    <BudgetProvider>
      <AppShell />
    </BudgetProvider>
  );
}
