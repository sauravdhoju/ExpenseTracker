import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, radius } from '../../constants/theme';
import { formatFriendlyDate, toISODate } from '../../utils/date';

interface DateFieldProps {
  value: string; // ISO date
  onChange: (value: string) => void;
}

export default function DateField({ value, onChange }: DateFieldProps) {
  const colors = useThemeColors();

  const shift = (days: number) => {
    const d = new Date(value + 'T00:00:00');
    d.setDate(d.getDate() + days);
    onChange(toISODate(d));
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.background,
        borderRadius: radius.md,
        paddingHorizontal: spacing.sm,
      }}
    >
      <TouchableOpacity onPress={() => shift(-1)} hitSlop={8} style={{ padding: spacing.sm }}>
        <Ionicons name="chevron-back" size={18} color={colors.text} />
      </TouchableOpacity>
      <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text }}>
        {formatFriendlyDate(value)}
      </Text>
      <TouchableOpacity onPress={() => shift(1)} hitSlop={8} style={{ padding: spacing.sm }}>
        <Ionicons name="chevron-forward" size={18} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}
