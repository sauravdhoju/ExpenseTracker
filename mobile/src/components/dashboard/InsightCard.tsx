import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing } from '../../constants/theme';
import SectionCard from './SectionCard';
import type { Insight } from '../../services/insightService';

export default function InsightCard({ insights }: { insights: Insight[] }) {
  const colors = useThemeColors();

  return (
    <SectionCard title="Insights">
      {insights.length === 0 ? (
        <Text style={{ fontSize: 13, color: colors.textLight }}>Keep tracking - insights appear as your history grows.</Text>
      ) : (
        insights.map((insight) => (
          <View key={insight.id} style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
            <Ionicons name="bulb-outline" size={15} color={colors.warning} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 13.5, color: colors.text, lineHeight: 19 }}>{insight.text}</Text>
          </View>
        ))
      )}
    </SectionCard>
  );
}
