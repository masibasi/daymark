import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { motion, nativeDriver } from './tokens';
import { useReducedMotion } from './useReducedMotion';

// A 0/1 Animated.Value that eases toward `on` whenever it changes (no animation on mount; instant when motion is reduced).
export function useToggleProgress(on: boolean, duration: number = motion.base, native = false) {
  const value = useRef(new Animated.Value(on ? 1 : 0)).current;
  const first = useRef(true);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    const animation = Animated.timing(value, { toValue: on ? 1 : 0, duration: reduced ? 0 : duration, easing: motion.easeOut, useNativeDriver: native && nativeDriver });
    animation.start();
    return () => animation.stop();
  }, [on]); // eslint-disable-line react-hooks/exhaustive-deps
  return value;
}
