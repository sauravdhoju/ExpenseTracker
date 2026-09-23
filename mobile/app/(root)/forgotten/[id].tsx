import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useDateFormat } from '../../../src/hooks/useDateFormat';
import { useAppStore } from '../../../src/store/useAppStore';
import { getForgottenOutstanding, getForgottenStatus } from '../../../src/services/calculations';
import { spacing, radius } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import Button from '../../../src/components/ui/Button';
import DateField from '../../../src/components/ui/DateField';
import EmptyState from '../../../src/components/ui/EmptyState';

export default function ForgottenEntryDetailScreen() {
  const colors = useThemeColors();
  const { format } = useCurrency();
  const { format: formatDate } = useDateFormat();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const entry = useAppStore((s) => s.forgottenEntries.find((e) => e.id === id));
  const resolutions = useAppStore((s) =>
    s.transactions.filter((t) => t.type === 'expense' && t.forgottenId === id)
  );
  const categories = useAppStore((s) => s.categories.filter((c) => c.kind === 'expense'));
  const addForgottenResolution = useAppStore((s) => s.addForgottenResolution);
  const removeForgottenEntry = useAppStore((s) => s.removeForgottenEntry);

  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(entry?.date ?? '');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!entry) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ padding: spacing.lg }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <Card style={{ margin: spacing.lg }}>
          <EmptyState icon="help-circle-outline" title="Not found" message="This entry may have been deleted." />
        </Card>
      </View>
    );
  }

  const outstanding = getForgottenOutstanding(entry, resolutions);
  const status = getForgottenStatus(entry, resolutions);

  const openResolveModal = () => {
    setAmount('');
    setTitle('');
    setCategoryId(categories[0]?.id ?? null);
    setDate(entry.date);
    setNote('');
    setModalVisible(true);
  };

  const handleResolve = async () => {
    const parsed = parseFloat(amount);
    if (Number.isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
      return;
    }
    if (parsed > outstanding) {
      Alert.alert('Amount too high', `Only ${format(outstanding)} is unresolved.`);
      return;
    }
    if (!categoryId) {
      Alert.alert('Missing category', 'Select a category.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Missing title', 'Enter what this was for.');
      return;
    }
    setIsSaving(true);
    try {
      await addForgottenResolution(entry.id, {
        amount: parsed,
        categoryId,
        title: title.trim(),
        date,
        note: note.trim() || null,
      });
      setModalVisible(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete entry', 'Delete this forgotten money entry and its resolutions?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeForgottenEntry(entry.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Forgotten Money</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={colors.expense} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 130 }}>
        <Card style={{ marginBottom: spacing.lg }}>
          {status === 'resolved' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md }}>
              <Ionicons name="checkmark-circle" size={18} color={colors.income} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.income }}>✓ Fully Resolved</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={{ fontSize: 13, color: colors.textLight }}>Forgotten Amount</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{format(entry.amount)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={{ fontSize: 13, color: colors.textLight }}>Resolved</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.income }}>
              {format(entry.amount - outstanding)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: colors.textLight }}>Remaining</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.expense }}>{format(outstanding)}</Text>
          </View>

          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

          <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 2 }}>
            Actual date {formatDate(entry.date)}
          </Text>
          {entry.note ? <Text style={{ fontSize: 12, color: colors.textLight }}>Note: {entry.note}</Text> : null}

          {status !== 'resolved' && (
            <View style={{ marginTop: spacing.md }}>
              <Button label={status === 'partial' ? 'Continue Resolving' : 'Resolve'} onPress={openResolveModal} />
            </View>
          )}
        </Card>

        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>
          Where did this money go?
        </Text>
        {resolutions.length === 0 ? (
          <Card>
            <EmptyState icon="cash-outline" title="Not resolved yet" message="Resolved expenses will show up here." />
          </Card>
        ) : (
          resolutions.map((r) => {
            const category = categories.find((c) => c.id === r.categoryId);
            return (
              <Card key={r.id} style={{ marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{r.title}</Text>
                  <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
                    {category?.name ?? 'Category'} · {formatDate(r.date)}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.expense }}>{format(r.amount)}</Text>
              </Card>
            );
          })
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: spacing.xl,
              maxHeight: '85%',
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.lg }}>
                Resolve
              </Text>

              <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Amount</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textLight}
                autoFocus
                style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: colors.text,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  paddingBottom: spacing.sm,
                  marginBottom: spacing.lg,
                }}
              />

              <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>What was it?</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Restaurant, Pathao"
                placeholderTextColor={colors.textLight}
                style={{
                  backgroundColor: colors.background,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  fontSize: 15,
                  color: colors.text,
                  marginBottom: spacing.lg,
                }}
              />

              <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCategoryId(cat.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: radius.full,
                      backgroundColor: categoryId === cat.id ? cat.color : colors.background,
                      marginRight: spacing.sm,
                    }}
                  >
                    <Ionicons name={cat.icon as any} size={14} color={categoryId === cat.id ? '#FFF' : cat.color} />
                    <Text style={{ color: categoryId === cat.id ? '#FFF' : colors.text, fontWeight: '500', fontSize: 12.5 }}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>
                Date (defaults to the original date)
              </Text>
              <View style={{ marginBottom: spacing.lg }}>
                <DateField value={date} onChange={setDate} />
              </View>

              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Note (optional)"
                placeholderTextColor={colors.textLight}
                style={{
                  backgroundColor: colors.background,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  fontSize: 14,
                  color: colors.text,
                  marginBottom: spacing.xl,
                }}
              />

              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
                <Button label="Save" style={{ flex: 1 }} onPress={handleResolve} loading={isSaving} />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
