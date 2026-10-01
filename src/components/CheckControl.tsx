import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { motion, nativeDriver, onSolid, radius } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/useReducedMotion';
import { useToggleProgress } from '@/theme/useToggleProgress';

// The task check circle: on complete it settles with a gentle spring, fills with the list colour and the tick eases in; uncomplete reverses.
export function CheckControl({ checked, color }: { checked: boolean; color: string }) {
  const progress = useToggleProgress(checked, motion.quick + 60, true);
  const pop = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduced) return;
    pop.setValue(checked ? 0.86 : 1.06);
    Animated.spring(pop, { toValue: 1, friction: 8, tension: 220, useNativeDriver: nativeDriver }).start();
  }, [checked]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={[styles.check, { borderColor: color, transform: [{ scale: pop }] }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color, opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]} />
      <Animated.View style={{ opacity: progress.interpolate({ inputRange: [0.3, 1], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale: progress.interpolate({ inputRange: [0.3, 1], outputRange: [0.5, 1], extrapolate: 'clamp' }) }] }}>
        <Ionicons name="checkmark" size={14} color={onSolid(color)} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  check: { width: 22, height: 22, borderRadius: radius.round, borderWidth: 1.7, alignItems: 'center', justifyContent: 'center' },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.round },
});
