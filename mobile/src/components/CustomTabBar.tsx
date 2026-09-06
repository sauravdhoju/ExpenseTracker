import { useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../hooks/useThemeColors';
import { radius, spacing } from '../constants/theme';
import QuickAddSheet from './QuickAddSheet';

const ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  index: { active: 'home', inactive: 'home-outline' },
  transactions: { active: 'list', inactive: 'list-outline' },
  budgets: { active: 'pie-chart', inactive: 'pie-chart-outline' },
  reports: { active: 'stats-chart', inactive: 'stats-chart-outline' },
};

const FAB_WIDTH = 56;

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [showAdd, setShowAdd] = useState(false);

  const renderTab = (route: (typeof state.routes)[number]) => {
    const { options } = descriptors[route.key];
    const isFocused = state.routes[state.index].key === route.key;
    const icons = ICONS[route.name] ?? ICONS.index;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.title ?? route.name}
        onPress={onPress}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 6 }}
      >
        <Ionicons
          name={isFocused ? icons.active : icons.inactive}
          size={22}
          color={isFocused ? colors.primary : colors.textLight}
        />
        <Text
          numberOfLines={1}
          style={{
            fontSize: 10.5,
            fontWeight: isFocused ? '700' : '500',
            color: isFocused ? colors.primary : colors.textLight,
          }}
        >
          {String(options.title ?? route.name)}
        </Text>
      </TouchableOpacity>
    );
  };

  const midpoint = Math.ceil(state.routes.length / 2);
  const leftRoutes = state.routes.slice(0, midpoint);
  const rightRoutes = state.routes.slice(midpoint);

  return (
    <View
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        bottom: insets.bottom + spacing.sm,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          borderRadius: radius.xl,
          height: 64,
          paddingHorizontal: spacing.xs,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 14,
          elevation: 10,
        }}
      >
        {leftRoutes.map((route) => renderTab(route))}
        <View style={{ width: FAB_WIDTH }} />
        {rightRoutes.map((route) => renderTab(route))}
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
        onPress={() => setShowAdd(true)}
        style={{
          position: 'absolute',
          top: -22,
          left: '50%',
          marginLeft: -(FAB_WIDTH / 2),
          width: FAB_WIDTH,
          height: FAB_WIDTH,
          borderRadius: radius.full,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 8,
          borderWidth: Platform.OS === 'android' ? 0 : 4,
          borderColor: colors.background,
        }}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      <QuickAddSheet visible={showAdd} onClose={() => setShowAdd(false)} />
    </View>
  );
}
