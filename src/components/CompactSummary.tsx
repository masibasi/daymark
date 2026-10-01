import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek } from 'date-fns';
import { selectDayOrbit } from '@/domain/selectors';
import type { Category, Task } from '@/domain/types';
import { categoryPalette, colors, fontFamily, space, type } from '@/theme/tokens';
import { DayOrbit } from './DayOrbit';

interface CompactSummaryProps {
  selectedDate: Date;
  tasks: Task[];
  categories: Category[];
  completed: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onSelectDate: (date: Date) => void;
}

// Phone Today: one calm row — small Day Mark, "4 of 10", and this week's seven marks. Tapping the left side expands the full card + history.
export function CompactSummary({ selectedDate, tasks, categories, completed, total, expanded, onToggle, onSelectDate }: CompactSummaryProps) {
  const week = eachDayOfInterval({ start: startOfWeek(selectedDate, { weekStartsOn: 0 }), end: endOfWeek(selectedDate, { weekStartsOn: 0 }) });
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Hide day mark details' : 'Show day mark details'} accessibilityState={{ expanded }} onPress={onToggle} style={styles.lead}>
        <DayOrbit segments={selectDayOrbit(tasks, selectedDate, categories)} size={44} strokeWidth={6} />
        <Text style={styles.count} numberOfLines={1}>{completed} of {total}</Text>
        {expanded ? <Ionicons name="chevron-up" size={14} color={colors.muted} /> : null}
      </Pressable>
      {expanded ? <Pressable accessibilityElementsHidden style={styles.fill} onPress={onToggle} /> : (
        <View style={styles.week}>
          {week.map((day) => {
            const selected = isSameDay(day, selectedDate);
            return (
              <Pressable key={day.toISOString()} accessibilityRole="button" accessibilityLabel={`Open ${format(day, 'MMMM d')}`} accessibilityState={{ selected }} hitSlop={{ top: 6, bottom: 6 }} onPress={() => onSelectDate(day)} style={styles.day}>
                <View style={[styles.markWrap, selected && styles.selected]}><DayOrbit segments={selectDayOrbit(tasks, day, categories)} size={22} strokeWidth={3.5} /></View>
                <Text style={[styles.dayNumber, selected && styles.selectedNumber]}>{format(day, 'd')}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {expanded ? null : <Pressable accessibilityElementsHidden hitSlop={8} onPress={onToggle}><Ionicons name="chevron-down" size={14} color={colors.muted} /></Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingVertical: space.xxs, borderBottomWidth: 1, borderColor: colors.line },
  lead: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingRight: space.xxs },
  count: { ...type.bodyMedium, color: colors.ink, fontFamily },
  fill: { flex: 1, alignSelf: 'stretch' },
  week: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  day: { width: 27, alignItems: 'center', gap: 1 },
  markWrap: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: categoryPalette.routine.soft, borderWidth: 1, borderColor: categoryPalette.routine.solid },
  dayNumber: { fontSize: 9, lineHeight: 12, color: colors.inkSoft, fontFamily },
  selectedNumber: { color: categoryPalette.routine.ink, fontWeight: '700' },
});
