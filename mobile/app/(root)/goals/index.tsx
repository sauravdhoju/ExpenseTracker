import { useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useAppStore } from '../../../src/store/useAppStore';
import { getGoalProgress } from '../../../src/services/calculations';
import { spacing, radius } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import ProgressBar from '../../../src/components/ui/ProgressBar';
import EmptyState from '../../../src/components/ui/EmptyState';
import IconCircle from '../../../src/components/ui/IconCircle';
import Button from '../../../src/components/ui/Button';

export default function GoalsScreen() {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const router = useRouter();
  const goals = useAppStore((s) => s.goals);
  const removeGoal = useAppStore((s) => s.removeGoal);
  const contributeToGoal = useAppStore((s) => s.contributeToGoal);

  const [contributeId, setContributeId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');

  const handleContribute = async () => {
    const amount = parseFloat(contributeAmount);
    if (Number.isNaN(amount) || amount <= 0 || !contributeId) {
      Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
      return;
    }
    await contributeToGoal(contributeId, amount);
    setContributeId(null);
    setContributeAmount('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Financial Goals</Text>
        <TouchableOpacity onPress={() => router.push('/goals/new')}>
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 100 }}>
        {goals.length === 0 ? (
          <Card>
            <EmptyState
              icon="flag-outline"
              title="No financial goals yet"
              message="Create a goal and start saving."
              actionLabel="Create Goal"
              onAction={() => router.push('/goals/new')}
            />
          </Card>
        ) : (
          goals.map((goal) => {
            const progress = getGoalProgress(goal);
            return (
              <Card key={goal.id} style={{ marginBottom: spacing.md }}>
                <TouchableOpacity
                  onLongPress={() =>
                    Alert.alert('Delete goal', `Delete "${goal.name}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => removeGoal(goal.id) },
                    ])
                  }
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                    <IconCircle name={goal.icon as any} color={goal.color} size={44} />
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{goal.name}</Text>
                      <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
                        {progress.percent.toFixed(0)}% complete
                      </Text>
                    </View>
                  </View>
                  <ProgressBar percent={progress.percent} color={goal.color} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
                    <Text style={{ fontSize: 13, color: colors.textLight }}>
                      {format(goal.currentAmount)} / {format(goal.targetAmount)}
                    </Text>
                    {progress.requiredMonthlyContribution !== null && (
                      <Text style={{ fontSize: 12, color: colors.textLight }}>
                        {format(progress.requiredMonthlyContribution)}/mo needed
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setContributeId(goal.id)}
                  style={{ marginTop: spacing.md, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <Ionicons name="add-circle" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>Add contribution</Text>
                </TouchableOpacity>
              </Card>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!contributeId} transparent animationType="fade" onRequestClose={() => setContributeId(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl }}>
          <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.lg }}>Add Contribution</Text>
            <TextInput
              value={contributeAmount}
              onChangeText={setContributeAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textLight}
              autoFocus
              style={{ fontSize: 24, fontWeight: '700', color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm, marginBottom: spacing.lg }}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setContributeId(null)} />
              <Button label="Add" style={{ flex: 1 }} onPress={handleContribute} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
