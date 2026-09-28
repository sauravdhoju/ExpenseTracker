import { useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store/useAppStore';
import { DEFAULT_SETTINGS } from '../../database/settingsRepo';
import { DASHBOARD_WIDGETS, DASHBOARD_WIDGET_IDS } from '../../constants/dashboardWidgets';
import { radius, spacing } from '../../constants/theme';
import IconCircle from '../ui/IconCircle';
import type { DashboardWidgetId } from '../../types';

interface Row {
  id: DashboardWidgetId;
  enabled: boolean;
}

// Enabled widgets first (in the user's order), then the disabled ones in catalogue order.
function buildRows(enabledIds: DashboardWidgetId[]): Row[] {
  const enabled = enabledIds.filter((id) => DASHBOARD_WIDGET_IDS.has(id));
  const enabledSet = new Set(enabled);
  return [
    ...enabled.map((id) => ({ id, enabled: true })),
    ...DASHBOARD_WIDGETS.filter((w) => !enabledSet.has(w.id)).map((w) => ({ id: w.id, enabled: false })),
  ];
}

interface Props {
  onClose: () => void;
}

export default function CustomizeDashboardSheet({ onClose }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const homeSections = useAppStore((s) => s.settings.homeSections);
  const updateSettings = useAppStore((s) => s.updateSettings);
  // Seeded once per mount (the parent mounts the sheet only while it's open);
  // while open, `rows` is the source of truth and each change is persisted immediately.
  const [rows, setRows] = useState<Row[]>(() => buildRows(homeSections));

  const commit = (next: Row[]) => {
    setRows(next);
    updateSettings({ homeSections: next.filter((r) => r.enabled).map((r) => r.id) });
  };

  const toggle = (id: DashboardWidgetId) => {
    const target = rows.find((r) => r.id === id);
    if (!target) return;
    const rest = rows.filter((r) => r.id !== id);
    const enabledCount = rest.filter((r) => r.enabled).length;
    // A newly enabled widget joins the end of the enabled group; a disabled one drops below it.
    const updated = { id, enabled: !target.enabled };
    commit([...rest.slice(0, enabledCount), updated, ...rest.slice(enabledCount)]);
  };

  const move = (index: number, delta: number) => {
    const next = [...rows];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    commit(next);
  };

  const enabledCount = rows.filter((r) => r.enabled).length;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingTop: spacing.sm,
            paddingBottom: insets.bottom + spacing.lg,
            maxHeight: '85%',
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              alignSelf: 'center',
              marginBottom: spacing.lg,
            }}
          />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.xl,
              marginBottom: 2,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Edit home screen</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={10}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: colors.background,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 13, color: colors.textLight, paddingHorizontal: spacing.xl, marginBottom: spacing.md }}>
            {'Today\'s spending and "Where it went" always stay. Add anything else you want below them.'}
          </Text>

          <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl }}>
            {rows.map((row, index) => {
              const meta = DASHBOARD_WIDGETS.find((w) => w.id === row.id)!;
              const canMoveUp = row.enabled && index > 0;
              const canMoveDown = row.enabled && index < enabledCount - 1;
              return (
                <View key={row.id}>
                  {index === enabledCount && (
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: colors.textLight,
                        letterSpacing: 0.6,
                        marginTop: spacing.lg,
                        marginBottom: spacing.xs,
                      }}
                    >
                      HIDDEN
                    </Text>
                  )}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: spacing.md,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      opacity: row.enabled ? 1 : 0.7,
                    }}
                  >
                    <IconCircle name={meta.icon} color={row.enabled ? colors.primary : colors.textLight} size={36} iconSize={16} />
                    <View style={{ flex: 1, marginHorizontal: spacing.md }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.text }}>{meta.title}</Text>
                      <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 1 }} numberOfLines={1}>
                        {meta.description}
                      </Text>
                    </View>
                    {row.enabled && (
                      <View style={{ flexDirection: 'row', marginRight: spacing.sm }}>
                        <TouchableOpacity
                          disabled={!canMoveUp}
                          onPress={() => move(index, -1)}
                          hitSlop={4}
                          accessibilityLabel={`Move ${meta.title} up`}
                          style={{ padding: 4, opacity: canMoveUp ? 1 : 0.25 }}
                        >
                          <Ionicons name="chevron-up" size={18} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          disabled={!canMoveDown}
                          onPress={() => move(index, 1)}
                          hitSlop={4}
                          accessibilityLabel={`Move ${meta.title} down`}
                          style={{ padding: 4, opacity: canMoveDown ? 1 : 0.25 }}
                        >
                          <Ionicons name="chevron-down" size={18} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                    )}
                    <Switch
                      value={row.enabled}
                      onValueChange={() => toggle(row.id)}
                      trackColor={{ true: colors.primary, false: colors.border }}
                      thumbColor={colors.white}
                    />
                  </View>
                </View>
              );
            })}

            <TouchableOpacity
              onPress={() => commit(buildRows(DEFAULT_SETTINGS.homeSections))}
              style={{ alignSelf: 'center', paddingVertical: spacing.lg }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.primary }}>Reset to default</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
