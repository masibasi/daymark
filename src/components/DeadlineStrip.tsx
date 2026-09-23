import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Project, Task } from '@/domain/types';
import { selectDeadlineDays, selectDeadlineTone, selectProjectProgress } from '@/domain/selectors';
import { categoryPalette, colors, fontFamily, radius, space, type } from '@/theme/tokens';

interface DeadlineStripProps { projects: Project[]; tasks: Task[]; now: Date }

export function DeadlineStrip({ projects, tasks, now }: DeadlineStripProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.track}>
      {projects.map((project) => {
        const days = selectDeadlineDays(project.deadline, now);
        const tone = selectDeadlineTone(days);
        const progress = selectProjectProgress(tasks, project.id);
        const palette = categoryPalette[project.categoryId];
        return (
          <Pressable key={project.id} onPress={() => router.push(`/projects/${project.id}`)} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
            <View style={styles.topline}>
              <View style={[styles.projectDot, { backgroundColor: palette.solid }]} />
              <Text style={[styles.days, tone === 'warm' && styles.warm, tone === 'urgent' && styles.urgent]}>{days === 0 ? 'Due today' : `D−${days}`}</Text>
            </View>
            <Text style={styles.title} numberOfLines={2}>{project.title}</Text>
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%`, backgroundColor: palette.solid }]} /></View>
              <Text style={styles.progressText}>{progress.completed}/{progress.total}</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.muted} />
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: { gap: space.sm, paddingRight: space.lg },
  item: { width: 220, minHeight: 132, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  projectDot: { width: 9, height: 9, borderRadius: 5 },
  days: { ...type.meta, color: colors.muted, fontFamily },
  warm: { color: colors.warm },
  urgent: { color: colors.danger },
  title: { ...type.section, color: colors.ink, marginTop: space.sm, minHeight: 44, fontFamily },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.sm },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.track, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { ...type.meta, color: colors.muted, fontFamily },
  pressed: { opacity: 0.7 },
});

