import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ProjectProgress } from '../../../src/components/ProjectProgress';
import { QuickAdd } from '../../../src/components/QuickAdd';
import { TaskRow } from '../../../src/components/TaskRow';
import { daysUntil } from '../../../src/domain/dateUtils';
import { selectDeadlineUrgencyTier, selectProjectProgress, selectProjectTasks } from '../../../src/domain/selectors';
import { useStore } from '../../../src/store/useStore';
import { categoryColors } from '../../../src/theme/categoryColors';
import { palette, radii, spacing, type as typeScale, weight } from '../../../src/theme/tokens';

const TIER_COLOR: Record<string, string> = {
  far: palette.inkSecondary,
  week: palette.ink,
  soon: palette.amber,
  urgent: palette.coral,
};

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const today = useStore((s) => s.today);
  const categories = useStore((s) => s.categories);
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const toggleTask = useStore((s) => s.toggleTask);
  const setTaskOnToday = useStore((s) => s.setTaskOnToday);
  const addTask = useStore((s) => s.addTask);

  const todayDate = useMemo(() => new Date(`${today}T12:00:00`), [today]);
  const project = projects.find((p) => p.id === id);

  if (!project) {
    return (
      <View style={styles.root}>
        <Text style={styles.notFound}>Project not found.</Text>
      </View>
    );
  }

  const category = categories.find((c) => c.id === project.categoryId);
  const colors = categoryColors[category?.color ?? 'study'];
  const subtasks = selectProjectTasks(tasks, project.id);
  const progress = selectProjectProgress(tasks, project.id);
  const d = daysUntil(project.deadline, todayDate);
  const tier = selectDeadlineUrgencyTier(project.deadline, todayDate);
  const ddayLabel = d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? 'Due today' : `D-${d}`;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>‹ Projects</Text>
      </Pressable>

      <View style={[styles.categoryPill, { backgroundColor: colors.soft }]}>
        <Text style={[styles.categoryPillText, { color: colors.text }]}>
          {category?.name ?? 'Category'}
        </Text>
      </View>
      <Text style={styles.title}>{project.title}</Text>
      <View style={styles.metaRow}>
        <Text style={[styles.dday, { color: TIER_COLOR[tier] }]}>{ddayLabel}</Text>
        <Text style={styles.metaSeparator}>·</Text>
        <Text style={styles.metaText}>{project.deadline}</Text>
      </View>
      {project.notes ? <Text style={styles.notes}>{project.notes}</Text> : null}

      <View style={styles.progressBlock}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>Progress</Text>
          <Text style={styles.progressLabel}>
            {progress.done}/{progress.total}
          </Text>
        </View>
        <ProjectProgress fraction={progress.fraction} color={colors.solid} height={6} />
      </View>

      <Text style={styles.subtasksTitle}>Subtasks</Text>
      {subtasks.map((task) => (
        <TaskRow
          key={task.id}
          title={task.title}
          completed={!!task.completedAt}
          categoryColor={category?.color ?? 'study'}
          onToggle={() => toggleTask(task.id)}
          right={
            <Pressable
              onPress={() => setTaskOnToday(task.id, task.scheduledDate !== today)}
              style={[
                styles.todayPill,
                task.scheduledDate === today && styles.todayPillActive,
              ]}
            >
              <Text
                style={[
                  styles.todayPillText,
                  task.scheduledDate === today && styles.todayPillTextActive,
                ]}
              >
                Today
              </Text>
            </Pressable>
          }
        />
      ))}
      <QuickAdd
        placeholder="Add a subtask..."
        onSubmit={(titleText) =>
          addTask({ title: titleText, categoryId: project.categoryId, projectId: project.id })
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  notFound: {
    padding: spacing.lg,
    fontSize: typeScale.body,
    color: palette.inkSecondary,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    fontSize: typeScale.body,
    color: palette.inkSecondary,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    marginBottom: spacing.xs,
  },
  categoryPillText: {
    fontSize: typeScale.label,
    fontWeight: weight.semibold,
  },
  title: {
    fontSize: typeScale.title,
    fontWeight: weight.semibold,
    color: palette.ink,
    marginBottom: spacing.xxs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginBottom: spacing.sm,
  },
  dday: {
    fontSize: typeScale.label,
    fontWeight: weight.semibold,
  },
  metaSeparator: {
    color: palette.inkSecondary,
  },
  metaText: {
    fontSize: typeScale.label,
    color: palette.inkSecondary,
  },
  notes: {
    fontSize: typeScale.body,
    color: palette.inkSecondary,
    marginBottom: spacing.md,
  },
  progressBlock: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: typeScale.label,
    color: palette.inkSecondary,
    fontWeight: weight.medium,
  },
  subtasksTitle: {
    fontSize: typeScale.subhead,
    fontWeight: weight.semibold,
    color: palette.ink,
    marginBottom: spacing.xs,
  },
  todayPill: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  todayPillActive: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  todayPillText: {
    fontSize: 11,
    color: palette.inkSecondary,
    fontWeight: weight.medium,
  },
  todayPillTextActive: {
    color: palette.surface,
  },
});
