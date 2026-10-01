import { useRef, useState, type Ref } from 'react';
import { Animated, Pressable, type PressableProps, type View } from 'react-native';
import { motion, nativeDriver } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/useReducedMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = PressableProps & { ref?: Ref<View>; scaleTo?: number };

// Pressable with the app's small, consistent press feedback (scale to 0.97). Layout props in `style` apply to the pressable itself.
export function PressableScale({ style, onPressIn, onPressOut, scaleTo = motion.pressScale, ...rest }: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  const to = (toValue: number) => { if (!reduced) Animated.timing(scale, { toValue, duration: motion.press, easing: motion.easeOut, useNativeDriver: nativeDriver }).start(); };
  const resolved = typeof style === 'function' ? style({ pressed }) : style;
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(event) => { setPressed(true); to(scaleTo); onPressIn?.(event); }}
      onPressOut={(event) => { setPressed(false); to(1); onPressOut?.(event); }}
      style={[resolved, { transform: [{ scale }] }]}
    />
  );
}
