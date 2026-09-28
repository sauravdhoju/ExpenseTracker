import { Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCurrency } from '../../hooks/useCurrency';
import { useAppStore } from '../../store/useAppStore';
import { formatPlain, MASK } from '../dashboard/money';
import { spacing } from '../../constants/theme';
import { Dot, SheetRow } from '../ui/Sheet';
import type { Transaction } from '../../types';

const TYPE_LABELS: Record<Transaction['type'], string> = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
  lent: 'Lent',
  repayment: 'Repayment',
  forgotten: 'Forgotten money',
};

export function to12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

interface Props {
  transaction: Transaction;
  onDelete?: (id: string) => void;
  /** Last row in its sheet: no divider below. */
  last?: boolean;
  /** Show the category in the subtitle (off when the list is already filtered to one category). */
  showCategory?: boolean;
}

/** One transaction as a sheet row: colour dot, title, time/context, signed amount. Long-press deletes. */
export default function TransactionListItem({ transaction: t, onDelete, last, showCategory = true }: Props) {
  const colors = useThemeColors();
  const { currency, hideBalances } = useCurrency();
  const router = useRouter();
  const categories = useAppStore((s) => s.categories);
  const accounts = useAppStore((s) => s.accounts);

  const category = categories.find((c) => c.id === t.categoryId);
  const account = accounts.find((a) => a.id === t.accountId);
  const toAccount = accounts.find((a) => a.id === t.toAccountId);
  const isLoanLinked = !!t.loanId;
  const isOut = t.type === 'expense' || t.type === 'lent';
  const isIn = t.type === 'income' || t.type === 'repayment';

  const dot = category?.color ?? (isIn ? colors.income : t.type === 'transfer' || isLoanLinked ? colors.primary : colors.textLight);
  const context =
    t.type === 'transfer'
      ? `${account?.name ?? ''} → ${toAccount?.name ?? ''}`
      : [showCategory ? category?.name ?? TYPE_LABELS[t.type] : null, account?.name].filter(Boolean).join(' · ');

  const openDetail = () => {
    if (isLoanLinked) router.push({ pathname: '/loans/[id]', params: { id: t.loanId! } });
    else router.push({ pathname: '/transaction/[id]', params: { id: t.id } });
  };

  const confirmDelete = () => {
    if (!onDelete || isLoanLinked) return;
    Alert.alert('Delete transaction', 'This will reverse its effect on your account balance.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(t.id) },
    ]);
  };

  return (
    <SheetRow last={last} onPress={openDetail} onLongPress={onDelete && !isLoanLinked ? confirmDelete : undefined}>
      <View style={{ marginRight: spacing.md }}>
        <Dot color={dot} />
      </View>
      <View style={{ flex: 1, marginRight: spacing.md }}>
        <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.text }} numberOfLines={1}>
          {t.title || category?.name || TYPE_LABELS[t.type]}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }} numberOfLines={1}>
          {to12h(t.time)}
          {context ? ` · ${context}` : ''}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 14.5,
          fontWeight: '700',
          color: isIn ? colors.income : colors.text,
          fontVariant: ['tabular-nums'],
        }}
      >
        {hideBalances ? MASK : `${isOut ? '−' : isIn ? '+' : ''}${formatPlain(t.amount, currency)}`}
      </Text>
    </SheetRow>
  );
}
