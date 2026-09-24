import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { format } from 'date-fns';
import { DeadlineStrip } from '@/components/DeadlineStrip';
import { DayOrbit } from '@/components/DayOrbit';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TaskSection } from '@/components/TaskSection';
import { QuickAdd } from '@/components/QuickAdd';
import { selectDayOrbit, selectTasksByCategory, selectTodayTasks, selectUpcomingProjects } from '@/domain/selectors';
import { prototypeDate } from '@/store/mockData';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { categoryPalette, colors, fontFamily, radius, space, type } from '@/theme/tokens';

export default function TodayScreen() {
  const { width } = useWindowDimensions();
  const desktop = width >= 1020;
  const categories = useDaymarkStore((state) => state.categories);
  const projects = useDaymarkStore((state) => state.projects);
  const tasks = useDaymarkStore((state) => state.tasks);
  const toggleTask = useDaymarkStore((state) => state.toggleTask);
  const addTask = useDaymarkStore((state) => state.addTask);
  const todayTasks = selectTodayTasks(tasks, prototypeDate);
  const groups = selectTasksByCategory(todayTasks, categories);
  const upcoming = selectUpcomingProjects(projects, prototypeDate);
  const segments = selectDayOrbit(tasks, prototypeDate);
  const completed = todayTasks.filter((task) => Boolean(task.completedAt)).length;
  const projectNames = Object.fromEntries(projects.map((project) => [project.id, project.title]));

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.page}>
        <ScreenHeader eyebrow={format(prototypeDate, 'EEEE · MMMM d')} title="A gentle day, Jimin." subtitle="Start with what matters. The rest can wait." />
        <View style={styles.upcomingHeader}><Text style={styles.sectionLabel}>Upcoming</Text><Text style={styles.sectionHint}>Deadlines that need a little attention</Text></View>
        <DeadlineStrip projects={upcoming} tasks={tasks} now={prototypeDate} />

        <View style={[styles.todayArea, desktop && styles.todayAreaDesktop]}>
          <View style={styles.tasksColumn}>
            <View style={styles.tasksHeader}><Text style={styles.sectionTitle}>Today's tasks</Text><Text style={styles.taskCount}>{todayTasks.length - completed} left</Text></View>
            {groups.map((group) => <TaskSection key={group.category.id} category={group.category} tasks={group.tasks} onToggle={toggleTask} projectNames={projectNames} />)}
            <QuickAdd categories={categories} onAdd={addTask} />
          </View>
          <View style={[styles.orbitCard, desktop && styles.orbitCardDesktop]}>
            <Text style={styles.orbitEyebrow}>Your day mark</Text>
            <DayOrbit segments={segments} size={desktop ? 148 : 112} strokeWidth={desktop ? 16 : 13} />
            <Text style={styles.orbitNumber}>{completed} of {todayTasks.length}</Text>
            <Text style={styles.orbitCopy}>Each color keeps its place as your day fills in.</Text>
            <View style={styles.legend}>{categories.map((category) => <View key={category.id} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: categoryPalette[category.colorKey].solid }]} /><Text style={styles.legendText}>{category.name}</Text></View>)}</View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  page: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.xxl },
  upcomingHeader: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: space.xl, marginBottom: space.sm },
  sectionLabel: { ...type.section, color: colors.ink, fontFamily },
  sectionHint: { ...type.meta, color: colors.muted, fontFamily },
  todayArea: { marginTop: space.xl },
  todayAreaDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: 56 },
  tasksColumn: { flex: 1, minWidth: 0, maxWidth: 650 },
  tasksHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: space.lg },
  sectionTitle: { ...type.title, color: colors.ink, fontFamily },
  taskCount: { ...type.meta, color: colors.muted, marginLeft: 'auto', fontFamily },
  orbitCard: { marginTop: space.lg, padding: space.lg, alignItems: 'center', borderRadius: radius.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  orbitCardDesktop: { width: 300, marginTop: 0 },
  orbitEyebrow: { ...type.meta, color: colors.accent, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: space.lg, fontFamily },
  orbitNumber: { ...type.section, color: colors.ink, marginTop: space.md, fontFamily },
  orbitCopy: { ...type.body, color: colors.inkSoft, textAlign: 'center', marginTop: space.xs, maxWidth: 220, fontFamily },
  legend: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm, marginTop: space.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { ...type.meta, color: colors.muted, fontFamily },
});
