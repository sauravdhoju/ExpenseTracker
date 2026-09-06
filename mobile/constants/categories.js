export const CATEGORIES = [
  { name: 'Food', icon: 'fast-food', color: '#FF7043' },
  { name: 'Transportation', icon: 'car', color: '#42A5F5' },
  { name: 'Shopping', icon: 'cart', color: '#AB47BC' },
  { name: 'Entertainment', icon: 'film', color: '#FFCA28' },
  { name: 'Bills', icon: 'receipt', color: '#26A69A' },
  { name: 'Income', icon: 'cash', color: '#66BB6A' },
  { name: 'Other', icon: 'ellipsis-horizontal', color: '#78909C' },
];

export function getCategoryIcon(name) {
  return CATEGORIES.find((c) => c.name === name)?.icon ?? 'pricetag';
}

export function getCategoryColor(name) {
  return CATEGORIES.find((c) => c.name === name)?.color ?? '#78909C';
}
