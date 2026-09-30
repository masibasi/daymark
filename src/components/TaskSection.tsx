import { useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Category, Routine, Task } from '@/domain/types';
import { categoryPalette, colors, fontFamily, space, type } from '@/theme/tokens';
import { DragRow } from './DragRow';
import { GhostRoutineRow } from './GhostRoutineRow';
import { InlineAdd } from './InlineAdd';
import { TaskRow } from './TaskRow';
import { TaskDragContext, useDragStore } from './useTaskDrag';

interface TaskSectionProps {
  category: Category;
  tasks: Task[];
  routines: Routine[];
  ghosts: Routine[];
  selectedDate: string;
  projectNames: Record<string, string>;
  adding: boolean;
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

export function TaskSection({ category, tasks, routines, ghosts, selectedDate, projectNames, adding, onToggle, onMove, onDelete, onOpenAdd, onCloseAdd, onAddTask, onAddRoutine, onAddFromRoutine, onRemoveRoutine, onReveal }: TaskSectionProps) {
  const palette = categoryPalette[category.colorKey];
  const completed = tasks.filter((task) => Boolean(task.completedAt)).length;
  const controller = useContext(TaskDragContext);
  const lifted = useDragStore((state) => state.draggingCategoryId === category.id);
  const emptyLine = useDragStore((state) => state.target?.categoryId === category.id && state.target.empty === true);
  const hasRoutine = (title: string) => routines.some((routine) => routine.title.toLowerCase() === title.trim().toLowerCase());

  return (
    <View ref={(node) => controller?.registerSection(category.id, !category.archived, category.colorKey, node)} collapsable={false} style={[styles.section, lifted && styles.lifted]}>
      <View style={styles.heading}>
        <View style={[styles.dot, { backgroundColor: palette.solid }]} />
        <Text style={styles.name}>{category.name}</Text>
        {tasks.length > 0 ? <Text style={styles.count}>{completed}/{tasks.length}</Text> : null}
      </View>
      <View style={styles.tasks}>
        {emptyLine ? <View pointerEvents="none" style={[styles.line, { backgroundColor: palette.solid }]} /> : null}
        {tasks.map((task) => (
          <DragRow key={task.id} taskId={task.id} categoryId={category.id} colorKey={category.colorKey}>
          <TaskRow
            task={task}
            onToggle={() => onToggle(task.id)}
            onMove={onMove ? (date) => onMove(task.id, date) : undefined}
            onDelete={onDelete ? () => onDelete(task.id) : undefined}
            onSaveRoutine={hasRoutine(task.title) ? undefined : () => onAddRoutine(task.title, category.id)}
            selectedDate={selectedDate}
            projectTitle={task.projectId ? projectNames[task.projectId] : undefined}
          />
          </DragRow>
        ))}
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
  line: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, borderRadius: 1, zIndex: 60 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { ...type.section, color: colors.ink, fontFamily },
  count: { ...type.meta, color: colors.muted, marginLeft: 'auto', fontFamily },
  tasks: { paddingLeft: 1, position: 'relative' },
});
