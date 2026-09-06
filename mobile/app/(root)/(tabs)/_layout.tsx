import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { radius } from '../../../src/constants/theme';
import QuickAddSheet from '../../../src/components/QuickAddSheet';

export default function TabsLayout() {
  const colors = useThemeColors();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textLight,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: 'Transactions',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'list' : 'list-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="budgets"
          options={{
            title: 'Budgets',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'pie-chart' : 'pie-chart-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'menu' : 'menu-outline'} size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
        onPress={() => setShowAdd(true)}
        style={{
          position: 'absolute',
          bottom: 74,
          alignSelf: 'center',
          width: 56,
          height: 56,
          borderRadius: radius.full,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      <QuickAddSheet visible={showAdd} onClose={() => setShowAdd(false)} />
    </View>
  );
}
