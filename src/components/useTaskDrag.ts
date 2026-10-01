import { createContext, useContext, useEffect, useMemo, useRef, type RefObject } from 'react';
import { Animated, PanResponder, Platform, type ScrollView, type View } from 'react-native';
import { create } from 'zustand';
import type { CategoryColorKey } from '@/theme/tokens';

// Long-press drag for Today's task rows (reorder within a list, move to another list). Pure UI state:
// the store is only touched through the `onDrop` callback. Works on web (DOM rects) and native (measureInWindow).

const LONG_PRESS_MS = 300;
const MOVE_SLOP = 10;
const EDGE = 60;
const MAX_SCROLL_STEP = 14;

export interface DropTarget { categoryId: string; colorKey: CategoryColorKey; index: number; beforeId?: string; afterId?: string; empty?: boolean }
// `shifts`: net row displacement in dragged-row heights (+1 opens the gap below the insertion point, -1 closes the hole left behind); `snap` skips the settle animation after a successful drop.
interface DragState { draggingId?: string; draggingCategoryId?: string; editingId?: string; target: DropTarget | null; shifts: Record<string, number>; dragHeight: number; snap: boolean }

export const useDragStore = create<DragState>(() => ({ target: null, shifts: {}, dragHeight: 0, snap: false }));
export const dragY = new Animated.Value(0);

// Browsers fire a click after a long-press drag is released; tap handlers on a row ignore it via this stamp.
let lastDragEndAt = 0;
export const justDragged = () => Date.now() - lastDragEndAt < 500;

interface Box { top: number; bottom: number }
interface SectionGeo extends Box { categoryId: string; colorKey: CategoryColorKey; droppable: boolean; rows: Array<Box & { id: string }> }
interface Session { taskId: string; categoryId: string; startPointer: number; startScroll: number; pointer: number; sections: SectionGeo[]; viewport: Box; drop: { categoryId: string; index: number; blocked: boolean } | null; dragHeight: number; closeIds: Set<string>; shiftKey: string; timer?: ReturnType<typeof setInterval> }

export interface TaskDragController {
  registerRow: (id: string, categoryId: string, node: View | null) => void;
  registerSection: (categoryId: string, droppable: boolean, colorKey: CategoryColorKey, node: View | null) => void;
  begin: (taskId: string, pointerY: number) => void;
  update: (pointerY: number) => void;
  end: () => void;
}

export const TaskDragContext = createContext<TaskDragController | null>(null);

interface ControllerOptions {
  scrollRef: RefObject<ScrollView | null>;
  getScrollY: () => number;
  getMaxScrollY: () => number;
  setScrollLocked: (locked: boolean) => void;
  canMove: (taskId: string, toCategoryId: string) => boolean;
  onDrop: (taskId: string, toCategoryId: string, toIndex: number) => boolean;
  onBlocked: () => void;
}

function measure(node: View | null): Promise<Box | null> {
  return new Promise((resolve) => {
    if (!node) { resolve(null); return; }
    if (Platform.OS === 'web') {
      const rect = (node as unknown as HTMLElement).getBoundingClientRect();
      resolve({ top: rect.top, bottom: rect.bottom });
      return;
    }
    node.measureInWindow((_x, y, _w, h) => resolve({ top: y, bottom: y + h }));
  });
}

function scrollViewport(scroll: ScrollView | null): Promise<Box | null> {
  if (!scroll) return Promise.resolve(null);
  if (Platform.OS === 'web') return measure(scroll.getScrollableNode() as View);
  return measure(scroll as unknown as View);
}

