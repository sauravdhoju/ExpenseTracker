import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCurrency } from '../../hooks/useCurrency';
import { useAppStore } from '../../store/useAppStore';
import { getGoalProgress } from '../../services/calculations';
import { spacing } from '../../constants/theme';
import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';
import IconCircle from '../ui/IconCircle';

export default function GoalsPreview() {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const router = useRouter();
  const goals = useAppStore((s) => s.goals);

  if (goals.length === 0) return null;

  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <TouchableOpacity
        onPress={() => router.push('/goals')}
        style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Financial Goals</Text>
        <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>View all</Text>
      </TouchableOpacity>

      {goals.slice(0, 3).map((goal) => {
        const progress = getGoalProgress(goal);
        return (
          <View key={goal.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
            <IconCircle name={goal.icon as any} color={goal.color} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{goal.name}</Text>
                <Text style={{ fontSize: 12, color: colors.textLight }}>{progress.percent.toFixed(0)}%</Text>
              </View>
              <ProgressBar percent={progress.percent} color={goal.color} height={6} />
              <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 4 }}>
                {format(goal.currentAmount)} / {format(goal.targetAmount)}
              </Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}
