import { useEffect, useRef, type PropsWithChildren } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, View } from 'react-native';
import { motion, nativeDriver } from '@/theme/tokens';
import { isReducedMotion } from '@/theme/useReducedMotion';
import { useDragStore } from './useTaskDrag';

interface SwipePagerProps { index: number; count: number; onChange: (index: number) => void; minHeight?: number }

const FOLLOW = 0.8;
const EDGE_RESIST = 0.22;
const REACH = 140;
const ENTER = 44;

// Shows one page at a time (so the page height is just the active content and the main ScrollView stays the only vertical scroller).
// The page follows the finger during a horizontal swipe, then slides out and the next one eases in; tapping the segment slides too.
// Only clearly horizontal gestures are claimed, so vertical scrolling and long-press row drag are untouched.
export function SwipePager({ index, count, onChange, minHeight, children }: PropsWithChildren<SwipePagerProps>) {
  const latest = useRef({ index, count, onChange });
  latest.current = { index, count, onChange };
  const slide = useRef(new Animated.Value(0)).current;
  const previous = useRef(index);

  useEffect(() => {
    if (previous.current === index) return;
    const from = index > previous.current ? ENTER : -ENTER;
    previous.current = index;
    if (isReducedMotion()) { slide.setValue(0); return; }
    slide.setValue(from);
    Animated.timing(slide, { toValue: 0, duration: motion.page, easing: motion.easeOut, useNativeDriver: nativeDriver }).start();
  }, [index, slide]);

  const settle = () => Animated.timing(slide, { toValue: 0, duration: motion.base, easing: motion.easeOut, useNativeDriver: nativeDriver }).start();

  const responder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => useDragStore.getState().draggingId === undefined && Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > 2 * Math.abs(gesture.dy),
    onPanResponderTerminationRequest: () => true,
    onPanResponderMove: (_event, gesture) => {
      if (isReducedMotion()) return;
      const { index: current, count: total } = latest.current;
      const next = current + (gesture.dx < 0 ? 1 : -1);
      slide.setValue(gesture.dx * (next >= 0 && next < total ? FOLLOW : EDGE_RESIST));
    },
    onPanResponderTerminate: settle,
    onPanResponderRelease: (_event, gesture) => {
      const { index: current, count: total, onChange: change } = latest.current;
      const next = current + (gesture.dx < 0 ? 1 : -1);
      if (Math.abs(gesture.dx) < 40 || next < 0 || next >= total) { settle(); return; }
      if (isReducedMotion()) { change(next); return; }
      Animated.timing(slide, { toValue: gesture.dx < 0 ? -REACH : REACH, duration: motion.quick, easing: motion.easeOut, useNativeDriver: nativeDriver }).start(() => change(next));
    },
  })).current;

  return (
    <View {...responder.panHandlers} style={[styles.root, { minHeight }]}>
      <Animated.View style={{ opacity: slide.interpolate({ inputRange: [-REACH, 0, REACH], outputRange: [0.15, 1, 0.15], extrapolate: 'clamp' }), transform: [{ translateX: slide }] }}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...Platform.select({ web: { touchAction: 'pan-y' } as object, default: {} }) },
});
