import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { addWeeks, endOfWeek, format, isSameDay, parseISO, startOfWeek, subWeeks } from 'date-fns';
import { DeadlineStrip } from '@/components/DeadlineStrip';
import { Collapsible } from '@/components/Collapsible';
import { CompactSummary } from '@/components/CompactSummary';
import { DayOrbit } from '@/components/DayOrbit';
import { FadeOnChange } from '@/components/FadeOnChange';
import { HistoryCalendar } from '@/components/HistoryCalendar';
import { PressableScale } from '@/components/PressableScale';
import { ScheduleList } from '@/components/ScheduleList';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SwipePager } from '@/components/SwipePager';
import { TaskSection } from '@/components/TaskSection';
import { TaskDragContext, useTaskDragController } from '@/components/useTaskDrag';
import { selectCompletedCountOnDay, selectActiveCategories, selectDayOrbit, selectEventsOnDay, selectGhostRoutines, selectRoutinesForList, selectTodaySections, selectTodayTasks, selectUpcomingProjects } from '@/domain/selectors';
import { useCalendarEvents } from '@/calendar/useCalendarEvents';
import { now } from '@/domain/clock';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { categoryPalette, colors, fontFamily, motion, radius, space, type } from '@/theme/tokens';
import { isReducedMotion } from '@/theme/useReducedMotion';