export function useTaskDragController(options: ControllerOptions): TaskDragController {
  const opts = useRef(options);
  opts.current = options;
  const rows = useRef(new Map<string, { node: View | null; categoryId: string }>()).current;
  const sections = useRef(new Map<string, { node: View | null; droppable: boolean; colorKey: CategoryColorKey }>()).current;
  const session = useRef<Session | null>(null);

  // Stop the browser from scrolling the page under a finger that is dragging a row.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const block = (event: TouchEvent) => { if (session.current) event.preventDefault(); };
    document.addEventListener('touchmove', block, { passive: false });
    return () => document.removeEventListener('touchmove', block);
  }, []);

  return useMemo(() => {
    const refresh = () => {
      const s = session.current;
      if (!s) return;
      const scrollY = opts.current.getScrollY();
      dragY.setValue(s.pointer - s.startPointer + (scrollY - s.startScroll));
      if (s.sections.length === 0) return;
      const py = s.pointer + scrollY; // content coordinates, same space as the measured rects
      const candidates = s.sections.filter((section) => section.droppable || section.categoryId === s.categoryId);
      if (candidates.length === 0) return;
      let chosen = candidates[0];
      candidates.forEach((section) => { if (py >= section.top) chosen = section; });
      const blocked = !opts.current.canMove(s.taskId, chosen.categoryId);
      const index = chosen.rows.filter((row) => (row.top + row.bottom) / 2 < py).length;
      s.drop = { categoryId: chosen.categoryId, index, blocked };
      const next: DropTarget | null = blocked ? null : { categoryId: chosen.categoryId, colorKey: chosen.colorKey, index, beforeId: chosen.rows[index]?.id, afterId: index >= chosen.rows.length ? chosen.rows[chosen.rows.length - 1]?.id : undefined, empty: chosen.rows.length === 0 };
      // Rows from the insertion point on move down to open a gap; rows below the dragged row's old slot move up to close its hole.
      const shifts: Record<string, number> = {};
      if (next) {
        s.closeIds.forEach((id) => { shifts[id] = (shifts[id] ?? 0) - 1; });
        chosen.rows.slice(index).forEach((row) => { shifts[row.id] = (shifts[row.id] ?? 0) + 1; });
      }
      const shiftKey = Object.entries(shifts).filter(([, amount]) => amount !== 0).map(([id, amount]) => `${id}:${amount}`).join(',');
      if (shiftKey !== s.shiftKey) { s.shiftKey = shiftKey; useDragStore.setState({ shifts, dragHeight: s.dragHeight }); }
      const prev = useDragStore.getState().target;
      if (prev?.categoryId !== next?.categoryId || prev?.index !== next?.index || prev?.beforeId !== next?.beforeId || prev?.afterId !== next?.afterId || (prev === null) !== (next === null)) useDragStore.setState({ target: next });
    };

    const tick = () => {
      const s = session.current;
      if (!s) return;
      const scroll = opts.current.scrollRef.current;
      const { top, bottom } = s.viewport;
      let step = 0;
      if (s.pointer < top + EDGE) step = -Math.ceil((Math.min(EDGE, top + EDGE - s.pointer) / EDGE) * MAX_SCROLL_STEP);
      else if (s.pointer > bottom - EDGE) step = Math.ceil((Math.min(EDGE, s.pointer - (bottom - EDGE)) / EDGE) * MAX_SCROLL_STEP);
      if (step !== 0 && scroll) {
        const y = Math.max(0, Math.min(opts.current.getMaxScrollY(), opts.current.getScrollY() + step));
        if (y !== opts.current.getScrollY()) scroll.scrollTo({ y, animated: false });
      }
      refresh();
    };

    const finish = (blockedAnimation: boolean) => {
      const s = session.current;
      session.current = null;
      lastDragEndAt = Date.now();
      if (s?.timer) clearInterval(s.timer);
      const clear = () => {
        useDragStore.setState({ draggingId: undefined, draggingCategoryId: undefined, target: null, shifts: {}, snap: !blockedAnimation });
        opts.current.setScrollLocked(false);
        if (Platform.OS === 'web' && typeof document !== 'undefined') document.body.style.userSelect = '';
      };
      if (blockedAnimation) { useDragStore.setState({ shifts: {} }); Animated.timing(dragY, { toValue: 0, duration: 140, useNativeDriver: false }).start(clear); }
      else { dragY.setValue(0); clear(); }
    };

    return {
      registerRow: (id, categoryId, node) => { if (node) rows.set(id, { node, categoryId }); else rows.delete(id); },
      registerSection: (categoryId, droppable, colorKey, node) => { if (node) sections.set(categoryId, { node, droppable, colorKey }); else sections.delete(categoryId); },
      begin: (taskId, pointerY) => {
        const row = rows.get(taskId);
        if (!row || session.current) return;
        const startScroll = opts.current.getScrollY();
        const dragMeasure = measure(row.node); // before the lift scales the row
        const s: Session = { taskId, categoryId: row.categoryId, startPointer: pointerY, startScroll, pointer: pointerY, sections: [], viewport: { top: 0, bottom: 10000 }, drop: null, dragHeight: 0, closeIds: new Set(), shiftKey: '' };
        session.current = s;
        dragY.setValue(0);
        useDragStore.setState({ draggingId: taskId, draggingCategoryId: row.categoryId, target: null, shifts: {}, dragHeight: 0, snap: false });
        opts.current.setScrollLocked(true);
        if (Platform.OS === 'web' && typeof document !== 'undefined') document.body.style.userSelect = 'none';
        s.timer = setInterval(tick, 16);
        // Rects are stored in content coordinates (window position + scroll offset at measure time).
        void Promise.all([
          scrollViewport(opts.current.scrollRef.current),
          dragMeasure,
          ...Array.from(sections.entries()).map(async ([categoryId, section]) => {
            const box = await measure(section.node);
            const rowBoxes = await Promise.all(Array.from(rows.entries()).filter(([id, item]) => item.categoryId === categoryId && id !== taskId).map(async ([id, item]) => ({ id, box: await measure(item.node) })));
            if (!box) return null;
            const geo: SectionGeo = {
              categoryId, colorKey: section.colorKey, droppable: section.droppable, top: box.top + startScroll, bottom: box.bottom + startScroll,
              rows: rowBoxes.flatMap((entry) => entry.box ? [{ id: entry.id, top: entry.box.top + startScroll, bottom: entry.box.bottom + startScroll }] : []).sort((a, b) => a.top - b.top),
            };
            return geo;
          }),
        ]).then(([viewport, dragBox, ...geos]) => {
          if (session.current !== s) return;
          if (viewport) s.viewport = viewport;
          s.sections = (geos as Array<SectionGeo | null>).flatMap((geo) => geo ? [geo] : []).sort((a, b) => a.top - b.top);
          if (dragBox) {
            s.dragHeight = dragBox.bottom - dragBox.top;
            const source = s.sections.find((section) => section.categoryId === s.categoryId);
            source?.rows.filter((item) => item.top > dragBox.top + startScroll - 1).forEach((item) => s.closeIds.add(item.id));
          }
          refresh();
        });
      },
      update: (pointerY) => { if (session.current) session.current.pointer = pointerY; },
      end: () => {
        const s = session.current;
        if (!s) return;
        const drop = s.drop;
        if (!drop) { finish(false); return; }
        if (drop.blocked || !opts.current.onDrop(s.taskId, drop.categoryId, drop.index)) {
          opts.current.onBlocked();
          finish(true);
          return;
        }
        finish(false);
      },
    };
  }, [rows, sections]);
}

