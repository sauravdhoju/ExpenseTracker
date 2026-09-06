export const CATEGORIES = [
  { name: 'Food', icon: 'fast-food' },
  { name: 'Transportation', icon: 'car' },
  { name: 'Shopping', icon: 'cart' },
  { name: 'Entertainment', icon: 'film' },
  { name: 'Bills', icon: 'receipt' },
  { name: 'Income', icon: 'cash' },
  { name: 'Other', icon: 'ellipsis-horizontal' },
];

export function getCategoryIcon(name) {
  return CATEGORIES.find((c) => c.name === name)?.icon ?? 'pricetag';
}
