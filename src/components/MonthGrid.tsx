import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import type { CalendarEvent, Project, Task, TimeBlock } from '@/domain/types';
import { selectDayComplete, selectDayOrbit, selectEventsOnDay } from '@/domain/selectors';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { useCategoryPalette } from '@/store/useCategoryPalette';
import { colors, fontFamily, space, type } from '@/theme/tokens';
import { DayOrbit } from './DayOrbit';

interface MonthGridProps { anchor: Date; events: CalendarEvent[]; blocks: TimeBlock[]; projects: Project[]; tasks: Task[]; onEventPress: (event: CalendarEvent, day: Date) => void; onBlockPress: (block: TimeBlock) => void }

export function MonthGrid({ anchor, events, blocks, projects, tasks, onEventPress, onBlockPress }: MonthGridProps) {
  const { width } = useWindowDimensions();
  const categories = useDaymarkStore((state) => state.categories);
  const paletteFor = useCategoryPalette();
  const compact = width < 680;
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  return (
    <View style={styles.frame}>
      <View style={styles.weekdays}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <Text key={day} style={styles.weekday}>{compact ? day[0] : day}</Text>)}</View>
      <View style={styles.grid}>
        {days.map((day) => {
          const dayEvents = selectEventsOnDay(events, day);
          const dayBlocks = blocks.filter((block) => isSameDay(parseISO(block.startAt), day));
          const deadlines = projects.filter((project) => project.status !== 'archived' && project.deadline && isSameDay(parseISO(project.deadline), day));
          const items: { id: string; title: string; color: string; onPress?: () => void }[] = [
            ...deadlines.map((project) => ({ id: project.id, title: `Due · ${project.title}`, color: paletteFor(project.categoryId).solid })),
            ...dayEvents.map((event) => ({ id: event.id, title: event.title, color: colors.event, onPress: () => onEventPress(event, day) })),
            ...dayBlocks.map((block) => ({ id: block.id, title: taskMap.get(block.taskId)?.title ?? 'Task block', color: (taskMap.get(block.taskId) ? paletteFor(taskMap.get(block.taskId)!.categoryId) : paletteFor('')).solid, onPress: () => onBlockPress(block) })),
          ];
          return (
            <View key={day.toISOString()} style={[styles.cell, compact && styles.cellCompact, !isSameMonth(day, anchor) && styles.outside]}>
              <View style={styles.cellTop}>
                <View style={styles.dateWrap}><Text style={[styles.date, isSameDay(day, anchor) && styles.anchorDate]}>{format(day, 'd')}</Text>{selectDayComplete(tasks, day, categories) ? <Ionicons accessibilityLabel="All done" name="checkmark" size={8} color={colors.muted} style={styles.dateCheck} /> : null}</View>
                <DayOrbit segments={selectDayOrbit(tasks, day, categories)} size={compact ? 18 : 22} strokeWidth={compact ? 3 : 3.5} />
              </View>
              <View style={styles.items}>
                {items.slice(0, compact ? 2 : 3).map((item) => <Pressable key={item.id} accessibilityRole={item.onPress ? 'button' : undefined} accessibilityLabel={item.title} disabled={!item.onPress} onPress={item.onPress} style={styles.item}><View style={[styles.itemDot, { backgroundColor: item.color }]} /><Text style={[styles.itemText, compact && styles.itemTextCompact]} numberOfLines={1}>{item.title}</Text></Pressable>)}
                {items.length > (compact ? 2 : 3) ? <Text style={styles.more}>+{items.length - (compact ? 2 : 3)} more</Text> : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.paper },
  weekdays: { flexDirection: 'row', minHeight: 38, alignItems: 'center', borderBottomWidth: 1, borderColor: colors.line },
  weekday: { flex: 1, textAlign: 'center', ...type.meta, color: colors.muted, fontFamily },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, minHeight: 118, padding: space.xs, borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  cellCompact: { minHeight: 82, padding: 4 },
  outside: { opacity: 0.35, backgroundColor: colors.canvasMuted },
  cellTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.xs },
  dateWrap: { width: 24, height: 24 },
  dateCheck: { position: 'absolute', right: -3, top: 1 },
  date: { width: 24, height: 24, paddingTop: 3, textAlign: 'center', ...type.meta, color: colors.inkSoft, borderRadius: 12, fontFamily },
  anchorDate: { backgroundColor: colors.ink, color: colors.paper },
  items: { gap: 3 },
  item: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemDot: { width: 3, height: 12, borderRadius: 2 },
  itemText: { flex: 1, fontSize: 10, lineHeight: 14, color: colors.inkSoft, fontFamily },
  itemTextCompact: { fontSize: 8.5, lineHeight: 11 },
  more: { fontSize: 9, lineHeight: 12, color: colors.muted, paddingLeft: 7, fontFamily },
});
