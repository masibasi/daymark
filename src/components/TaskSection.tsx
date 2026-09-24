import { StyleSheet, Text, View } from 'react-native';
import type { Category, Task } from '@/domain/types';
import { categoryPalette, colors, fontFamily, space, type } from '@/theme/tokens';
import { TaskRow } from './TaskRow';

interface TaskSectionProps { category: Category; tasks: Task[]; onToggle: (id: string) => void; onMove?: (id: string, date?: string) => void; selectedDate?: string; projectNames: Record<string, string> }

export function TaskSection({ category, tasks, onToggle, onMove, selectedDate, projectNames }: TaskSectionProps) {
  const palette = categoryPalette[category.colorKey];
  const completed = tasks.filter((task) => Boolean(task.completedAt)).length;
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View style={[styles.dot, { backgroundColor: palette.solid }]} />
        <Text style={styles.name}>{category.name}</Text>
        <Text style={styles.count}>{completed}/{tasks.length}</Text>
      </View>
      <View style={styles.tasks}>
        {tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={() => onToggle(task.id)} onMove={onMove ? (date) => onMove(task.id, date) : undefined} selectedDate={selectedDate} projectTitle={task.projectId ? projectNames[task.projectId] : undefined} />)}
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
