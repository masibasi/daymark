import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import type { Task } from '@/domain/types';
import { selectDayOrbit } from '@/domain/selectors';
import { categoryPalette, colors, fontFamily, radius, space, type } from '@/theme/tokens';
import { DayOrbit } from './DayOrbit';

interface HistoryCalendarProps {
  selectedDate: Date;
  tasks: Task[];
  onSelectDate: (date: Date) => void;
}

export function HistoryCalendar({ selectedDate, tasks, onSelectDate }: HistoryCalendarProps) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 0 }),
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{format(selectedDate, 'MMMM yyyy')}</Text>
        <View style={styles.controls}>
          <Pressable accessibilityLabel="Previous history month" onPress={() => onSelectDate(subMonths(selectedDate, 1))} style={styles.arrow}><Ionicons name="chevron-back" size={16} color={colors.ink} /></Pressable>
          <Pressable accessibilityLabel="Next history month" onPress={() => onSelectDate(addMonths(selectedDate, 1))} style={styles.arrow}><Ionicons name="chevron-forward" size={16} color={colors.ink} /></Pressable>
        </View>
      </View>
      <View style={styles.weekdays}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => <Text key={`${label}-${index}`} style={styles.weekday}>{label}</Text>)}</View>
      <View style={styles.grid}>
        {days.map((day) => {
          const selected = isSameDay(day, selectedDate);
          return (
            <Pressable key={day.toISOString()} accessibilityLabel={`Open ${format(day, 'MMMM d')}`} accessibilityState={{ selected }} onPress={() => onSelectDate(day)} style={[styles.day, !isSameMonth(day, selectedDate) && styles.outside]}>
              <View style={[styles.orbitWrap, selected && styles.selected]}><DayOrbit segments={selectDayOrbit(tasks, day)} size={22} strokeWidth={3.5} /></View>
              <Text style={[styles.dayNumber, selected && styles.selectedNumber]}>{format(day, 'd')}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 300, minHeight: 352, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
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
  dayNumber: { fontSize: 9, lineHeight: 12, color: colors.inkSoft, fontFamily },
  selectedNumber: { color: categoryPalette.routine.ink, fontWeight: '700' },
});
