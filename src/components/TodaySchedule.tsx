import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { Link } from 'expo-router';
import { selectTaskFromEvent } from '@/domain/selectors';
import type { CalendarEvent, Category, Task } from '@/domain/types';
import { colors, fontFamily, space, type } from '@/theme/tokens';
import { Collapsible } from './Collapsible';
import { EventActions, eventTimeRange } from './EventActions';
import { EventSheet } from './EventSheet';

const VISIBLE = 3;
const timeLabel = (event: CalendarEvent) => (event.allDay ? 'All day' : format(parseISO(event.startAt), 'h:mm a'));

interface TodayScheduleProps {
  events: CalendarEvent[];
  day: Date;
  tasks: Task[];
  categories: Category[];
  hasFeeds: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onAdd: (event: CalendarEvent, categoryId: string | undefined) => void;
}

// Column layout (tablet + desktop): a compact Schedule block at the top of the tasks column. One line per event, three by default
// with a quiet "+N more"; tapping a row opens the same Add-to-day sheet as the Calendar tab. The block collapses to one line.
export function TodaySchedule({ events, day, tasks, categories, hasFeeds, collapsed, onToggleCollapsed, onAdd }: TodayScheduleProps) {
  const [more, setMore] = useState(false);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const count = events.length;
  const row = (event: CalendarEvent) => {
    const added = Boolean(selectTaskFromEvent(tasks, event.id, day));
    return (
      <Pressable key={event.id} accessibilityRole="button" accessibilityLabel={`${event.title}, ${eventTimeRange(event)}${added ? ', added' : ''}`} onPress={() => setSelected(event)} style={styles.row}>
        <View style={[styles.rail, event.allDay && styles.railAllDay]} />
        <Text style={styles.time}>{timeLabel(event)}</Text>
        <Text style={[styles.title, added && styles.titleAdded]} numberOfLines={1}>{event.title}</Text>
        {added ? <Ionicons name="checkmark" size={13} color={colors.muted} /> : null}
      </Pressable>
    );
  };
  return (
    <View style={styles.block}>
      <Pressable accessibilityRole="button" accessibilityLabel={collapsed ? 'Expand schedule' : 'Collapse schedule'} accessibilityState={{ expanded: !collapsed }} onPress={onToggleCollapsed} style={styles.header}>
        <Text style={styles.heading}>Schedule</Text>
        {collapsed && count > 0 ? <Text style={styles.meta}>· {count} {count === 1 ? 'event' : 'events'}</Text> : null}
        <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={14} color={colors.muted} style={styles.chevron} />
      </Pressable>
      <Collapsible open={!collapsed}>
        <View style={styles.body}>
          {count === 0 ? (
            <Text style={styles.empty}>{hasFeeds ? 'No events today' : 'No events · '}{hasFeeds ? null : <Link href="/settings" style={styles.emptyLink}>Connect a calendar</Link>}</Text>
          ) : (
            <>
              {events.slice(0, VISIBLE).map(row)}
              {count > VISIBLE ? <Collapsible open={more}><View>{events.slice(VISIBLE).map(row)}</View></Collapsible> : null}
              {count > VISIBLE ? <Pressable accessibilityRole="button" onPress={() => setMore(!more)} style={styles.moreButton}><Text style={styles.moreText}>{more ? 'Show less' : `+${count - VISIBLE} more`}</Text></Pressable> : null}
            </>
          )}
        </View>
      </Collapsible>
      <EventSheet visible={selected !== null} title={selected?.title ?? ''} subtitle={selected ? `${format(day, 'EEE, MMM d')} · ${eventTimeRange(selected)}` : ''} onClose={() => setSelected(null)}>
        {selected ? <EventActions event={selected} day={day} tasks={tasks} categories={categories} onAdd={(event, categoryId) => { onAdd(event, categoryId); setSelected(null); }} /> : null}
      </EventSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: space.lg, paddingBottom: space.sm, borderBottomWidth: 1, borderColor: colors.line },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs, minHeight: 32 },
  heading: { ...type.section, color: colors.ink, fontFamily },
  meta: { ...type.meta, color: colors.muted, fontFamily },
  chevron: { marginLeft: 'auto', alignSelf: 'center' },
  body: { paddingTop: space.xxs },
  row: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rail: { alignSelf: 'stretch', width: 3, marginVertical: 5, borderRadius: 2, backgroundColor: colors.event },
  railAllDay: { opacity: 0.45 },
  time: { ...type.meta, width: 64, color: colors.muted, fontFamily },
  title: { ...type.task, flex: 1, minWidth: 0, color: colors.ink, fontFamily },
  titleAdded: { color: colors.muted },
  moreButton: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
  moreText: { ...type.meta, color: colors.muted, fontFamily },
  empty: { ...type.meta, color: colors.muted, paddingVertical: space.xxs, fontFamily },
  emptyLink: { ...type.meta, color: colors.inkSoft, textDecorationLine: 'underline', fontFamily },
});
