import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isSameDay, parseISO } from 'date-fns';
import { now } from '@/domain/clock';
import { selectActiveCategories, selectTaskFromEvent } from '@/domain/selectors';
import type { CalendarEvent, Category, Task } from '@/domain/types';
import { useCategoryPalette } from '@/store/useCategoryPalette';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';
import { PressableScale } from './PressableScale';
import { formatDate, formatTimeRange, t, useT } from '@/i18n';

export const eventTimeRange = (event: CalendarEvent) => (event.allDay ? t().common.allDay : formatTimeRange(parseISO(event.startAt), parseISO(event.endAt)));

// "Today" or "Tue, Oct 6": the day an event would be added to.
export const eventDayLabel = (day: Date) => (isSameDay(day, now()) ? t().common.today : formatDate(day, 'weekdayShortMonthDay'));

// List an imported event lands in by default: one named Schedule/Calendar, else the list used for the last event import, else none (a new "Schedule" list).
export function defaultEventList(categories: Category[], tasks: Task[]): Category | undefined {
  const active = selectActiveCategories(categories);
  const named = active.find((category) => /^(schedule|calendar|일정|캘린더)$/i.test(category.name.trim()));
  if (named) return named;
  const last = tasks.filter((task) => task.sourceEventId).pop();
  return active.find((category) => category.id === last?.categoryId);
}

interface EventActionsProps {
  event: CalendarEvent;
  day: Date;
  tasks: Task[];
  categories: Category[];
  // categoryId undefined = create the Schedule list and add there.
  onAdd: (event: CalendarEvent, categoryId: string | undefined) => void;
}

// The "Add to <day>" pill plus "or in" list chips, or "Added" once a Task from this event exists on `day`. Shared by Today's Schedule and the Calendar tab.
export function EventActions({ event, day, tasks, categories, onAdd }: EventActionsProps) {
  const t = useT();
  const paletteFor = useCategoryPalette();
  const added = Boolean(selectTaskFromEvent(tasks, event.id, day));
  const preferred = defaultEventList(categories, tasks);
  const others = selectActiveCategories(categories).filter((category) => category.id !== preferred?.id);
  const addLabel = t.calendar.addTo(eventDayLabel(day));
  const newList = t.calendar.newScheduleList;
  if (added) return <View style={styles.added}><Ionicons name="checkmark" size={14} color={colors.muted} /><Text style={styles.addedText}>{t.calendar.addedTo(eventDayLabel(day))}</Text></View>;
  const palette = preferred ? paletteFor(preferred) : undefined;
  return (
    <View style={styles.actions}>
      <PressableScale accessibilityRole="button" accessibilityLabel={t.calendar.addToIn(addLabel, preferred?.name ?? newList)} onPress={() => onAdd(event, preferred?.id)} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
        {palette ? <View style={[styles.dot, { backgroundColor: palette.solid }]} /> : <Ionicons name="add" size={14} color={colors.ink} />}
        <Text style={styles.addText}>{addLabel} · {preferred ? preferred.name : newList}</Text>
      </PressableScale>
      {others.length > 0 ? (
        <View style={styles.chips}>
          <Text style={styles.chipsLabel}>{t.calendar.orIn}</Text>
          {others.map((category) => (
            <PressableScale key={category.id} accessibilityRole="button" accessibilityLabel={t.calendar.addToIn(addLabel, category.name)} onPress={() => onAdd(event, category.id)} style={({ pressed }) => [styles.chip, { backgroundColor: paletteFor(category).soft }, pressed && styles.pressed]}>
              <View style={[styles.chipDot, { backgroundColor: paletteFor(category).solid }]} />
              <Text style={[styles.chipText, { color: paletteFor(category).ink }]}>{category.name}</Text>
            </PressableScale>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// Quiet text button used for secondary actions in the shared sheet (e.g. removing a legacy TimeBlock).
export function SheetAction({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.removeButton}><Text style={styles.removeText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  actions: { gap: space.xs },
  addButton: { alignSelf: 'flex-start', minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, borderRadius: radius.round, backgroundColor: colors.eventSoft },
  dot: { width: 8, height: 8, borderRadius: 4 },
  addText: { ...type.bodyMedium, color: colors.ink, fontFamily },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  chipsLabel: { ...type.meta, color: colors.muted, marginRight: 2, fontFamily },
  chip: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, borderRadius: radius.round },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { ...type.meta, fontFamily },
  pressed: { opacity: 0.6 },
  added: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 32 },
  addedText: { ...type.meta, color: colors.muted, fontFamily },
  removeButton: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', paddingHorizontal: space.md, borderRadius: radius.round, borderWidth: 1, borderColor: colors.line },
  removeText: { ...type.bodyMedium, color: colors.danger, fontFamily },
});
