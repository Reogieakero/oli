import { StyleSheet, View } from 'react-native';

const GRID = [
  '111111101111111',
  '100000101000001',
  '101110101011101',
  '101110111011101',
  '101110101011101',
  '100000111000001',
  '111111101111111',
  '101010101010101',
  '111111101010101',
  '100000111011011',
  '101110100011101',
  '101110111110010',
  '101110100101001',
  '100000111101101',
  '111111100110011',
];

interface Props {
  size?: number;
  color?: string;
}

export default function QRIcon({ size = 48, color = '#FFFFFF' }: Props) {
  const cell = size / GRID[0].length;
  return (
    <View style={{ width: size, height: size, gap: 0 }}>
      {GRID.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 0 }}>
          {row.split('').map((ch, c) =>
            ch === '1' ? (
              <View
                key={c}
                style={{
                  width: cell,
                  height: cell,
                  backgroundColor: color,
                }}
              />
            ) : (
              <View key={c} style={{ width: cell, height: cell }} />
            )
          )}
        </View>
      ))}
    </View>
  );
}
