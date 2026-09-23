import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing } from '../constants/theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

interface PinEntryProps {
  length?: number;
  title: string;
  subtitle?: string;
  error?: string | null;
  onComplete: (pin: string) => void;
  /** Bump this to force the entered digits to clear (e.g. after a failed attempt). */
  resetSignal?: number;
}

export default function PinEntry({ length = 4, title, subtitle, error, onComplete, resetSignal }: PinEntryProps) {
  const colors = useThemeColors();
  const [digits, setDigits] = useState('');
  // Adjust state during render (React's recommended pattern) instead of an
  // effect, so a parent-triggered reset (e.g. after a failed attempt) clears
  // the digits in the same render pass rather than causing an extra one.
  const [lastResetSignal, setLastResetSignal] = useState(resetSignal);
  if (resetSignal !== lastResetSignal) {
    setLastResetSignal(resetSignal);
    setDigits('');
  }

  const press = (d: string) => {
    if (digits.length >= length) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === length) {
      onComplete(next);
      setTimeout(() => setDigits(''), 250);
    }
  };

  const backspace = () => setDigits((d) => d.slice(0, -1));

  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4, textAlign: 'center' }}>{title}</Text>
      {subtitle ? (
        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.md, textAlign: 'center' }}>{subtitle}</Text>
      ) : null}
      <Text style={{ fontSize: 13, color: colors.expense, marginBottom: spacing.sm, minHeight: 18 }}>{error ?? ''}</Text>

      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl }}>
        {Array.from({ length }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: i < digits.length ? colors.primary : 'transparent',
              borderWidth: 1.5,
              borderColor: colors.primary,
            }}
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 240, justifyContent: 'center' }}>
        {KEYS.map((k, i) =>
          k === '' ? (
            <View key={i} style={{ width: 72, height: 72 }} />
          ) : (
            <TouchableOpacity
              key={i}
              onPress={() => (k === '⌫' ? backspace() : press(k))}
              style={{ width: 72, height: 72, alignItems: 'center', justifyContent: 'center' }}
              hitSlop={4}
            >
              {k === '⌫' ? (
                <Ionicons name="backspace-outline" size={22} color={colors.text} />
              ) : (
                <Text style={{ fontSize: 24, fontWeight: '600', color: colors.text }}>{k}</Text>
              )}
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );
}
