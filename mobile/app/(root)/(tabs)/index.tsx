import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useDateFormat } from '../../../src/hooks/useDateFormat';
import { useAppStore } from '../../../src/store/useAppStore';
import { filterByMonth, getForgottenSummary } from '../../../src/services/calculations';
import { generateInsights } from '../../../src/services/insightService';
import { shiftMonth } from '../../../src/utils/bsDate';
import { DASHBOARD_WIDGET_MAP } from '../../../src/constants/dashboardWidgets';
import { radius, spacing } from '../../../src/constants/theme';
import DashboardHeader from '../../../src/components/dashboard/DashboardHeader';
import TodaySpendCard from '../../../src/components/dashboard/TodaySpendCard';
import WhereItWent from '../../../src/components/dashboard/WhereItWent';
import TodayActivity from '../../../src/components/dashboard/TodayActivity';
import QuickAddRow from '../../../src/components/dashboard/QuickAddRow';
import GoalsPreview from '../../../src/components/dashboard/GoalsPreview';
import InsightCard from '../../../src/components/dashboard/InsightCard';
import { Sheet, SectionTitle } from '../../../src/components/dashboard/SectionCard';
import {
  BalanceRow,
  BillRow,
  BudgetRow,
  MonthRow,
  OwedRow,
  StreakRow,
  WeekRow,
} from '../../../src/components/dashboard/GlanceRows';
import CustomizeDashboardSheet from '../../../src/components/dashboard/CustomizeDashboardSheet';
import type { DashboardWidgetId } from '../../../src/types';

function AlertBanner({ icon, text, onPress }: { icon: keyof typeof Ionicons.glyphMap; text: string; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.warning + '1A',
        borderRadius: radius.md,
        paddingVertical: 11,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm,
      }}
    >
      <Ionicons name={icon} size={17} color={colors.warning} />
      <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>
        {text}
      </Text>
      <Ionicons name="chevron-forward" size={15} color={colors.textLight} />
    </TouchableOpacity>
  );
}

// Re-reads the clock whenever the screen regains focus or the app returns to the
// foreground, so "today" rolls over correctly if the app is left open past midnight.
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  const refresh = useCallback(() => {
    setNow((prev) => {
      const next = new Date();
      return Math.floor(prev.getTime() / 60000) === Math.floor(next.getTime() / 60000) ? prev : next;
    });
  }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);
  return now;
}

type Block = { kind: 'section'; id: DashboardWidgetId } | { kind: 'glance'; ids: DashboardWidgetId[] };

// All "glance" items share one list, placed where the first of them appears in the user's order.
function toBlocks(ids: DashboardWidgetId[]): Block[] {
  const blocks: Block[] = [];
  let glance: { kind: 'glance'; ids: DashboardWidgetId[] } | null = null;
  for (const id of ids) {
    const meta = DASHBOARD_WIDGET_MAP.get(id);
    if (!meta) continue;
    if (meta.kind === 'section') {
      blocks.push({ kind: 'section', id });
    } else if (glance) {
      glance.ids.push(id);
    } else {
      glance = { kind: 'glance', ids: [id] };
      blocks.push(glance);
    }
  }
  return blocks;
}

export default function DashboardScreen() {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const { dateSystem } = useDateFormat();
  const router = useRouter();
  const now = useNow();

  const widgetIds = useAppStore((s) => s.settings.homeSections);
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const budgets = useAppStore((s) => s.budgets);
  const forgottenEntries = useAppStore((s) => s.forgottenEntries);
  const pendingReviewCount = useAppStore((s) => s.pendingDetections.length);

  const [customizing, setCustomizing] = useState(false);

  const needsInsights = widgetIds.includes('insights');
  const insights = useMemo(() => {
    if (!needsInsights) return [];
    return generateInsights(
      filterByMonth(transactions, now, dateSystem),
      filterByMonth(transactions, shiftMonth(now, -1, dateSystem), dateSystem),
      categories,
      budgets
    );
  }, [needsInsights, transactions, now, dateSystem, categories, budgets]);

  const forgottenSummary = useMemo(
    () => getForgottenSummary(forgottenEntries, transactions),
    [forgottenEntries, transactions]
  );

  const blocks = useMemo(() => toBlocks(widgetIds), [widgetIds]);

  const renderSection = (id: DashboardWidgetId): ReactNode => {
    switch (id) {
      case 'todayActivity':
        return <TodayActivity now={now} />;
      case 'quickAdd':
        return <QuickAddRow />;
      case 'goals':
        return <GoalsPreview />;
      case 'insights':
        return <InsightCard insights={insights} />;
      default:
        return null;
    }
  };

  const renderGlance = (id: DashboardWidgetId, last: boolean): ReactNode => {
    switch (id) {
      case 'budget':
        return <BudgetRow now={now} last={last} />;
      case 'week':
        return <WeekRow now={now} last={last} />;
      case 'month':
        return <MonthRow now={now} last={last} />;
      case 'bills':
        return <BillRow now={now} last={last} />;
      case 'streak':
        return <StreakRow now={now} last={last} />;
      case 'owed':
        return <OwedRow now={now} last={last} />;
      case 'balance':
        return <BalanceRow now={now} last={last} />;
      default:
        return null;
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 130 }}
      showsVerticalScrollIndicator={false}
    >
      <DashboardHeader
        now={now}
        actions={[
          { icon: 'search-outline', label: 'Search', onPress: () => router.push('/search') },
          { icon: 'settings-outline', label: 'Settings', onPress: () => router.push('/more') },
        ]}
      />

      {pendingReviewCount > 0 && (
        <AlertBanner
          icon="file-tray-full-outline"
          text={`${pendingReviewCount} detected transaction${pendingReviewCount === 1 ? '' : 's'} to review`}
          onPress={() => router.push('/automation/review')}
        />
      )}
      {forgottenSummary.unresolvedCount > 0 && (
        <AlertBanner
          icon="help-circle-outline"
          text={`${format(forgottenSummary.outstanding)} unexplained · ${forgottenSummary.unresolvedCount} ${forgottenSummary.unresolvedCount === 1 ? 'entry' : 'entries'}`}
          onPress={() => router.push('/forgotten')}
        />
      )}
      {(pendingReviewCount > 0 || forgottenSummary.unresolvedCount > 0) && <View style={{ height: spacing.sm }} />}

      <TodaySpendCard now={now} />
      <WhereItWent now={now} />

      {blocks.map((block) =>
        block.kind === 'section' ? (
          <View key={block.id}>{renderSection(block.id)}</View>
        ) : (
          <View key="glance">
            <SectionTitle title="At a glance" />
            <Sheet>
              {block.ids.map((id, i) => (
                <View key={id}>{renderGlance(id, i === block.ids.length - 1)}</View>
              ))}
            </Sheet>
          </View>
        )
      )}

      <TouchableOpacity onPress={() => setCustomizing(true)} hitSlop={8} style={{ alignSelf: 'center', marginTop: spacing.xxl, padding: spacing.sm }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textLight }}>Edit home screen</Text>
      </TouchableOpacity>

      {customizing && <CustomizeDashboardSheet onClose={() => setCustomizing(false)} />}
    </ScrollView>
  );
}
