import { useCallback, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Link } from 'expo-router';
import { format, isSameDay, parseISO } from 'date-fns';
import { DeadlineStrip } from '@/components/DeadlineStrip';
import { DayOrbit } from '@/components/DayOrbit';
import { HistoryCalendar } from '@/components/HistoryCalendar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TaskSection } from '@/components/TaskSection';
import { TaskDragContext, useTaskDragController } from '@/components/useTaskDrag';
import { selectCompletedCountOnDay, selectActiveCategories, selectDayOrbit, selectGhostRoutines, selectRoutinesForList, selectTodaySections, selectTodayTasks, selectUpcomingProjects } from '@/domain/selectors';
import { now } from '@/domain/clock';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { categoryPalette, colors, fontFamily, radius, space, type } from '@/theme/tokens';

export default function TodayScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const categories = useDaymarkStore((state) => state.categories);
  const projects = useDaymarkStore((state) => state.projects);
  const routines = useDaymarkStore((state) => state.routines);
  const tasks = useDaymarkStore((state) => state.tasks);
  const selectedTodayDate = useDaymarkStore((state) => state.selectedTodayDate);
  const setSelectedTodayDate = useDaymarkStore((state) => state.setSelectedTodayDate);
  const toggleTask = useDaymarkStore((state) => state.toggleTask);
  const addTask = useDaymarkStore((state) => state.addTask);
  const addRoutine = useDaymarkStore((state) => state.addRoutine);
  const addTaskFromRoutine = useDaymarkStore((state) => state.addTaskFromRoutine);
  const removeRoutine = useDaymarkStore((state) => state.removeRoutine);
  const moveTaskInDay = useDaymarkStore((state) => state.moveTaskInDay);
  const showToast = useDaymarkStore((state) => state.showToast);
  const [scrollLocked, setScrollLocked] = useState(false);
  const scrollY = useRef(0);
  const maxScrollY = useRef(0);
  const viewportHeight = useRef(0);
  const [addingListId, setAddingListId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const moveTaskToDate = useDaymarkStore((state) => state.moveTaskToDate);
  const deleteTask = useDaymarkStore((state) => state.deleteTask);
  const selectedDate = parseISO(selectedTodayDate);
  const dayTasks = selectTodayTasks(tasks, selectedDate);
  const sections = selectTodaySections(dayTasks, categories);
  const upcoming = selectUpcomingProjects(projects, now());
  const segments = selectDayOrbit(tasks, selectedDate, categories);
  const completed = selectCompletedCountOnDay(dayTasks, selectedDate);
  const isToday = isSameDay(selectedDate, now());
  const drag = useTaskDragController({
    scrollRef,
    getScrollY: () => scrollY.current,
    getMaxScrollY: () => maxScrollY.current,
    setScrollLocked,
    canMove: useCallback((taskId: string, toCategoryId: string) => {
      const task = useDaymarkStore.getState().tasks.find((item) => item.id === taskId);
      return !task || task.categoryId === toCategoryId || !(task.completedAt || task.projectId);
    }, []),
    onDrop: (taskId, toCategoryId, toIndex) => moveTaskInDay(taskId, toCategoryId, toIndex, selectedTodayDate),
    onBlocked: () => showToast('Project and completed tasks stay in their list'),
  });
  // Bring the opened inline input comfortably into view above the keyboard.
  const reveal = (node: View | null) => {
    if (!node) return;
    setTimeout(() => {
      if (Platform.OS === 'web') (node as unknown as HTMLElement).scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      else if (contentRef.current) node.measureLayout(contentRef.current, (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - 180), animated: true }), () => undefined);
    }, 250);
  };
  const projectNames = Object.fromEntries(projects.map((project) => [project.id, project.title]));

  return (
    <TaskDragContext.Provider value={drag}>
    <ScrollView
      ref={scrollRef} scrollEnabled={!scrollLocked} scrollEventThrottle={16}
      onScroll={(event) => { scrollY.current = event.nativeEvent.contentOffset.y; }}
      onLayout={(event) => { viewportHeight.current = event.nativeEvent.layout.height; }}
      onContentSizeChange={(_w, height) => { maxScrollY.current = Math.max(0, height - viewportHeight.current); }}
      contentContainerStyle={[styles.scroll, addingListId !== null && !wide && styles.scrollKeyboard]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View ref={contentRef} collapsable={false} style={styles.page}>
        <ScreenHeader eyebrow={isToday ? 'Today' : 'Day archive'} title={format(selectedDate, 'EEEE, MMMM d')} subtitle="Clear · 72° · Los Angeles · sample weather" />

        <View style={[styles.overview, wide && styles.overviewWide]}>
          <View style={[styles.orbitCard, wide && styles.orbitCardWide]}>
            <View style={styles.orbitHeading}><Link href="/daymark-lab" style={styles.orbitEyebrow}>Your day mark ↗</Link><Text style={styles.orbitDate}>{isToday ? 'Today' : format(selectedDate, 'MMM d')}</Text></View>
            <DayOrbit segments={segments} size={wide ? 132 : 112} strokeWidth={wide ? 13 : 11} animate />
            <Text style={styles.orbitNumber}>{completed} of {dayTasks.length}</Text>
            <Text style={styles.orbitCopy}>{dayTasks.length === 0 ? 'Nothing planned for this day.' : 'Completed on this day, kept by category.'}</Text>
            <View style={styles.legend}>{selectActiveCategories(categories).map((category) => <View key={category.id} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: categoryPalette[category.colorKey].solid }]} /><Text style={styles.legendText}>{category.name}</Text></View>)}</View>
          </View>
          <HistoryCalendar selectedDate={selectedDate} tasks={tasks} onSelectDate={(date) => setSelectedTodayDate(format(date, 'yyyy-MM-dd'))} />
        </View>

        <View style={styles.upcomingHeader}><Text style={styles.sectionLabel}>Upcoming</Text><Text style={styles.sectionHint}>Deadlines that need a little attention</Text></View>
        <DeadlineStrip projects={upcoming} tasks={tasks} now={now()} />

        <View style={styles.tasksColumn}>
          <View style={styles.tasksHeader}><View><Text style={styles.sectionTitle}>{isToday ? "Today's tasks" : format(selectedDate, 'EEEE, MMM d')}</Text>{!isToday ? <Text style={styles.historyHint}>Tasks and completions from this day</Text> : null}</View><Text style={styles.taskCount}>{Math.max(0, dayTasks.length - completed)} left</Text></View>
          {sections.map((group) => (
            <TaskSection
              key={group.category.id}
              category={group.category}
              tasks={group.tasks}
              routines={selectRoutinesForList(routines, group.category.id)}
              ghosts={group.category.archived ? [] : selectGhostRoutines(routines, dayTasks, group.category.id, selectedDate, now())}
              onToggle={toggleTask}
              onMove={moveTaskToDate}
              onDelete={deleteTask}
              selectedDate={selectedTodayDate}
              projectNames={projectNames}
              adding={addingListId === group.category.id}
              onOpenAdd={() => setAddingListId(group.category.id)}
              onCloseAdd={() => setAddingListId((current) => (current === group.category.id ? null : current))}
              onAddTask={addTask}
              onAddRoutine={addRoutine}
              onAddFromRoutine={(routineId, complete) => addTaskFromRoutine(routineId, selectedTodayDate, complete)}
              onRemoveRoutine={removeRoutine}
              onReveal={reveal}
            />
          ))}
          <Link href="/lists" style={styles.editLists}>Edit lists</Link>
        </View>
      </View>
    </ScrollView>
    </TaskDragContext.Provider>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  scrollKeyboard: { paddingBottom: 320 },
  page: { width: '100%', maxWidth: 1040, alignSelf: 'center', paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.xxl },
  overview: { gap: space.md, marginTop: space.lg },
  overviewWide: { flexDirection: 'row', alignItems: 'flex-start' },
  orbitCard: { minHeight: 304, padding: space.lg, alignItems: 'center', borderRadius: radius.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  orbitCardWide: { width: 300, height: 352 },
  orbitHeading: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  orbitEyebrow: { ...type.meta, color: colors.accent, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily },
  orbitDate: { ...type.meta, color: colors.muted, fontFamily },
  orbitNumber: { ...type.section, color: colors.ink, marginTop: space.sm, fontFamily },
  orbitCopy: { ...type.body, color: colors.inkSoft, textAlign: 'center', marginTop: 2, width: 230, minHeight: 42, fontFamily },
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
  editLists: { ...type.meta, color: colors.muted, marginTop: space.md, alignSelf: 'flex-start', fontFamily },
});
