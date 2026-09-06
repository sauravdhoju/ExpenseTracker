import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing } from '../../constants/theme';
import Card from '../ui/Card';
import type { Insight } from '../../services/insightService';

export default function InsightCard({ insights }: { insights: Insight[] }) {
  const colors = useThemeColors();
  if (insights.length === 0) return null;

  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
        <Ionicons name="bulb" size={18} color={colors.warning} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Insights</Text>
      </View>
      {insights.map((insight) => (
        <Text key={insight.id} style={{ fontSize: 13.5, color: colors.textLight, lineHeight: 19, marginBottom: spacing.xs }}>
          • {insight.text}
        </Text>
      ))}
    </Card>
  );
}
