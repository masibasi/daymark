import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addMonths, addWeeks, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek, subMonths, subWeeks } from 'date-fns';
import { MonthGrid } from '@/components/MonthGrid';
import { EventActions, eventTimeRange, SheetAction } from '@/components/EventActions';
import { EventSheet } from '@/components/EventSheet';
import { SegmentedControl } from '@/components/SegmentedControl';
import { WeekGrid } from '@/components/WeekGrid';
import { useCalendarEvents } from '@/calendar/useCalendarEvents';
import { now } from '@/domain/clock';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import type { CalendarEvent, TimeBlock } from '@/domain/types';
import { colors, fontFamily, space, type } from '@/theme/tokens';

export default function CalendarScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 680;
  const [selection, setSelection] = useState<{ event: CalendarEvent; day: Date } | { block: TimeBlock } | null>(null);
  const view = useDaymarkStore((state) => state.calendarView);
  const dateString = useDaymarkStore((state) => state.calendarDate);
  const setView = useDaymarkStore((state) => state.setCalendarView);
  const setDate = useDaymarkStore((state) => state.setCalendarDate);
  const removeTimeBlock = useDaymarkStore((state) => state.removeTimeBlock);
  const addTaskFromEvent = useDaymarkStore((state) => state.addTaskFromEvent);
  const categories = useDaymarkStore((state) => state.categories);
  const tasks = useDaymarkStore((state) => state.tasks);
  const projects = useDaymarkStore((state) => state.projects);
  const events = useDaymarkStore((state) => state.events);
  const blocks = useDaymarkStore((state) => state.timeBlocks);
  const anchor = parseISO(dateString);
  // Week: the shown week +-1 week. Month: the visible 6-week grid +-1 week (both stay under the function's 62-day cap).
  useCalendarEvents(
    subWeeks(view === 'week' ? startOfWeek(anchor, { weekStartsOn: 1 }) : startOfWeek(startOfMonth(anchor)), 1),
    addWeeks(view === 'week' ? endOfWeek(anchor, { weekStartsOn: 1 }) : endOfWeek(endOfMonth(anchor)), 1),
  );
  const move = (direction: -1 | 1) => setDate((view === 'week' ? (direction < 0 ? subWeeks : addWeeks) : (direction < 0 ? subMonths : addMonths))(anchor, 1).toISOString());

  const close = () => setSelection(null);
  const selectedBlock = selection && 'block' in selection ? selection.block : undefined;
  const blockTask = tasks.find((task) => task.id === selectedBlock?.taskId);
  const openEvent = (event: CalendarEvent, day: Date) => setSelection({ event, day });
  const openBlock = (block: TimeBlock) => setSelection({ block });

  return (
    <View style={styles.page}>
      <View style={[styles.toolbar, compact && styles.toolbarCompact]}>
        <View><Text style={styles.eyebrow}>Calendar</Text><Text style={styles.title}>{format(anchor, view === 'week' ? "MMMM yyyy" : 'MMMM yyyy')}</Text></View>
        <View style={styles.toolbarActions}>
          <SegmentedControl value={view} options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} onChange={setView} />
          <View style={styles.periodControls}><Pressable accessibilityLabel="Previous period" onPress={() => move(-1)} style={styles.iconButton}><Ionicons name="chevron-back" size={18} color={colors.ink} /></Pressable><Pressable onPress={() => setDate(now().toISOString())} style={styles.todayButton}><Text style={styles.todayText}>Today</Text></Pressable><Pressable accessibilityLabel="Next period" onPress={() => move(1)} style={styles.iconButton}><Ionicons name="chevron-forward" size={18} color={colors.ink} /></Pressable><Pressable accessibilityRole="link" accessibilityLabel="Reflect on this period" hitSlop={6} onPress={() => router.push(`/reflect?period=${view}&date=${format(anchor, 'yyyy-MM-dd')}`)} style={styles.reflectButton}><Text style={styles.reflectText}>Reflect</Text></Pressable></View>
        </View>
      </View>
      <View style={styles.gridWrap}>{view === 'week' ? <WeekGrid anchor={anchor} events={events} blocks={blocks} tasks={tasks} onEventPress={openEvent} onBlockPress={openBlock} /> : <MonthGrid anchor={anchor} events={events} blocks={blocks} projects={projects} tasks={tasks} onEventPress={openEvent} onBlockPress={openBlock} />}</View>
      <EventSheet
        visible={selection !== null}
        title={selection && 'event' in selection ? selection.event.title : blockTask?.title ?? 'Task block'}
        subtitle={selection && 'event' in selection ? `${format(selection.day, 'EEE, MMM d')} · ${eventTimeRange(selection.event)}` : selectedBlock ? `${format(parseISO(selectedBlock.startAt), 'EEE, MMM d · h:mm')}–${format(parseISO(selectedBlock.endAt), 'h:mm a')}` : ''}
        onClose={close}
      >
        {selection && 'event' in selection ? <EventActions event={selection.event} day={selection.day} tasks={tasks} categories={categories} onAdd={(event, categoryId) => { addTaskFromEvent(event, categoryId, format(selection.day, 'yyyy-MM-dd')); close(); }} /> : null}
        {selectedBlock ? <SheetAction label="Remove" onPress={() => { removeTimeBlock(selectedBlock.id); close(); }} /> : null}
      </EventSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: space.lg, paddingBottom: space.md },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: space.md, maxWidth: 1380, width: '100%', alignSelf: 'center', marginBottom: space.md },
  toolbarCompact: { flexDirection: 'column', alignItems: 'stretch' },
  eyebrow: { ...type.meta, color: colors.accent, textTransform: 'uppercase', letterSpacing: 1.1, fontFamily },
  title: { ...type.title, color: colors.ink, marginTop: 2, fontFamily },
  toolbarActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  periodControls: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  iconButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  todayButton: { height: 34, paddingHorizontal: space.sm, borderRadius: 17, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  todayText: { ...type.meta, color: colors.ink, fontFamily },
  reflectButton: { height: 34, paddingHorizontal: space.xs, justifyContent: 'center', marginLeft: space.xxs },
  reflectText: { ...type.meta, color: colors.muted, fontFamily },
  gridWrap: { flex: 1, width: '100%', maxWidth: 1380, alignSelf: 'center' },
});
