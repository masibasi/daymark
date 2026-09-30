import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { router } from 'expo-router';
import type { Project, Task } from '@/domain/types';
import { selectDeadlineDays, selectProjectProgress } from '@/domain/selectors';
import { useCategoryPalette } from '@/store/useCategoryPalette';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';

export function ProjectCard({ project, tasks, now }: { project: Project; tasks: Task[]; now: Date }) {
  const palette = useCategoryPalette()(project.categoryId);
  const progress = selectProjectProgress(tasks, project.id);
  const days = selectDeadlineDays(project.deadline, now);
  const percent = progress.total ? progress.completed / progress.total : 0;
  return (
    <Pressable onPress={() => router.push(`/projects/${project.id}`)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.accent, { backgroundColor: palette.solid }]} />
      <View style={styles.content}>
        <View style={styles.top}><Text style={styles.date}>Due {format(parseISO(project.deadline), 'MMM d')}</Text><Text style={[styles.days, days < 0 && styles.overdue, days >= 0 && days <= 3 && { color: colors.accent }]}>{days < 0 ? `Overdue · D+${Math.abs(days)}` : days === 0 ? 'Today' : `D−${days}`}</Text></View>
        <Text style={styles.title}>{project.title}</Text>
        <Text style={styles.notes} numberOfLines={2}>{project.notes ?? 'A focused project with a clear finish line.'}</Text>
        <View style={styles.bottom}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${percent * 100}%`, backgroundColor: palette.solid }]} /></View><Text style={styles.progress}>{progress.completed} of {progress.total}</Text><Ionicons name="arrow-forward" size={16} color={colors.muted} /></View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 280, maxWidth: 520, flexDirection: 'row', backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  accent: { width: 5 },
  content: { flex: 1, padding: space.lg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { ...type.meta, color: colors.muted, fontFamily },
  days: { ...type.meta, color: colors.inkSoft, fontFamily },
  overdue: { color: colors.danger },
  title: { ...type.section, color: colors.ink, fontSize: 19, marginTop: space.sm, fontFamily },
  notes: { ...type.body, color: colors.inkSoft, marginTop: space.xs, minHeight: 42, fontFamily },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.lg },
  progressTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' },
  progressFill: { height: '100%' },
  progress: { ...type.meta, color: colors.muted, fontFamily },
  pressed: { opacity: 0.72 },
});
