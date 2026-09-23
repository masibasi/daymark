import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ProjectCard } from '@/components/ProjectCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { prototypeDate } from '@/store/mockData';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { colors, fontFamily, space, type } from '@/theme/tokens';

export default function ProjectsScreen() {
  const { width } = useWindowDimensions();
  const projects = useDaymarkStore((state) => state.projects);
  const tasks = useDaymarkStore((state) => state.tasks);
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.page}>
        <ScreenHeader eyebrow="Persistent work" title="Projects" subtitle="Deadlines stay visible, even when they are not part of today." />
        <View style={styles.summary}><Text style={styles.summaryNumber}>{projects.filter((project) => project.status === 'active').length}</Text><Text style={styles.summaryText}>active projects</Text><View style={styles.summaryDivider} /><Text style={styles.summaryText}>Next deadline in 5 days</Text></View>
        <View style={[styles.grid, width < 720 && styles.gridCompact]}>{projects.map((project) => <ProjectCard key={project.id} project={project} tasks={tasks} now={prototypeDate} />)}</View>
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
});

