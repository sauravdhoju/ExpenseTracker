import type { ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing } from '../../constants/theme';

interface HeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: HeaderAction[];
  rightContent?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions, rightContent }: PageHeaderProps) {
  const colors = useThemeColors();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
      }}
    >
      <View style={{ flex: 1, marginRight: spacing.md }}>
        <Text
          style={{ fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.4 }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 13, color: colors.textLight, marginTop: 2 }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightContent ? (
        rightContent
      ) : actions && actions.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              onPress={action.onPress}
              hitSlop={8}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: colors.card,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={action.icon} size={19} color={colors.text} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}
