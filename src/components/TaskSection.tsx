import { useContext, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Category, Routine, Task } from '@/domain/types';
import { categoryPalette, colors, fontFamily, space, type } from '@/theme/tokens';
import { DragRow } from './DragRow';
import { GhostRoutineRow } from './GhostRoutineRow';
import { MissedRow } from './MissedRow';
import { InlineAdd } from './InlineAdd';
import { ListQuickEdit } from './ListQuickEdit';
import { RowPresence, isQuietEnter } from './RowPresence';
import { TaskRow } from './TaskRow';
import { TaskDragContext, justDragged, useDragStore } from './useTaskDrag';

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
  onToggleEditList: () => void;
  onCloseEditList: () => void;
  onToggle: (id: string) => void;
  onMove?: (id: string, date?: string) => void;
  onDelete?: (id: string) => void;
  onOpenAdd: () => void;
  onCloseAdd: () => void;
  onAddTask: (title: string, categoryId: string) => void;
  onAddRoutine: (title: string, categoryId: string) => void;
  onAddFromRoutine: (routineId: string, complete?: boolean) => void;
  onRemoveRoutine: (routineId: string) => void;
  onReveal: (node: View | null) => void;
}

export function TaskSection({ category, tasks, missed, routines, ghosts, selectedDate, projectNames, adding, editingList, onToggleEditList, onCloseEditList, onToggle, onMove, onDelete, onOpenAdd, onCloseAdd, onAddTask, onAddRoutine, onAddFromRoutine, onRemoveRoutine, onReveal }: TaskSectionProps) {
  const palette = categoryPalette[category.colorKey];
  const completed = tasks.filter((task) => Boolean(task.completedAt)).length;
  const controller = useContext(TaskDragContext);
  const lifted = useDragStore((state) => state.draggingCategoryId === category.id);
  const emptyLine = useDragStore((state) => state.target?.categoryId === category.id && state.target.empty === true);
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
  const leave = (id: string, action: () => void) => setLeaving((current) => ({ ...current, [id]: action }));
  const gone = (id: string) => {
    const action = leaveRef.current[id];
    setLeaving((current) => { const { [id]: _removed, ...rest } = current; return rest; });
    action?.();
  };
  const hasRoutine = (title: string) => routines.some((routine) => routine.title.toLowerCase() === title.trim().toLowerCase());

  const headingContent = (
    <>
      <View style={[styles.dot, { backgroundColor: palette.solid }]} />
      <Text style={styles.name}>{category.name}</Text>
      {tasks.length + missed.length > 0 ? <Text style={styles.count}>{completed}/{tasks.length + missed.length}</Text> : null}
    </>
  );

  return (
    <View ref={(node) => controller?.registerSection(category.id, !category.archived, category.colorKey, node)} collapsable={false} style={[styles.section, lifted && styles.lifted]}>
      {category.archived ? <View style={styles.heading}>{headingContent}</View> : (
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit list ${category.name}`} accessibilityState={{ expanded: editingList }} onPress={onToggleEditList} style={(state) => [styles.heading, (state as { hovered?: boolean }).hovered && styles.hovered]}>
          {headingContent}
          <Ionicons name={editingList ? 'chevron-up' : 'chevron-down'} size={13} color={colors.muted} style={editingList ? undefined : styles.chevron} />
        </Pressable>
      )}
      {editingList && !category.archived ? <ListQuickEdit category={category} onClose={onCloseEditList} /> : null}
      <View style={styles.tasks}>
        {emptyLine ? <View pointerEvents="none" style={[styles.line, { backgroundColor: palette.solid }]} /> : null}
        {tasks.map((task) => (
          <RowPresence key={task.id} enter={!knownNow.has(task.id) && !justDragged()} quiet={isQuietEnter()} leaving={task.id in leaving} onGone={() => gone(task.id)}>
          <DragRow taskId={task.id} categoryId={category.id} colorKey={category.colorKey}>
          <TaskRow
            task={task}
            onToggle={() => onToggle(task.id)}
            onMove={onMove ? (date) => (date !== selectedDate ? leave(task.id, () => onMove(task.id, date)) : onMove(task.id, date)) : undefined}
            onDelete={onDelete ? () => leave(task.id, () => onDelete(task.id)) : undefined}
            onSaveRoutine={hasRoutine(task.title) ? undefined : () => onAddRoutine(task.title, category.id)}
            selectedDate={selectedDate}
            projectTitle={task.projectId ? projectNames[task.projectId] : undefined}
            canMoveToFolder
          />
          </DragRow>
          </RowPresence>
        ))}
        {missed.map((task) => <MissedRow key={task.id} task={task} colorKey={category.colorKey} folderName={task.projectId ? projectNames[task.projectId] : undefined} />)}
        {ghosts.map((routine) => (
          <GhostRoutineRow key={routine.id} routine={routine} colorKey={category.colorKey} onAdd={() => onAddFromRoutine(routine.id)} onAddDone={() => onAddFromRoutine(routine.id, true)} onRemove={() => onRemoveRoutine(routine.id)} />
        ))}
        {category.archived ? null : (
          <InlineAdd
            listName={category.name} colorKey={category.colorKey} open={adding}
            onOpen={onOpenAdd} onClose={onCloseAdd} onReveal={onReveal}
            onAddTask={(title) => onAddTask(title, category.id)} onSaveRoutine={(title) => onAddRoutine(title, category.id)}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: space.lg },
  lifted: { zIndex: 50 },
  line: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, borderRadius: 1, zIndex: 60 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.xs, paddingVertical: space.xxs },
  hovered: { opacity: 0.8 },
  chevron: { opacity: 0.45 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { ...type.section, color: colors.ink, fontFamily },
  count: { ...type.meta, color: colors.muted, marginLeft: 'auto', fontFamily },
  tasks: { paddingLeft: 1, position: 'relative' },
});
