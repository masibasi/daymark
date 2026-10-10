import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EventActions, eventTimeRange } from './EventActions';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { selectTaskFromEvent } from '@/domain/selectors';
import type { CalendarEvent, Category, Task } from '@/domain/types';
import { colors, fontFamily, space, type } from '@/theme/tokens';
import { useT } from '@/i18n';

interface ScheduleListProps {
  events: CalendarEvent[];
  day: Date;
  tasks: Task[];
  categories: Category[];
  onAdd: (event: CalendarEvent, categoryId: string | undefined) => void;
}

// The displayed day's CalendarEvents. Events are never tasks until the user taps "Add to <day>" (tracked by sourceEventId).
export function ScheduleList({ events, day, tasks, categories, onAdd }: ScheduleListProps) {
  const t = useT();
  const [openId, setOpenId] = useState<string | null>(null);

  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{t.calendar.noEvents}</Text>
        <Link href="/settings" style={styles.emptyHint}>{t.calendar.connectInSettings}</Link>
      </View>
    );
  }

  return (
    <View>
      {events.map((event) => {
        const added = Boolean(selectTaskFromEvent(tasks, event.id, day));
        const open = openId === event.id && !added;
        const add = (_: CalendarEvent, categoryId: string | undefined) => { onAdd(event, categoryId); setOpenId(null); };
        return (
          <View key={event.id} style={styles.item}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${event.title}, ${eventTimeRange(event)}`} accessibilityState={{ expanded: open, disabled: added }} disabled={added} onPress={() => setOpenId(open ? null : event.id)} style={styles.row}>
              <View style={[styles.rail, event.allDay && styles.railAllDay]} />
              <View style={styles.copy}>
                <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
                <Text style={styles.time}>{eventTimeRange(event)}</Text>
              </View>
              {added ? <View style={styles.added}><Ionicons name="checkmark" size={14} color={colors.muted} /><Text style={styles.addedText}>{t.calendar.added}</Text></View> : <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={13} color={colors.muted} style={styles.chevron} />}
            </Pressable>
            {open ? <View style={styles.actions}><EventActions event={event} day={day} tasks={tasks} categories={categories} onAdd={add} /></View> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { marginBottom: space.xxs },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  rail: { alignSelf: 'stretch', width: 3, borderRadius: 2, backgroundColor: colors.event },
  railAllDay: { opacity: 0.45 },
  copy: { flex: 1, minWidth: 0 },
  title: { ...type.task, color: colors.ink, fontFamily },
  time: { ...type.meta, color: colors.muted, marginTop: 1, fontFamily },
  added: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  addedText: { ...type.meta, color: colors.muted, fontFamily },
  chevron: { opacity: 0.5, marginRight: 2 },
  actions: { marginLeft: 3 + space.sm, paddingBottom: space.sm },
  empty: { paddingVertical: space.md, gap: 4 },
  emptyTitle: { ...type.body, color: colors.inkSoft, fontFamily },
  emptyHint: { ...type.meta, color: colors.muted, fontFamily },
});
