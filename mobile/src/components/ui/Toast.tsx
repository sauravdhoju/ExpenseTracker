import { useEffect, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../hooks/useThemeColors';
import { radius, spacing } from '../../constants/theme';

type Listener = (message: string) => void;

let listener: Listener | null = null;

export function showToast(message: string) {
  listener?.(message);
}

export default function ToastHost() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listener = (msg: string) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setMessage(msg);
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
          setMessage(null)
        );
      }, 2000);
    };
    return () => {
      listener = null;
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [opacity]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        bottom: insets.bottom + 90,
        opacity,
        alignItems: 'center',
      }}
    >
      <Animated.View
        style={{
          backgroundColor: colors.text,
          paddingVertical: 12,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.full,
          maxWidth: '100%',
        }}
      >
        <Text style={{ color: colors.background, fontSize: 13.5, fontWeight: '600' }} numberOfLines={2}>
          {message}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}
