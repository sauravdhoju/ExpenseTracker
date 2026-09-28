import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useCurrency } from '../../../src/hooks/useCurrency';
import { useDateFormat } from '../../../src/hooks/useDateFormat';
import { useAppStore } from '../../../src/store/useAppStore';
import { filterByRange } from '../../../src/services/calculations';
import { activityHref, ranges } from '../../../src/utils/links';
import { spacing, radius } from '../../../src/constants/theme';
import Segmented from '../../../src/components/ui/Segmented';
import { SectionTitle, Sheet, SheetRow } from '../../../src/components/ui/Sheet';
import type { Category, CategoryKind } from '../../../src/types';

const PALETTE = [
  '#FF7043', '#F59E0B', '#FFCA28', '#66BB6A', '#26A69A', '#42A5F5',
  '#5C6BC0', '#AB47BC', '#EC407A', '#8D6E63', '#78909C', '#0EA5E9',
];
const ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'pricetag', 'fast-food', 'restaurant', 'cafe', 'beer', 'cart', 'basket', 'shirt',
  'car', 'bus', 'bicycle', 'airplane', 'home', 'flash', 'water', 'wifi',
  'phone-portrait', 'receipt', 'medkit', 'fitness', 'school', 'book', 'film', 'game-controller',
  'musical-notes', 'paw', 'gift', 'heart', 'person', 'people', 'briefcase', 'cash',
  'card', 'trending-up', 'business', 'construct',
];

function CategoryIcon({ icon, color, size = 38 }: { icon: string; color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + '1A',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={size * 0.45} color={color} />
    </View>
  );
}

export default function CategoriesScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { format } = useCurrency();
  const { dateSystem, formatMonthYear } = useDateFormat();
  const categories = useAppStore((s) => s.categories);
  const transactions = useAppStore((s) => s.transactions);
  const setCategoryEnabled = useAppStore((s) => s.setCategoryEnabled);
  const removeCategory = useAppStore((s) => s.removeCategory);
  const addCategory = useAppStore((s) => s.addCategory);

  const [kind, setKind] = useState<CategoryKind>('expense');
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [icon, setIcon] = useState<keyof typeof Ionicons.glyphMap>(ICONS[0]);

  const now = useMemo(() => new Date(), []);
  const monthRange = useMemo(() => ranges.month(now, dateSystem), [now, dateSystem]);

  // This month's total and count per category — the same figures Activity shows when a row is tapped.
  const usage = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    for (const t of filterByRange(transactions, monthRange)) {
      if (!t.categoryId || t.type !== kind) continue;
      const u = map.get(t.categoryId) ?? { amount: 0, count: 0 };
      u.amount += t.amount;
      u.count += 1;
      map.set(t.categoryId, u);
    }
    return map;
  }, [transactions, monthRange, kind]);

  const ofKind = categories.filter((c) => c.kind === kind);
  const byUsage = (a: Category, b: Category) =>
    (usage.get(b.id)?.amount ?? 0) - (usage.get(a.id)?.amount ?? 0) || a.name.localeCompare(b.name);
  const visible = ofKind.filter((c) => c.isEnabled).sort(byUsage);
  const hidden = ofKind.filter((c) => !c.isEnabled).sort(byUsage);

  const openNew = () => {
    setName('');
    setColor(PALETTE[0]);
    setIcon(ICONS[0]);
    setModalVisible(true);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Enter a category name.');
      return;
    }
    await addCategory({ name: name.trim(), kind, icon, color });
    setModalVisible(false);
  };

  const handleLongPress = (cat: Category) => {
    if (cat.isDefault) {
      Alert.alert(cat.name, 'Built-in categories can’t be deleted, but you can hide them with the switch.');
      return;
    }
    Alert.alert('Delete category', `Delete "${cat.name}"? Past transactions keep their amounts but lose this category.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeCategory(cat.id) },
    ]);
  };

  const renderList = (list: Category[]) => (
    <Sheet>
      {list.map((cat, i) => {
        const u = usage.get(cat.id);
        return (
          <SheetRow
            key={cat.id}
            last={i === list.length - 1}
            onPress={() => router.push(activityHref({ range: monthRange, type: kind, categoryId: cat.id }))}
            onLongPress={() => handleLongPress(cat)}
          >
            <View style={{ opacity: cat.isEnabled ? 1 : 0.5 }}>
              <CategoryIcon icon={cat.icon} color={cat.color} />
            </View>
            <View style={{ flex: 1, marginHorizontal: spacing.md }}>
              <Text style={{ fontSize: 14.5, fontWeight: '600', color: cat.isEnabled ? colors.text : colors.textLight }} numberOfLines={1}>
                {cat.name}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }} numberOfLines={1}>
                {u ? `${format(u.amount)} · ${u.count} ${u.count === 1 ? 'entry' : 'entries'}` : 'Nothing this month'}
              </Text>
            </View>
            <Switch
              value={cat.isEnabled}
              onValueChange={(on) => setCategoryEnabled(cat.id, on)}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
          </SheetRow>
        );
      })}
    </Sheet>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={10}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="arrow-back" size={19} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Categories</Text>
        <TouchableOpacity onPress={openNew} hitSlop={10}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primaryDeep }}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Segmented
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
          ]}
          value={kind}
          onChange={setKind}
        />

        <SectionTitle title={`Shown in forms · ${formatMonthYear(now)}`} />
        {visible.length > 0 ? (
          renderList(visible)
        ) : (
          <Text style={{ fontSize: 14, color: colors.textLight }}>No visible categories — turn one on below.</Text>
        )}

        {hidden.length > 0 && (
          <>
            <SectionTitle title="Hidden" />
            {renderList(hidden)}
          </>
        )}

        <Text style={{ fontSize: 12, color: colors.textLight, textAlign: 'center', marginTop: spacing.lg }}>
          Tap to see this month’s entries · long-press to delete
        </Text>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setModalVisible(false)}>
          <Pressable
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
              maxHeight: '90%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
                New {kind} category
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Live preview + name */}
              <Sheet style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md }}>
                <CategoryIcon icon={icon} color={color} size={44} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Category name"
                  placeholderTextColor={colors.textLight}
                  autoFocus
                  style={{ flex: 1, marginLeft: spacing.md, fontSize: 16, fontWeight: '600', color: colors.text, paddingVertical: 8 }}
                />
              </Sheet>

              <SectionTitle title="Colour" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {PALETTE.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setColor(c)}
                    accessibilityLabel={`Colour ${c}`}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: c,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {color === c && <Ionicons name="checkmark" size={18} color={colors.white} />}
                  </TouchableOpacity>
                ))}
              </View>

              <SectionTitle title="Icon" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
                {ICONS.map((i) => {
                  const active = icon === i;
                  return (
                    <TouchableOpacity key={i} onPress={() => setIcon(i)} style={{ width: `${100 / 6}%`, alignItems: 'center', paddingVertical: 5 }}>
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 21,
                          backgroundColor: active ? color : colors.card,
                          borderWidth: active ? 0 : 1,
                          borderColor: colors.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name={i} size={18} color={active ? colors.white : colors.text} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={handleCreate}
              style={{
                marginTop: spacing.lg,
                backgroundColor: name.trim() ? colors.text : colors.border,
                borderRadius: radius.md,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: name.trim() ? colors.card : colors.textLight, fontWeight: '700', fontSize: 15 }}>
                Create category
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
