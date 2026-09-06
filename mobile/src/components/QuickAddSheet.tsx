import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../hooks/useThemeColors';
import { radius, spacing } from '../constants/theme';

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
  ];

  const handlePick = (type: string) => {
    onClose();
    router.push({ pathname: '/transaction/new', params: { type } });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: colors.card,
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

          <View style={{ gap: spacing.sm }}>
            {OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.type}
                accessibilityRole="button"
                activeOpacity={0.7}
                onPress={() => handlePick(opt.type)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.md,
                  borderRadius: radius.lg,
                  backgroundColor: colors.background,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: `${opt.color}1F`,
                  }}
                >
                  <Ionicons name={opt.icon} size={22} color={opt.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15.5, fontWeight: '700', color: colors.text }}>
                    {opt.label}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 1 }}>
                    {opt.subtitle}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
