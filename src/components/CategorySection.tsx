import { StyleSheet, Text, View } from 'react-native';
import type { Category, Task } from '../domain/types';
import { categoryColors } from '../theme/categoryColors';
import { palette, radii, spacing, type as typeScale, weight } from '../theme/tokens';
import { TaskRow } from './TaskRow';

interface CategorySectionProps {
  category: Category;
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
}

export function CategorySection({ category, tasks, onToggleTask }: CategorySectionProps) {
  const colors = categoryColors[category.color];
  return (
    <View style={styles.container}>
      <View style={[styles.pill, { backgroundColor: colors.soft }]}>
        <Text style={[styles.pillText, { color: colors.text }]}>{category.name}</Text>
      </View>
      <View>
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            title={task.title}
            completed={!!task.completedAt}
            categoryColor={category.color}
            onToggle={() => onToggleTask(task.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    marginBottom: spacing.xs,
  },
  pillText: {
    fontSize: typeScale.label,
    fontWeight: weight.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: palette.hairline,
  },
});
