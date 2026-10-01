import { useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { categoryPalette, colors, motion, radius, type CategoryColorKey } from '@/theme/tokens';
import { isReducedMotion } from '@/theme/useReducedMotion';
import { dragY, useDragRow, useDragStore } from './useTaskDrag';

interface DragRowProps { taskId: string; categoryId: string; colorKey: CategoryColorKey }

// Wraps a task row on Today: long-press to lift (spring to 1.02 with a soft shadow), follows the pointer, neighbours slide to open a gap
// at the insertion point, a thin line marks the drop spot, and the row settles back with a spring on release.
export function DragRow({ taskId, categoryId, colorKey, children }: PropsWithChildren<DragRowProps>) {
  const { controller, panHandlers } = useDragRow(taskId, categoryId);
  const dragging = useDragStore((state) => state.draggingId === taskId);
  const before = useDragStore((state) => state.target?.beforeId === taskId);
  const after = useDragStore((state) => state.target?.afterId === taskId);
  const shift = useDragStore((state) => state.shifts[taskId] ?? 0);
  const dragHeight = useDragStore((state) => state.dragHeight);
  const lineColor = { backgroundColor: categoryPalette[useDragStore((state) => state.target?.colorKey ?? colorKey)].solid };
  const lift = useRef(new Animated.Value(0)).current;
  const offset = useRef(new Animated.Value(0)).current;
  const [raised, setRaised] = useState(false);
  const [shifted, setShifted] = useState(false);
  const shiftPx = shift * dragHeight;

  useEffect(() => {
    if (dragging) {
      setRaised(true);
      if (isReducedMotion()) { lift.setValue(1); return undefined; }
      const spring = Animated.spring(lift, { toValue: 1, ...motion.spring, useNativeDriver: false });
      spring.start();
      return () => spring.stop();
    }
    if (!raised) return undefined;
    if (isReducedMotion()) { lift.setValue(0); setRaised(false); return undefined; }
    const spring = Animated.spring(lift, { toValue: 0, ...motion.spring, useNativeDriver: false });
    spring.start(({ finished }) => { if (finished) setRaised(false); });
    return () => spring.stop();
  }, [dragging]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (shiftPx === 0 && !shifted) return undefined;
    if (useDragStore.getState().snap || isReducedMotion()) { offset.setValue(shiftPx); setShifted(shiftPx !== 0); return undefined; }
    setShifted(true);
    const slide = Animated.timing(offset, { toValue: shiftPx, duration: motion.quick + 20, easing: motion.easeOut, useNativeDriver: false });
    slide.start(({ finished }) => { if (finished && shiftPx === 0) setShifted(false); });
    return () => slide.stop();
  }, [shiftPx]); // eslint-disable-line react-hooks/exhaustive-deps

  const moving = dragging || raised || shifted;
  const liftStyle = useMemo(() => ({
    shadowOpacity: lift.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }),
    transform: [{ translateY: dragging ? dragY : offset }, { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, motion.lift] }) }],
  }), [lift, offset, dragging]);

  if (!controller) return <View>{children}</View>;
  return (
    <Animated.View
      ref={(node) => controller.registerRow(taskId, categoryId, node as unknown as View | null)}
      collapsable={false} {...panHandlers}
      style={[styles.row, (dragging || raised) && styles.lifted, moving && liftStyle]}
    >
      {before ? <View pointerEvents="none" style={[styles.line, { top: -dragHeight - 1 }, lineColor]} /> : null}
      {children}
      {after ? <View pointerEvents="none" style={[styles.line, styles.lineBottom, lineColor]} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { ...Platform.select({ web: { userSelect: 'none', WebkitTouchCallout: 'none', cursor: 'grab' } as object, default: {} }) },
  lifted: { ...Platform.select({ web: { cursor: 'grabbing' } as object, default: {} }), zIndex: 50, elevation: 8, backgroundColor: colors.paper, borderRadius: radius.sm, shadowColor: colors.ink, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  line: { position: 'absolute', left: 0, right: 0, height: 1.5, borderRadius: 1, zIndex: 60 },
  lineBottom: { bottom: -1 },
});
