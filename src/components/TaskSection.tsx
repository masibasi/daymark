import { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { selectTaskRoutine } from '@/domain/selectors';
import type { Category, Routine, Task } from '@/domain/types';
import { useCategoryPalette } from '@/store/useCategoryPalette';
import { colors, fontFamily, motion, space, type } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/useReducedMotion';
import { Collapsible } from './Collapsible';
import { DragRow } from './DragRow';
import { GhostRoutineRow } from './GhostRoutineRow';
import { RoutineRepeatPicker } from './RoutineRepeatPicker';
import { MissedRow } from './MissedRow';
import { InlineAdd } from './InlineAdd';
import { ListQuickEdit } from './ListQuickEdit';
import { RowPresence, isQuietEnter } from './RowPresence';
import { TaskRow } from './TaskRow';
import { TaskDragContext, justDragged, useDragStore } from './useTaskDrag';
import { useT } from '@/i18n';

interface TaskSectionProps {
  category: Category;
  tasks: Task[];
  // Tasks left undone on this (past) day that have since moved; shown muted and inert.
  missed: Task[];
  routines: Routine[];
  ghosts: Routine[];
  selectedDate: string;
  projectNames: Record<string, string>;
  adding: boolean;
  editingList: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onToggleEditList: () => void;
  onCloseEditList: () => void;
  onToggle: (id: string) => void;
  onMove?: (id: string, date?: string) => void;
  onDelete?: (id: string) => void;
  onOpenAdd: () => void;
  onCloseAdd: () => void;
  onAddTask: (title: string, categoryId: string) => void;
  onAddRoutine: (title: string, categoryId: string, fromTaskId?: string) => void;
  onAddFromRoutine: (routineId: string, complete?: boolean) => void;
  ghostMeta: (routine: Routine) => string | undefined;
  onRemoveRoutine: (routineId: string) => void;
  onReveal: (node: View | null) => void;
}

export function TaskSection({ category, tasks, missed, routines, ghosts, selectedDate, projectNames, adding, editingList, collapsed, onToggleCollapsed, onToggleEditList, onCloseEditList, onToggle, onMove, onDelete, onOpenAdd, onCloseAdd, onAddTask, onAddRoutine, onAddFromRoutine, ghostMeta, onRemoveRoutine, onReveal }: TaskSectionProps) {
  const t = useT();
  const palette = useCategoryPalette()(category);
  const completed = tasks.filter((task) => Boolean(task.completedAt)).length;
  const controller = useContext(TaskDragContext);
  const [repeatFor, setRepeatFor] = useState<string | null>(null);
  const lifted = useDragStore((state) => state.draggingCategoryId === category.id);
  const emptyLine = useDragStore((state) => state.target?.categoryId === category.id && state.target.empty === true);
  const left = tasks.length - completed;
  // Folding a list shut also closes its open add input.
  const toggleCollapsed = () => { if (!collapsed && adding) onCloseAdd(); onToggleCollapsed(); };
  // Rows that appear after the list settled (add, routine, undo, schedule) enter softly; the first render and day changes do not.
  const known = useRef(new Set(tasks.map((task) => task.id)));
  const knownDate = useRef(selectedDate);
  if (knownDate.current !== selectedDate) { knownDate.current = selectedDate; known.current = new Set(tasks.map((task) => task.id)); }
  const knownNow = known.current;
  useEffect(() => { known.current = new Set(tasks.map((task) => task.id)); });
  // Deleting / moving away collapses the row first; the real store action runs when the exit animation ends.
  const [leaving, setLeaving] = useState<Record<string, () => void>>({});
  const leaveRef = useRef(leaving);
  leaveRef.current = leaving;
  const gone = (id: string) => {
    const action = leaveRef.current[id];
    if (!action) return;
    leaveRef.current = (({ [id]: _removed, ...rest }) => rest)(leaveRef.current);
    setLeaving((current) => { const { [id]: _removed, ...rest } = current; return rest; });
    action();
  };
  // Safety net: if the exit animation never reports back, still commit the change shortly after.
  const leave = (id: string, action: () => void) => {
    leaveRef.current = { ...leaveRef.current, [id]: action };
    setLeaving((current) => ({ ...current, [id]: action }));
    setTimeout(() => gone(id), motion.exit + 400);
  };
  const hasRoutine = (title: string) => routines.some((routine) => routine.title.toLowerCase() === title.trim().toLowerCase());

  const headingContent = (
    <>
      <View style={[styles.dot, { backgroundColor: palette.solid }]} />
      <Text style={styles.name}>{category.name}</Text>
      <View style={styles.spacer} />
      {tasks.length + missed.length > 0 ? <Text style={styles.count}>{completed}/{tasks.length + missed.length}{collapsed && left > 0 ? <Text style={styles.left}> · {t.today.left(left)}</Text> : null}</Text> : null}
    </>
  );

  return (
    <View ref={(node) => controller?.registerSection(category.id, !category.archived, node, collapsed)} collapsable={false} style={[styles.section, lifted && styles.lifted]}>
      <View style={styles.heading}>
        {category.archived ? <View style={styles.titleRow}>{headingContent}</View> : (
          <Pressable accessibilityRole="button" accessibilityLabel={t.tasks.editList(category.name)} accessibilityState={{ expanded: editingList }} onPress={onToggleEditList} style={(state) => [styles.titleRow, (state as { hovered?: boolean }).hovered && styles.hovered]}>
            {headingContent}
          </Pressable>
        )}
        <CollapseToggle name={category.name} collapsed={collapsed} onPress={toggleCollapsed} />
      </View>
      {editingList && !category.archived ? <ListQuickEdit category={category} onClose={onCloseEditList} /> : null}
      <View style={styles.tasks}>
        {emptyLine ? <View pointerEvents="none" style={[styles.line, { backgroundColor: palette.solid }]} /> : null}
        <Collapsible open={!collapsed}>
        {tasks.map((task) => (
          <RowPresence key={task.id} enter={!knownNow.has(task.id) && !justDragged()} quiet={isQuietEnter()} leaving={task.id in leaving} onGone={() => gone(task.id)}>
          <DragRow taskId={task.id} categoryId={category.id}>
          <TaskRow
            task={task}
            onToggle={() => onToggle(task.id)}
            onMove={onMove ? (date) => (date !== selectedDate ? leave(task.id, () => onMove(task.id, date)) : onMove(task.id, date)) : undefined}
            onDelete={onDelete ? () => leave(task.id, () => onDelete(task.id)) : undefined}
            onSaveRoutine={hasRoutine(task.title) ? undefined : () => onAddRoutine(task.title, category.id, task.id)}
            isRoutine={Boolean(selectTaskRoutine(routines, task))}
            selectedDate={selectedDate}
            projectTitle={task.projectId ? projectNames[task.projectId] : undefined}
            canMoveToFolder
          />
          </DragRow>
          </RowPresence>
        ))}
        {missed.map((task) => <MissedRow key={task.id} task={task} day={selectedDate} palette={palette} folderName={task.projectId ? projectNames[task.projectId] : undefined} />)}
        {ghosts.map((routine) => (
          <GhostRoutineRow key={routine.id} routine={routine} palette={palette} onAdd={() => onAddFromRoutine(routine.id)} meta={ghostMeta(routine)} onAddDone={() => onAddFromRoutine(routine.id, true)} onRepeat={() => setRepeatFor(routine.id)} onRemove={() => onRemoveRoutine(routine.id)} />
        ))}
        {category.archived ? null : (
          <InlineAdd
            listName={category.name} palette={palette} open={adding}
            onOpen={onOpenAdd} onClose={onCloseAdd} onReveal={onReveal}
            onAddTask={(title) => onAddTask(title, category.id)} onSaveRoutine={(title) => onAddRoutine(title, category.id)}
          />
        )}
        </Collapsible>
      </View>
      {repeatFor ? <RoutineRepeatPicker routineId={repeatFor} onClose={() => setRepeatFor(null)} /> : null}
    </View>
  );
}

// Separate from the header's editor tap: folds the whole list body shut. The chevron turns with the motion tokens.
function CollapseToggle({ name, collapsed, onPress }: { name: string; collapsed: boolean; onPress: () => void }) {
  const t = useT();
  const reduced = useReducedMotion();
  const turn = useRef(new Animated.Value(collapsed ? 0 : 1)).current;
  useEffect(() => {
    const animation = Animated.timing(turn, { toValue: collapsed ? 0 : 1, duration: reduced ? 0 : motion.base, easing: motion.easeOut, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [collapsed]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={collapsed ? t.tasks.expandList(name) : t.tasks.collapseList(name)} accessibilityState={{ expanded: !collapsed }} hitSlop={10} onPress={onPress} style={styles.toggle}>
      <Animated.View style={{ transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}><Ionicons name="chevron-down" size={14} color={colors.muted} /></Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: space.lg },
  lifted: { zIndex: 50 },
  line: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, borderRadius: 1, zIndex: 60 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.xs },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingVertical: space.xxs },
  spacer: { flex: 1 },
  toggle: { padding: space.xxs },
  hovered: { opacity: 0.8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { ...type.section, color: colors.ink, fontFamily },
  count: { ...type.meta, color: colors.muted, fontFamily },
  left: { opacity: 0.7 },
  tasks: { paddingLeft: 1, position: 'relative' },
});
