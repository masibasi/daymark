import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PressableScale } from './PressableScale';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { selectActiveCategories, selectTaskFromEvent } from '@/domain/selectors';
import type { CalendarEvent, Category, Task } from '@/domain/types';
import { categoryPalette, colors, fontFamily, radius, space, type } from '@/theme/tokens';

interface ScheduleListProps {
  events: CalendarEvent[];
  day: Date;
  tasks: Task[];
  categories: Category[];
  isToday: boolean;
  onAdd: (event: CalendarEvent, categoryId: string) => void;
}

const timeRange = (event: CalendarEvent) => {
  if (event.allDay) return 'All day';
  const start = parseISO(event.startAt);
  const end = parseISO(event.endAt);
  const samePeriod = format(start, 'a') === format(end, 'a');
  return `${format(start, samePeriod ? 'h:mm' : 'h:mm a')} – ${format(end, 'h:mm a')}`;
};

// List a tapped event lands in by default: one named Schedule/Calendar, else the list used for the last event, else the first.
function defaultList(categories: Category[], tasks: Task[]): Category | undefined {
  const active = selectActiveCategories(categories);
  const named = active.find((category) => /^(schedule|calendar)$/i.test(category.name.trim()));
  if (named) return named;
  const last = tasks.filter((task) => task.sourceEventId).pop();
  return active.find((category) => category.id === last?.categoryId) ?? active[0];
}

// The displayed day's CalendarEvents. Events are never tasks until the user taps "Add to Today" (tracked by sourceEventId).
export function ScheduleList({ events, day, tasks, categories, isToday, onAdd }: ScheduleListProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const active = selectActiveCategories(categories);
  const preferred = defaultList(categories, tasks);
  const others = active.filter((category) => category.id !== preferred?.id);
  const addLabel = isToday ? 'Add to Today' : 'Add to this day';

  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No events on this day.</Text>
        <Link href="/settings" style={styles.emptyHint}>Connect a calendar in Settings</Link>
      </View>
    );
  }

  return (
    <View>
      {events.map((event) => {
        const added = Boolean(selectTaskFromEvent(tasks, event.id, day));
        const open = openId === event.id && !added;
        const add = (categoryId: string) => { onAdd(event, categoryId); setOpenId(null); };
        return (
          <View key={event.id} style={styles.item}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${event.title}, ${timeRange(event)}`} accessibilityState={{ expanded: open, disabled: added }} disabled={added} onPress={() => setOpenId(open ? null : event.id)} style={styles.row}>
              <View style={[styles.rail, event.allDay && styles.railAllDay]} />
              <View style={styles.copy}>
                <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
                <Text style={styles.time}>{timeRange(event)}</Text>
              </View>
              {added ? <View style={styles.added}><Ionicons name="checkmark" size={14} color={colors.muted} /><Text style={styles.addedText}>Added</Text></View> : <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={13} color={colors.muted} style={styles.chevron} />}
            </Pressable>
            {open && preferred ? (
              <View style={styles.actions}>
                <PressableScale accessibilityRole="button" accessibilityLabel={`${addLabel} in ${preferred.name}`} onPress={() => add(preferred.id)} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
                  <View style={[styles.dot, { backgroundColor: categoryPalette[preferred.colorKey].solid }]} />
                  <Text style={styles.addText}>{addLabel} · {preferred.name}</Text>
                </PressableScale>
                {others.length > 0 ? (
                  <View style={styles.chips}>
                    <Text style={styles.chipsLabel}>or in</Text>
                    {others.map((category) => (
                      <PressableScale key={category.id} accessibilityRole="button" accessibilityLabel={`${addLabel} in ${category.name}`} onPress={() => add(category.id)} style={({ pressed }) => [styles.chip, { backgroundColor: categoryPalette[category.colorKey].soft }, pressed && styles.pressed]}>
                        <View style={[styles.chipDot, { backgroundColor: categoryPalette[category.colorKey].solid }]} />
                        <Text style={[styles.chipText, { color: categoryPalette[category.colorKey].ink }]}>{category.name}</Text>
                      </PressableScale>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
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
  chevron: { opacity: 0.5, marginRight: 2 },
  added: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  addedText: { ...type.meta, color: colors.muted, fontFamily },
  actions: { marginLeft: 3 + space.sm, paddingBottom: space.sm, gap: space.xs },
  addButton: { alignSelf: 'flex-start', minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, borderRadius: radius.round, backgroundColor: colors.eventSoft },
  dot: { width: 8, height: 8, borderRadius: 4 },
  addText: { ...type.bodyMedium, color: colors.ink, fontFamily },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  chipsLabel: { ...type.meta, color: colors.muted, marginRight: 2, fontFamily },
  chip: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, borderRadius: radius.round },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { ...type.meta, fontFamily },
  pressed: { opacity: 0.6 },
  empty: { paddingVertical: space.md, gap: 4 },
  emptyTitle: { ...type.body, color: colors.inkSoft, fontFamily },
  emptyHint: { ...type.meta, color: colors.muted, fontFamily },
});
