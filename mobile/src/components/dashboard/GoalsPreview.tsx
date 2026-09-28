import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCurrency } from '../../hooks/useCurrency';
import { useAppStore } from '../../store/useAppStore';
import { getGoalProgress } from '../../services/calculations';
import { spacing } from '../../constants/theme';
import ProgressBar from '../ui/ProgressBar';
import SectionCard from './SectionCard';

export default function GoalsPreview() {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const router = useRouter();
  const goals = useAppStore((s) => s.goals);

  return (
    <SectionCard
      title="Goals"
      linkLabel={goals.length === 0 ? 'Create' : 'See all'}
      onLinkPress={() => router.push(goals.length === 0 ? '/goals/new' : '/goals')}
    >
      {goals.length === 0 ? (
        <Text style={{ fontSize: 13, color: colors.textLight }}>Save towards something - create your first goal.</Text>
      ) : (
        goals.slice(0, 3).map((goal, i) => {
          const progress = getGoalProgress(goal);
          return (
            <View key={goal.id} style={{ flexDirection: 'row', alignItems: 'center', marginTop: i === 0 ? 0 : spacing.lg }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: goal.color, marginRight: spacing.md }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }} numberOfLines={1}>
                    {goal.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textLight }}>
                    {format(goal.currentAmount)} · {progress.percent.toFixed(0)}%
                  </Text>
                </View>
                <ProgressBar percent={progress.percent} color={goal.color} height={4} />
              </View>
            </View>
          );
        })
      )}
    </SectionCard>
  );
}
