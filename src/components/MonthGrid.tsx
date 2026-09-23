import { StyleSheet, Text, View } from 'react-native';
import { isSameMonth } from 'date-fns';
import type { CalendarEvent, DayMarkSegment, Project } from '../domain/types';
import { isToday as isSameDay, monthGridDays, toDateKey } from '../domain/dateUtils';
import type { CategoryColorKey } from '../theme/categoryColors';
import { palette, spacing, type as typeScale, weight } from '../theme/tokens';
import { CalendarDayCell } from './CalendarDayCell';

interface MonthGridProps {
  monthAnchor: Date;
  today: Date;
  eventsByDay: (dateKey: string) => CalendarEvent[];
  deadlinesByDay: (dateKey: string) => Project[];
  dayMarkByDay: (dateKey: string) => DayMarkSegment[];
  categoryColorOf: (categoryId: string) => CategoryColorKey;
  onSelectDay: (dateKey: string) => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthGrid({
  monthAnchor,
  today,
  eventsByDay,
  deadlinesByDay,
  dayMarkByDay,
  categoryColorOf,
  onSelectDay,
}: MonthGridProps) {
  const days = monthGridDays(monthAnchor);

  return (
    <View style={styles.root}>
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {days.map((day) => {
          const key = toDateKey(day);
          return (
            <View key={key} style={styles.cellWrap}>
              <CalendarDayCell
                date={day}
                inCurrentMonth={isSameMonth(day, monthAnchor)}
                isToday={isSameDay(day, today)}
                events={eventsByDay(key)}
                deadlineProjects={deadlinesByDay(key)}
                dayMarkSegments={dayMarkByDay(key)}
                categoryColorOf={categoryColorOf}
                today={today}
                onPress={() => onSelectDay(key)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingBottom: spacing.xs,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: typeScale.micro,
    color: palette.inkSecondary,
    fontWeight: weight.medium,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cellWrap: {
    width: '14.2857%',
  },
});
