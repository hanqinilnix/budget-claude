import { useState } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import Sheet from './Sheet.jsx';

const ICON_CHOICES = ['🛒', '🍔', '🚗', '🏠', '💡', '🎬', '💊', '🛍️', '💰', '📦', '✈️', '🎓', '🐾', '🎁', '📱', '💻'];
const COLOR_CHOICES = ['#22c55e', '#f97316', '#3b82f6', '#a855f7', '#eab308', '#ec4899', '#14b8a6', '#f43f5e', '#84cc16', '#64748b'];

export default function CategoryForm({ category, onClose }) {
  const { addCategory, updateCategory, deleteCategory } = useBudget();
  const isEdit = Boolean(category);

  const [name, setName] = useState(category?.name || '');
  const [icon, setIcon] = useState(category?.icon || ICON_CHOICES[0]);
  const [color, setColor] = useState(category?.color || COLOR_CHOICES[0]);
  const [budget, setBudget] = useState(category ? String(category.budget || '') : '');
  const [error, setError] = useState('');

  const handleSubmit = async (e, requestClose) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Give the category a name');
      return;
    }
    const payload = {
      name: name.trim(),
      icon,
      color,
      budget: parseFloat(budget) || 0,
    };
    if (isEdit) {
      await updateCategory({ ...category, ...payload });
    } else {
      await addCategory(payload);
    }
    requestClose();
  };

  const handleDelete = async (requestClose) => {
    await deleteCategory(category.id);
    requestClose();
  };

  return (
    <Sheet onClose={onClose}>
      {(requestClose) => (
        <form onSubmit={(e) => handleSubmit(e, requestClose)} className="tx-form">
          <label className="field">
            <span>Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coffee" autoFocus />
          </label>

          <label className="field">
            <span>Monthly budget (0 = no budget)</span>
            <input type="number" inputMode="decimal" step="0.01" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0.00" />
          </label>

          <div className="field">
            <span>Icon</span>
            <div className="choice-grid">
              {ICON_CHOICES.map((i) => (
                <button type="button" key={i} className={`choice-icon ${icon === i ? 'selected' : ''}`} onClick={() => setIcon(i)}>
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span>Color</span>
            <div className="choice-grid">
              {COLOR_CHOICES.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`choice-color ${color === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            {isEdit && (
              <button type="button" className="btn danger" onClick={() => handleDelete(requestClose)}>
                Delete
              </button>
            )}
            <button type="button" className="btn ghost" onClick={requestClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary">
              {isEdit ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
