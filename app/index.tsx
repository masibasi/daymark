import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { addWeeks, endOfWeek, format, isSameDay, parseISO, startOfWeek, subWeeks } from 'date-fns';
import { DeadlineStrip } from '@/components/DeadlineStrip';
import { CarryoverBanner } from '@/components/CarryoverBanner';
import { Collapsible } from '@/components/Collapsible';
import { CompactSummary } from '@/components/CompactSummary';
import { DayOrbit } from '@/components/DayOrbit';
import { FadeOnChange } from '@/components/FadeOnChange';
import { HistoryCalendar } from '@/components/HistoryCalendar';
import { PressableScale } from '@/components/PressableScale';
import { ScheduleList } from '@/components/ScheduleList';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SwipePager } from '@/components/SwipePager';
import { TodaySchedule } from '@/components/TodaySchedule';
import { TaskSection } from '@/components/TaskSection';
import { TaskDragContext, useTaskDragController } from '@/components/useTaskDrag';
import { selectCompletedByCategoryOnDay, selectCompletedCountOnDay, selectDayComplete, selectLateCompletedCountOnDay, selectActiveCategories, selectCarryover, selectDayOrbit, selectEventsOnDay, selectGhostRoutines, selectMissedOnDay, selectRoutineMeta, selectRoutinesForList, selectTodayFolders, selectTodaySections, selectTodayTasks } from '@/domain/selectors';
import { useCalendarEvents } from '@/calendar/useCalendarEvents';
import { useFormat, useT } from '@/i18n';
import { now, todayKey } from '@/domain/clock';
import { useCategoryPalette } from '@/store/useCategoryPalette';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { colors, fontFamily, motion, radius, space, type } from '@/theme/tokens';
import { isReducedMotion } from '@/theme/useReducedMotion';

