import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Collapsible } from '@/components/Collapsible';
import { DragRow } from '@/components/DragRow';
import { NewProjectComposer } from '@/components/NewProjectComposer';
import { ProjectCard } from '@/components/ProjectCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TaskDragContext, useTaskDragController } from '@/components/useTaskDrag';
import { now } from '@/domain/clock';
import { confirmAction } from '@/domain/confirm';
import { selectArchivedFolders, selectDeadlineDays, selectFolderGroups, selectProjectProgress, selectUpcomingProjects } from '@/domain/selectors';
import type { Project } from '@/domain/types';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { useCategoryPalette } from '@/store/useCategoryPalette';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';
import { useT } from '@/i18n';

type Group = 'pinned' | 'undated';

export default function FoldersScreen() {
  const t = useT();
  const categories = useDaymarkStore((state) => state.categories);
  const projects = useDaymarkStore((state) => state.projects);
  const tasks = useDaymarkStore((state) => state.tasks);
  const addProject = useDaymarkStore((state) => state.addProject);
  const moveFolder = useDaymarkStore((state) => state.moveFolder);
  const restoreProject = useDaymarkStore((state) => state.restoreProject);
  const deleteProject = useDaymarkStore((state) => state.deleteProject);
  const paletteFor = useCategoryPalette();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [scrollLocked, setScrollLocked] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const maxScrollY = useRef(0);
  const viewportHeight = useRef(0);
  // Reordering reuses the Today drag controller: each group (pinned, undated) is one section that only accepts its own folders.
  const drag = useTaskDragController({
    scrollRef, getScrollY: () => scrollY.current, getMaxScrollY: () => maxScrollY.current, setScrollLocked,
    canMove: useCallback(() => true, []),
    onDrop: (id, group, toIndex) => { moveFolder(id, toIndex, group as Group); return true; },
    onBlocked: () => undefined,
  });
  const current = now();
  const groups = selectFolderGroups(projects);
  const archived = selectArchivedFolders(projects);
  const activeCount = groups.pinned.length + groups.dated.length + groups.undated.length;
  const nextDeadline = selectUpcomingProjects(projects, current, 1)[0];
  const nextDeadlineDays = nextDeadline?.deadline ? selectDeadlineDays(nextDeadline.deadline, current) : undefined;

  const card = (project: Project, list?: Project[], group?: Group) => {
    const index = list ? list.findIndex((item) => item.id === project.id) : -1;
    const body = (
      <View style={styles.slot}>
        <ProjectCard
          project={project} tasks={tasks} now={current}
          onMoveUp={group && index > 0 ? () => moveFolder(project.id, index - 1, group) : undefined}
          onMoveDown={group && list && index < list.length - 1 ? () => moveFolder(project.id, index + 1, group) : undefined}
        />
      </View>
    );
    return <View key={project.id}>{group ? <DragRow taskId={project.id} categoryId={group}>{body}</DragRow> : body}</View>;
  };
  const section = (group: Group, list: Project[]) => (
    <View ref={(node) => drag.registerSection(group, false, node)} collapsable={false}>{list.map((project) => card(project, list, group))}</View>
  );

  const removeArchived = async (project: Project) => {
    const total = selectProjectProgress(tasks, project.id).total;
    if (await confirmAction(t.folders.deleteFolderTitle, t.folders.deleteConfirm(project.title, total), t.common.delete)) deleteProject(project.id);
  };

  return (
    <TaskDragContext.Provider value={drag}>
    <ScrollView
      ref={scrollRef} scrollEnabled={!scrollLocked} scrollEventThrottle={16} contentContainerStyle={styles.scroll}
      onScroll={(event) => { scrollY.current = event.nativeEvent.contentOffset.y; }}
      onLayout={(event) => { viewportHeight.current = event.nativeEvent.layout.height; }}
      onContentSizeChange={(_w, height) => { maxScrollY.current = Math.max(0, height - viewportHeight.current); }}
    >
      <View style={styles.page}>
        <ScreenHeader
          eyebrow={t.folders.eyebrow}
          title={t.folders.title}
          subtitle={t.folders.subtitle}
          action={<NewProjectComposer categories={categories} projects={projects} onCreate={addProject} />}
        />
        <View style={styles.summary}>
          <Text style={styles.summaryText}><Text style={styles.summaryNumber}>{activeCount}</Text>{t.folders.countSuffix(activeCount)}</Text>
          {nextDeadline ? <><View style={styles.summaryDivider} /><Text style={styles.summaryText}>{nextDeadlineDays === 0 ? t.folders.nextDeadlineToday : t.folders.nextDeadlineIn(nextDeadlineDays ?? 0)}</Text></> : null}
        </View>
        {activeCount > 0 ? (
          <>
            {groups.pinned.length > 0 ? <><Text style={styles.sectionLabel}>{t.strip.pinned}</Text>{section('pinned', groups.pinned)}</> : null}
            <Text style={styles.sectionLabel}>{t.today.folders}</Text>
            {groups.dated.map((project) => card(project))}
            {section('undated', groups.undated)}
          </>
        ) : (
          <Text style={styles.empty}>{t.folders.empty}</Text>
        )}
        {archived.length > 0 ? (
          <View style={styles.archive}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: archiveOpen }} onPress={() => setArchiveOpen(!archiveOpen)} style={styles.archiveHead}>
              <Text style={styles.archiveLabel}>{t.folders.archive(archived.length)}</Text>
              <Ionicons name={archiveOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.muted} />
            </Pressable>
            <Collapsible open={archiveOpen}>
              {archived.map((project) => (
                <View key={project.id} style={styles.archivedRow}>
                  <View style={[styles.archivedDot, { backgroundColor: paletteFor(project.categoryId).solid }]} />
                  <Text style={styles.archivedTitle} numberOfLines={1}>{project.title}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={t.folders.restoreName(project.title)} hitSlop={8} onPress={() => restoreProject(project.id)}><Text style={styles.archivedAction}>{t.folders.restore}</Text></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={t.folders.deleteName(project.title)} hitSlop={8} onPress={() => { void removeArchived(project); }}><Text style={styles.archivedDelete}>{t.common.delete}</Text></Pressable>
                </View>
              ))}
            </Collapsible>
          </View>
        ) : null}
      </View>
    </ScrollView>
    </TaskDragContext.Provider>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  page: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: space.lg, paddingTop: space.xl, paddingBottom: space.xxl },
  summary: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs, marginTop: space.xl, marginBottom: space.md },
  summaryNumber: { ...type.title, color: colors.ink, fontFamily },
  summaryText: { ...type.body, color: colors.inkSoft, fontFamily },
  summaryDivider: { width: 1, height: 18, backgroundColor: colors.lineStrong, marginHorizontal: space.sm },
  sectionLabel: { ...type.section, color: colors.ink, marginTop: space.md, marginBottom: space.sm, fontFamily },
  slot: { paddingBottom: space.md },
  empty: { ...type.body, color: colors.muted, paddingVertical: space.xl, fontFamily },
  archive: { marginTop: space.lg },
  archiveHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 40 },
  archiveLabel: { ...type.bodyMedium, color: colors.muted, fontFamily },
  archivedRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48, paddingHorizontal: space.sm, borderTopWidth: 1, borderColor: colors.line },
  archivedDot: { width: 8, height: 8, borderRadius: radius.round },
  archivedTitle: { ...type.body, color: colors.inkSoft, flex: 1, minWidth: 0, fontFamily },
  archivedAction: { ...type.bodyMedium, color: colors.ink, fontFamily },
  archivedDelete: { ...type.bodyMedium, color: colors.muted, fontFamily },
});
