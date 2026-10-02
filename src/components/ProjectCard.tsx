import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { router } from 'expo-router';
import type { Project, Task } from '@/domain/types';
import { confirmAction } from '@/domain/confirm';
import { selectCompletionPrompt, selectDeadlineDays, selectDeadlineLabel, selectProjectProgress } from '@/domain/selectors';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { useCategoryPalette } from '@/store/useCategoryPalette';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';
import { FolderCompletionRow } from './FolderCompletionRow';
import { FolderMenu, type FolderMenuItem } from './FolderMenu';
import { justDragged } from './useTaskDrag';

interface ProjectCardProps { project: Project; tasks: Task[]; now: Date; onMoveUp?: () => void; onMoveDown?: () => void }

// One folder on the Folders tab. The body opens the folder (web: click, ignored right after a drag; native: press); the `…` menu and the
// completion row sit outside that tap area so they never open the folder.
export function ProjectCard({ project, tasks, now, onMoveUp, onMoveDown }: ProjectCardProps) {
  const palette = useCategoryPalette()(project.categoryId);
  const setProjectPinned = useDaymarkStore((state) => state.setProjectPinned);
  const archiveProject = useDaymarkStore((state) => state.archiveProject);
  const deleteProject = useDaymarkStore((state) => state.deleteProject);
  const progress = selectProjectProgress(tasks, project.id);
  const days = project.deadline ? selectDeadlineDays(project.deadline, now) : undefined;
  const percent = progress.total ? progress.completed / progress.total : 0;
  const open = () => router.push(`/projects/${project.id}`);
  const tap = Platform.OS === 'web'
    ? ({ onClick: () => { if (!justDragged()) open(); }, onKeyDown: (event: { key: string }) => { if (event.key === 'Enter') open(); }, tabIndex: 0 } as object)
    : { onPress: open };
  const Body = (Platform.OS === 'web' ? View : Pressable) as typeof Pressable;

  const removeFolder = async () => {
    const confirmed = await confirmAction('Delete folder', `Delete "${project.title}" and its ${progress.total} step${progress.total === 1 ? '' : 's'}? This cannot be undone.`, 'Delete');
    if (confirmed) deleteProject(project.id);
  };
  const items: FolderMenuItem[] = [
    { label: project.pinned ? 'Unpin' : 'Pin to Today', icon: project.pinned ? 'pin-off' : 'pin', onPress: () => setProjectPinned(project.id, !project.pinned) },
    ...(onMoveUp ? [{ label: 'Move up', icon: 'arrow-up-outline' as const, onPress: onMoveUp }] : []),
    ...(onMoveDown ? [{ label: 'Move down', icon: 'arrow-down-outline' as const, onPress: onMoveDown }] : []),
    { label: 'Archive', icon: 'archive-outline', onPress: () => archiveProject(project.id) },
    { label: 'Delete', icon: 'trash-outline', onPress: () => { void removeFolder(); }, danger: true },
  ];

  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: palette.solid }]} />
      <View style={styles.content}>
        <Body accessibilityRole="link" accessibilityLabel={`Open ${project.title}`} {...tap}>
          <View style={styles.top}>
            <View style={[styles.dot, { backgroundColor: palette.solid }]} />
            <Text style={styles.date}>{project.deadline ? `Due ${format(parseISO(project.deadline), 'MMM d')}` : 'No deadline'}</Text>
            {days !== undefined ? <Text style={[styles.days, days < 0 && styles.overdue, days >= 0 && days <= 3 && { color: colors.accent }]}>{selectDeadlineLabel(days)}</Text> : null}
          </View>
          <View style={styles.titleRow}>
            {project.pinned ? <MaterialCommunityIcons name="pin" size={16} color={palette.ink} accessibilityLabel="Pinned" style={styles.pin} /> : null}
            <Text style={styles.title} numberOfLines={2}>{project.title}</Text>
          </View>
          {project.notes ? <Text style={styles.notes} numberOfLines={1}>{project.notes}</Text> : null}
          <View style={styles.bottom}>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${percent * 100}%`, backgroundColor: palette.solid }]} /></View>
            <Text style={styles.progress}>{progress.total === 0 ? 'Empty' : `${progress.completed} of ${progress.total}`}</Text>
          </View>
        </Body>
        {selectCompletionPrompt(project, tasks) ? <FolderCompletionRow project={project} /> : null}
      </View>
      <View style={styles.menu}><FolderMenu label={`More options for ${project.title}`} items={items} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  pin: { transform: [{ rotate: '30deg' }], marginTop: 2 },
  card: { width: '100%', flexDirection: 'row', backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', ...Platform.select({ web: { cursor: 'pointer' } as object, default: {} }) },
  accent: { width: 5 },
  content: { flex: 1, minWidth: 0, padding: space.lg, paddingTop: space.md },
  menu: { position: 'absolute', top: space.xs, right: space.xs },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingRight: 40, minHeight: 28 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  date: { ...type.meta, color: colors.muted, fontFamily },
  days: { ...type.meta, color: colors.inkSoft, fontFamily },
  overdue: { color: colors.danger },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.xxs },
  title: { ...type.section, color: colors.ink, fontSize: 19, flexShrink: 1, fontFamily },
  notes: { ...type.body, color: colors.inkSoft, marginTop: space.xxs, fontFamily },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.md },
  progressTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' },
  progressFill: { height: '100%' },
  progress: { ...type.meta, color: colors.muted, fontFamily },
});
