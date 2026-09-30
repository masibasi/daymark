import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { TaskRow } from '@/components/TaskRow';
import { selectDeadlineDays, selectProjectProgress, selectProjectTasks } from '@/domain/selectors';
import { now, todayKey } from '@/domain/clock';
import { confirmAction } from '@/domain/confirm';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { useCategoryPalette } from '@/store/useCategoryPalette';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const projects = useDaymarkStore((state) => state.projects);
  const tasks = useDaymarkStore((state) => state.tasks);
  const toggleTask = useDaymarkStore((state) => state.toggleTask);
  const setTaskOnToday = useDaymarkStore((state) => state.setTaskOnToday);
  const setProjectAttentionDays = useDaymarkStore((state) => state.setProjectAttentionDays);
  const addProjectTask = useDaymarkStore((state) => state.addProjectTask);
  const deleteTask = useDaymarkStore((state) => state.deleteTask);
  const deleteProject = useDaymarkStore((state) => state.deleteProject);
  const paletteFor = useCategoryPalette();
  const [stepTitle, setStepTitle] = useState('');
  const project = projects.find((item) => item.id === id);
  if (!project) return <View style={styles.empty}><Text>Project not found.</Text></View>;
  const projectTasks = selectProjectTasks(tasks, project.id);
  const progress = selectProjectProgress(tasks, project.id);
  const percent = progress.total ? progress.completed / progress.total : 0;
  const days = selectDeadlineDays(project.deadline, now());
  const palette = paletteFor(project.categoryId);

  const addStep = () => {
    if (!stepTitle.trim()) return;
    addProjectTask(project.id, stepTitle);
    setStepTitle('');
  };

  const removeProject = async () => {
    const confirmed = await confirmAction('Delete project', `Delete "${project.title}" and its ${projectTasks.length} step${projectTasks.length === 1 ? '' : 's'}? This cannot be undone.`, 'Delete');
    if (confirmed) { deleteProject(project.id); router.replace('/projects'); }
  };
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.page}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={18} color={colors.ink} /><Text style={styles.backText}>Projects</Text></Pressable>
        <View style={styles.hero}>
          <View style={[styles.categoryMark, { backgroundColor: palette.solid }]} />
          <Text style={[styles.kicker, days < 0 && styles.kickerOverdue]}>Due {format(parseISO(project.deadline), 'EEEE, MMMM d')} · {days < 0 ? `Overdue · D+${Math.abs(days)}` : `D−${days}`}</Text>
          <Text style={styles.title}>{project.title}</Text>
          <Text style={styles.notes}>{project.notes}</Text>
          <View style={styles.progressRow}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${percent * 100}%`, backgroundColor: palette.solid }]} /></View><Text style={styles.progressText}>{progress.completed} of {progress.total} complete</Text></View>
          <View style={styles.attention}><Text style={styles.attentionTitle}>Emphasize this deadline from</Text><View style={styles.attentionChoices}>{[3, 7, 14, 30].map((lead) => <Pressable key={lead} accessibilityRole="button" accessibilityState={{ selected: (project.attentionDays ?? 7) === lead }} onPress={() => setProjectAttentionDays(project.id, lead)} style={[styles.attentionChoice, (project.attentionDays ?? 7) === lead && styles.attentionChoiceSelected]}><Text style={[styles.attentionChoiceText, (project.attentionDays ?? 7) === lead && styles.attentionChoiceTextSelected]}>{lead} days</Text></Pressable>)}</View></View>
        </View>
        <View style={styles.taskHeader}><Text style={styles.sectionTitle}>Project steps</Text><Text style={styles.hint}>Add any step to Today without making a copy.</Text></View>
        <View style={styles.taskList}>
          {projectTasks.length === 0 ? <Text style={styles.emptySteps}>No steps yet. Add the first one below.</Text> : null}
          {projectTasks.map((task) => {
            const onToday = task.scheduledDate === todayKey();
            return <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id)} onDelete={() => deleteTask(task.id)} trailing={task.completedAt
              ? <Text style={styles.doneDate}>{format(parseISO(task.completedAt), 'MMM d')}</Text>
              : <Pressable accessibilityLabel={onToday ? `Remove ${task.title} from Today` : `Add ${task.title} to Today`} onPress={() => setTaskOnToday(task.id, !onToday)} style={[styles.todayToggle, onToday && { backgroundColor: palette.soft }]}><Ionicons name={onToday ? 'sunny' : 'sunny-outline'} size={16} color={onToday ? palette.solid : colors.muted} /><Text style={[styles.todayText, onToday && { color: palette.ink }]}>{onToday ? 'Today' : 'Add'}</Text></Pressable>} />;
          })}
          <View style={styles.addStepRow}>
            <TextInput value={stepTitle} onChangeText={setStepTitle} onSubmitEditing={addStep} placeholder="Add a step" placeholderTextColor={colors.muted} style={styles.addStepInput} />
            <Pressable accessibilityLabel="Save step" onPress={addStep} style={styles.addStepButton}><Ionicons name="arrow-up" size={17} color={colors.paper} /></Pressable>
          </View>
        </View>
        <Pressable accessibilityRole="button" onPress={removeProject} style={styles.deleteProject}><Text style={styles.deleteProjectText}>Delete project</Text></Pressable>
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
  kickerOverdue: { color: colors.danger },
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
  emptySteps: { ...type.body, color: colors.muted, paddingVertical: space.sm, fontFamily },
  addStepRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderColor: colors.line },
  addStepInput: { flex: 1, minHeight: 40, ...type.bodyMedium, fontSize: 16, color: colors.ink, outlineStyle: 'none' as never, fontFamily },
  addStepButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  deleteProject: { alignSelf: 'center', marginTop: space.xl },
  deleteProjectText: { ...type.bodyMedium, color: colors.danger, fontFamily },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
