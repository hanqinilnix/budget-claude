import { useState } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import { todayISO } from '../utils.js';

export default function TransactionForm({ transaction, onClose }) {
  const { categories, addTransaction, updateTransaction, deleteTransaction } = useBudget();
  const isEdit = Boolean(transaction);

  const [type, setType] = useState(transaction?.type || 'expense');
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '');
  const [categoryId, setCategoryId] = useState(
    transaction?.categoryId ?? categories.find((c) => c.name !== 'Income')?.id ?? categories[0]?.id ?? ''
  );
  const [date, setDate] = useState(transaction?.date || todayISO());
  const [note, setNote] = useState(transaction?.note || '');
  const [error, setError] = useState('');

  const visibleCategories = categories;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setError('Enter an amount greater than 0');
      return;
    }
    if (!categoryId) {
      setError('Choose a category');
      return;
    }
    const payload = {
      type,
      amount: parsed,
      categoryId: Number(categoryId),
      date,
      note: note.trim(),
    };
    if (isEdit) {
      await updateTransaction({ ...transaction, ...payload });
    } else {
      await addTransaction(payload);
    }
    onClose();
  };

  const handleDelete = async () => {
    await deleteTransaction(transaction.id);
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <form onSubmit={handleSubmit} className="tx-form">
          <div className="type-toggle">
            <button type="button" className={type === 'expense' ? 'active' : ''} onClick={() => setType('expense')}>
              Expense
            </button>
            <button type="button" className={type === 'income' ? 'active' : ''} onClick={() => setType('income')}>
              Income
            </button>
          </div>

          <label className="field">
            <span>Amount</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </label>

          <label className="field">
            <span>Category</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {visibleCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayISO()} />
          </label>

          <label className="field">
            <span>Note (optional)</span>
            <input type="text" placeholder="e.g. Weekly groceries" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            {isEdit && (
              <button type="button" className="btn danger" onClick={handleDelete}>
                Delete
              </button>
            )}
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary">
              {isEdit ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
