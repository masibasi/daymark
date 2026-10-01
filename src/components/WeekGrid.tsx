import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { addMinutes, eachDayOfInterval, endOfWeek, format, getHours, getMinutes, isSameDay, parseISO, setHours, setMinutes, startOfWeek } from 'date-fns';
import { selectEventsOnDay } from '@/domain/selectors';
import type { CalendarEvent, Task, TimeBlock } from '@/domain/types';
import { colors, fontFamily, type } from '@/theme/tokens';
import { CalendarBlock } from './CalendarBlock';

const START_HOUR = 8;
const END_HOUR = 21;

interface WeekGridProps {
  anchor: Date;
  events: CalendarEvent[];
  blocks: TimeBlock[];
  tasks: Task[];
  scheduleTaskId?: string;
  onSchedule: (startAt: string, endAt: string) => void;
}

export function WeekGrid({ anchor, events, blocks, tasks, scheduleTaskId, onSchedule }: WeekGridProps) {
  const { width } = useWindowDimensions();
  const compact = width < 680;
  const hourHeight = compact ? 62 : 70;
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(anchor, { weekStartsOn: 1 }) });
  const days = compact ? weekDays.slice(0, 3) : weekDays;
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => START_HOUR + index);
  const taskMap = new Map(tasks.map((task) => [task.id, task]));

  return (
    <View style={styles.frame}>
      <View style={styles.headerRow}>
        <View style={styles.gutterHeader} />
        {days.map((day) => <View key={day.toISOString()} style={styles.dayHeader}><Text style={styles.weekday}>{format(day, 'EEE')}</Text><Text style={[styles.dayNumber, isSameDay(day, anchor) && styles.today]}>{format(day, 'd')}</Text></View>)}
      </View>
      <View style={styles.allDayRow}>
        <Text style={styles.allDayLabel}>all-day</Text>
        {days.map((day) => {
          const dayEvents = selectEventsOnDay(events, day).filter((event) => event.allDay);
          return <View key={day.toISOString()} style={styles.allDayCell}>{dayEvents.map((event) => <CalendarBlock key={event.id} event={event} compact />)}</View>;
        })}
      </View>
      <ScrollView style={styles.scroller} contentContainerStyle={{ height: (END_HOUR - START_HOUR) * hourHeight }}>
        <View style={styles.gridRow}>
          <View style={styles.timeGutter}>
            {hours.slice(0, -1).map((hour) => <Text key={hour} style={[styles.hourLabel, { top: (hour - START_HOUR) * hourHeight - 8 }]}>{format(setHours(new Date(2026, 0, 1), hour), 'h a')}</Text>)}
          </View>
          {days.map((day) => {
            const dayEvents = events.filter((event) => !event.allDay && isSameDay(parseISO(event.startAt), day));
            const dayBlocks = blocks.filter((block) => isSameDay(parseISO(block.startAt), day));
            return (
              <View key={day.toISOString()} style={styles.dayColumn}>
                {hours.slice(0, -1).map((hour) => (
                  <View key={hour} style={[styles.hourCell, { height: hourHeight }]}>
                    <View style={styles.halfLine} />
                    {scheduleTaskId ? [0, 30].map((minute) => {
                      const start = setMinutes(setHours(day, hour), minute);
                      return <Pressable key={minute} accessibilityLabel={`Schedule at ${format(start, 'EEE h:mm a')}`} onPress={() => onSchedule(start.toISOString(), addMinutes(start, 60).toISOString())} style={[styles.slot, { top: minute === 0 ? 0 : hourHeight / 2, height: hourHeight / 2 }]} />;
                    }) : null}
                  </View>
                ))}
                {dayEvents.map((event) => <PositionedBlock key={event.id} startAt={event.startAt} endAt={event.endAt} hourHeight={hourHeight}><CalendarBlock event={event} /></PositionedBlock>)}
                {dayBlocks.map((block) => <PositionedBlock key={block.id} startAt={block.startAt} endAt={block.endAt} hourHeight={hourHeight}><CalendarBlock block={block} task={taskMap.get(block.taskId)} /></PositionedBlock>)}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function PositionedBlock({ startAt, endAt, hourHeight, children }: { startAt: string; endAt: string; hourHeight: number; children: React.ReactNode }) {
  const start = parseISO(startAt);
  const end = parseISO(endAt);
  const startMinutes = (getHours(start) - START_HOUR) * 60 + getMinutes(start);
  const duration = Math.max(30, (end.getTime() - start.getTime()) / 60000);
  return <View style={[styles.positioned, { top: (startMinutes / 60) * hourHeight + 2, height: (duration / 60) * hourHeight - 4 }]}>{children}</View>;
}

const styles = StyleSheet.create({
  frame: { flex: 1, minHeight: 500, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 18, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', minHeight: 58, borderBottomWidth: 1, borderColor: colors.line },
  gutterHeader: { width: 48 },
  dayHeader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, borderLeftWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  weekday: { ...type.meta, color: colors.muted, fontFamily },
  dayNumber: { width: 26, height: 26, borderRadius: 13, textAlign: 'center', paddingTop: 4, ...type.bodyMedium, color: colors.ink, fontFamily },
  today: { backgroundColor: colors.ink, color: colors.paper },
  allDayRow: { flexDirection: 'row', minHeight: 34, borderBottomWidth: 1, borderColor: colors.lineStrong },
  allDayLabel: { width: 48, paddingTop: 8, paddingRight: 6, textAlign: 'right', fontSize: 9, color: colors.muted, fontFamily },
  allDayCell: { flex: 1, padding: 3, borderLeftWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  scroller: { flex: 1 },
  gridRow: { flex: 1, flexDirection: 'row' },
  timeGutter: { width: 48, position: 'relative' },
  hourLabel: { position: 'absolute', right: 7, fontSize: 9, color: colors.muted, fontFamily },
  dayColumn: { flex: 1, position: 'relative', borderLeftWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  hourCell: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line, position: 'relative' },
  halfLine: { position: 'absolute', top: '50%', left: 0, right: 0, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.lineFaint },
  slot: { position: 'absolute', left: 0, right: 0, zIndex: 3 },
  positioned: { position: 'absolute', left: 3, right: 3, zIndex: 2 },
});
