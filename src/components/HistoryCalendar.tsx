import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths, subWeeks } from 'date-fns';
import type { Task } from '@/domain/types';
import { selectDayOrbit } from '@/domain/selectors';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { categoryPalette, colors, fontFamily, radius, space, type } from '@/theme/tokens';
import { DayNumber } from './DayNumber';
import { DayOrbit } from './DayOrbit';

interface HistoryCalendarProps {
  selectedDate: Date;
  tasks: Task[];
  onSelectDate: (date: Date) => void;
  defaultExpanded?: boolean;
}

export function HistoryCalendar({ selectedDate, tasks, onSelectDate, defaultExpanded }: HistoryCalendarProps) {
  const { width } = useWindowDimensions();
  const categories = useDaymarkStore((state) => state.categories);
  const [expanded, setExpanded] = useState(() => defaultExpanded ?? width >= 820);

  const days = expanded
    ? eachDayOfInterval({
      start: startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 0 }),
      end: endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 0 }),
    })
    : eachDayOfInterval({
      start: startOfWeek(selectedDate, { weekStartsOn: 0 }),
      end: endOfWeek(selectedDate, { weekStartsOn: 0 }),
    });

  const goToPrevious = () => onSelectDate(expanded ? subMonths(selectedDate, 1) : subWeeks(selectedDate, 1));
  const goToNext = () => onSelectDate(expanded ? addMonths(selectedDate, 1) : addWeeks(selectedDate, 1));

  return (
    <View style={[styles.card, expanded && styles.cardExpanded]}>
      <View style={styles.header}>
        <Text style={styles.title}>{format(selectedDate, 'MMMM yyyy')}</Text>
        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Show one week' : 'Show full month'}
            accessibilityState={{ expanded }}
            onPress={() => setExpanded((current) => !current)}
            style={styles.arrow}
          >
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.ink} />
          </Pressable>
          <Pressable accessibilityLabel={expanded ? 'Previous history month' : 'Previous history week'} onPress={goToPrevious} style={styles.arrow}><Ionicons name="chevron-back" size={16} color={colors.ink} /></Pressable>
          <Pressable accessibilityLabel={expanded ? 'Next history month' : 'Next history week'} onPress={goToNext} style={styles.arrow}><Ionicons name="chevron-forward" size={16} color={colors.ink} /></Pressable>
        </View>
      </View>
      <View style={styles.weekdays}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => <Text key={`${label}-${index}`} style={styles.weekday}>{label}</Text>)}</View>
      <View style={styles.grid}>
        {days.map((day) => {
          const selected = isSameDay(day, selectedDate);
          return (
            <Pressable key={day.toISOString()} accessibilityLabel={`Open ${format(day, 'MMMM d')}`} accessibilityState={{ selected }} onPress={() => onSelectDate(day)} style={[styles.day, expanded && !isSameMonth(day, selectedDate) && styles.outside]}>
              <View style={[styles.orbitWrap, selected && styles.selected]}><DayOrbit segments={selectDayOrbit(tasks, day, categories)} size={22} strokeWidth={3.5} /></View>
              <DayNumber day={day} tasks={tasks} categories={categories} selected={selected} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 300, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  cardExpanded: { minHeight: 352 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  title: { ...type.section, color: colors.ink, fontFamily },
  controls: { flexDirection: 'row', gap: 4 },
  arrow: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.track },
  weekdays: { flexDirection: 'row', marginBottom: 4 },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 9, lineHeight: 14, fontWeight: '600', color: colors.muted, fontFamily },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  day: { width: `${100 / 7}%`, minHeight: 43, alignItems: 'center', justifyContent: 'center' },
  outside: { opacity: 0.28 },
  orbitWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: categoryPalette.routine.soft, borderWidth: 1, borderColor: categoryPalette.routine.solid },
});
