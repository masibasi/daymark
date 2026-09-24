import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { format, isSameDay, parseISO } from 'date-fns';
import { DeadlineStrip } from '@/components/DeadlineStrip';
import { DayOrbit } from '@/components/DayOrbit';
import { HistoryCalendar } from '@/components/HistoryCalendar';
import { QuickAdd } from '@/components/QuickAdd';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TaskSection } from '@/components/TaskSection';
import { selectCompletedCountOnDay, selectDayOrbit, selectTasksByCategory, selectTodayTasks, selectUpcomingProjects } from '@/domain/selectors';
import { prototypeDate } from '@/store/mockData';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { categoryPalette, colors, fontFamily, radius, space, type } from '@/theme/tokens';

export default function TodayScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const categories = useDaymarkStore((state) => state.categories);
  const projects = useDaymarkStore((state) => state.projects);
  const tasks = useDaymarkStore((state) => state.tasks);
  const selectedTodayDate = useDaymarkStore((state) => state.selectedTodayDate);
  const setSelectedTodayDate = useDaymarkStore((state) => state.setSelectedTodayDate);
  const toggleTask = useDaymarkStore((state) => state.toggleTask);
  const addTask = useDaymarkStore((state) => state.addTask);
  const selectedDate = parseISO(selectedTodayDate);
  const dayTasks = selectTodayTasks(tasks, selectedDate);
  const groups = selectTasksByCategory(dayTasks, categories);
  const upcoming = selectUpcomingProjects(projects, prototypeDate);
  const segments = selectDayOrbit(tasks, selectedDate);
  const completed = selectCompletedCountOnDay(dayTasks, selectedDate);
  const isToday = isSameDay(selectedDate, prototypeDate);
  const projectNames = Object.fromEntries(projects.map((project) => [project.id, project.title]));

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.page}>
        <ScreenHeader eyebrow={format(selectedDate, 'EEEE · MMMM d')} title={isToday ? 'A gentle day, Jimin.' : `A day in ${format(selectedDate, 'MMMM')}.`} subtitle={isToday ? 'Start with what matters. The rest can wait.' : 'Completed work leaves a mark you can return to.'} />

        <View style={[styles.overview, wide && styles.overviewWide]}>
          <View style={[styles.orbitCard, wide && styles.orbitCardWide]}>
            <View style={styles.orbitHeading}><Text style={styles.orbitEyebrow}>Your day mark</Text><Text style={styles.orbitDate}>{isToday ? 'Today' : format(selectedDate, 'MMM d')}</Text></View>
            <DayOrbit segments={segments} size={wide ? 132 : 112} strokeWidth={wide ? 15 : 13} />
            <Text style={styles.orbitNumber}>{completed} of {dayTasks.length}</Text>
            <Text style={styles.orbitCopy}>{dayTasks.length === 0 ? 'Nothing planned for this day.' : 'Completed on this day, kept by category.'}</Text>
            <View style={styles.legend}>{categories.map((category) => <View key={category.id} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: categoryPalette[category.colorKey].solid }]} /><Text style={styles.legendText}>{category.name}</Text></View>)}</View>
          </View>
          <HistoryCalendar selectedDate={selectedDate} tasks={tasks} onSelectDate={(date) => setSelectedTodayDate(format(date, 'yyyy-MM-dd'))} />
        </View>

        <View style={styles.upcomingHeader}><Text style={styles.sectionLabel}>Upcoming</Text><Text style={styles.sectionHint}>Deadlines that need a little attention</Text></View>
        <DeadlineStrip projects={upcoming} tasks={tasks} now={prototypeDate} />

        <View style={styles.tasksColumn}>
          <View style={styles.tasksHeader}><View><Text style={styles.sectionTitle}>{isToday ? "Today's tasks" : format(selectedDate, 'EEEE, MMM d')}</Text>{!isToday ? <Text style={styles.historyHint}>Tasks and completions from this day</Text> : null}</View><Text style={styles.taskCount}>{Math.max(0, dayTasks.length - completed)} left</Text></View>
          {groups.length > 0 ? groups.map((group) => <TaskSection key={group.category.id} category={group.category} tasks={group.tasks} onToggle={toggleTask} projectNames={projectNames} />) : <Text style={styles.empty}>A clear day. Add something small, or leave it open.</Text>}
          <QuickAdd categories={categories} onAdd={addTask} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  page: { width: '100%', maxWidth: 1040, alignSelf: 'center', paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.xxl },
  overview: { gap: space.md, marginTop: space.lg },
  overviewWide: { flexDirection: 'row', alignItems: 'stretch' },
  orbitCard: { padding: space.lg, alignItems: 'center', borderRadius: radius.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  orbitCardWide: { width: 300 },
  orbitHeading: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  orbitEyebrow: { ...type.meta, color: colors.accent, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily },
  orbitDate: { ...type.meta, color: colors.muted, fontFamily },
  orbitNumber: { ...type.section, color: colors.ink, marginTop: space.sm, fontFamily },
  orbitCopy: { ...type.body, color: colors.inkSoft, textAlign: 'center', marginTop: 2, maxWidth: 230, fontFamily },
  legend: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm, marginTop: space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { ...type.meta, color: colors.muted, fontFamily },
  upcomingHeader: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: space.xl, marginBottom: space.sm },
  sectionLabel: { ...type.section, color: colors.ink, fontFamily },
  sectionHint: { ...type.meta, color: colors.muted, fontFamily },
  tasksColumn: { width: '100%', maxWidth: 700, marginTop: space.xl },
  tasksHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: space.lg },
  sectionTitle: { ...type.title, color: colors.ink, fontFamily },
  historyHint: { ...type.meta, color: colors.muted, marginTop: 2, fontFamily },
  taskCount: { ...type.meta, color: colors.muted, marginLeft: 'auto', marginTop: 8, fontFamily },
  empty: { ...type.body, color: colors.muted, paddingVertical: space.lg, fontFamily },
});
