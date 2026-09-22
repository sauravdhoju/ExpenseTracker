import { Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useAppStore } from '../../../src/store/useAppStore';
import { getLoanOutstanding, getLoanStatus, getLoanSummary } from '../../../src/services/calculations';
import { formatFriendlyDate } from '../../../src/utils/date';
import { spacing } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import EmptyState from '../../../src/components/ui/EmptyState';
import IconCircle from '../../../src/components/ui/IconCircle';

const STATUS_LABEL: Record<string, string> = {
  outstanding: 'Outstanding',
  partial: 'Partially paid',
  repaid: 'Fully Repaid',
};

export default function LoansScreen() {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const router = useRouter();
  const loans = useAppStore((s) => s.loans);
  const repayments = useAppStore((s) => s.repayments);

  const summary = getLoanSummary(loans, repayments);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Lent Money</Text>
        <TouchableOpacity onPress={() => router.push('/loans/new')}>
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 130 }}>
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.xs }}>Total Lent</Text>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: spacing.md }}>
            {format(summary.totalLent)}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 12, color: colors.textLight }}>Outstanding</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.expense }}>
                {format(summary.outstanding)}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: colors.textLight }}>Recovered</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.income }}>
                {format(summary.recovered)}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: colors.textLight }}>People</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{summary.peopleOwing}</Text>
            </View>
          </View>
        </Card>

        {loans.length === 0 ? (
          <Card>
            <EmptyState
              icon="people-outline"
              title="No money lent yet"
              message="Track money you've given to friends or family."
              actionLabel="Add Lent Money"
              onAction={() => router.push('/loans/new')}
            />
          </Card>
        ) : (
          loans.map((loan) => {
            const outstanding = getLoanOutstanding(loan, repayments);
            const status = getLoanStatus(loan, repayments);
            return (
              <TouchableOpacity
                key={loan.id}
                onPress={() => router.push({ pathname: '/loans/[id]', params: { id: loan.id } })}
              >
                <Card style={{ marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center' }}>
                  <IconCircle name="person-outline" color={colors.primary} size={44} />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{loan.personName}</Text>
                    <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
                      {status === 'repaid'
                        ? `Paid ${format(loan.originalAmount)}`
                        : `${STATUS_LABEL[status]}${loan.expectedReturnDate ? ` · Due ${formatFriendlyDate(loan.expectedReturnDate)}` : ''}`}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                      {format(loan.originalAmount)}
                    </Text>
                    {status === 'repaid' ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 3,
                          marginTop: 2,
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={12} color={colors.income} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.income }}>Repaid</Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 12, color: colors.expense, marginTop: 2 }}>
                        {format(outstanding)} left
                      </Text>
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
