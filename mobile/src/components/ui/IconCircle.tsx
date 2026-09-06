import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IconCircleProps {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size?: number;
  iconSize?: number;
}

export default function IconCircle({ name, color, size = 40, iconSize = 18 }: IconCircleProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + '22',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Ionicons name={name} size={iconSize} color={color} />
    </View>
  );
}
