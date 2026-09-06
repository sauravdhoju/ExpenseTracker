import { useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useAppStore } from '../../../src/store/useAppStore';
import { spacing, radius } from '../../../src/constants/theme';
import Card from '../../../src/components/ui/Card';
import Button from '../../../src/components/ui/Button';
import IconCircle from '../../../src/components/ui/IconCircle';
import type { CategoryKind } from '../../../src/types';

const PALETTE = ['#FF7043', '#42A5F5', '#AB47BC', '#26A69A', '#FFCA28', '#EC407A', '#5C6BC0', '#66BB6A', '#78909C', '#8D6E63'];
const ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'pricetag', 'fast-food', 'car', 'cart', 'receipt', 'film', 'medkit', 'school', 'airplane', 'person', 'cash', 'gift',
];

export default function CategoriesScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const categories = useAppStore((s) => s.categories);
  const setCategoryEnabled = useAppStore((s) => s.setCategoryEnabled);
  const removeCategory = useAppStore((s) => s.removeCategory);
  const addCategory = useAppStore((s) => s.addCategory);

  const [modalVisible, setModalVisible] = useState(false);
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [icon, setIcon] = useState(ICONS[0]);

  const expenseCategories = categories.filter((c) => c.kind === 'expense');
  const incomeCategories = categories.filter((c) => c.kind === 'income');

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Enter a category name.');
      return;
    }
    await addCategory({ name: name.trim(), kind, icon, color });
    setName('');
    setModalVisible(false);
  };

  const renderRow = (cat: (typeof categories)[number]) => (
    <TouchableOpacity
      key={cat.id}
      onLongPress={() =>
        !cat.isDefault &&
        Alert.alert('Delete category', `Delete "${cat.name}"?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => removeCategory(cat.id) },
        ])
      }
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm + 2 }}
    >
      <IconCircle name={cat.icon as any} color={cat.color} />
      <Text style={{ flex: 1, fontSize: 14.5, color: colors.text, marginLeft: spacing.md }}>{cat.name}</Text>
      <TouchableOpacity onPress={() => setCategoryEnabled(cat.id, !cat.isEnabled)} hitSlop={8}>
        <Ionicons
          name={cat.isEnabled ? 'toggle' : 'toggle-outline'}
          size={30}
          color={cat.isEnabled ? colors.primary : colors.textLight}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>Categories</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 100 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textLight, marginBottom: spacing.sm, textTransform: 'uppercase' }}>
          Expense
        </Text>
        <Card style={{ marginBottom: spacing.lg }}>{expenseCategories.map(renderRow)}</Card>

        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textLight, marginBottom: spacing.sm, textTransform: 'uppercase' }}>
          Income
        </Text>
        <Card>{incomeCategories.map(renderRow)}</Card>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.lg }}>New Category</Text>

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
              {(['expense', 'income'] as CategoryKind[]).map((k) => (
                <TouchableOpacity
                  key={k}
                  onPress={() => setKind(k)}
                  style={{ flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, alignItems: 'center', backgroundColor: kind === k ? colors.primary : colors.background }}
                >
                  <Text style={{ color: kind === k ? colors.white : colors.text, fontWeight: '600', textTransform: 'capitalize' }}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Category name"
              placeholderTextColor={colors.textLight}
              style={{ backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text, marginBottom: spacing.lg }}
            />

            <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Icon</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
              {ICONS.map((i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setIcon(i)}
                  style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: icon === i ? color : colors.background }}
                >
                  <Ionicons name={i} size={18} color={icon === i ? '#FFF' : colors.text} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: spacing.sm }}>Color</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl }}>
              {PALETTE.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setColor(c)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: c,
                    borderWidth: color === c ? 3 : 0,
                    borderColor: colors.text,
                  }}
                />
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
              <Button label="Create" style={{ flex: 1 }} onPress={handleCreate} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
