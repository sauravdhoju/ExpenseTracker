import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppStore } from '../../../src/store/useAppStore';
import TransactionForm, { type TransactionFormValues } from '../../../src/components/transactions/TransactionForm';

// This screen only ever creates expense/income/transfer transactions; 'lent'/'repayment'
// transactions are created via the Lent Money flow so their linked loan stays in sync.
type ManualTransactionType = 'expense' | 'income' | 'transfer';
const MANUAL_TYPES: ManualTransactionType[] = ['expense', 'income', 'transfer'];

export default function NewTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; categoryId?: string; date?: string }>();
  const addTransaction = useAppStore((s) => s.addTransaction);
  const addRecurring = useAppStore((s) => s.addRecurring);

  const type = MANUAL_TYPES.includes(params.type as ManualTransactionType) ? (params.type as ManualTransactionType) : 'expense';

  const handleSubmit = async (v: TransactionFormValues) => {
    if (v.repeat && (v.type === 'expense' || v.type === 'income') && v.categoryId) {
      await addRecurring({
        type: v.type,
        title: v.title,
        amount: v.amount,
        accountId: v.accountId,
        categoryId: v.categoryId,
        frequency: v.repeat,
        startDate: v.date,
      });
    } else {
      await addTransaction({
        type: v.type,
        amount: v.amount,
        accountId: v.accountId,
        toAccountId: v.toAccountId,
        categoryId: v.categoryId,
        title: v.title,
        notes: v.notes,
        date: v.date,
        fee: v.type === 'transfer' ? v.fee : undefined,
      });
    }
    router.back();
  };

  return (
    <TransactionForm
      mode="new"
      initial={{ type, categoryId: params.categoryId ?? null, date: params.date }}
      onSubmit={handleSubmit}
    />
  );
}
