import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../hooks/useThemeColors';
import { radius, spacing } from '../constants/theme';
import { Sheet, SheetRow } from './ui/Sheet';

interface QuickAddSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function QuickAddSheet({ visible, onClose }: QuickAddSheetProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const OPTIONS = [
    {
      type: 'expense',
      label: 'Expense',
      subtitle: 'Log money spent',
      icon: 'arrow-down-circle' as const,
      color: colors.expense,
    },
    {
      type: 'income',
      label: 'Income',
      subtitle: 'Log money received',
      icon: 'arrow-up-circle' as const,
      color: colors.income,
    },
    {
      type: 'transfer',
      label: 'Transfer',
      subtitle: 'Move money between accounts',
      icon: 'swap-horizontal' as const,
      color: colors.primary,
    },
    {
      type: 'lent',
      label: 'Lent Money',
      subtitle: 'Track money given to someone',
      icon: 'people-circle' as const,
      color: colors.primary,
    },
    {
      type: 'forgotten',
      label: 'Forgotten Money',
      subtitle: "Money you can't place yet",
      icon: 'help-circle' as const,
      color: colors.warning,
    },
  ];

  const handlePick = (type: string) => {
    onClose();
    if (type === 'lent') {
      router.push('/loans/new');
    } else if (type === 'forgotten') {
      router.push('/forgotten/new');
    } else {
      router.push({ pathname: '/transaction/new', params: { type } });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.sm,
            paddingBottom: insets.bottom + spacing.lg,
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              alignSelf: 'center',
              marginBottom: spacing.lg,
            }}
          />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.lg,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Add Transaction</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={10}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: colors.background,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={16} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <Sheet>
            {OPTIONS.map((opt, i) => (
              <SheetRow key={opt.type} last={i === OPTIONS.length - 1} onPress={() => handlePick(opt.type)}>
                <Ionicons name={opt.icon} size={24} color={opt.color} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{opt.label}</Text>
                  <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 1 }}>{opt.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.border} />
              </SheetRow>
            ))}
          </Sheet>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
