import { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store/useAppStore';
import { addDays, todayISO } from '../../utils/date';
import { spacing } from '../../constants/theme';
import type { CategoryKind } from '../../types';

const COLLAPSED_COUNT = 7; // 7 categories + the "More" cell = two tidy rows of four
const USAGE_WINDOW_DAYS = 90;
const CELL = 48;

interface Props {
  kind: CategoryKind;
  value: string | null;
  onChange: (id: string) => void;
  onManage: () => void;
}

/** Four-column icon grid, most-used categories first. Only enabled categories are offered. */
export default function CategoryGrid({ kind, value, onChange, onManage }: Props) {
  const colors = useThemeColors();
  const categories = useAppStore((s) => s.categories);
  const transactions = useAppStore((s) => s.transactions);
  const [expanded, setExpanded] = useState(false);

  const ordered = useMemo(() => {
    const since = addDays(todayISO(), -USAGE_WINDOW_DAYS);
    const usage = new Map<string, number>();
    for (const t of transactions) {
      if (t.categoryId && t.date >= since) usage.set(t.categoryId, (usage.get(t.categoryId) ?? 0) + 1);
    }
    return categories
      .filter((c) => c.kind === kind && (c.isEnabled || c.id === value))
      .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0));
  }, [categories, transactions, kind, value]);

  // Keep the selected category visible even when the grid is collapsed.
  let shown = expanded ? ordered : ordered.slice(0, COLLAPSED_COUNT);
  if (!expanded && value && !shown.some((c) => c.id === value)) {
    const selected = ordered.find((c) => c.id === value);
    if (selected) shown = [...shown.slice(0, COLLAPSED_COUNT - 1), selected];
  }
  const hasMore = ordered.length > COLLAPSED_COUNT;

  const cell = (key: string, content: React.ReactNode, label: string, onPress: () => void, active = false) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={{ width: '25%', alignItems: 'center', paddingVertical: spacing.sm }}
    >
      {content}
      <Text
        numberOfLines={1}
        style={{
          fontSize: 11.5,
          marginTop: 6,
          paddingHorizontal: 2,
          fontWeight: active ? '700' : '500',
          color: active ? colors.text : colors.textLight,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs }}>
      {shown.map((c) => {
        const active = c.id === value;
        return cell(
          c.id,
          <View
            style={{
              width: CELL,
              height: CELL,
              borderRadius: CELL / 2,
              backgroundColor: active ? c.color : c.color + '1A',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={c.icon as keyof typeof Ionicons.glyphMap} size={21} color={active ? colors.white : c.color} />
          </View>,
          c.name,
          () => onChange(c.id),
          active
        );
      })}

      {hasMore &&
        cell(
          'more',
          <View
            style={{
              width: CELL,
              height: CELL,
              borderRadius: CELL / 2,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={expanded ? 'chevron-up' : 'ellipsis-horizontal'} size={20} color={colors.textLight} />
          </View>,
          expanded ? 'Less' : `+${ordered.length - COLLAPSED_COUNT} more`,
          () => setExpanded((e) => !e)
        )}

      {(expanded || !hasMore) &&
        cell(
          'manage',
          <View
            style={{
              width: CELL,
              height: CELL,
              borderRadius: CELL / 2,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="add" size={22} color={colors.textLight} />
          </View>,
          'New',
          onManage
        )}
    </View>
  );
}
