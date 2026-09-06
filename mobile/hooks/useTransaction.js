import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  initDatabase,
  getAllTransactions,
  getSummary,
  insertTransaction,
  removeTransaction,
} from '../db/database';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    balance: 0,
    income: 0,
    expenses: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!initialized.current) {
        await initDatabase();
        initialized.current = true;
      }
      const [txns, sum] = await Promise.all([
        getAllTransactions(),
        getSummary(),
      ]);
      setTransactions(txns);
      setSummary(sum);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load transactions.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTransaction = useCallback(
    async (data) => {
      try {
        await insertTransaction(data);
        await loadData();
        return true;
      } catch (error) {
        console.error('Error creating transaction:', error);
        Alert.alert('Error', 'Failed to save transaction.');
        return false;
      }
    },
    [loadData]
  );

  const deleteTransaction = useCallback(
    async (id) => {
      try {
        await removeTransaction(id);
        await loadData();
      } catch (error) {
        console.error('Error deleting transaction:', error);
        Alert.alert('Error', 'Failed to delete transaction.');
      }
    },
    [loadData]
  );

  return {
    transactions,
    summary,
    isLoading,
    loadData,
    createTransaction,
    deleteTransaction,
  };
};
