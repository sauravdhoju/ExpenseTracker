import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCurrency } from '../../hooks/useCurrency';
import { useAppStore } from '../../store/useAppStore';
import { spacing } from '../../constants/theme';
import IconCircle from '../ui/IconCircle';
import type { Transaction } from '../../types';

interface Props {
  transaction: Transaction;
  onDelete: (id: string) => void;
}

export default function TransactionListItem({ transaction, onDelete }: Props) {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const router = useRouter();
  const categories = useAppStore((s) => s.categories);
  const accounts = useAppStore((s) => s.accounts);

  const category = categories.find((c) => c.id === transaction.categoryId);
  const account = accounts.find((a) => a.id === transaction.accountId);
  const toAccount = accounts.find((a) => a.id === transaction.toAccountId);

  const isExpense = transaction.type === 'expense' || transaction.type === 'lent';
  const isTransfer = transaction.type === 'transfer';
  const isLoanLinked = !!transaction.loanId;
  const sign = isTransfer ? '' : isExpense ? '-' : '+';
  const amountColor = isTransfer ? colors.text : isExpense ? colors.expense : colors.income;

  const icon = isTransfer
    ? 'swap-horizontal'
    : transaction.type === 'lent'
      ? 'arrow-up-circle-outline'
      : transaction.type === 'repayment'
        ? 'arrow-down-circle-outline'
        : ((category?.icon as any) ?? 'pricetag');
  const iconColor = isTransfer || isLoanLinked ? colors.primary : (category?.color ?? colors.textLight);

  const subtitle = isTransfer
    ? `${account?.name ?? ''} → ${toAccount?.name ?? ''}`
    : `${transaction.time}${account ? ' · ' + account.name : ''}${category ? ' · ' + category.name : ''}`;

  const confirmDelete = () => {
    Alert.alert('Delete transaction', 'This will reverse its effect on your account balance.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(transaction.id) },
    ]);
  };

  const openDetail = () => {
    if (isLoanLinked) {
      router.push({ pathname: '/loans/[id]', params: { id: transaction.loanId! } });
    } else {
      router.push({ pathname: '/transaction/[id]', params: { id: transaction.id } });
    }
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onLongPress={isLoanLinked ? openDetail : confirmDelete}
      onPress={openDetail}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
      }}
    >
      <IconCircle name={icon} color={iconColor} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text }} numberOfLines={1}>
          {transaction.title}
        </Text>
        <Text style={{ fontSize: 12.5, color: colors.textLight, marginTop: 2 }} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: amountColor }}>
          {sign}
          {format(transaction.amount)}
        </Text>
        {!isLoanLinked && (
          <TouchableOpacity onPress={confirmDelete} hitSlop={8} style={{ marginTop: 4 }}>
            <Ionicons name="trash-outline" size={14} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}
