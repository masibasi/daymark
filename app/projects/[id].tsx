import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { DatePickerModal } from '@/components/DatePickerModal';
import { TaskRow } from '@/components/TaskRow';
import { selectDeadlineDays, selectDeadlineLabel, selectProjectProgress, selectProjectTasks } from '@/domain/selectors';
import { now, todayKey } from '@/domain/clock';
import { confirmAction } from '@/domain/confirm';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { useCategoryPalette } from '@/store/useCategoryPalette';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';
import { useFormat, useLocale, useT } from '@/i18n';

export default function ProjectDetailScreen() {
  const t = useT();
  const fmt = useFormat();
  const ko = useLocale().locale === 'ko';
  const { id } = useLocalSearchParams<{ id: string }>();
  const projects = useDaymarkStore((state) => state.projects);
  const tasks = useDaymarkStore((state) => state.tasks);
  const toggleTask = useDaymarkStore((state) => state.toggleTask);
  const setTaskOnToday = useDaymarkStore((state) => state.setTaskOnToday);
  const setProjectAttentionDays = useDaymarkStore((state) => state.setProjectAttentionDays);
  const addProjectTask = useDaymarkStore((state) => state.addProjectTask);
  const deleteTask = useDaymarkStore((state) => state.deleteTask);
  const deleteProject = useDaymarkStore((state) => state.deleteProject);
  const renameProject = useDaymarkStore((state) => state.renameProject);
  const setProjectDeadline = useDaymarkStore((state) => state.setProjectDeadline);
  const setProjectPinned = useDaymarkStore((state) => state.setProjectPinned);
  const archiveProject = useDaymarkStore((state) => state.archiveProject);
  const restoreProject = useDaymarkStore((state) => state.restoreProject);
  const paletteFor = useCategoryPalette();
  const [stepTitle, setStepTitle] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const project = projects.find((item) => item.id === id);
  const [draft, setDraft] = useState(project?.title ?? '');
  useEffect(() => { setDraft(project?.title ?? ''); }, [project?.title]);
  if (!project) return <View style={styles.empty}><Text>{t.folders.notFound}</Text></View>;
  const projectTasks = selectProjectTasks(tasks, project.id);
  const openTasks = projectTasks.filter((task) => !task.completedAt);
  const doneTasks = projectTasks.filter((task) => task.completedAt);
  const progress = selectProjectProgress(tasks, project.id);
  const percent = progress.total ? progress.completed / progress.total : 0;
  const days = project.deadline ? selectDeadlineDays(project.deadline, now()) : undefined;
  const palette = paletteFor(project.categoryId);

  const addStep = () => {
    if (!stepTitle.trim()) return;
    addProjectTask(project.id, stepTitle);
    setStepTitle('');
  };

  const removeProject = async () => {
    const confirmed = await confirmAction(t.folders.deleteFolderTitle, t.folders.deleteConfirm(project.title, projectTasks.length), t.common.delete);
    if (confirmed) { deleteProject(project.id); router.replace('/projects'); }
  };
  const commitTitle = () => { if (draft.trim()) renameProject(project.id, draft); else setDraft(project.title); };
  const archived = project.status === 'archived';
  const stepRow = (task: (typeof projectTasks)[number]) => {
    const onToday = task.scheduledDate === todayKey();
    return <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id)} onDelete={() => deleteTask(task.id)} trailing={task.completedAt
      ? <Text style={styles.doneDate}>{fmt(parseISO(task.completedAt), 'monthDay')}</Text>
      : <Pressable accessibilityLabel={onToday ? t.strip.removeFromToday(task.title) : t.strip.addToToday(task.title)} onPress={() => setTaskOnToday(task.id, !onToday)} style={[styles.todayToggle, onToday && { backgroundColor: palette.soft }]}><Ionicons name={onToday ? 'sunny' : 'sunny-outline'} size={16} color={onToday ? palette.solid : colors.muted} /><Text style={[styles.todayText, onToday && { color: palette.ink }]}>{onToday ? t.strip.today : t.strip.add}</Text></Pressable>} />;
  };
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.page}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={18} color={colors.ink} /><Text style={styles.backText}>{t.today.folders}</Text></Pressable>
        <View style={styles.hero}>
          <View style={[styles.categoryMark, { backgroundColor: palette.solid }]} />
          <Text style={[styles.kicker, ko && styles.untracked, days !== undefined && days < 0 && styles.kickerOverdue]}>{project.deadline && days !== undefined ? t.folders.dueKicker(fmt(parseISO(project.deadline), 'weekdayMonthDay'), selectDeadlineLabel(days)) : t.folders.folderNoDeadline}</Text>
          <TextInput value={draft} onChangeText={setDraft} onBlur={commitTitle} onSubmitEditing={commitTitle} accessibilityLabel={t.folders.folderName} placeholder={t.folders.folderName} placeholderTextColor={colors.muted} style={styles.title} />
          {project.notes ? <Text style={styles.notes}>{project.notes}</Text> : null}
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.muted} />
            {project.deadline ? (
              <>
                <Text style={styles.metaText}>{t.folders.dueOn(fmt(parseISO(project.deadline), 'weekdayShortMonthDay'))}</Text>
                <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setPickerOpen(true)}><Text style={styles.link}>{t.folders.change}</Text></Pressable>
                <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setProjectDeadline(project.id)}><Text style={styles.link}>{t.common.remove}</Text></Pressable>
              </>
            ) : (
              <>
                <Text style={styles.metaText}>{t.folders.noDeadline}</Text>
                <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setPickerOpen(true)}><Text style={styles.link}>{t.common.add}</Text></Pressable>
              </>
            )}
            <View style={styles.metaSpacer} />
            <Pressable accessibilityRole="button" accessibilityState={{ selected: Boolean(project.pinned) }} accessibilityLabel={project.pinned ? t.folders.unpinFromToday : t.folders.pinToToday} onPress={() => setProjectPinned(project.id, !project.pinned)} style={[styles.pinToggle, project.pinned && styles.pinToggleOn]}>
              <MaterialCommunityIcons name={project.pinned ? 'pin' : 'pin-outline'} size={15} color={project.pinned ? colors.ink : colors.muted} />
              <Text style={[styles.pinText, project.pinned && styles.pinTextOn]}>{project.pinned ? t.strip.pinned : t.folders.pin}</Text>
            </Pressable>
          </View>
          {archived ? <View style={styles.notice}><Text style={styles.noticeText}>{t.folders.archivedNotice}</Text><Pressable accessibilityRole="button" hitSlop={8} onPress={() => restoreProject(project.id)}><Text style={styles.link}>{t.folders.restore}</Text></Pressable></View> : null}
          {!archived && days !== undefined && days < 0 && openTasks.length > 0 ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{t.folders.pastDue}</Text>
              <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setPickerOpen(true)}><Text style={styles.link}>{t.folders.moveDeadline}</Text></Pressable>
              <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setProjectDeadline(project.id)}><Text style={styles.link}>{t.folders.removeDeadline}</Text></Pressable>
            </View>
          ) : null}
          <View style={styles.progressRow}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${percent * 100}%`, backgroundColor: palette.solid }]} /></View><Text style={styles.progressText}>{t.folders.completeOf(progress.completed, progress.total)}</Text></View>
          {project.deadline ? <View style={styles.attention}><Text style={styles.attentionTitle}>{t.folders.emphasize}</Text><View style={styles.attentionChoices}>{[3, 7, 14, 30].map((lead) => <Pressable key={lead} accessibilityRole="button" accessibilityState={{ selected: (project.attentionDays ?? 7) === lead }} onPress={() => setProjectAttentionDays(project.id, lead)} style={[styles.attentionChoice, (project.attentionDays ?? 7) === lead && styles.attentionChoiceSelected]}><Text style={[styles.attentionChoiceText, (project.attentionDays ?? 7) === lead && styles.attentionChoiceTextSelected]}>{t.folders.days(lead)}</Text></Pressable>)}</View></View> : null}
        </View>
        <View style={styles.taskHeader}><Text style={styles.sectionTitle}>{t.folders.steps}</Text><Text style={styles.hint}>{t.folders.stepsHint}</Text></View>
        <View style={styles.taskList}>
          {projectTasks.length === 0 ? <Text style={styles.emptySteps}>{t.folders.noSteps}</Text> : null}
          {openTasks.map(stepRow)}
          {doneTasks.length > 0 ? <Text style={styles.doneLabel}>{t.folders.doneLabel}</Text> : null}
          {doneTasks.map(stepRow)}
          <View style={styles.addStepRow}>
            <TextInput value={stepTitle} onChangeText={setStepTitle} onSubmitEditing={addStep} placeholder={t.strip.addStepPlaceholder} placeholderTextColor={colors.muted} style={styles.addStepInput} />
            <Pressable accessibilityLabel={t.strip.saveStep} onPress={addStep} style={styles.addStepButton}><Ionicons name="arrow-up" size={17} color={colors.paper} /></Pressable>
          </View>
        </View>
        <View style={styles.footer}>
          {archived ? null : <Pressable accessibilityRole="button" onPress={() => archiveProject(project.id)} style={styles.footerAction}><Text style={styles.footerText}>{t.folders.archiveFolder}</Text></Pressable>}
          <Pressable accessibilityRole="button" onPress={removeProject} style={styles.footerAction}><Text style={styles.deleteProjectText}>{t.folders.deleteFolderTitle}</Text></Pressable>
        </View>
      </View>
      {pickerOpen ? <DatePickerModal title={project.deadline ? t.folders.moveDeadlineTitle : t.folders.setDeadline} initialMonth={project.deadline ? parseISO(project.deadline) : now()} onPick={(date) => { setProjectDeadline(project.id, date); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} /> : null}
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
  untracked: { letterSpacing: 0 },
  kicker: { ...type.meta, color: colors.accent, textTransform: 'uppercase', letterSpacing: 1, fontFamily },
  kickerOverdue: { color: colors.danger },
  title: { ...type.display, color: colors.ink, marginTop: space.xs, padding: 0, outlineStyle: 'none' as never, fontFamily },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.xs, minHeight: 40, marginTop: space.sm },
  metaText: { ...type.body, color: colors.inkSoft, fontFamily },
  metaSpacer: { flex: 1 },
  link: { ...type.bodyMedium, color: colors.ink, textDecorationLine: 'underline', fontFamily },
  pinToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: space.sm, borderRadius: radius.round, backgroundColor: colors.track },
  pinToggleOn: { backgroundColor: colors.canvasMuted, borderWidth: 1, borderColor: colors.lineStrong },
  pinText: { ...type.meta, color: colors.muted, fontFamily },
  pinTextOn: { color: colors.ink },
  notice: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.md, minHeight: 40, marginTop: space.sm, paddingHorizontal: space.sm, borderRadius: radius.md, backgroundColor: colors.canvasMuted, borderWidth: 1, borderColor: colors.line },
  noticeText: { ...type.body, color: colors.inkSoft, fontFamily },
  doneLabel: { ...type.meta, color: colors.muted, marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderColor: colors.line, fontFamily },
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
  footer: { flexDirection: 'row', justifyContent: 'center', gap: space.xl, marginTop: space.xl },
  footerAction: { paddingVertical: space.xs },
  footerText: { ...type.bodyMedium, color: colors.inkSoft, fontFamily },
  deleteProjectText: { ...type.bodyMedium, color: colors.danger, fontFamily },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
