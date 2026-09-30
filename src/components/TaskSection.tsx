import { StyleSheet, Text, View } from 'react-native';
import { parseISO } from 'date-fns';
import { selectRoutineAddedOnDay } from '@/domain/selectors';
import type { Category, Routine, Task } from '@/domain/types';
import { categoryPalette, colors, fontFamily, space, type } from '@/theme/tokens';
import { InlineAdd } from './InlineAdd';
import { TaskRow } from './TaskRow';

interface TaskSectionProps {
  category: Category;
  tasks: Task[];
  routines: Routine[];
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
  onAddFromRoutine: (routineId: string) => void;
  onReveal: (node: View | null) => void;
}

export function TaskSection({ category, tasks, routines, selectedDate, projectNames, adding, onToggle, onMove, onDelete, onOpenAdd, onCloseAdd, onAddTask, onAddRoutine, onAddFromRoutine, onReveal }: TaskSectionProps) {
  const palette = categoryPalette[category.colorKey];
  const completed = tasks.filter((task) => Boolean(task.completedAt)).length;
  const day = parseISO(selectedDate);
  const hasRoutine = (title: string) => routines.some((routine) => routine.title.toLowerCase() === title.trim().toLowerCase());

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View style={[styles.dot, { backgroundColor: palette.solid }]} />
        <Text style={styles.name}>{category.name}</Text>
        {tasks.length > 0 ? <Text style={styles.count}>{completed}/{tasks.length}</Text> : null}
      </View>
      <View style={styles.tasks}>
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onToggle={() => onToggle(task.id)}
            onMove={onMove ? (date) => onMove(task.id, date) : undefined}
            onDelete={onDelete ? () => onDelete(task.id) : undefined}
            onSaveRoutine={hasRoutine(task.title) ? undefined : () => onAddRoutine(task.title, category.id)}
            selectedDate={selectedDate}
            projectTitle={task.projectId ? projectNames[task.projectId] : undefined}
          />
        ))}
        {category.archived ? null : (
          <InlineAdd
            listName={category.name} colorKey={category.colorKey} open={adding} routines={routines}
            isAdded={(routineId) => selectRoutineAddedOnDay(tasks, routineId, day)}
            onOpen={onOpenAdd} onClose={onCloseAdd} onReveal={onReveal}
            onAddTask={(title) => onAddTask(title, category.id)} onSaveRoutine={(title) => onAddRoutine(title, category.id)} onAddRoutine={onAddFromRoutine}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: space.lg },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { ...type.section, color: colors.ink, fontFamily },
  count: { ...type.meta, color: colors.muted, marginLeft: 'auto', fontFamily },
  tasks: { paddingLeft: 1 },
});
