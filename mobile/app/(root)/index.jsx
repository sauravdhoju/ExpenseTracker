import { useEffect } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTransactions } from '../../hooks/useTransaction.js';
import PageLoader from '../../components/PageLoader.jsx';
import BalanceCard from '../../components/BalanceCard.jsx';
import TransactionItem from '../../components/TransactionItem.jsx';
import { styles } from '../../assets/styles/home.styles.js';
import { COLORS } from '../../constants/colors.js';

export default function Page() {
  const router = useRouter();

  const {
    transactions,
    summary,
    isLoading,
    loadData,
    deleteTransaction,
  } = useTransactions();

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) return <PageLoader />;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          {/* Left  */}
          <View style={styles.headerLeft}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>Welcome,</Text>
              <Text style={styles.usernameText}>Guest</Text>
            </View>
          </View>

          {/* Right */}
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/create')}
            >
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
        <BalanceCard summary={summary} />
      </View>

      <View style={[styles.transactionsHeaderContainer, { marginHorizontal: 20 }]}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
      </View>

      <FlatList
        style={styles.transactionsList}
        contentContainerStyle={styles.transactionsListContent}
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TransactionItem item={item} onDelete={deleteTransaction} />
        )}
        refreshing={isLoading}
        onRefresh={loadData}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="receipt-outline"
              size={48}
              color={COLORS.textLight}
              style={styles.emptyStateIcon}
            />
            <Text style={styles.emptyStateTitle}>No transactions yet</Text>
            <Text style={styles.emptyStateText}>
              Start tracking your expenses by adding your first transaction.
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => router.push('/create')}
            >
              <Ionicons name="add-circle" size={18} color={COLORS.white} />
              <Text style={styles.emptyStateButtonText}>Add Transaction</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}
