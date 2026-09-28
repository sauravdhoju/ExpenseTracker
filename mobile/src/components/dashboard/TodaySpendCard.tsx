import { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useCurrency } from '../../hooks/useCurrency';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useAppStore } from '../../store/useAppStore';
import {
  filterByDay,
  filterByWeek,
  getBudgetEngineSummary,
  getTotalExpenses,
} from '../../services/calculations';
import { addDays, toISODate } from '../../utils/date';
import { activityHref, ranges } from '../../utils/links';
import { brand, radius, spacing } from '../../constants/theme';
import { MASK, formatCompact, splitAmount } from './money';

const USUAL_DAY_WINDOW = 30;
const RING_SIZE = 68;
const RING_STROKE = 6;
const CARD_RADIUS = 16;

const WHITE = '#FFFFFF';
const WHITE_MUTED = 'rgba(255,255,255,0.72)';
const GLASS = 'rgba(255,255,255,0.13)';

function LimitRing({ percent }: { percent: number }) {
  const r = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(percent, 0), 100);
  const over = percent > 100;
  return (
    <View
      style={{
        width: RING_SIZE,
        height: RING_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg
        width={RING_SIZE}
        height={RING_SIZE}
        style={{ position: 'absolute' }}
      >
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={r}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={r}
          stroke={over ? '#FCA5A5' : WHITE}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </Svg>
      <Text style={{ color: WHITE, fontSize: 15, fontWeight: '800' }}>
        {Math.round(percent)}%
      </Text>
      <Text style={{ color: WHITE_MUTED, fontSize: 9 }}>of limit</Text>
    </View>
  );
}

function StripStat({
  label,
  value,
  divider,
  onPress,
}: {
  label: string;
  value: string;
  divider?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      disabled={!onPress}
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        borderLeftWidth: divider ? 1 : 0,
        borderLeftColor: 'rgba(255,255,255,0.14)',
        paddingHorizontal: 4,
      }}
    >
      <Text style={{ color: WHITE_MUTED, fontSize: 11 }}>{label}</Text>
      <Text
        style={{
          color: WHITE,
          fontSize: 13.5,
          fontWeight: '700',
          marginTop: 2,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </TouchableOpacity>
  );
}

export default function TodaySpendCard({ now }: { now: Date }) {
  const { hideBalances, currency } = useCurrency();
  const { dateSystem } = useDateFormat();
  const router = useRouter();
  const transactions = useAppStore((s) => s.transactions);
  const budgets = useAppStore((s) => s.budgets);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const today = useMemo(
    () => filterByDay(transactions, now),
    [transactions, now]
  );
  const spentToday = getTotalExpenses(today);
  const spentThisWeek = useMemo(
    () => getTotalExpenses(filterByWeek(transactions, now)),
    [transactions, now]
  );

  // "Usual day" = average daily spend over the previous 30 days, excluding today.
  const usualDay = useMemo(() => {
    const todayIso = toISODate(now);
    const from = addDays(todayIso, -USUAL_DAY_WINDOW);
    const history = transactions.filter(
      (t) => t.type === 'expense' && t.date >= from && t.date < todayIso
    );
    return history.length === 0
      ? null
      : getTotalExpenses(history) / USUAL_DAY_WINDOW;
  }, [transactions, now]);

  const overall = budgets.find((b) => b.categoryId === null);
  const budget = overall
    ? getBudgetEngineSummary(overall.amount, transactions, now, dateSystem)
    : null;
  const limitPercent = budget
    ? budget.safeToSpendToday > 0
      ? (spentToday / budget.safeToSpendToday) * 100
      : spentToday > 0
        ? 101
        : 0
    : null;

  const money = (n: number) =>
    hideBalances ? '••••' : formatCompact(n, currency);
  const amount = splitAmount(spentToday, currency);

  let comparison: { text: string; good: boolean } | null = null;
  if (spentToday === 0) {
    comparison = { text: 'No spending yet today', good: true };
  } else if (usualDay !== null && usualDay > 0) {
    const diff = ((spentToday - usualDay) / usualDay) * 100;
    comparison =
      Math.abs(diff) < 5
        ? { text: 'Right on your usual day', good: true }
        : {
            text: `${Math.abs(diff).toFixed(0)}% ${diff < 0 ? 'below' : 'above'} your usual day`,
            good: diff < 0,
          };
  }

  return (
    // Two-tone glow in the logo colours: crimson bleeds out bottom-left, blue bottom-right.
    // Shadows live on wrappers without overflow:hidden so they aren't clipped.
    <View
      style={{
        borderRadius: CARD_RADIUS,
        backgroundColor: brand.sky,
        shadowColor: brand.red,
        shadowOffset: { width: -6, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
        elevation: 6,
      }}
    >
      <View
        style={{
          borderRadius: CARD_RADIUS,
          backgroundColor: brand.sky,
          shadowColor: brand.blue,
          shadowOffset: { width: 6, height: 12 },
          shadowOpacity: 0.4,
          shadowRadius: 18,
          elevation: 6,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() =>
            router.push(
              activityHref({ range: ranges.today(now), type: 'expense' })
            )
          }
          onLayout={(e) =>
            setSize({
              width: e.nativeEvent.layout.width,
              height: e.nativeEvent.layout.height,
            })
          }
          style={{
            borderRadius: CARD_RADIUS,
            // Fine glass edge that catches the light instead of a painted border.
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.28)',
            padding: spacing.lg,
            overflow: 'hidden',
            backgroundColor: brand.sky,
          }}
        >
          {size.width > 0 && (
            <Svg
              width={size.width}
              height={size.height}
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              <Defs>
                <LinearGradient id="heroGradient" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={brand.skyDeep} />
                  <Stop offset="0.55" stopColor={brand.sky} />
                  <Stop offset="1" stopColor={brand.skySoft} />
                </LinearGradient>
                {/* Soft crimson tint from the bottom-left corner, echoing the red glow outside. */}
                <RadialGradient id="heroGlow" cx="0.5" cy="0.5" r="0.5">
                  <Stop offset="0" stopColor={brand.red} stopOpacity={0.3} />
                  <Stop offset="1" stopColor={brand.red} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect
                width={size.width}
                height={size.height}
                fill="url(#heroGradient)"
              />
              <Circle
                cx={10}
                cy={size.height + 10}
                r={size.height * 0.85}
                fill="url(#heroGlow)"
              />
              <Circle
                cx={size.width - 40}
                cy={20}
                r={110}
                fill="rgba(255,255,255,0.08)"
              />
            </Svg>
          )}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text
                  style={{
                    color: WHITE_MUTED,
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  Spent today
                </Text>
                <TouchableOpacity
                  hitSlop={12}
                  onPress={() =>
                    updateSettings({ hideBalances: !hideBalances })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={
                    hideBalances ? 'Show amounts' : 'Hide amounts'
                  }
                >
                  <Ionicons
                    name={hideBalances ? 'eye-off-outline' : 'eye-outline'}
                    size={15}
                    color={WHITE_MUTED}
                  />
                </TouchableOpacity>
              </View>
              {hideBalances ? (
                <Text
                  style={{
                    color: WHITE,
                    fontSize: 34,
                    fontWeight: '800',
                  }}
                >
                  {MASK}
                </Text>
              ) : (
                <Text
                  style={{ color: WHITE }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: WHITE_MUTED,
                    }}
                  >
                    {amount.symbol}{' '}
                  </Text>
                  <Text
                    style={{
                      fontSize: 36,
                      fontWeight: '800',
                      letterSpacing: -1.2,
                    }}
                  >
                    {amount.whole}
                  </Text>
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: '700',
                      color: 'rgba(255,255,255,0.55)',
                    }}
                  >
                    {amount.decimal}
                  </Text>
                </Text>
              )}
              {comparison && (
                <View
                  style={{
                    alignSelf: 'flex-start',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 6,
                    paddingVertical: 3,
                    paddingHorizontal: 9,
                    borderRadius: radius.full,
                    backgroundColor: comparison.good
                      ? 'rgba(74,222,128,0.18)'
                      : 'rgba(248,113,113,0.22)',
                  }}
                >
                  {spentToday > 0 && (
                    <Ionicons
                      name={comparison.good ? 'trending-down' : 'trending-up'}
                      size={13}
                      color={comparison.good ? '#BBF7D0' : '#FECACA'}
                    />
                  )}
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: comparison.good ? '#BBF7D0' : '#FECACA',
                    }}
                  >
                    {comparison.text}
                  </Text>
                </View>
              )}
            </View>
            {limitPercent !== null && <LimitRing percent={limitPercent} />}
          </View>

          <View
            style={{
              flexDirection: 'row',
              marginTop: 14,
              backgroundColor: GLASS,
              borderRadius: 10,
              paddingVertical: 8,
            }}
          >
            {budget ? (
              <StripStat
                label={budget.remainingToday < 0 ? 'Over today' : 'Left today'}
                value={money(Math.abs(budget.remainingToday))}
                onPress={() => router.push('/(root)/(tabs)/budgets')}
              />
            ) : (
              <StripStat
                label="Usual day"
                value={usualDay !== null ? money(usualDay) : '—'}
              />
            )}
            <StripStat
              label="Entries"
              value={String(today.length)}
              divider
              onPress={() =>
                router.push(activityHref({ range: ranges.today(now) }))
              }
            />
            <StripStat
              label="This week"
              value={money(spentThisWeek)}
              divider
              onPress={() =>
                router.push(
                  activityHref({ range: ranges.week(now), type: 'expense' })
                )
              }
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
