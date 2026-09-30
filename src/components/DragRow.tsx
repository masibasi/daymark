import { type PropsWithChildren } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { categoryPalette, colors, radius, type CategoryColorKey } from '@/theme/tokens';
import { dragY, useDragRow, useDragStore } from './useTaskDrag';

interface DragRowProps { taskId: string; categoryId: string; colorKey: CategoryColorKey }

// Wraps a task row on Today: long-press to lift, follows the pointer, shows a 2px insertion line at the drop spot.
export function DragRow({ taskId, categoryId, colorKey, children }: PropsWithChildren<DragRowProps>) {
  const { controller, panHandlers } = useDragRow(taskId, categoryId);
  const dragging = useDragStore((state) => state.draggingId === taskId);
  const before = useDragStore((state) => state.target?.beforeId === taskId);
  const after = useDragStore((state) => state.target?.afterId === taskId);
  const lineColor = { backgroundColor: categoryPalette[useDragStore((state) => state.target?.colorKey ?? colorKey)].solid };
  if (!controller) return <View>{children}</View>;
  return (
    <Animated.View
      ref={(node) => controller.registerRow(taskId, categoryId, node as unknown as View | null)}
      collapsable={false} {...panHandlers}
      style={[styles.row, dragging && styles.lifted, dragging && { transform: [{ translateY: dragY }, { scale: 1.02 }] }]}
    >
      {before ? <View pointerEvents="none" style={[styles.line, styles.lineTop, lineColor]} /> : null}
      {children}
      {after ? <View pointerEvents="none" style={[styles.line, styles.lineBottom, lineColor]} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { ...Platform.select({ web: { userSelect: 'none', WebkitTouchCallout: 'none' } as object, default: {} }) },
  lifted: { zIndex: 50, elevation: 8, backgroundColor: colors.paper, borderRadius: radius.sm, shadowColor: colors.ink, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  line: { position: 'absolute', left: 0, right: 0, height: 2, borderRadius: 1, zIndex: 60 },
  lineTop: { top: -1 },
  lineBottom: { bottom: -1 },
});