// Gesture wiring for one row: hold ~300 ms without moving, then the row follows the pointer.
export function useDragRow(taskId: string, categoryId: string) {
  const controller = useContext(TaskDragContext);
  const latest = useRef({ controller, taskId, categoryId });
  latest.current = { controller, taskId, categoryId };
  const state = useRef<{ timer?: ReturnType<typeof setTimeout>; active: boolean; pointer: number }>({ active: false, pointer: 0 }).current;

  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => useDragStore.getState().editingId !== latest.current.taskId,
    onPanResponderGrant: (event) => {
      state.active = false;
      state.pointer = event.nativeEvent.pageY;
      clearTimeout(state.timer);
      state.timer = setTimeout(() => { state.active = true; latest.current.controller?.begin(latest.current.taskId, state.pointer); }, LONG_PRESS_MS);
    },
    onPanResponderMove: (_event, gesture) => {
      if (gesture.moveY) state.pointer = gesture.moveY;
      if (state.active) latest.current.controller?.update(state.pointer);
      else if (Math.abs(gesture.dx) > MOVE_SLOP || Math.abs(gesture.dy) > MOVE_SLOP) clearTimeout(state.timer);
    },
    onPanResponderTerminationRequest: () => !state.active,
    onPanResponderRelease: () => { clearTimeout(state.timer); if (state.active) latest.current.controller?.end(); state.active = false; },
    onPanResponderTerminate: () => { clearTimeout(state.timer); if (state.active) latest.current.controller?.end(); state.active = false; },
  })).current;

  useEffect(() => () => clearTimeout(state.timer), [state]);
  return { controller, panHandlers: responder.panHandlers };
}