export default function TodayScreen() {
  const { width, height } = useWindowDimensions();
  const wide = width >= 820;
  const phone = width < 760;
  const scheduleColumn = width >= 1100;
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [page, setPage] = useState<'tasks' | 'schedule'>('tasks');
  const tabBox = useRef<Record<string, { x: number; width: number }>>({});
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorW = useRef(new Animated.Value(0)).current;
  const [indicatorReady, setIndicatorReady] = useState(false);
  // The underline slides between the Tasks and Schedule labels.
  const moveIndicator = useCallback((key: string, animated: boolean) => {
    const box = tabBox.current[key];
    if (!box) return;
    if (!animated || isReducedMotion()) { indicatorX.setValue(box.x); indicatorW.setValue(box.width); setIndicatorReady(true); return; }
    Animated.parallel([
      Animated.timing(indicatorX, { toValue: box.x, duration: motion.page, easing: motion.easeOut, useNativeDriver: false }),
      Animated.timing(indicatorW, { toValue: box.width, duration: motion.page, easing: motion.easeOut, useNativeDriver: false }),
    ]).start();
  }, [indicatorX, indicatorW]);
  useEffect(() => { moveIndicator(page, indicatorReady); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  const categories = useDaymarkStore((state) => state.categories);
  const projects = useDaymarkStore((state) => state.projects);
  const routines = useDaymarkStore((state) => state.routines);
  const tasks = useDaymarkStore((state) => state.tasks);
  const selectedTodayDate = useDaymarkStore((state) => state.selectedTodayDate);
  const setSelectedTodayDate = useDaymarkStore((state) => state.setSelectedTodayDate);
  const events = useDaymarkStore((state) => state.events);
  const addTaskFromEvent = useDaymarkStore((state) => state.addTaskFromEvent);
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
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const moveTaskToDate = useDaymarkStore((state) => state.moveTaskToDate);
  const deleteTask = useDaymarkStore((state) => state.deleteTask);
  const selectedDate = parseISO(selectedTodayDate);
  useCalendarEvents(startOfWeek(subWeeks(selectedDate, 1), { weekStartsOn: 1 }), endOfWeek(addWeeks(selectedDate, 1), { weekStartsOn: 1 }));
  const dayTasks = selectTodayTasks(tasks, selectedDate);
  const sections = selectTodaySections(dayTasks, categories);
  const upcoming = selectUpcomingProjects(projects, now());
  const segments = selectDayOrbit(tasks, selectedDate, categories);
  const completed = selectCompletedCountOnDay(dayTasks, selectedDate);
  const isToday = isSameDay(selectedDate, now());
  const dayEvents = selectEventsOnDay(events, selectedDate);
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

  const selectDate = (date: Date) => setSelectedTodayDate(format(date, 'yyyy-MM-dd'));

  const orbitCard = (
    <View style={[styles.orbitCard, wide && styles.orbitCardWide]}>
      <View style={styles.orbitHeading}><Link href="/daymark-lab" style={styles.orbitEyebrow}>Your day mark ↗</Link><Text style={styles.orbitDate}>{isToday ? 'Today' : format(selectedDate, 'MMM d')}</Text></View>
      <DayOrbit segments={segments} size={wide ? 132 : 112} strokeWidth={wide ? 13 : 11} animate />
      <Text style={styles.orbitNumber}>{completed} of {dayTasks.length}</Text>
      <Text style={styles.orbitCopy}>{dayTasks.length === 0 ? 'Nothing planned for this day.' : 'Completed on this day, kept by category.'}</Text>
      <View style={styles.legend}>{selectActiveCategories(categories).map((category) => <View key={category.id} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: categoryPalette[category.colorKey].solid }]} /><Text style={styles.legendText}>{category.name}</Text></View>)}</View>
    </View>
  );

  const overview = (
    <View style={[styles.overview, wide && styles.overviewWide, phone && styles.overviewPhone]}>
      {orbitCard}
      <HistoryCalendar selectedDate={selectedDate} tasks={tasks} onSelectDate={selectDate} />
    </View>
  );

  const schedule = <ScheduleList events={dayEvents} day={selectedDate} tasks={tasks} categories={categories} isToday={isToday} onAdd={(event, categoryId) => addTaskFromEvent(event, categoryId, selectedTodayDate)} />;

  const tasksColumn = (
    <View style={[styles.tasksColumn, phone && styles.tasksColumnPhone]}>
      <FadeOnChange token={selectedTodayDate}>
          {phone ? null : <View style={styles.tasksHeader}><View><Text style={styles.sectionTitle}>{isToday ? "Today's tasks" : format(selectedDate, 'EEEE, MMM d')}</Text>{!isToday ? <Text style={styles.historyHint}>Tasks and completions from this day</Text> : null}</View><Text style={styles.taskCount}>{Math.max(0, dayTasks.length - completed)} left</Text></View>}
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
              editingList={editingListId === group.category.id}
              onToggleEditList={() => setEditingListId((current) => (current === group.category.id ? null : group.category.id))}
              onCloseEditList={() => setEditingListId((current) => (current === group.category.id ? null : current))}
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
      </FadeOnChange>
    </View>
  );

  return (
    <TaskDragContext.Provider value={drag}>
    <ScrollView
      ref={scrollRef} scrollEnabled={!scrollLocked} scrollEventThrottle={16}
      onScroll={(event) => { scrollY.current = event.nativeEvent.contentOffset.y; }}
      onLayout={(event) => { viewportHeight.current = event.nativeEvent.layout.height; }}
      onContentSizeChange={(_w, height) => { maxScrollY.current = Math.max(0, height - viewportHeight.current); }}
      contentContainerStyle={[styles.scroll, addingListId !== null && !wide && styles.scrollKeyboard]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View ref={contentRef} collapsable={false} style={[styles.page, scheduleColumn && styles.pageWide]}>
        <ScreenHeader eyebrow={isToday ? 'Today' : 'Day archive'} title={format(selectedDate, 'EEEE, MMMM d')} subtitle="Clear · 72° · Los Angeles · sample weather" action={width < 760 ? <Link href="/settings" asChild><Pressable accessibilityRole="link" accessibilityLabel="Settings and account" hitSlop={8} style={styles.settingsButton}><Ionicons name="person-circle-outline" size={26} color={colors.inkSoft} /></Pressable></Link> : undefined} />

        {phone ? <CompactSummary selectedDate={selectedDate} tasks={tasks} categories={categories} completed={completed} total={dayTasks.length} expanded={summaryOpen} onToggle={() => setSummaryOpen((open) => !open)} onSelectDate={selectDate} /> : null}
        {phone ? <Collapsible open={summaryOpen}>{overview}</Collapsible> : overview}

        <View style={[styles.upcomingHeader, phone && styles.upcomingHeaderPhone]}><Text style={styles.sectionLabel}>Upcoming</Text>{phone ? null : <Text style={styles.sectionHint}>Deadlines that need a little attention</Text>}</View>
        <DeadlineStrip projects={upcoming} tasks={tasks} now={now()} compact={phone} />

        {!phone && !scheduleColumn ? <View style={styles.scheduleSection}><Text style={styles.sectionTitle}>Schedule</Text>{schedule}</View> : null}

        {phone ? (
          <View style={styles.tabs}>
            {(['tasks', 'schedule'] as const).map((key) => (
              <PressableScale key={key} accessibilityRole="tab" accessibilityState={{ selected: page === key }} onPress={() => setPage(key)} onLayout={(event) => { const { x, width } = event.nativeEvent.layout; tabBox.current[key] = { x, width }; if (key === page) moveIndicator(key, false); }} style={styles.tab}>
                <Text style={[styles.tabText, page === key && styles.tabTextActive]}>{key === 'tasks' ? 'Tasks' : 'Schedule'}</Text>
                {key === 'schedule' && dayEvents.length > 0 ? <Text style={styles.tabCount}>{dayEvents.length}</Text> : null}
              </PressableScale>
            ))}
            {indicatorReady ? <Animated.View pointerEvents="none" style={[styles.tabIndicator, { left: indicatorX, width: indicatorW }]} /> : null}
            {page === 'tasks' ? <Text style={[styles.taskCount, styles.taskCountPhone]}>{Math.max(0, dayTasks.length - completed)} left</Text> : null}
          </View>
        ) : null}

        {phone ? (
          <SwipePager minHeight={Math.round(height * 0.45)} index={page === 'tasks' ? 0 : 1} count={2} onChange={(next) => setPage(next === 0 ? 'tasks' : 'schedule')}>
            {page === 'tasks' ? tasksColumn : <View style={styles.schedulePage}>{schedule}</View>}
          </SwipePager>
        ) : scheduleColumn ? (
          <View style={styles.split}>{tasksColumn}<View style={styles.scheduleAside}><Text style={styles.sectionTitle}>Schedule</Text><View style={styles.scheduleAsideBody}>{schedule}</View></View></View>
        ) : tasksColumn}
      </View>
    </ScrollView>
    </TaskDragContext.Provider>
  );
}

