import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { NewProjectComposer } from '@/components/NewProjectComposer';
import { ProjectCard } from '@/components/ProjectCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { now } from '@/domain/clock';
import { selectDeadlineDays, selectUpcomingProjects } from '@/domain/selectors';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { colors, fontFamily, space, type } from '@/theme/tokens';

export default function ProjectsScreen() {
  const { width } = useWindowDimensions();
  const categories = useDaymarkStore((state) => state.categories);
  const projects = useDaymarkStore((state) => state.projects);
  const tasks = useDaymarkStore((state) => state.tasks);
  const addProject = useDaymarkStore((state) => state.addProject);
  const current = now();
  const nextDeadline = selectUpcomingProjects(projects, current, 1)[0];
  const nextDeadlineDays = nextDeadline ? selectDeadlineDays(nextDeadline.deadline, current) : undefined;
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.page}>
        <ScreenHeader
          eyebrow="Persistent work"
          title="Projects"
          subtitle="Deadlines stay visible, even when they are not part of today."
          action={<NewProjectComposer categories={categories} onCreate={addProject} />}
        />
        <View style={styles.summary}>
          <Text style={styles.summaryNumber}>{projects.filter((project) => project.status === 'active').length}</Text>
          <Text style={styles.summaryText}>active projects</Text>
          <View style={styles.summaryDivider} />
          <Text style={styles.summaryText}>{nextDeadline ? (nextDeadlineDays === 0 ? 'Next deadline is today' : `Next deadline in ${nextDeadlineDays} day${nextDeadlineDays === 1 ? '' : 's'}`) : 'No upcoming deadlines'}</Text>
        </View>
        {projects.length > 0 ? (
          <View style={[styles.grid, width < 720 && styles.gridCompact]}>{projects.map((project) => <ProjectCard key={project.id} project={project} tasks={tasks} now={current} />)}</View>
        ) : (
          <Text style={styles.empty}>No projects yet. Start one with a title, category, and deadline.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  page: { width: '100%', maxWidth: 1120, alignSelf: 'center', padding: space.lg, paddingTop: space.xl, paddingBottom: space.xxl },
  summary: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs, marginTop: space.xl, marginBottom: space.lg },
  summaryNumber: { ...type.title, color: colors.ink, fontFamily },
  summaryText: { ...type.body, color: colors.inkSoft, fontFamily },
  summaryDivider: { width: 1, height: 18, backgroundColor: colors.lineStrong, marginHorizontal: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  gridCompact: { flexDirection: 'column' },
  empty: { ...type.body, color: colors.muted, paddingVertical: space.xl, fontFamily },
});

