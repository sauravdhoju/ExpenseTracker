import { Text, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { radius } from '../../constants/theme';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}

/** iOS-style segmented control: one bordered track, the active segment filled white. */
export default function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.border + '80',
        borderRadius: radius.sm + 2,
        padding: 3,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 7,
              borderRadius: radius.sm,
              backgroundColor: active ? colors.card : 'transparent',
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: active ? '700' : '600', color: active ? colors.primary : colors.textLight }}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
