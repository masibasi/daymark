import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from './PressableScale';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';

interface SegmentedControlProps<T extends string> { value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }

export function SegmentedControl<T extends string>({ value, options, onChange }: SegmentedControlProps<T>) {
  return (
    <View style={styles.root}>
      {options.map((option) => (
        <PressableScale key={option.value} accessibilityRole="button" onPress={() => onChange(option.value)} style={[styles.option, value === option.value && styles.active]}>
          <Text style={[styles.label, value === option.value && styles.activeLabel]}>{option.label}</Text>
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', padding: 3, borderRadius: radius.round, backgroundColor: colors.track },
  option: { paddingVertical: 7, paddingHorizontal: space.md, borderRadius: radius.round },
  active: { backgroundColor: colors.paper },
  label: { ...type.meta, color: colors.muted, fontFamily },
  activeLabel: { color: colors.ink },
});

