import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppStore } from '../../../src/store/useAppStore';
import PageLoader from '../../../src/components/ui/PageLoader';
import TransactionForm, { type TransactionFormValues } from '../../../src/components/transactions/TransactionForm';

export default function EditTransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const existing = useAppStore((s) => s.transactions.find((t) => t.id === id));
  const editTransaction = useAppStore((s) => s.editTransaction);
  const removeTransaction = useAppStore((s) => s.removeTransaction);

  if (!existing) return <PageLoader />;

  const handleSubmit = async (v: TransactionFormValues) => {
    await editTransaction(existing.id, {
      type: v.type,
      amount: v.amount,
      accountId: v.accountId,
      toAccountId: v.toAccountId,
      categoryId: v.categoryId,
      title: v.title,
      notes: v.notes,
      date: v.date,
    });
    router.back();
  };

  const handleDelete = () => {
    Alert.alert('Delete transaction', 'This will reverse its effect on your account balance.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeTransaction(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <TransactionForm
      mode="edit"
      initial={{
        type: existing.type,
        amount: existing.amount,
        accountId: existing.accountId,
        toAccountId: existing.toAccountId,
        categoryId: existing.categoryId,
        title: existing.title,
        notes: existing.notes,
        date: existing.date,
      }}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
    />
  );
}
