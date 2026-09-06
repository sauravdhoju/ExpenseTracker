import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useAppStore } from '../../../src/store/useAppStore';
import { scheduleBillReminder } from '../../../src/services/notificationService';
import { spacing, radius } from '../../../src/constants/theme';
import Button from '../../../src/components/ui/Button';
import DateField from '../../../src/components/ui/DateField';
import { todayISO } from '../../../src/utils/date';

export default function NewBillScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const addBill = useAppStore((s) => s.addBill);
  const notificationsEnabled = useAppStore((s) => s.settings.notificationsEnabled);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(todayISO());
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (!title.trim() || Number.isNaN(parsed) || parsed <= 0) {
      Alert.alert('Missing info', 'Enter a title and amount.');
      return;
    }
    setIsSaving(true);
    try {
      await addBill({ title: title.trim(), amount: parsed, dueDate });
      if (notificationsEnabled) {
        await scheduleBillReminder('manual-' + Date.now(), title.trim(), amount, new Date(dueDate + 'T00:00:00'));
      }
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
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>New Bill</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Internet, Rent, Insurance"
          placeholderTextColor={colors.textLight}
          style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text, marginBottom: spacing.lg }}
        />

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Amount</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textLight}
          style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text, marginBottom: spacing.lg }}
        />

        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Due Date</Text>
        <View style={{ marginBottom: spacing.xl }}>
          <DateField value={dueDate} onChange={setDueDate} />
        </View>

        <Button label="Add Bill" onPress={handleSave} loading={isSaving} />
      </ScrollView>
    </View>
  );
}
