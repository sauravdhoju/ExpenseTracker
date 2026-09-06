import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useAppStore } from '../../../src/store/useAppStore';
import { spacing, radius } from '../../../src/constants/theme';
import Button from '../../../src/components/ui/Button';
import DateField from '../../../src/components/ui/DateField';
import { todayISO } from '../../../src/utils/date';

const PALETTE = ['#2E7D32', '#42A5F5', '#AB47BC', '#FFA726', '#EC407A', '#26A69A'];
const ICONS: (keyof typeof Ionicons.glyphMap)[] = ['shield-checkmark', 'laptop', 'airplane', 'home', 'car', 'school', 'gift', 'flag'];

export default function NewGoalScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const addGoal = useAppStore((s) => s.addGoal);

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [hasTargetDate, setHasTargetDate] = useState(false);
  const [targetDate, setTargetDate] = useState(todayISO());
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(PALETTE[0]);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const target = parseFloat(targetAmount);
    if (!name.trim() || Number.isNaN(target) || target <= 0) {
      Alert.alert('Missing info', 'Enter a goal name and a target amount greater than 0.');
      return;
    }
    const current = currentAmount.trim() === '' ? 0 : parseFloat(currentAmount);
    setIsSaving(true);
    try {
      await addGoal({
        name: name.trim(),
        targetAmount: target,
        currentAmount: Number.isNaN(current) ? 0 : current,
        targetDate: hasTargetDate ? targetDate : null,
        icon,
        color,
      });
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>New Goal</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Goal Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Emergency Fund"
          placeholderTextColor={colors.textLight}
          style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text, marginBottom: spacing.lg }}
        />

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Target Amount</Text>
        <TextInput
          value={targetAmount}
          onChangeText={setTargetAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textLight}
          style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text, marginBottom: spacing.lg }}
        />

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Current Amount (optional)</Text>
        <TextInput
          value={currentAmount}
          onChangeText={setCurrentAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textLight}
          style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text, marginBottom: spacing.lg }}
        />

        <TouchableOpacity
          onPress={() => setHasTargetDate((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: hasTargetDate ? spacing.md : spacing.lg }}
        >
          <Text style={{ fontSize: 14, color: colors.text }}>Set a target date</Text>
          <Ionicons name={hasTargetDate ? 'checkbox' : 'square-outline'} size={20} color={hasTargetDate ? colors.primary : colors.textLight} />
        </TouchableOpacity>
        {hasTargetDate && (
          <View style={{ marginBottom: spacing.lg }}>
            <DateField value={targetDate} onChange={setTargetDate} />
          </View>
        )}

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Icon</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
          {ICONS.map((i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setIcon(i)}
              style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: icon === i ? color : colors.card }}
            >
              <Ionicons name={i} size={18} color={icon === i ? '#FFF' : colors.text} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Color</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
          {PALETTE.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setColor(c)}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: colors.text }}
            />
          ))}
        </View>

        <Button label="Create Goal" onPress={handleSave} loading={isSaving} />
      </ScrollView>
    </View>
  );
}
