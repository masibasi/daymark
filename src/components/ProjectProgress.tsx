import { StyleSheet, View } from 'react-native';
import { palette } from '../theme/tokens';

interface ProjectProgressProps {
  fraction: number;
  color: string;
  height?: number;
}

export function ProjectProgress({ fraction, color, height = 5 }: ProjectProgressProps) {
  const clamped = Math.max(0, Math.min(1, fraction));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped * 100}%`,
            height,
            borderRadius: height / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: palette.hairline,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {},
});
