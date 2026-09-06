import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { radius } from '../../constants/theme';

interface ProgressBarProps {
  percent: number; // 0-100+
  color?: string;
  height?: number;
  trackColor?: string;
}

export default function ProgressBar({ percent, color, height = 8, trackColor }: ProgressBarProps) {
  const colors = useThemeColors();
  const clamped = Math.min(Math.max(percent, 0), 100);
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [clamped, anim]);

  const barColor =
    color ?? (percent >= 100 ? colors.expense : percent >= 90 ? colors.expense : percent >= 70 ? colors.warning : colors.primary);

  return (
    <View
      style={{
        height,
        borderRadius: radius.full,
        backgroundColor: trackColor ?? colors.border,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          height: '100%',
          borderRadius: radius.full,
          backgroundColor: barColor,
          width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}
