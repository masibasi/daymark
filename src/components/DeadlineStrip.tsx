import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Project, Task } from '@/domain/types';
import { Collapsible } from '@/components/Collapsible';
import { todayKey } from '@/domain/clock';
import { selectDeadlineDays, selectDeadlineTone, selectProjectProgress, selectProjectTasks } from '@/domain/selectors';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { useCategoryPalette } from '@/store/useCategoryPalette';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';

interface DeadlineStripProps { projects: Project[]; tasks: Task[]; now: Date; compact?: boolean }

// `compact` (phone): one-line title with D−n beside it, then progress; keeps tasks on the first screen.
// Tapping a card expands a panel below the strip (a horizontal scroller can't grow in place); only one is open at a time.
export function DeadlineStrip({ projects, tasks, now, compact }: DeadlineStripProps) {
  const paletteFor = useCategoryPalette();
  const [openId, setOpenId] = useState<string | null>(null);
  const [panelId, setPanelId] = useState<string | null>(null); // lingers while the panel collapses
  const toggle = (id: string) => { const next = openId === id ? null : id; setOpenId(next); if (next) setPanelId(next); };
  const panelProject = projects.find((project) => project.id === panelId);
  return (
    <View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.track}>
      {projects.map((project) => {
        const days = selectDeadlineDays(project.deadline, now);
        const tone = selectDeadlineTone(days, project.attentionDays);
        const progress = selectProjectProgress(tasks, project.id);
        const palette = paletteFor(project.categoryId);
        return (
          <Pressable key={project.id} accessibilityRole="button" accessibilityState={{ expanded: openId === project.id }} onPress={() => toggle(project.id)} style={({ pressed }) => [styles.item, compact && styles.itemCompact, openId === project.id && { borderColor: palette.solid }, pressed && styles.pressed]}>
            <View style={styles.topline}>
              <View style={[styles.projectDot, { backgroundColor: palette.solid }]} />
              {compact ? <Text style={[styles.title, styles.titleCompact]} numberOfLines={1}>{project.title}</Text> : null}
              <Text style={[styles.days, tone === 'muted' && styles.muted, tone === 'normal' && styles.normal, tone === 'warm' && styles.warm, tone === 'urgent' && styles.urgent]}>{days === 0 ? 'Due today' : `D−${days}`}</Text>
            </View>
            {compact ? null : <Text style={styles.title} numberOfLines={2}>{project.title}</Text>}
            <View style={[styles.progressRow, compact && styles.progressRowCompact]}>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%`, backgroundColor: palette.solid }]} /></View>
              <Text style={styles.progressText}>{progress.completed}/{progress.total}</Text>
              {compact ? null : <Ionicons name={openId === project.id ? 'chevron-up' : 'chevron-down'} size={14} color={colors.muted} />}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
    <Collapsible open={openId !== null}>{panelProject ? <DeadlinePanel project={panelProject} tasks={tasks} now={now} /> : null}</Collapsible>
    </View>
  );
}

function DeadlinePanel({ project, tasks, now }: { project: Project; tasks: Task[]; now: Date }) {
  const palette = useCategoryPalette()(project.categoryId);
  const setTaskOnToday = useDaymarkStore((state) => state.setTaskOnToday);
  const addProjectTask = useDaymarkStore((state) => state.addProjectTask);
  const [stepTitle, setStepTitle] = useState('');
  const days = selectDeadlineDays(project.deadline, now);
  const tone = selectDeadlineTone(days, project.attentionDays);
  const progress = selectProjectProgress(tasks, project.id);
  const open = selectProjectTasks(tasks, project.id).filter((task) => !task.completedAt);
  const addStep = () => { if (!stepTitle.trim()) return; addProjectTask(project.id, stepTitle); setStepTitle(''); };
  return (
    <View style={styles.panelWrap}>
      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <View style={[styles.projectDot, { backgroundColor: palette.solid }]} />
          <Text style={styles.panelTitle} numberOfLines={2}>{project.title}</Text>
          <Text style={[styles.days, tone === 'muted' && styles.muted, tone === 'normal' && styles.normal, tone === 'warm' && styles.warm, tone === 'urgent' && styles.urgent]}>{days === 0 ? 'Due today' : `D−${days}`}</Text>
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%`, backgroundColor: palette.solid }]} /></View>
          <Text style={styles.progressText}>{progress.completed}/{progress.total}</Text>
        </View>
        {open.length === 0 ? (
          <View>
            <Text style={styles.emptySteps}>No open steps</Text>
            <View style={styles.addStepRow}>
              <TextInput value={stepTitle} onChangeText={setStepTitle} onSubmitEditing={addStep} placeholder="Add a step" placeholderTextColor={colors.muted} style={styles.addStepInput} />
              <Pressable accessibilityLabel="Save step" onPress={addStep} style={styles.addStepButton}><Ionicons name="arrow-up" size={15} color={colors.paper} /></Pressable>
            </View>
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
  item: { width: 220, minHeight: 132, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  itemCompact: { width: 212, minHeight: 0, padding: space.sm, borderRadius: radius.md },
  // background/border are always neutral (colors.paper / colors.line); urgency is carried only by the `days` label color above.
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs },
  projectDot: { width: 9, height: 9, borderRadius: 5 },
  days: { ...type.meta, color: colors.muted, fontFamily },
  muted: { color: colors.muted },
  normal: { color: colors.inkSoft },
  warm: { color: colors.ink },
  urgent: { color: colors.danger },
  title: { ...type.section, color: colors.ink, marginTop: space.sm, minHeight: 44, fontFamily },
  titleCompact: { ...type.bodyMedium, flex: 1, minWidth: 0, marginTop: 0, minHeight: 0 },
  progressRowCompact: { marginTop: 6 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.sm },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.track, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { ...type.meta, color: colors.muted, fontFamily },
  pressed: { opacity: 0.7 },
  panelWrap: { paddingTop: space.sm },
  panel: { padding: space.md, borderRadius: radius.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  panelTitle: { ...type.section, color: colors.ink, flex: 1, minWidth: 0, fontFamily },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 40, borderTopWidth: 1, borderColor: colors.line, marginTop: space.xs, paddingTop: space.xs },
  stepTitle: { ...type.body, color: colors.ink, flex: 1, minWidth: 0, fontFamily },
  todayToggle: { minWidth: 76, height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: space.xs, borderRadius: radius.round, backgroundColor: colors.track },
  todayText: { ...type.meta, color: colors.muted, fontFamily },
  emptySteps: { ...type.body, color: colors.muted, marginTop: space.sm, fontFamily },
  addStepRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs, borderTopWidth: 1, borderColor: colors.line },
  addStepInput: { flex: 1, minHeight: 40, ...type.bodyMedium, fontSize: 16, color: colors.ink, outlineStyle: 'none' as never, fontFamily },
  addStepButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  openLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4, marginTop: space.sm, paddingVertical: space.xs },
  openText: { ...type.bodyMedium, color: colors.inkSoft, fontFamily },
});
