import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek } from 'date-fns';
import { selectDayOrbit } from '@/domain/selectors';
import type { Category, Task } from '@/domain/types';
import { categoryPalette, colors, fontFamily, motion, space, type } from '@/theme/tokens';
import { useToggleProgress } from '@/theme/useToggleProgress';
import { DayOrbit } from './DayOrbit';
import { PressableScale } from './PressableScale';

interface CompactSummaryProps {
  selectedDate: Date;
  tasks: Task[];
  categories: Category[];
  completed: number;
  total: number;
  late?: number;
  expanded: boolean;
  onToggle: () => void;
  onSelectDate: (date: Date) => void;
}

// Phone Today: one calm row — small Day Mark, "3 done", and this week's seven marks. Tapping the left side expands the full card + history.
export function CompactSummary({ selectedDate, tasks, categories, completed, total, late = 0, expanded, onToggle, onSelectDate }: CompactSummaryProps) {
  const week = eachDayOfInterval({ start: startOfWeek(selectedDate, { weekStartsOn: 0 }), end: endOfWeek(selectedDate, { weekStartsOn: 0 }) });
  const turn = useToggleProgress(expanded, motion.base, true);
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Hide day mark details' : 'Show day mark details'} accessibilityState={{ expanded }} onPress={onToggle} style={styles.lead}>
        <DayOrbit segments={selectDayOrbit(tasks, selectedDate, categories)} size={44} strokeWidth={6} />
        {expanded ? null : <Text style={[styles.count, completed === 0 && styles.quiet]} numberOfLines={1}>{completed > 0 ? `${completed} done` : total === 0 ? 'Clear day' : 'Nothing yet'}{late > 0 ? <Text style={styles.late}> · {late} later</Text> : null}</Text>}
      </Pressable>
      {expanded ? <Pressable accessibilityElementsHidden style={styles.fill} onPress={onToggle} /> : (
        <View style={styles.week}>
          {week.map((day) => {
            const selected = isSameDay(day, selectedDate);
            return (
              <PressableScale key={day.toISOString()} accessibilityRole="button" accessibilityLabel={`Open ${format(day, 'MMMM d')}`} accessibilityState={{ selected }} hitSlop={{ top: 6, bottom: 6 }} onPress={() => onSelectDate(day)} style={styles.day}>
                <View style={[styles.markWrap, selected && styles.selected]}><DayOrbit segments={selectDayOrbit(tasks, day, categories)} size={22} strokeWidth={3.5} /></View>
                <Text style={[styles.dayNumber, selected && styles.selectedNumber]}>{format(day, 'd')}</Text>
              </PressableScale>
            );
          })}
        </View>
      )}
      <Pressable accessibilityElementsHidden hitSlop={8} onPress={onToggle}>
        <Animated.View style={{ transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}><Ionicons name="chevron-down" size={14} color={colors.muted} /></Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingVertical: space.xxs, borderBottomWidth: 1, borderColor: colors.line },
  lead: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingRight: space.xxs },
  count: { ...type.bodyMedium, color: colors.ink, fontFamily },
  quiet: { color: colors.muted },
  late: { ...type.meta, color: colors.muted, fontFamily },
  fill: { flex: 1, alignSelf: 'stretch' },
  week: { flex: 1, minWidth: 0, flexDirection: 'row', justifyContent: 'flex-end' },
  day: { width: 27, minWidth: 21, flexShrink: 1, alignItems: 'center', gap: 1 },
  markWrap: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: categoryPalette.routine.soft, borderWidth: 1, borderColor: categoryPalette.routine.solid },
  dayNumber: { fontSize: 9, lineHeight: 12, color: colors.inkSoft, fontFamily },
  selectedNumber: { color: categoryPalette.routine.ink, fontWeight: '700' },
});
