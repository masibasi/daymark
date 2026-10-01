import { useEffect, useRef, type PropsWithChildren } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, View } from 'react-native';
import { useDragStore } from './useTaskDrag';

interface SwipePagerProps { index: number; count: number; onChange: (index: number) => void; minHeight?: number }

// Shows one page at a time (so the page height is just the active content and the main ScrollView stays the only vertical scroller).
// A horizontal swipe changes page; only clearly horizontal gestures are claimed, so vertical scrolling and long-press row drag are untouched.
export function SwipePager({ index, count, onChange, minHeight, children }: PropsWithChildren<SwipePagerProps>) {
  const latest = useRef({ index, count, onChange });
  latest.current = { index, count, onChange };
  const slide = useRef(new Animated.Value(0)).current;
  const previous = useRef(index);

  useEffect(() => {
    if (previous.current === index) return;
    slide.setValue(index > previous.current ? 28 : -28);
    previous.current = index;
    Animated.timing(slide, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [index, slide]);

  const responder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => useDragStore.getState().draggingId === undefined && Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > 2 * Math.abs(gesture.dy),
    onPanResponderTerminationRequest: () => true,
    onPanResponderRelease: (_event, gesture) => {
      const { index: current, count: total, onChange: change } = latest.current;
      if (Math.abs(gesture.dx) < 40) return;
      const next = current + (gesture.dx < 0 ? 1 : -1);
      if (next >= 0 && next < total) change(next);
    },
  })).current;

  return (
    <View {...responder.panHandlers} style={[styles.root, { minHeight }]}>
      <Animated.View style={{ opacity: slide.interpolate({ inputRange: [-28, 0, 28], outputRange: [0.4, 1, 0.4] }), transform: [{ translateX: slide }] }}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...Platform.select({ web: { touchAction: 'pan-y' } as object, default: {} }) },
});
