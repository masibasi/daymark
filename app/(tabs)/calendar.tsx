import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { addDays, addMonths, parseISO } from 'date-fns';
import { MonthGrid } from '../../src/components/MonthGrid';
import { ScheduleTaskSheet } from '../../src/components/ScheduleTaskSheet';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { WeekTimeGrid, type GridBlock } from '../../src/components/WeekTimeGrid';
import { dateKeyOf, daysOfWeek, formatMonthTitle, toDateKey } from '../../src/domain/dateUtils';
import { selectDayMark, selectUnscheduledTasksForSheet } from '../../src/domain/selectors';
import type { CategoryColorKey } from '../../src/theme/categoryColors';
import { useResponsive } from '../../src/hooks/useResponsive';
import { useStore } from '../../src/store/useStore';
import { palette, radii, spacing, type as typeScale, weight } from '../../src/theme/tokens';

export default function CalendarScreen() {
  const { isPhone } = useResponsive();
  const today = useStore((s) => s.today);
  const categories = useStore((s) => s.categories);
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const calendarEvents = useStore((s) => s.calendarEvents);
  const timeBlocks = useStore((s) => s.timeBlocks);
  const calendarView = useStore((s) => s.calendarView);
  const calendarDate = useStore((s) => s.calendarDate);
  const placingTaskId = useStore((s) => s.placingTaskId);
  const setCalendarView = useStore((s) => s.setCalendarView);
  const setCalendarDate = useStore((s) => s.setCalendarDate);
  const beginPlacingTask = useStore((s) => s.beginPlacingTask);
  const cancelPlacingTask = useStore((s) => s.cancelPlacingTask);
  const addTimeBlock = useStore((s) => s.addTimeBlock);

  const [sheetOpen, setSheetOpen] = useState(false);

  const todayDate = useMemo(() => new Date(`${today}T12:00:00`), [today]);
  const anchorDate = useMemo(() => parseISO(calendarDate), [calendarDate]);

  const categoryColorOf = (categoryId: string): CategoryColorKey =>
    categories.find((c) => c.id === categoryId)?.color ?? 'study';

  const taskById = (id: string) => tasks.find((t) => t.id === id);

  // ---- Week view data ----
  const weekDays = useMemo(() => {
    const full = daysOfWeek(anchorDate);
    return isPhone ? full.slice(0, 3) : full;
  }, [anchorDate, isPhone]);

  const blocksByDay = useMemo(() => {
    const map = new Map<string, GridBlock[]>();
    for (const day of weekDays) {
      map.set(toDateKey(day), []);
    }
    for (const event of calendarEvents) {
      if (event.allDay) continue;
      const key = dateKeyOf(event.start);
      if (!map.has(key)) continue;
      map.get(key)!.push({
        id: event.id,
        kind: 'event',
        title: event.title,
        start: event.start,
        end: event.end,
        color: event.color,
      });
    }
    for (const block of timeBlocks) {
      const key = dateKeyOf(block.start);
      if (!map.has(key)) continue;
      const task = taskById(block.taskId);
      if (!task) continue;
      map.get(key)!.push({
        id: block.id,
        kind: 'task',
        title: task.title,
        start: block.start,
        end: block.end,
        categoryColor: categoryColorOf(task.categoryId),
        completed: !!task.completedAt,
      });
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDays, calendarEvents, timeBlocks, tasks, categories]);

  const allDayEvents = useMemo(
    () =>
      calendarEvents.filter(
        (e) => e.allDay && weekDays.some((d) => toDateKey(d) === dateKeyOf(e.start))
      ),
    [calendarEvents, weekDays]
  );

  // ---- Month view data ----
  const eventsByDay = (key: string) =>
    calendarEvents.filter((e) => !e.allDay && dateKeyOf(e.start) === key).slice(0, 6);
  const deadlinesByDay = (key: string) => projects.filter((p) => p.deadline === key);
  const dayMarkByDay = (key: string) => selectDayMark(tasks, categories, key);

  // ---- Navigation ----
  const goPrev = () => {
    if (calendarView === 'month') setCalendarDate(toDateKey(addMonths(anchorDate, -1)));
    else setCalendarDate(toDateKey(addDays(anchorDate, isPhone ? -3 : -7)));
  };
  const goNext = () => {
    if (calendarView === 'month') setCalendarDate(toDateKey(addMonths(anchorDate, 1)));
    else setCalendarDate(toDateKey(addDays(anchorDate, isPhone ? 3 : 7)));
  };
  const goToday = () => setCalendarDate(today);

  const unscheduledTasks = selectUnscheduledTasksForSheet(
    tasks,
    new Set(timeBlocks.map((b) => b.taskId)),
    today
  ).map((task) => ({ task, categoryColor: categoryColorOf(task.categoryId) }));

  const handleSlotPress = (dateKey: string, hour: number) => {
    if (!placingTaskId) return;
    const h = Math.floor(hour);
    const m = hour % 1 >= 0.5 ? 30 : 0;
    const start = `${dateKey}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    const endHour = m === 30 ? h + 1 : h;
    const endMin = m === 30 ? 0 : 30;
    const end = `${dateKey}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;
    addTimeBlock(placingTaskId, start, end);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Calendar"
        subtitle={formatMonthTitle(anchorDate)}
        right={
          <View style={styles.segmented}>
            {(['week', 'month'] as const).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setCalendarView(mode)}
                style={[styles.segment, calendarView === mode && styles.segmentActive]}
              >
                <Text
                  style={[styles.segmentText, calendarView === mode && styles.segmentTextActive]}
                >
                  {mode === 'week' ? 'Week' : 'Month'}
                </Text>
              </Pressable>
            ))}
          </View>
        }
      />

      <View style={styles.controlsRow}>
        <View style={styles.navButtons}>
          <Pressable onPress={goPrev} style={styles.navButton}>
            <Text style={styles.navButtonText}>‹</Text>
          </Pressable>
          <Pressable onPress={goToday} style={styles.todayButton}>
            <Text style={styles.todayButtonText}>Today</Text>
          </Pressable>
          <Pressable onPress={goNext} style={styles.navButton}>
            <Text style={styles.navButtonText}>›</Text>
          </Pressable>
        </View>
        {calendarView === 'week' && (
          <Pressable
            style={styles.scheduleButton}
            onPress={() => {
              if (placingTaskId) {
                cancelPlacingTask();
              } else {
                setSheetOpen(true);
              }
            }}
          >
            <Text style={styles.scheduleButtonText}>
              {placingTaskId ? 'Cancel placement' : 'Schedule a task'}
            </Text>
          </Pressable>
        )}
      </View>

      {placingTaskId && (
        <View style={styles.placingHint}>
          <Text style={styles.placingHintText}>
            Tap an open slot to schedule "{taskById(placingTaskId)?.title}"
          </Text>
        </View>
      )}

      {calendarView === 'week' ? (
        <View style={styles.weekWrap}>
          {allDayEvents.length > 0 && (
            <View style={styles.allDayRow}>
              {allDayEvents.map((e) => (
                <View key={e.id} style={styles.allDayChip}>
                  <Text style={styles.allDayText} numberOfLines={1}>
                    {e.title}
                  </Text>
                </View>
              ))}
            </View>
          )}
          <WeekTimeGrid
            days={weekDays}
            today={todayDate}
            blocksByDay={blocksByDay}
            placing={!!placingTaskId}
            onSlotPress={handleSlotPress}
          />
        </View>
      ) : (
        <View style={styles.monthWrap}>
          <MonthGrid
            monthAnchor={anchorDate}
            today={todayDate}
            eventsByDay={eventsByDay}
            deadlinesByDay={deadlinesByDay}
            dayMarkByDay={dayMarkByDay}
            categoryColorOf={categoryColorOf}
            onSelectDay={(key) => {
              setCalendarDate(key);
              setCalendarView('week');
            }}
          />
        </View>
      )}

      <ScheduleTaskSheet
        visible={sheetOpen}
        tasks={unscheduledTasks}
        onSelect={(taskId) => {
          beginPlacingTask(taskId);
          setSheetOpen(false);
        }}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: palette.hairline,
    borderRadius: radii.pill,
    padding: 2,
  },
  segment: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  segmentActive: {
    backgroundColor: palette.surface,
  },
  segmentText: {
    fontSize: typeScale.label,
    color: palette.inkSecondary,
    fontWeight: weight.medium,
  },
  segmentTextActive: {
    color: palette.ink,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
    rowGap: spacing.xs,
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  navButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: typeScale.title,
    color: palette.inkSecondary,
  },
  todayButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  todayButtonText: {
    fontSize: typeScale.label,
    color: palette.ink,
    fontWeight: weight.medium,
  },
  scheduleButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: palette.ink,
  },
  scheduleButtonText: {
    fontSize: typeScale.label,
    color: palette.surface,
    fontWeight: weight.medium,
  },
  placingHint: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#E7EDFC',
    borderRadius: radii.sm,
  },
  placingHintText: {
    fontSize: typeScale.label,
    color: '#3A5FC4',
  },
  weekWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  allDayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
    marginBottom: spacing.xs,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: palette.hairline,
  },
  allDayChip: {
    backgroundColor: palette.hairline,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  allDayText: {
    fontSize: typeScale.micro,
    color: palette.ink,
  },
  monthWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
});