export default function TodayScreen() {
  const t = useT();
  const fmt = useFormat();
  const { width, height } = useWindowDimensions();
  const wide = width >= 820;
  const phone = width < 760;
  const desk = width >= 760; // tablet + desktop: independent columns (context on the left; schedule + tasks in the main column)
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
  const paletteFor = useCategoryPalette();
  const projects = useDaymarkStore((state) => state.projects);
  const routines = useDaymarkStore((state) => state.routines);
  const collapsedListIds = useDaymarkStore((state) => state.collapsedListIds);
  const dayMarkCollapsed = useDaymarkStore((state) => state.dayMarkCollapsedDesktop);
  const scheduleCollapsed = useDaymarkStore((state) => state.scheduleCollapsed);
  const toggleSchedule = useDaymarkStore((state) => state.toggleSchedule);
  const hasFeeds = useDaymarkStore((state) => state.calendarFeeds.some((feed) => feed.enabled));
  const toggleDayMark = useDaymarkStore((state) => state.toggleDayMarkDesktop);
  const toggleListCollapsed = useDaymarkStore((state) => state.toggleListCollapsed);
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
  const moveTaskToFolder = useDaymarkStore((state) => state.moveTaskToFolder);
  const carryoverDismissed = useDaymarkStore((state) => state.carryoverDismissed);
  const dismissCarryover = useDaymarkStore((state) => state.dismissCarryover);
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
  // A past day also remembers what was left undone on it (moved since): planned, never completed.
  const missed = selectMissedOnDay(tasks, selectedDate);
  const planned = dayTasks.length + missed.length;
  const sections = selectTodaySections(dayTasks, categories, missed);
  const folders = selectTodayFolders(projects);
  const segments = selectDayOrbit(tasks, selectedDate, categories);
  const completed = selectCompletedCountOnDay([...dayTasks, ...missed], selectedDate);
  const late = selectLateCompletedCountOnDay(tasks, selectedDate);
  const dayComplete = selectDayComplete(tasks, selectedDate, categories);
  const isToday = isSameDay(selectedDate, now());
  const byList = selectCompletedByCategoryOnDay([...dayTasks, ...missed], selectedDate, categories);
  const carryover = isToday ? selectCarryover(tasks, todayKey(), carryoverDismissed) : null;
  const dayEvents = selectEventsOnDay(events, selectedDate);
  const drag = useTaskDragController({
    scrollRef,
    getScrollY: () => scrollY.current,
    getMaxScrollY: () => maxScrollY.current,
    foldersFixed: desk,
    setScrollLocked,
    canMove: useCallback((taskId: string, toCategoryId: string) => {
      const task = useDaymarkStore.getState().tasks.find((item) => item.id === taskId);
      return !task || task.categoryId === toCategoryId || !(task.completedAt || task.projectId);
    }, []),
    onDrop: (taskId, toCategoryId, toIndex) => moveTaskInDay(taskId, toCategoryId, toIndex, selectedTodayDate),
    onDropFolder: (taskId, folderId) => moveTaskToFolder(taskId, folderId),
    onBlocked: () => showToast(t.today.blocked),
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
  // Viewing another day: one tap back to today (the Today tab does the same).
  const todayButton = isToday ? null : <Pressable accessibilityRole="button" accessibilityLabel={t.today.backToToday} onPress={() => setSelectedTodayDate(todayKey())} hitSlop={6} style={({ pressed }) => [styles.todayButton, pressed && styles.todayButtonPressed]}><Ionicons name="return-down-back" size={14} color={colors.ink} /><Text style={styles.todayButtonText}>{t.common.today}</Text></Pressable>;

  const orbitCard = (
    <View style={[styles.orbitCard, wide && styles.orbitCardWide, desk && styles.orbitCardDesk]}>
      <View style={desk ? styles.orbitDeskBody : styles.orbitBody}>
        <DayOrbit segments={segments} size={desk ? 120 : wide ? 132 : 112} strokeWidth={desk ? 12 : wide ? 13 : 11} animate />
        <View style={desk ? styles.orbitDeskCopy : styles.orbitBody}>
          <Text style={styles.orbitDate}>{isToday ? t.common.today : fmt(selectedDate, 'monthDay')}</Text>
          {dayComplete ? <View style={styles.orbitDone}><Text style={[styles.orbitNumber, styles.orbitNumberInline, desk && styles.orbitNumberDesk]}>{t.today.allDone}</Text>{isToday ? <Ionicons name="checkmark-circle" size={desk ? 20 : 18} color={colors.ink} /> : null}</View> : completed > 0 ? <Text style={[styles.orbitNumber, desk && styles.orbitNumberDesk]}>{t.today.doneCount(completed)}{late > 0 ? <Text style={styles.orbitLate}> · {t.today.laterCount(late)}</Text> : null}</Text> : <Text style={[styles.orbitNumber, styles.orbitQuiet, desk && styles.orbitNumberDesk]}>{planned === 0 ? t.today.clearDay : isToday ? t.today.nothingYetToday : t.today.nothingChecked}{late > 0 ? <Text style={styles.orbitLate}> · {t.today.laterCount(late)}</Text> : null}</Text>}
          {byList.length > 0 ? <View style={[styles.legend, desk && styles.legendDesk]}>{byList.map(({ category, count }) => <View key={category.id} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: paletteFor(category).solid }]} /><Text style={styles.legendText} numberOfLines={1}>{category.name} {count}</Text></View>)}</View> : null}
        </View>
      </View>
    </View>
  );

  const overview = (
    <View style={[styles.overview, wide && styles.overviewWide, phone && styles.overviewPhone]}>
      {orbitCard}
      <HistoryCalendar selectedDate={selectedDate} tasks={tasks} onSelectDate={selectDate} />
    </View>
  );

  const reflectLink = <Link href="/reflect" accessibilityLabel={t.today.reflectLabel} style={styles.reflectLink}>{t.today.reflectLink}</Link>;

  const schedule = <ScheduleList events={dayEvents} day={selectedDate} tasks={tasks} categories={categories} onAdd={(event, categoryId) => addTaskFromEvent(event, categoryId, selectedTodayDate)} />;

  const folderList = <DeadlineStrip projects={folders} tasks={tasks} now={now()} vertical />;

  const tasksColumn = (
    <View style={[styles.tasksColumn, phone && styles.tasksColumnPhone, desk && styles.tasksColumnDesk]}>
      {desk ? <TodaySchedule events={dayEvents} day={selectedDate} tasks={tasks} categories={categories} hasFeeds={hasFeeds} collapsed={scheduleCollapsed} onToggleCollapsed={toggleSchedule} onAdd={(event, categoryId) => addTaskFromEvent(event, categoryId, selectedTodayDate)} /> : null}
      {carryover ? (
        <CarryoverBanner
          day={carryover.day} tasks={carryover.tasks}
          onBring={() => carryover.tasks.forEach((task) => moveTaskToDate(task.id, todayKey()))}
          onBackToFolder={() => carryover.tasks.filter((task) => task.projectId).forEach((task) => moveTaskToDate(task.id))}
          onLeave={() => dismissCarryover(carryover.day)}
        />
      ) : null}
      <FadeOnChange token={selectedTodayDate}>
          {phone ? null : <View style={styles.tasksHeader}><View><Text style={styles.sectionTitle}>{isToday ? t.today.todaysTasks : fmt(selectedDate, 'weekdayMonthDayShort')}</Text>{!isToday ? <Text style={styles.historyHint}>{t.today.historyHint}</Text> : null}</View><Text style={styles.taskCount}>{t.today.left(Math.max(0, planned - completed))}</Text></View>}
          {sections.map((group) => (
            <TaskSection
              key={group.category.id}
              category={group.category}
              tasks={group.tasks}
              missed={group.missed}
              routines={selectRoutinesForList(routines, group.category.id)}
              ghosts={group.category.archived ? [] : selectGhostRoutines(routines, tasks, group.category.id, selectedDate, now())}
              onToggle={toggleTask}
              onMove={moveTaskToDate}
              onDelete={deleteTask}
              selectedDate={selectedTodayDate}
              projectNames={projectNames}
              adding={addingListId === group.category.id}
              editingList={editingListId === group.category.id}
              collapsed={collapsedListIds.includes(group.category.id)}
              onToggleCollapsed={() => toggleListCollapsed(group.category.id)}
              onToggleEditList={() => setEditingListId((current) => (current === group.category.id ? null : group.category.id))}
              onCloseEditList={() => setEditingListId((current) => (current === group.category.id ? null : current))}
              onOpenAdd={() => setAddingListId(group.category.id)}
              onCloseAdd={() => setAddingListId((current) => (current === group.category.id ? null : current))}
              onAddTask={addTask}
              onAddRoutine={addRoutine}
              onAddFromRoutine={(routineId, complete) => addTaskFromRoutine(routineId, selectedTodayDate, complete)}
              ghostMeta={(routine) => selectRoutineMeta(routine, tasks, selectedDate)}
              onRemoveRoutine={removeRoutine}
              onReveal={reveal}
            />
          ))}
          <Link href="/lists" style={styles.editLists}>{t.today.editLists}</Link>
      </FadeOnChange>
    </View>
  );

  const scrollProps = {
    scrollEnabled: !scrollLocked, scrollEventThrottle: 16, showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: 'handled' as const,
  };

  if (desk) {
    return (
      <TaskDragContext.Provider value={drag}>
        <View style={styles.desk}>
          <ScrollView {...scrollProps} style={[styles.deskLeft, width < 1024 && styles.deskLeftNarrow]} contentContainerStyle={styles.deskLeftContent}>
            <ScreenHeader eyebrow={isToday ? t.common.today : t.today.dayArchive} title={fmt(selectedDate, 'weekdayMonthDay')} action={todayButton} />
            <View style={styles.deskSummary}><CompactSummary selectedDate={selectedDate} tasks={tasks} categories={categories} completed={completed} total={planned} late={late} expanded={!dayMarkCollapsed} onToggle={toggleDayMark} onSelectDate={selectDate} /></View>
            <Collapsible open={!dayMarkCollapsed}><View style={styles.deskStack}>{orbitCard}<HistoryCalendar selectedDate={selectedDate} tasks={tasks} onSelectDate={selectDate} defaultExpanded={height >= 900} /></View></Collapsible>
            {reflectLink}
            <View style={styles.deskBlock}><View style={styles.upcomingHeader}><Text style={styles.sectionLabel}>{t.today.folders}</Text><Text style={styles.sectionHint}>{t.today.foldersHint}</Text></View>{folderList}</View>
          </ScrollView>
          <ScrollView
            {...scrollProps} ref={scrollRef} style={styles.deskMain} contentContainerStyle={styles.deskMainContent}
            onScroll={(event) => { scrollY.current = event.nativeEvent.contentOffset.y; }}
            onLayout={(event) => { viewportHeight.current = event.nativeEvent.layout.height; }}
            onContentSizeChange={(_w, h) => { maxScrollY.current = Math.max(0, h - viewportHeight.current); }}>
            <View ref={contentRef} collapsable={false}>{tasksColumn}</View>
          </ScrollView>
        </View>
      </TaskDragContext.Provider>
    );
  }

  return (
    <TaskDragContext.Provider value={drag}>
    <ScrollView
      ref={scrollRef} scrollEnabled={!scrollLocked} scrollEventThrottle={16}
      onScroll={(event) => { scrollY.current = event.nativeEvent.contentOffset.y; }}
      onLayout={(event) => { viewportHeight.current = event.nativeEvent.layout.height; }}
      onContentSizeChange={(_w, height) => { maxScrollY.current = Math.max(0, height - viewportHeight.current); }}
      contentContainerStyle={[styles.scroll, addingListId !== null && !wide && styles.scrollKeyboard]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View ref={contentRef} collapsable={false} style={styles.page}>
        <ScreenHeader eyebrow={isToday ? t.common.today : t.today.dayArchive} title={fmt(selectedDate, 'weekdayMonthDay')} action={width < 760 ? <View style={styles.headerActions}>{todayButton}<Link href="/settings" asChild><Pressable accessibilityRole="link" accessibilityLabel={t.today.settingsLabel} hitSlop={8} style={styles.settingsButton}><Ionicons name="person-circle-outline" size={26} color={colors.inkSoft} /></Pressable></Link></View> : todayButton} />

        {phone ? <CompactSummary selectedDate={selectedDate} tasks={tasks} categories={categories} completed={completed} total={planned} late={late} expanded={summaryOpen} onToggle={() => setSummaryOpen((open) => !open)} onSelectDate={selectDate} /> : null}
        {phone ? <Collapsible open={summaryOpen}>{overview}</Collapsible> : overview}
        {phone ? reflectLink : null}

        <View style={[styles.upcomingHeader, phone && styles.upcomingHeaderPhone]}><Text style={styles.sectionLabel}>{t.today.folders}</Text>{phone ? null : <Text style={styles.sectionHint}>{t.today.foldersHint}</Text>}</View>
        <DeadlineStrip projects={folders} tasks={tasks} now={now()} compact={phone} />

        {!phone ? <View style={styles.scheduleSection}><Text style={styles.sectionTitle}>{t.today.schedule}</Text>{schedule}</View> : null}

        {phone ? (
          <View style={styles.tabs}>
            {(['tasks', 'schedule'] as const).map((key) => (
              <PressableScale key={key} accessibilityRole="tab" accessibilityState={{ selected: page === key }} onPress={() => setPage(key)} onLayout={(event) => { const { x, width } = event.nativeEvent.layout; tabBox.current[key] = { x, width }; if (key === page) moveIndicator(key, false); }} style={styles.tab}>
                <Text style={[styles.tabText, page === key && styles.tabTextActive]}>{key === 'tasks' ? t.today.tasksTab : t.today.schedule}</Text>
                {key === 'schedule' && dayEvents.length > 0 ? <Text style={styles.tabCount}>{dayEvents.length}</Text> : null}
              </PressableScale>
            ))}
            {indicatorReady ? <Animated.View pointerEvents="none" style={[styles.tabIndicator, { left: indicatorX, width: indicatorW }]} /> : null}
            {page === 'tasks' ? <Text style={[styles.taskCount, styles.taskCountPhone]}>{t.today.left(Math.max(0, planned - completed))}</Text> : null}
          </View>
        ) : null}

        {phone ? (
          <SwipePager minHeight={Math.round(height * 0.45)} index={page === 'tasks' ? 0 : 1} count={2} onChange={(next) => setPage(next === 0 ? 'tasks' : 'schedule')}>
            {page === 'tasks' ? tasksColumn : <View style={styles.schedulePage}>{schedule}</View>}
          </SwipePager>
        ) : tasksColumn}
      </View>
    </ScrollView>
    </TaskDragContext.Provider>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  todayButton: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.sm, borderRadius: 17, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, marginTop: 2 },
  todayButtonPressed: { opacity: 0.6 },
  todayButtonText: { ...type.meta, color: colors.ink, fontFamily },
  settingsButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round },
  scroll: { flexGrow: 1 },
  scrollKeyboard: { paddingBottom: 320 },
  page: { width: '100%', maxWidth: 1040, alignSelf: 'center', paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.xxl },
  overview: { gap: space.md, marginTop: space.lg },
  overviewPhone: { marginTop: space.md },
  overviewWide: { flexDirection: 'row', alignItems: 'flex-start' },
  orbitCard: { minHeight: 0, padding: space.lg, alignItems: 'center', borderRadius: radius.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  orbitCardWide: { width: 300, height: 352, justifyContent: 'center' },
  orbitCardDesk: { width: '100%', height: 'auto', minHeight: 0, padding: space.md, alignItems: 'stretch' },
  orbitBody: { alignItems: 'center' },
  orbitDeskBody: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  orbitDeskCopy: { flex: 1, minWidth: 0 },
  orbitNumberDesk: { marginTop: 0, textAlign: 'left' },
  legendDesk: { justifyContent: 'flex-start', gap: space.xs, marginTop: space.xs },
  orbitDate: { ...type.meta, color: colors.muted, fontFamily },
  orbitDone: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, marginTop: 2 },
  orbitNumberInline: { marginTop: 0 },
  orbitLate: { color: colors.muted, fontWeight: '400' },
  orbitNumber: { ...type.section, color: colors.ink, marginTop: 2, textAlign: 'center', fontFamily },
  orbitQuiet: { color: colors.muted },
  legend: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm, marginTop: space.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { ...type.meta, color: colors.muted, fontFamily },
  upcomingHeader: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: space.xl, marginBottom: space.sm },
  upcomingHeaderPhone: { marginTop: space.md, marginBottom: space.xs },
  sectionLabel: { ...type.section, color: colors.ink, fontFamily },
  sectionHint: { ...type.meta, color: colors.muted, fontFamily },
  tasksColumn: { width: '100%', maxWidth: 700, marginTop: space.xl },
  tasksColumnDesk: { maxWidth: 760, marginTop: 0 },
  desk: { flex: 1, width: '100%', maxWidth: 1440, alignSelf: 'center', flexDirection: 'row', paddingHorizontal: space.lg, gap: space.xl },
  deskLeft: { width: 360, flexGrow: 0, flexShrink: 0 },
  deskLeftNarrow: { width: 300 },
  deskLeftContent: { paddingTop: space.xl, paddingBottom: space.xxl },
  deskSummary: { marginTop: space.md },
  deskStack: { gap: space.sm, marginTop: space.sm },
  deskBlock: { marginTop: space.lg },
  deskMain: { flex: 1, minWidth: 0 },
  deskMainContent: { paddingTop: space.xl, paddingBottom: space.xxl * 2, paddingHorizontal: space.xs },
  tasksColumnPhone: { marginTop: space.sm },
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
  reflectLink: { ...type.meta, color: colors.muted, alignSelf: 'flex-start', marginTop: space.sm, fontFamily },
  editLists: { ...type.meta, color: colors.muted, marginTop: space.md, alignSelf: 'flex-start', fontFamily },
});
