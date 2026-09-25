import { Pressable, StyleSheet, Text, View } from 'react-native';
import { addDays, addMinutes, format, parseISO } from 'date-fns';
import type { CalendarEvent, Category, Task, TimeBlock } from '@/domain/types';
import { selectFreeSlots, selectSuggestedStarts, selectTaskBlocksOnDay, type AgendaItem } from '@/domain/selectors';
import { categoryPalette, colors, fontFamily, radius, space, type } from '@/theme/tokens';
import { TaskRow } from './TaskRow';
import { TodayTimeline } from './TodayTimeline';

const DURATIONS = [
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '1.5h', minutes: 90 },
  { label: '2h', minutes: 120 },
];

export interface ReserveConfig {
  openTaskId: string | null;
  duration: number;
  onSetDuration: (minutes: number) => void;
  onToggleTray: (taskId: string) => void;
  day: Date;
  isToday: boolean;
  now: Date;
  events: CalendarEvent[];
  blocks: TimeBlock[];
  agenda: AgendaItem[];
  onAddTimeBlock: (taskId: string, startAt: string, endAt: string) => void;
}

interface TaskSectionProps { category: Category; tasks: Task[]; onToggle: (id: string) => void; onMove?: (id: string, date?: string) => void; selectedDate?: string; projectNames: Record<string, string>; reserve?: ReserveConfig }

export function TaskSection({ category, tasks, onToggle, onMove, selectedDate, projectNames, reserve }: TaskSectionProps) {
  const palette = categoryPalette[category.colorKey];
  const completed = tasks.filter((task) => Boolean(task.completedAt)).length;

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View style={[styles.dot, { backgroundColor: palette.solid }]} />
        <Text style={styles.name}>{category.name}</Text>
        <Text style={styles.count}>{completed}/{tasks.length}</Text>
      </View>
      <View style={styles.tasks}>
        {tasks.map((task) => {
          const taskBlocks = reserve ? selectTaskBlocksOnDay(reserve.blocks, task.id, reserve.day) : [];
          const timeLabel = taskBlocks.length > 0
            ? `${format(parseISO(taskBlocks[0].startAt), 'h:mm')}–${format(parseISO(taskBlocks[taskBlocks.length - 1].endAt), 'h:mm a')}`
            : undefined;
          return (
            <View key={task.id}>
              <TaskRow
                task={task}
                onToggle={() => onToggle(task.id)}
                onMove={onMove ? (date) => onMove(task.id, date) : undefined}
                selectedDate={selectedDate}
                projectTitle={task.projectId ? projectNames[task.projectId] : undefined}
                timeLabel={timeLabel}
                onReserve={reserve ? () => reserve.onToggleTray(task.id) : undefined}
                reserveOpen={reserve?.openTaskId === task.id}
              />
              {reserve && reserve.openTaskId === task.id ? (
                <ReserveTray task={task} palette={palette} reserve={reserve} />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ReserveTray({ task, palette, reserve }: { task: Task; palette: (typeof categoryPalette)[keyof typeof categoryPalette]; reserve: ReserveConfig }) {
  const freeSlots = selectFreeSlots(reserve.events, reserve.blocks, reserve.day, {
    from: reserve.isToday ? reserve.now : undefined,
    minMinutes: reserve.duration,
  });
  const suggestions = selectSuggestedStarts(freeSlots, reserve.duration);

  const reserveAt = (startAt: string) => {
    reserve.onAddTimeBlock(task.id, startAt, addMinutes(parseISO(startAt), reserve.duration).toISOString());
    reserve.onToggleTray(task.id);
  };

  const reserveTomorrowMorning = () => {
    const tomorrow = addDays(reserve.day, 1);
    const [first] = selectFreeSlots(reserve.events, reserve.blocks, tomorrow, { minMinutes: reserve.duration });
    if (first) reserveAt(first.startAt);
  };

  return (
    <View style={[styles.tray, { borderColor: palette.solid }]}>
      <View style={styles.chipRow}>
        {DURATIONS.map((option) => {
          const selected = reserve.duration === option.minutes;
          return (
            <Pressable key={option.minutes} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => reserve.onSetDuration(option.minutes)} style={[styles.chip, { backgroundColor: selected ? palette.solid : colors.track }]}>
              <Text style={[styles.chipText, { color: selected ? colors.white : colors.inkSoft }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {suggestions.length > 0 ? (
        <View style={styles.chipRow}>
          {suggestions.map((startAt) => (
            <Pressable key={startAt} accessibilityRole="button" accessibilityLabel={`Reserve ${format(parseISO(startAt), 'h:mm a')} for ${task.title}`} onPress={() => reserveAt(startAt)} style={[styles.chip, { backgroundColor: palette.soft }]}>
              <Text style={[styles.chipText, { color: palette.ink }]}>{format(parseISO(startAt), 'h:mm a')}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.chipRow}>
          <Text style={styles.noRoom}>No open time left on this day</Text>
          <Pressable accessibilityRole="button" onPress={reserveTomorrowMorning} style={[styles.chip, { backgroundColor: palette.soft }]}>
            <Text style={[styles.chipText, { color: palette.ink }]}>Tomorrow morning</Text>
          </Pressable>
        </View>
      )}
      {freeSlots.length > 0 ? <>
        <Text style={styles.hint}>Or tap an open gap</Text>
        <TodayTimeline compact day={reserve.day} isToday={reserve.isToday} now={reserve.now} agenda={reserve.agenda} freeSlots={freeSlots} highlightCategoryKey={task.categoryId} onReserveGap={reserveAt} onRemoveBlock={() => undefined} />
      </> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: space.lg },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { ...type.section, color: colors.ink, fontFamily },
  count: { ...type.meta, color: colors.muted, marginLeft: 'auto', fontFamily },
  tasks: { paddingLeft: 1 },
  tray: { marginBottom: space.sm, marginTop: -space.xxs, padding: space.sm, borderRadius: radius.md, borderWidth: 1, backgroundColor: colors.paper, gap: space.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.round },
  chipText: { ...type.meta, fontFamily },
  noRoom: { ...type.meta, color: colors.muted, fontFamily },
  hint: { ...type.meta, color: colors.muted, fontFamily },
});
