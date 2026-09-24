import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { TaskRow } from '@/components/TaskRow';
import { selectDeadlineDays, selectProjectProgress, selectProjectTasks } from '@/domain/selectors';
import { prototypeDate } from '@/store/mockData';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { categoryPalette, colors, fontFamily, radius, space, type } from '@/theme/tokens';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const projects = useDaymarkStore((state) => state.projects);
  const tasks = useDaymarkStore((state) => state.tasks);
  const toggleTask = useDaymarkStore((state) => state.toggleTask);
  const setTaskOnToday = useDaymarkStore((state) => state.setTaskOnToday);
  const setProjectAttentionDays = useDaymarkStore((state) => state.setProjectAttentionDays);
  const project = projects.find((item) => item.id === id);
  if (!project) return <View style={styles.empty}><Text>Project not found.</Text></View>;
  const projectTasks = selectProjectTasks(tasks, project.id);
  const progress = selectProjectProgress(tasks, project.id);
  const percent = progress.total ? progress.completed / progress.total : 0;
  const days = selectDeadlineDays(project.deadline, prototypeDate);
  const palette = categoryPalette[project.categoryId];
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.page}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={18} color={colors.ink} /><Text style={styles.backText}>Projects</Text></Pressable>
        <View style={styles.hero}>
          <View style={[styles.categoryMark, { backgroundColor: palette.solid }]} />
          <Text style={styles.kicker}>Due {format(parseISO(project.deadline), 'EEEE, MMMM d')} · D−{days}</Text>
          <Text style={styles.title}>{project.title}</Text>
          <Text style={styles.notes}>{project.notes}</Text>
          <View style={styles.progressRow}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${percent * 100}%`, backgroundColor: palette.solid }]} /></View><Text style={styles.progressText}>{progress.completed} of {progress.total} complete</Text></View>
          <View style={styles.attention}><Text style={styles.attentionTitle}>Highlight this deadline from</Text><View style={styles.attentionChoices}>{[3, 7, 14, 30].map((lead) => <Pressable key={lead} accessibilityRole="button" accessibilityState={{ selected: (project.attentionDays ?? 7) === lead }} onPress={() => setProjectAttentionDays(project.id, lead)} style={[styles.attentionChoice, (project.attentionDays ?? 7) === lead && styles.attentionChoiceSelected]}><Text style={[styles.attentionChoiceText, (project.attentionDays ?? 7) === lead && styles.attentionChoiceTextSelected]}>{lead} days</Text></Pressable>)}</View></View>
        </View>
        <View style={styles.taskHeader}><Text style={styles.sectionTitle}>Project steps</Text><Text style={styles.hint}>Add any step to Today without making a copy.</Text></View>
        <View style={styles.taskList}>{projectTasks.map((task) => {
          const onToday = task.scheduledDate === format(prototypeDate, 'yyyy-MM-dd');
          return <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id)} trailing={task.completedAt
            ? <Text style={styles.doneDate}>{format(parseISO(task.completedAt), 'MMM d')}</Text>
            : <Pressable accessibilityLabel={onToday ? `Remove ${task.title} from Today` : `Add ${task.title} to Today`} onPress={() => setTaskOnToday(task.id, !onToday)} style={[styles.todayToggle, onToday && { backgroundColor: palette.soft }]}><Ionicons name={onToday ? 'sunny' : 'sunny-outline'} size={16} color={onToday ? palette.solid : colors.muted} /><Text style={[styles.todayText, onToday && { color: palette.ink }]}>{onToday ? 'Today' : 'Add'}</Text></Pressable>} />;
        })}</View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  page: { width: '100%', maxWidth: 820, alignSelf: 'center', padding: space.lg, paddingTop: space.xl, paddingBottom: space.xxl },
  back: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginBottom: space.xl },
  backText: { ...type.bodyMedium, color: colors.ink, fontFamily },
  hero: { paddingBottom: space.xl, borderBottomWidth: 1, borderColor: colors.line },
  categoryMark: { width: 42, height: 6, borderRadius: 3, marginBottom: space.lg },
  kicker: { ...type.meta, color: colors.accent, textTransform: 'uppercase', letterSpacing: 1, fontFamily },
  title: { ...type.display, color: colors.ink, marginTop: space.xs, fontFamily },
  notes: { ...type.body, color: colors.inkSoft, marginTop: space.sm, maxWidth: 580, fontFamily },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xl },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.track, overflow: 'hidden' },
  progressFill: { height: '100%' },
  progressText: { ...type.meta, color: colors.muted, fontFamily },
  attention: { marginTop: space.lg },
  attentionTitle: { ...type.meta, color: colors.muted, fontFamily },
  attentionChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xs },
  attentionChoice: { paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  attentionChoiceSelected: { borderColor: colors.accent, backgroundColor: colors.canvasMuted },
  attentionChoiceText: { ...type.meta, color: colors.inkSoft, fontFamily },
  attentionChoiceTextSelected: { color: colors.accent },
  taskHeader: { marginTop: space.xl, marginBottom: space.md },
  sectionTitle: { ...type.title, color: colors.ink, fontFamily },
  hint: { ...type.body, color: colors.inkSoft, marginTop: space.xs, fontFamily },
  taskList: { padding: space.md, borderRadius: radius.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  todayToggle: { minWidth: 62, height: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: space.xs, borderRadius: radius.round, backgroundColor: colors.track },
  todayText: { ...type.meta, color: colors.muted, fontFamily },
  doneDate: { ...type.meta, color: colors.muted, minWidth: 62, textAlign: 'center', fontFamily },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
