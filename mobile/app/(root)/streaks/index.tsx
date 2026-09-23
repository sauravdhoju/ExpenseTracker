import { useMemo, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useDateFormat } from '../../../src/hooks/useDateFormat';
import { useAppStore } from '../../../src/store/useAppStore';
import { getCurrentStreak, getLongestStreak, trackedDatesSet } from '../../../src/services/calculations';
import { addDays, todayISO } from '../../../src/utils/date';
import { getMonthGrid, shiftMonth } from '../../../src/utils/bsDate';
import { spacing, radius } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import Button from '../../../src/components/ui/Button';
import EmptyState from '../../../src/components/ui/EmptyState';
import TransactionListItem from '../../../src/components/transactions/TransactionListItem';

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function StreaksScreen() {
  const colors = useThemeColors();
  const { format: formatDate, dateSystem } = useDateFormat();
  const router = useRouter();

  const dailyTracking = useAppStore((s) => s.dailyTracking);
  const transactions = useAppStore((s) => s.transactions);
  const removeTransaction = useAppStore((s) => s.removeTransaction);
  const settings = useAppStore((s) => s.settings);
  const markTodayTracked = useAppStore((s) => s.markTodayTracked);
  const applyGraceDay = useAppStore((s) => s.applyGraceDay);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isMarking, setIsMarking] = useState(false);
  const [isUsingGrace, setIsUsingGrace] = useState(false);

  const tracked = useMemo(() => trackedDatesSet(dailyTracking), [dailyTracking]);
  const today = todayISO();
  const yesterday = addDays(today, -1);

  const currentStreak = getCurrentStreak(tracked, today);
  const longestStreak = getLongestStreak(tracked);
  const isTodayTracked = tracked.has(today);

  const graceDayEligible =
    settings.graceDayEnabled &&
    !tracked.has(yesterday) &&
    !dailyTracking.some((t) => t.isGraceDay && t.date.slice(0, 7) === today.slice(0, 7));

  const handleMarkComplete = async () => {
    setIsMarking(true);
    try {
      await markTodayTracked();
    } finally {
      setIsMarking(false);
    }
  };

  const handleUseGraceDay = async () => {
    setIsUsingGrace(true);
    try {
      await applyGraceDay();
    } finally {
      setIsUsingGrace(false);
    }
  };

  const monthGrid = useMemo(() => getMonthGrid(calendarMonth, dateSystem), [calendarMonth, dateSystem]);

  const selectedDayTransactions = useMemo(
    () => (selectedDay ? transactions.filter((t) => t.date === selectedDay) : []),
    [transactions, selectedDay]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Streaks</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 130 }}>
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 4 }}>Current Streak</Text>
              <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>🔥 {currentStreak}</Text>
              <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 2 }}>
                {currentStreak === 1 ? 'day' : 'days'}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 4 }}>Best Streak</Text>
              <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>🏆 {longestStreak}</Text>
              <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 2 }}>
                {longestStreak === 1 ? 'day' : 'days'}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
            Today&apos;s Money Check
          </Text>
          {isTodayTracked ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm }}>
              <Ionicons name="checkmark-circle" size={18} color={colors.income} />
              <Text style={{ fontSize: 13.5, color: colors.income, fontWeight: '600' }}>Today&apos;s money is tracked.</Text>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 12.5, color: colors.textLight, marginBottom: spacing.md, marginTop: 2 }}>
                Have you tracked today&apos;s money? Even a day with no spending counts — just mark it complete.
              </Text>
              <Button label="✓ Mark Complete" onPress={handleMarkComplete} loading={isMarking} />
            </>
          )}
        </Card>

        {graceDayEligible && (
          <Card style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Grace Day Available</Text>
            </View>
            <Text style={{ fontSize: 12.5, color: colors.textLight, marginBottom: spacing.md }}>
              Forgot to track yesterday? Use your one grace day this month to keep your streak alive.
            </Text>
            <Button label="Use Grace Day" variant="secondary" onPress={handleUseGraceDay} loading={isUsingGrace} />
          </Card>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, marginBottom: spacing.md }}>
          <TouchableOpacity onPress={() => setCalendarMonth((d) => shiftMonth(d, -1, dateSystem))} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{monthGrid.label}</Text>
          <TouchableOpacity onPress={() => setCalendarMonth((d) => shiftMonth(d, 1, dateSystem))} hitSlop={8}>
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {WEEKDAY_HEADERS.map((d) => (
              <Text
                key={d}
                style={{ width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textLight, marginBottom: spacing.sm }}
              >
                {d}
              </Text>
            ))}
            {monthGrid.cells.map((cell, i) => {
              if (!cell) return <View key={`blank-${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
              const iso = cell.adIso;
              const isTracked = tracked.has(iso);
              const isToday = iso === today;
              const isFuture = iso > today;
              return (
                <TouchableOpacity key={iso} onPress={() => setSelectedDay(iso)} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
                  <View
                    style={{
                      flex: 1,
                      borderRadius: radius.sm,
                      backgroundColor: isTracked ? `${colors.income}26` : 'transparent',
                      borderWidth: isToday ? 1.5 : 0,
                      borderColor: colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: isToday ? '800' : '500', color: isFuture ? colors.textLight : colors.text }}>
                      {cell.dayNumber}
                    </Text>
                    <Text style={{ fontSize: 10, marginTop: 1 }}>
                      {isTracked ? '✓' : isFuture ? '' : '·'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <TouchableOpacity
            onPress={() => updateSettings({ graceDayEnabled: !settings.graceDayEnabled })}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Ionicons name="shield-checkmark-outline" size={19} color={colors.text} style={{ width: 26 }} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={{ fontSize: 15, color: colors.text }}>Grace Day</Text>
              <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
                One free pass per month for a missed day
              </Text>
            </View>
            <Ionicons
              name={settings.graceDayEnabled ? 'toggle' : 'toggle-outline'}
              size={30}
              color={settings.graceDayEnabled ? colors.primary : colors.textLight}
            />
          </TouchableOpacity>
        </Card>
      </ScrollView>

      <Modal visible={!!selectedDay} transparent animationType="slide" onRequestClose={() => setSelectedDay(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, maxHeight: '75%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
                {selectedDay ? formatDate(selectedDay) : ''}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDay(null)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12.5, color: selectedDay && tracked.has(selectedDay) ? colors.income : colors.textLight, marginBottom: spacing.md }}>
              {selectedDay && tracked.has(selectedDay) ? '✓ Tracked' : 'Not tracked'}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedDayTransactions.length === 0 ? (
                <EmptyState icon="receipt-outline" title="No transactions" message="Nothing recorded on this day." />
              ) : (
                selectedDayTransactions.map((t) => (
                  <TransactionListItem key={t.id} transaction={t} onDelete={removeTransaction} />
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
