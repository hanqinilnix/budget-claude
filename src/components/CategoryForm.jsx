import { useState } from 'react';
import { useSpending } from '../context/SpendingContext.jsx';
import { PACES, paceOf } from '../pace.js';
import Page from './Page.jsx';

const ICON_CHOICES = [
  '🍜', '🛒', '🍔', '☕', '🚗', '🚆', '🏠', '💡', '🧾', '📱', '👪', '🎓',
  '🎬', '🎮', '🧸', '👕', '💊', '🎁', '🛍️', '📦', '✈️', '🏨', '🎟️', '📶',
  '🛡️', '📈', '💻', '🐾', '💰', '🧹',
];

// A travel category belongs to trips, which have their own place, so only
// everyday categories choose a pace.
export default function CategoryForm({ category, forTrips = false, pace: initialPace = 'everyday', onClose }) {
  const { addCategory, updateCategory, deleteCategory } = useSpending();
  const isEdit = Boolean(category);

  const [name, setName] = useState(category?.name || '');
  const [icon, setIcon] = useState(category?.icon || ICON_CHOICES[0]);
  const [pace, setPace] = useState(category ? paceOf(category) : initialPace);
  const [error, setError] = useState('');
  const icons = ICON_CHOICES.includes(icon) ? ICON_CHOICES : [icon, ...ICON_CHOICES];

  const handleSubmit = async (e, requestClose) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Give the category a name');
      return;
    }
    const payload = { name: name.trim(), icon, ...(forTrips ? {} : { pace }) };
    if (isEdit) {
      await updateCategory({ ...category, ...payload });
    } else {
      await addCategory({ ...payload, forTrips });
    }
    requestClose();
  };

  const handleDelete = async (requestClose) => {
    await deleteCategory(category.id);
    requestClose();
  };

  return (
    <Page onClose={onClose}>
      {(requestClose) => (
        <form onSubmit={(e) => handleSubmit(e, requestClose)}>
          <header className="top">
            <div className="title">
              <h1>{isEdit ? 'Edit category' : forTrips ? 'New travel category' : 'New category'}</h1>
              <button type="button" className="pill" onClick={requestClose}>Cancel</button>
            </div>
          </header>

          <div className="body">
            <label className="lbl" htmlFor="category-name">Name</label>
            <input id="category-name" className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coffee" autoFocus={!isEdit} />

            <span className="lbl">Icon</span>
            <div className="cat-grid fixed" role="radiogroup" aria-label="Icon">
              {icons.map((i) => (
                <button type="button" key={i} role="radio" aria-checked={icon === i} className={`cat-tile ${icon === i ? 'on' : ''}`} onClick={() => setIcon(i)}>
                  <i>{i}</i>
                </button>
              ))}
            </div>

            {!forTrips && (
              <>
                <span className="lbl">How often you spend on it</span>
                <ul className="rows" role="radiogroup" aria-label="How often you spend on it">
                  {PACES.map((p) => (
                    <li key={p.key}>
                      <button type="button" role="radio" aria-checked={pace === p.key} className="row" onClick={() => setPace(p.key)}>
                        <span className={`tick ${pace === p.key ? 'done' : ''}`}>{pace === p.key ? '✓' : ''}</span>
                        <span className="grow"><b>{p.label}</b><span className="sub">{p.hint}</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="cta">{isEdit ? 'Save changes' : 'Add category'}</button>
            {isEdit && <button type="button" className="text-btn" onClick={() => handleDelete(requestClose)}>Delete category</button>}
          </div>
        </form>
      )}
    </Page>
  );
}
