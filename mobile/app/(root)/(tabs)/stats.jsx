import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTransactions } from '../../../hooks/useTransaction.js';
import PageLoader from '../../../components/PageLoader.jsx';
import { styles } from '../../../assets/styles/stats.styles.js';
import { COLORS } from '../../../constants/colors.js';
import { getCategoryColor, getCategoryIcon } from '../../../constants/categories.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function StatsPage() {
  const { transactions, isLoading, loadData } = useTransactions();
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadData();
  }, [loadData]);

  const monthTransactions = useMemo(() => {
    const key = monthKey(selectedDate);
    return transactions.filter((t) => t.created_at?.slice(0, 7) === key);
  }, [transactions, selectedDate]);

  const { income, expenses, net } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    monthTransactions.forEach((t) => {
      const amount = parseFloat(t.amount);
      if (amount > 0) income += amount;
      else expenses += Math.abs(amount);
    });
    return { income, expenses, net: income - expenses };
  }, [monthTransactions]);

  const categoryBreakdown = useMemo(() => {
    const totals = {};
    monthTransactions.forEach((t) => {
      const amount = parseFloat(t.amount);
      if (amount >= 0) return;
      totals[t.category] = (totals[t.category] || 0) + Math.abs(amount);
    });
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const max = entries.length ? entries[0][1] : 0;
    const total = entries.reduce((sum, [, v]) => sum + v, 0);
    return entries.map(([category, amount]) => ({
      category,
      amount,
      barWidth: max ? (amount / max) * 100 : 0,
      percent: total ? (amount / total) * 100 : 0,
    }));
  }, [monthTransactions]);

  const goToPrevMonth = () => {
    setSelectedDate(
      (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setSelectedDate(
      (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)
    );
  };

  if (isLoading) return <PageLoader />;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Statistics</Text>

        <View style={styles.monthSelector}>
          <TouchableOpacity style={styles.monthArrow} onPress={goToPrevMonth}>
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </Text>
          <TouchableOpacity style={styles.monthArrow} onPress={goToNextMonth}>
            <Ionicons name="chevron-forward" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryAmount, { color: COLORS.income }]}>
              ${income.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={[styles.summaryAmount, { color: COLORS.expense }]}>
              ${expenses.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Net</Text>
            <Text
              style={[
                styles.summaryAmount,
                { color: net >= 0 ? COLORS.income : COLORS.expense },
              ]}
            >
              ${net.toFixed(2)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Spending by Category</Text>

        {categoryBreakdown.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="pie-chart-outline"
              size={48}
              color={COLORS.textLight}
              style={styles.emptyStateIcon}
            />
            <Text style={styles.emptyStateText}>
              No expenses recorded for this month yet.
            </Text>
          </View>
        ) : (
          <View style={styles.breakdownCard}>
            {categoryBreakdown.map((entry, index) => (
              <View
                key={entry.category}
                style={[
                  styles.categoryRow,
                  index === categoryBreakdown.length - 1 &&
                    styles.categoryRowLast,
                ]}
              >
                <View style={styles.categoryRowTop}>
                  <View
                    style={[
                      styles.categoryIconDot,
                      { backgroundColor: getCategoryColor(entry.category) + '22' },
                    ]}
                  >
                    <Ionicons
                      name={getCategoryIcon(entry.category)}
                      size={14}
                      color={getCategoryColor(entry.category)}
                    />
                  </View>
                  <Text style={styles.categoryRowName}>{entry.category}</Text>
                  <Text style={styles.categoryRowAmount}>
                    ${entry.amount.toFixed(2)}
                  </Text>
                  <Text style={styles.categoryRowPercent}>
                    {entry.percent.toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${entry.barWidth}%`,
                        backgroundColor: getCategoryColor(entry.category),
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
