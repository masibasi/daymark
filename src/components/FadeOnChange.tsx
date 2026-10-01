import { useEffect, useRef, type PropsWithChildren } from 'react';
import { Animated } from 'react-native';
import { motion, nativeDriver } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/useReducedMotion';

// Content softly crossfades (dip to 0.3 and back, ~200 ms) whenever `token` changes, e.g. the selected day.
export function FadeOnChange({ token, children }: PropsWithChildren<{ token: string }>) {
  const opacity = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    opacity.setValue(reduced ? 0.7 : 0.3);
    const animation = Animated.timing(opacity, { toValue: 1, duration: motion.crossfade, easing: motion.easeOut, useNativeDriver: nativeDriver });
    animation.start();
    return () => animation.stop();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}
