import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useThemeColors } from '../../hooks/useThemeColors';

interface Props {
  /** 0–100+. Values over 100 draw a full ring. */
  percent: number;
  size: number;
  stroke: number;
  color: string;
  trackColor?: string;
  children?: ReactNode;
}

/** Circular progress ring with rounded ends; content is centred inside it. */
export default function Ring({ percent, size, stroke, color, trackColor, children }: Props) {
  const colors = useThemeColors();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(percent, 0), 100);
  const c = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={c} cy={c} r={r} stroke={trackColor ?? colors.border} strokeWidth={stroke} fill="none" />
        {clamped > 0 && (
          <Circle
            cx={c}
            cy={c}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - clamped / 100)}
            transform={`rotate(-90 ${c} ${c})`}
          />
        )}
      </Svg>
      {children}
    </View>
  );
}
