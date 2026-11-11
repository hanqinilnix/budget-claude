// How often money goes on a category, which decides where it shows:
// everyday spending leads Day, 7 Days and Week, monthly spending leads Month,
// and now-and-then spending is listed by name on Year.
export const PACES = [
  { key: 'everyday', label: 'Everyday', hint: 'Leads Day, 7 Days and Week' },
  { key: 'monthly', label: 'Every month', hint: 'Joins the Month checklist' },
  { key: 'occasional', label: 'Now and then', hint: 'Listed by name on Year' },
];

// Categories saved before categories had a pace get theirs from their name.
// Anything not named here starts as everyday, and can be moved in Settings.
const PACE_BY_NAME = {
  parent: 'monthly',
  'bills & subscriptions': 'monthly',
  transport: 'monthly',
  'student loan': 'monthly',
  housing: 'monthly',
  utilities: 'monthly',
  travel: 'occasional',
  investment: 'occasional',
  insurance: 'occasional',
  tax: 'occasional',
  electronics: 'occasional',
  home: 'occasional',
};

export function paceOf(category) {
  if (category?.pace) return category.pace;
  return PACE_BY_NAME[category?.name?.trim().toLowerCase()] ?? 'everyday';
}
