import { useContext, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Project, Task } from '@/domain/types';
import { Collapsible } from '@/components/Collapsible';
import { todayKey } from '@/domain/clock';
import { selectCompletionPrompt, selectDeadlineDays, selectDeadlineLabel, selectDeadlineTone, selectProjectProgress, selectProjectTasks } from '@/domain/selectors';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { useCategoryPalette } from '@/store/useCategoryPalette';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';
import { FolderCompletionRow } from './FolderCompletionRow';
import { TaskDragContext, useDragStore } from './useTaskDrag';

interface DeadlineStripProps { projects: Project[]; tasks: Task[]; now: Date; compact?: boolean; vertical?: boolean }

const toneStyle = (tone: ReturnType<typeof selectDeadlineTone>) => (tone === 'muted' ? styles.muted : tone === 'normal' ? styles.normal : tone === 'warm' ? styles.warm : styles.urgent);

// Today's folder strip: pinned folders and every folder with a deadline, then an "All folders" link.
// `compact` (phone): one-line title with D−n beside it, then progress; keeps tasks on the first screen.
// Tapping a card expands a panel below the strip (a horizontal scroller can't grow in place); only one is open at a time.
// `vertical` (desktop left column): compact cards stacked full width, the panel opens inline right under the tapped card.
// While a task is dragged, the cards are drop targets (ring in the folder's list colour).
export function DeadlineStrip({ projects, tasks, now, compact: compactProp, vertical }: DeadlineStripProps) {
  const compact = compactProp || vertical;
  const paletteFor = useCategoryPalette();
  const controller = useContext(TaskDragContext);
  const hoverId = useDragStore((state) => state.hoverFolderId);
  const [openId, setOpenId] = useState<string | null>(null);
  const [panelId, setPanelId] = useState<string | null>(null); // lingers while the panel collapses
  const toggle = (id: string) => { const next = openId === id ? null : id; setOpenId(next); if (next) setPanelId(next); };
  const panelProject = projects.find((project) => project.id === panelId);
  // An archived or removed folder takes its open panel with it.
  useEffect(() => { if (openId && !projects.some((project) => project.id === openId)) setOpenId(null); }, [projects, openId]);
  const Track = vertical ? View : ScrollView;
  const trackProps = vertical ? { style: styles.trackVertical } : { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: styles.track };
  return (
    <View>
    <Track {...trackProps}>
      {projects.map((project) => {
        const days = project.deadline ? selectDeadlineDays(project.deadline, now) : undefined;
        const tone = days === undefined ? 'muted' : selectDeadlineTone(days, project.attentionDays);
        const progress = selectProjectProgress(tasks, project.id);
        const palette = paletteFor(project.categoryId);
        const title = (
          <View style={[styles.titleRow, compact && styles.titleRowCompact]}>
            {project.pinned ? <MaterialCommunityIcons name="pin" size={15} color={palette.ink} accessibilityLabel="Pinned" style={styles.pin} /> : null}
            <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={compact ? 1 : 2}>{project.title}</Text>
          </View>
        );
        const card = (
          <Pressable key={vertical ? undefined : project.id} ref={(node) => controller?.registerFolder(project.id, node)} collapsable={false} accessibilityRole="button" accessibilityState={{ expanded: openId === project.id }} onPress={() => toggle(project.id)} style={({ pressed }) => [styles.item, compact && styles.itemCompact, vertical && styles.itemVertical, openId === project.id && { borderColor: palette.solid }, vertical && openId === project.id && styles.itemVerticalOpen, pressed && styles.pressed]}>
            {hoverId === project.id ? <View pointerEvents="none" style={[styles.ring, compact && styles.ringCompact, { borderColor: palette.solid }]} /> : null}
            <View style={styles.topline}>
              <View style={[styles.projectDot, { backgroundColor: palette.solid }]} />
              {compact ? title : null}
              {days !== undefined ? <Text style={[styles.days, toneStyle(tone)]}>{selectDeadlineLabel(days)}</Text> : null}
            </View>
            {compact ? null : title}
            <View style={[styles.progressRow, compact && styles.progressRowCompact]}>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%`, backgroundColor: palette.solid }]} /></View>
              <Text style={styles.progressText}>{progress.completed}/{progress.total}</Text>
              {compact ? null : <Ionicons name={openId === project.id ? 'chevron-up' : 'chevron-down'} size={14} color={colors.muted} />}
            </View>
          </Pressable>
        );
        return vertical ? (
          <View key={project.id} style={openId === project.id ? [styles.group, { borderColor: palette.solid }] : undefined}>
            {card}
            <Collapsible open={openId === project.id}>{panelId === project.id ? <DeadlinePanel project={project} tasks={tasks} now={now} inline /> : null}</Collapsible>
          </View>
        ) : card;
      })}
      <Pressable accessibilityRole="link" onPress={() => router.push('/projects')} style={({ pressed }) => [styles.allLink, vertical && styles.allLinkVertical, pressed && styles.pressed]}>
        <Text style={styles.allText}>All folders</Text>
        <Ionicons name="arrow-forward" size={13} color={colors.muted} />
      </Pressable>
    </Track>
    {vertical ? null : <Collapsible open={openId !== null}>{panelProject ? <DeadlinePanel project={panelProject} tasks={tasks} now={now} /> : null}</Collapsible>}
    </View>
  );
}

// `inline` (desktop list): the panel continues the tapped card, so it skips the card's own title, deadline and progress.
function DeadlinePanel({ project, tasks, now, inline }: { project: Project; tasks: Task[]; now: Date; inline?: boolean }) {
  const palette = useCategoryPalette()(project.categoryId);
  const setTaskOnToday = useDaymarkStore((state) => state.setTaskOnToday);
  const addProjectTask = useDaymarkStore((state) => state.addProjectTask);
  const [stepTitle, setStepTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const days = project.deadline ? selectDeadlineDays(project.deadline, now) : undefined;
  const tone = days === undefined ? 'muted' : selectDeadlineTone(days, project.attentionDays);
  const progress = selectProjectProgress(tasks, project.id);
  const open = selectProjectTasks(tasks, project.id).filter((task) => !task.completedAt);
  const prompt = selectCompletionPrompt(project, tasks);
  const addStep = () => { if (!stepTitle.trim()) return; addProjectTask(project.id, stepTitle); setStepTitle(''); };
  return (
    <View style={inline ? undefined : styles.panelWrap}>
      <View style={inline ? styles.panelInline : styles.panel}>
        {inline ? null : <View style={styles.panelHead}>
          <View style={[styles.projectDot, { backgroundColor: palette.solid }]} />
          {project.pinned ? <MaterialCommunityIcons name="pin" size={15} color={palette.ink} accessibilityLabel="Pinned" style={styles.pin} /> : null}
          <Text style={styles.panelTitle} numberOfLines={2}>{project.title}</Text>
          {days !== undefined ? <Text style={[styles.days, toneStyle(tone)]}>{selectDeadlineLabel(days)}</Text> : null}
        </View>}
        {inline ? null : <View style={styles.progressRow}>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%`, backgroundColor: palette.solid }]} /></View>
          <Text style={styles.progressText}>{progress.completed}/{progress.total}</Text>
        </View>}
        {open.length === 0 ? (
          <View>
            {prompt ? <FolderCompletionRow project={project} /> : (
              <View style={styles.emptyRow}>
                <Text style={styles.emptySteps}>{project.deadline ? 'No open steps' : 'Nothing left'}</Text>
                <Text style={styles.emptySteps}>·</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`Add a step to ${project.title}`} hitSlop={8} onPress={() => setAdding(true)}><Text style={styles.emptyAction}>Add</Text></Pressable>
              </View>
            )}
            {adding || prompt ? (
              <View style={styles.addStepRow}>
                <TextInput autoFocus={adding} value={stepTitle} onChangeText={setStepTitle} onSubmitEditing={addStep} placeholder="Add a step" placeholderTextColor={colors.muted} style={styles.addStepInput} />
                <Pressable accessibilityLabel="Save step" onPress={addStep} style={styles.addStepButton}><Ionicons name="arrow-up" size={15} color={colors.paper} /></Pressable>
              </View>
            ) : null}
          </View>
        ) : open.slice(0, 4).map((task) => {
          const onToday = task.scheduledDate === todayKey();
          return (
            <View key={task.id} style={styles.stepRow}>
              <Text style={styles.stepTitle} numberOfLines={1}>{task.title}</Text>
              <Pressable accessibilityLabel={onToday ? `Remove ${task.title} from Today` : `Add ${task.title} to Today`} onPress={() => setTaskOnToday(task.id, !onToday)} style={[styles.todayToggle, onToday && { backgroundColor: palette.soft }]}>
                <Ionicons name={onToday ? 'sunny' : 'sunny-outline'} size={14} color={onToday ? palette.solid : colors.muted} />
                <Text style={[styles.todayText, onToday && { color: palette.ink }]}>{onToday ? 'On Today' : 'Today'}</Text>
              </Pressable>
            </View>
          );
        })}
        <Pressable accessibilityRole="link" onPress={() => router.push(`/projects/${project.id}`)} style={styles.openLink}><Text style={styles.openText}>Open</Text><Ionicons name="arrow-forward" size={14} color={colors.inkSoft} /></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { gap: space.sm, paddingRight: space.lg },
  trackVertical: { gap: space.xs },
  itemVertical: { width: '100%' },
  itemVerticalOpen: { borderWidth: 0, backgroundColor: 'transparent' },
  group: { borderWidth: 1, borderRadius: radius.md, backgroundColor: colors.paper, overflow: 'hidden' },
  panelInline: { paddingHorizontal: space.sm, paddingBottom: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  allLinkVertical: { alignSelf: 'flex-start', paddingHorizontal: space.xxs },
  item: { width: 220, minHeight: 132, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  itemCompact: { width: 212, minHeight: 0, padding: space.sm, borderRadius: radius.md },
  ring: { position: 'absolute', top: -1, left: -1, right: -1, bottom: -1, borderRadius: radius.lg, borderWidth: 2 },
  ringCompact: { borderRadius: radius.md },
  // background/border are always neutral (colors.paper / colors.line); urgency is carried only by the `days` label color above.
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs },
  projectDot: { width: 9, height: 9, borderRadius: 5 },
  days: { ...type.meta, color: colors.muted, fontFamily },
  muted: { color: colors.muted },
  normal: { color: colors.inkSoft },
  warm: { color: colors.ink },
  urgent: { color: colors.danger },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: space.sm, minHeight: 44 },
  titleRowCompact: { alignItems: 'center', flex: 1, minWidth: 0, marginTop: 0, minHeight: 0 },
  pin: { marginTop: 2, transform: [{ rotate: '30deg' }] },
  title: { ...type.section, color: colors.ink, flex: 1, minWidth: 0, fontFamily },
  titleCompact: { ...type.bodyMedium },
  progressRowCompact: { marginTop: 6 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.sm },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.track, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { ...type.meta, color: colors.muted, fontFamily },
  pressed: { opacity: 0.7 },
  allLink: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.sm, minHeight: 40 },
  allText: { ...type.meta, color: colors.muted, fontFamily },
  panelWrap: { paddingTop: space.sm },
  panel: { padding: space.md, borderRadius: radius.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  panelTitle: { ...type.section, color: colors.ink, flex: 1, minWidth: 0, fontFamily },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 40, borderTopWidth: 1, borderColor: colors.line, marginTop: space.xs, paddingTop: space.xs },
  stepTitle: { ...type.body, color: colors.ink, flex: 1, minWidth: 0, fontFamily },
  todayToggle: { minWidth: 76, height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: space.xs, borderRadius: radius.round, backgroundColor: colors.track },
  todayText: { ...type.meta, color: colors.muted, fontFamily },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.sm },
  emptySteps: { ...type.body, color: colors.muted, fontFamily },
  emptyAction: { ...type.bodyMedium, color: colors.ink, fontFamily },
  addStepRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs, borderTopWidth: 1, borderColor: colors.line },
  addStepInput: { flex: 1, minHeight: 40, ...type.bodyMedium, fontSize: 16, color: colors.ink, outlineStyle: 'none' as never, fontFamily },
  addStepButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  openLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4, marginTop: space.sm, paddingVertical: space.xs },
  openText: { ...type.bodyMedium, color: colors.inkSoft, fontFamily },
});
