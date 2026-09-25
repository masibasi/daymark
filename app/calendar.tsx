import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addMonths, addWeeks, format, parseISO, subMonths, subWeeks } from 'date-fns';
import { MonthGrid } from '@/components/MonthGrid';
import { SchedulePanel } from '@/components/SchedulePanel';
import { SegmentedControl } from '@/components/SegmentedControl';
import { WeekGrid } from '@/components/WeekGrid';
import { now } from '@/domain/clock';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';

export default function CalendarScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 680;
  const [panelOpen, setPanelOpen] = useState(false);
  const view = useDaymarkStore((state) => state.calendarView);
  const dateString = useDaymarkStore((state) => state.calendarDate);
  const setView = useDaymarkStore((state) => state.setCalendarView);
  const setDate = useDaymarkStore((state) => state.setCalendarDate);
  const scheduleTaskId = useDaymarkStore((state) => state.scheduleTaskId);
  const setScheduleTask = useDaymarkStore((state) => state.setScheduleTask);
  const addTimeBlock = useDaymarkStore((state) => state.addTimeBlock);
  const tasks = useDaymarkStore((state) => state.tasks);
  const projects = useDaymarkStore((state) => state.projects);
  const events = useDaymarkStore((state) => state.events);
  const blocks = useDaymarkStore((state) => state.timeBlocks);
  const anchor = parseISO(dateString);
  const move = (direction: -1 | 1) => setDate((view === 'week' ? (direction < 0 ? subWeeks : addWeeks) : (direction < 0 ? subMonths : addMonths))(anchor, 1).toISOString());

  const schedule = (startAt: string, endAt: string) => {
    if (!scheduleTaskId) return;
    addTimeBlock(scheduleTaskId, startAt, endAt);
  };

  return (
    <View style={styles.page}>
      <View style={[styles.toolbar, compact && styles.toolbarCompact]}>
        <View><Text style={styles.eyebrow}>Calendar</Text><Text style={styles.title}>{format(anchor, view === 'week' ? "MMMM yyyy" : 'MMMM yyyy')}</Text></View>
        <View style={styles.toolbarActions}>
          <SegmentedControl value={view} options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} onChange={setView} />
          <View style={styles.periodControls}><Pressable accessibilityLabel="Previous period" onPress={() => move(-1)} style={styles.iconButton}><Ionicons name="chevron-back" size={18} color={colors.ink} /></Pressable><Pressable onPress={() => setDate(now().toISOString())} style={styles.todayButton}><Text style={styles.todayText}>Today</Text></Pressable><Pressable accessibilityLabel="Next period" onPress={() => move(1)} style={styles.iconButton}><Ionicons name="chevron-forward" size={18} color={colors.ink} /></Pressable></View>
        </View>
      </View>
      {scheduleTaskId ? <View style={styles.scheduleBanner}><View style={styles.pulse} /><Text style={styles.bannerText}>Choose a free slot for <Text style={styles.bannerStrong}>{tasks.find((task) => task.id === scheduleTaskId)?.title}</Text></Text><Pressable onPress={() => setScheduleTask(undefined)}><Text style={styles.cancel}>Cancel</Text></Pressable></View> : null}
      <View style={styles.gridWrap}>{view === 'week' ? <WeekGrid anchor={anchor} events={events} blocks={blocks} tasks={tasks} scheduleTaskId={scheduleTaskId} onSchedule={schedule} /> : <MonthGrid anchor={anchor} events={events} blocks={blocks} projects={projects} tasks={tasks} />}</View>
      {view === 'week' ? <Pressable onPress={() => setPanelOpen(true)} style={styles.scheduleButton}><Ionicons name="time-outline" size={18} color={colors.paper} /><Text style={styles.scheduleText}>Schedule a task</Text></Pressable> : null}
      <SchedulePanel visible={panelOpen} tasks={tasks} selectedTaskId={scheduleTaskId} onSelect={setScheduleTask} onClose={() => setPanelOpen(false)} />
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
  gridWrap: { flex: 1, width: '100%', maxWidth: 1380, alignSelf: 'center' },
  scheduleButton: { position: 'absolute', right: space.xl, bottom: space.xl, minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, borderRadius: radius.round, backgroundColor: colors.ink },
  scheduleText: { ...type.bodyMedium, color: colors.paper, fontFamily },
  scheduleBanner: { width: '100%', maxWidth: 1380, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingVertical: space.xs, marginBottom: space.xs },
  pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  bannerText: { ...type.meta, flex: 1, color: colors.inkSoft, fontFamily },
  bannerStrong: { color: colors.ink },
  cancel: { ...type.meta, color: colors.danger, fontFamily },
});
