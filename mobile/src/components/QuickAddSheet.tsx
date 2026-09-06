import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../hooks/useThemeColors';
import { radius, spacing } from '../constants/theme';

interface QuickAddSheetProps {
  visible: boolean;
  onClose: () => void;
}

const OPTIONS = [
  { type: 'expense', label: 'Expense', icon: 'arrow-down-circle' as const },
  { type: 'income', label: 'Income', icon: 'arrow-up-circle' as const },
  { type: 'transfer', label: 'Transfer', icon: 'swap-horizontal' as const },
];

export default function QuickAddSheet({ visible, onClose }: QuickAddSheetProps) {
  const colors = useThemeColors();
  const router = useRouter();

  const handlePick = (type: string) => {
    onClose();
    router.push({ pathname: '/transaction/new', params: { type } });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            padding: spacing.xl,
            paddingBottom: spacing.xxl,
            gap: spacing.md,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.sm }}>
            Add
          </Text>
          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.type}
              accessibilityRole="button"
              onPress={() => handlePick(opt.type)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.md,
                backgroundColor: colors.background,
              }}
            >
              <Ionicons name={opt.icon} size={22} color={colors.primary} />
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}