const styles = StyleSheet.create({
  settingsButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round },
  pageWide: { maxWidth: 1240 },
  scroll: { flexGrow: 1 },
  scrollKeyboard: { paddingBottom: 320 },
  page: { width: '100%', maxWidth: 1040, alignSelf: 'center', paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.xxl },
  overview: { gap: space.md, marginTop: space.lg },
  overviewPhone: { marginTop: space.md },
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
  upcomingHeaderPhone: { marginTop: space.md, marginBottom: space.xs },
  sectionLabel: { ...type.section, color: colors.ink, fontFamily },
  sectionHint: { ...type.meta, color: colors.muted, fontFamily },
  tasksColumn: { width: '100%', maxWidth: 700, marginTop: space.xl },
  tasksColumnPhone: { marginTop: space.sm },
  split: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xxl },
  scheduleAside: { width: 340, marginTop: space.xl },
  scheduleAsideBody: { marginTop: space.sm },
  scheduleSection: { marginTop: space.xl, maxWidth: 700 },
  schedulePage: { paddingTop: space.xs },
  tabs: { flexDirection: 'row', gap: space.lg, marginTop: space.md, borderBottomWidth: 1, borderColor: colors.line },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, marginBottom: -1 },
  tabIndicator: { position: 'absolute', bottom: -1, height: 2, backgroundColor: colors.ink },
  tabText: { ...type.bodyMedium, color: colors.muted, fontFamily },
  tabTextActive: { color: colors.ink },
  tabCount: { ...type.meta, color: colors.muted, fontFamily },
  tasksHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: space.lg },
  sectionTitle: { ...type.title, color: colors.ink, fontFamily },
  historyHint: { ...type.meta, color: colors.muted, marginTop: 2, fontFamily },
  taskCountPhone: { marginTop: 0, alignSelf: 'center' },
  taskCount: { ...type.meta, color: colors.muted, marginLeft: 'auto', marginTop: 8, fontFamily },
  editLists: { ...type.meta, color: colors.muted, marginTop: space.md, alignSelf: 'flex-start', fontFamily },
});
