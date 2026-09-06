import { View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

interface LineChartProps {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}

export default function LineChart({ values, color, width = 300, height = 100 }: LineChartProps) {
  if (values.length === 0) return <View style={{ width, height }} />;

  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;

  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  const zeroY = height - ((0 - min) / range) * height;

  return (
    <Svg width={width} height={height}>
      <Line x1={0} y1={zeroY} x2={width} y2={zeroY} stroke="#E3EAE5" strokeWidth={1} />
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => {
        const x = i * stepX;
        const y = height - ((v - min) / range) * height;
        return <Circle key={i} cx={x} cy={y} r={3} fill={color} />;
      })}
    </Svg>
  );
}
