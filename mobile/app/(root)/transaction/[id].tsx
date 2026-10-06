import { Alert } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAppStore } from '../../../src/store/useAppStore';
import PageLoader from '../../../src/components/ui/PageLoader';
import TransactionForm, { type TransactionFormValues } from '../../../src/components/transactions/TransactionForm';

export default function EditTransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const existing = useAppStore((s) => s.transactions.find((t) => t.id === id));
  const fee = useAppStore((s) => s.transactions.find((t) => t.parentId === id));
  const editTransaction = useAppStore((s) => s.editTransaction);
  const removeTransaction = useAppStore((s) => s.removeTransaction);

  if (!existing) return <PageLoader />;
  // A transfer's service charge is edited together with the transfer it belongs to.
  if (existing.parentId) return <Redirect href={{ pathname: '/transaction/[id]', params: { id: existing.parentId } }} />;

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
      fee: v.type === 'transfer' ? v.fee : undefined,
    });
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete transaction',
      fee
        ? 'This will reverse its effect on your account balances and remove its service charge.'
        : 'This will reverse its effect on your account balance.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeTransaction(existing.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <TransactionForm
      key={existing.id}
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
        fee: fee?.amount,
      }}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
    />
  );
}
