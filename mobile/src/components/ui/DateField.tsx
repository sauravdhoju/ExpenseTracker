import { useMemo, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useDateFormat } from '../../hooks/useDateFormat';
import { spacing, radius } from '../../constants/theme';
import { todayISO } from '../../utils/date';
import { getMonthGrid, shiftMonth } from '../../utils/bsDate';

interface DateFieldProps {
  value: string; // ISO date
  onChange: (value: string) => void;
}

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function DateField({ value, onChange }: DateFieldProps) {
  const colors = useThemeColors();
  const { format, dateSystem } = useDateFormat();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => new Date(value + 'T00:00:00'));

  const openPicker = () => {
    setViewMonth(new Date(value + 'T00:00:00'));
    setOpen(true);
  };

  // The grid itself follows the calendar system (true BS month lengths/weekdays in
  // BS mode) — same picker logic already used by the Reports calendar tab.
  const grid = useMemo(() => getMonthGrid(viewMonth, dateSystem), [viewMonth, dateSystem]);
  const today = todayISO();

  const selectDay = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={openPicker}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.background,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 2,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text }}>{format(value)}</Text>
        <Ionicons name="calendar-outline" size={18} color={colors.textLight} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <TouchableOpacity onPress={() => setViewMonth((d) => shiftMonth(d, -1, dateSystem))} hitSlop={8}>
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{grid.label}</Text>
              <TouchableOpacity onPress={() => setViewMonth((d) => shiftMonth(d, 1, dateSystem))} hitSlop={8}>
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {WEEKDAY_HEADERS.map((d) => (
                <Text
                  key={d}
                  style={{ width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textLight, marginBottom: spacing.sm }}
                >
                  {d}
                </Text>
              ))}
              {grid.cells.map((cell, i) => {
                if (!cell) return <View key={`blank-${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
                const isSelected = cell.adIso === value;
                const isToday = cell.adIso === today;
                return (
                  <TouchableOpacity
                    key={cell.adIso}
                    onPress={() => selectDay(cell.adIso)}
                    style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}
                  >
                    <View
                      style={{
                        flex: 1,
                        borderRadius: radius.sm,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                        borderWidth: isToday && !isSelected ? 1.5 : 0,
                        borderColor: colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: isSelected || isToday ? '800' : '500',
                          color: isSelected ? colors.white : colors.text,
                        }}
                      >
                        {cell.dayNumber}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity onPress={() => selectDay(today)} style={{ alignSelf: 'center', marginTop: spacing.md }}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Today</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
