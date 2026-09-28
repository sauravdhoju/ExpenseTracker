import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useDateFormat } from '../../hooks/useDateFormat';
import { formatBsDate } from '../../utils/bsDate';
import { toISODate } from '../../utils/date';
import { spacing } from '../../constants/theme';

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

interface Greeting {
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

function getGreeting(hour: number): Greeting {
  if (hour >= 5 && hour < 12)
    return { text: 'Good Morning', icon: 'sunny', color: '#F59E0B' };
  if (hour >= 12 && hour < 17)
    return { text: 'Good Afternoon', icon: 'partly-sunny', color: '#F97316' };
  if (hour >= 17 && hour < 21)
    return { text: 'Good Evening', icon: 'moon', color: '#8B5CF6' };
  return { text: 'Good night', icon: 'moon', color: '#6366F1' };
}

interface Action {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

interface Props {
  now: Date;
  actions: Action[];
}

export default function DashboardHeader({ now, actions }: Props) {
  const colors = useThemeColors();
  const { dateSystem } = useDateFormat();
  const greeting = getGreeting(now.getHours());

  const dateLabel =
    dateSystem === 'BS'
      ? `${WEEKDAYS[now.getDay()]}, ${formatBsDate(toISODate(now))}`
      : `${WEEKDAYS[now.getDay()]}, ${now.getDate()} ${SHORT_MONTHS[now.getMonth()]}`;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.xs,
        marginBottom: spacing.xl,
      }}
    >
      <View style={{ flex: 1, marginRight: spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: greeting.color + '22',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={greeting.icon} size={12} color={greeting.color} />
          </View>
          <Text
            style={{ fontSize: 13, fontWeight: '600', color: colors.textLight }}
            numberOfLines={1}
          >
            {dateLabel}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 26,
            fontWeight: '800',
            color: colors.text,
            letterSpacing: -0.6,
            marginTop: 4,
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {greeting.text}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            onPress={action.onPress}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={action.icon} size={19} color={colors.text} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
