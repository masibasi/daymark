import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { categoryColors, type CategoryColorKey } from '../theme/categoryColors';
import { motion, palette } from '../theme/tokens';

interface CheckboxProps {
  checked: boolean;
  categoryColor: CategoryColorKey;
  onToggle: () => void;
  size?: number;
}

export function Checkbox({ checked, categoryColor, onToggle, size = 22 }: CheckboxProps) {
  const scale = useSharedValue(1);
  const colors = categoryColors[categoryColor];

  useEffect(() => {
    if (checked) {
      scale.value = withSequence(
        withTiming(1.15, { duration: motion.fast / 2 }),
        withTiming(1, { duration: motion.fast / 2 })
      );
    }
  }, [checked, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={8}
      onPress={onToggle}
    >
      <Animated.View
        style={[
          styles.box,
          animatedStyle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: checked ? colors.solid : palette.hairline,
            backgroundColor: checked ? colors.solid : 'transparent',
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
  },
});
