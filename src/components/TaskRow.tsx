import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import type { CategoryColorKey } from '../theme/categoryColors';
import { motion, palette, spacing, type as typeScale, weight } from '../theme/tokens';
import { Checkbox } from './Checkbox';

interface TaskRowProps {
  title: string;
  completed: boolean;
  categoryColor: CategoryColorKey;
  onToggle: () => void;
  /** Optional trailing affordance, e.g. a "Today" pill in Project Detail. */
  right?: React.ReactNode;
}

export function TaskRow({ title, completed, categoryColor, onToggle, right }: TaskRowProps) {
  const textStyle = useAnimatedStyle(() => ({
    opacity: withTiming(completed ? 0.55 : 1, { duration: motion.base }),
  }));

  return (
    <View style={styles.row}>
      <Checkbox checked={completed} categoryColor={categoryColor} onToggle={onToggle} />
      <Pressable style={styles.textWrap} onPress={onToggle}>
        <Animated.Text style={[styles.title, textStyle]} numberOfLines={2}>
          {title}
        </Animated.Text>
      </Pressable>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: typeScale.body,
    fontWeight: weight.regular,
    color: palette.ink,
  },
});
