import { Text, View } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';

export interface BarGroup {
  label: string;
  bars: { value: number; color: string }[];
}

interface BarChartProps {
  data: BarGroup[];
  height?: number;
}

export default function BarChart({ data, height = 140 }: BarChartProps) {
  const colors = useThemeColors();
  const max = Math.max(1, ...data.flatMap((g) => g.bars.map((b) => b.value)));

  return (
    <View style={{ flexDirection: 'row', height: height + 24, alignItems: 'flex-end', gap: 12 }}>
      {data.map((group, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 3 }}>
            {group.bars.map((bar, j) => (
              <View
                key={j}
                style={{
                  width: 10,
                  borderRadius: 4,
                  backgroundColor: bar.color,
                  height: Math.max(3, (bar.value / max) * height),
                }}
              />
            ))}
          </View>
          <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 6 }}>{group.label}</Text>
        </View>
      ))}
    </View>
  );
}
