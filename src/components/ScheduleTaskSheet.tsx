import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Task } from '../domain/types';
import { categoryColors, type CategoryColorKey } from '../theme/categoryColors';
import { palette, radii, shadows, spacing, type as typeScale, weight } from '../theme/tokens';

interface TaskWithColor {
  task: Task;
  categoryColor: CategoryColorKey;
}

interface ScheduleTaskSheetProps {
  visible: boolean;
  tasks: TaskWithColor[];
  onSelect: (taskId: string) => void;
  onClose: () => void;
}

/** V0 scheduling flow, step 1: pick an unscheduled task. Step 2 (tap a
 * slot) happens in the week grid after this sheet closes — see
 * docs/DESIGN.md "Calendar interaction". No drag-and-drop anywhere. */
export function ScheduleTaskSheet({ visible, tasks, onSelect, onClose }: ScheduleTaskSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Schedule a task</Text>
          <Text style={styles.subtitle}>Pick a task, then tap an open slot on the grid.</Text>
          <ScrollView style={styles.list}>
            {tasks.length === 0 ? (
              <Text style={styles.empty}>No unscheduled tasks right now.</Text>
            ) : (
              tasks.map(({ task, categoryColor }) => {
                const colors = categoryColors[categoryColor];
                return (
                  <Pressable
                    key={task.id}
                    style={styles.row}
                    onPress={() => onSelect(task.id)}
                  >
                    <View style={[styles.dot, { backgroundColor: colors.solid }]} />
                    <Text style={styles.rowText} numberOfLines={1}>
                      {task.title}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 27, 26, 0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    padding: spacing.lg,
    maxHeight: '70%',
    ...shadows.sheet,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.hairline,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typeScale.subhead,
    fontWeight: weight.semibold,
    color: palette.ink,
  },
  subtitle: {
    fontSize: typeScale.label,
    color: palette.inkSecondary,
    marginTop: spacing.xxs,
    marginBottom: spacing.md,
  },
  list: {
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.hairline,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowText: {
    fontSize: typeScale.body,
    color: palette.ink,
    flex: 1,
  },
  empty: {
    fontSize: typeScale.body,
    color: palette.inkSecondary,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
});
