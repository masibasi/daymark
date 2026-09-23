import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CalendarEvent, DayMarkSegment, Project } from '../domain/types';
import { daysUntil, formatDayNumber } from '../domain/dateUtils';
import type { CategoryColorKey } from '../theme/categoryColors';
import { palette, spacing, type as typeScale, weight } from '../theme/tokens';
import { DayMark } from './DayMark';

interface CellLine {
  key: string;
  title: string;
  color: string;
}

interface CalendarDayCellProps {
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  deadlineProjects: Project[];
  dayMarkSegments: DayMarkSegment[];
  categoryColorOf: (categoryId: string) => CategoryColorKey;
  today: Date;
  onPress: () => void;
}

const MAX_LINES = 3;

export function CalendarDayCell({
  date,
  inCurrentMonth,
  isToday,
  events,
  deadlineProjects,
  dayMarkSegments,
  categoryColorOf,
  today,
  onPress,
}: CalendarDayCellProps) {
  const lines: CellLine[] = [
    ...deadlineProjects.map((p) => ({
      key: `deadline-${p.id}`,
      title: `D-${Math.max(0, daysUntil(p.deadline, today))} ${p.title}`,
      color: palette.coral,
    })),
    ...events.map((e) => ({ key: e.id, title: e.title, color: e.color })),
  ];
  const shown = lines.slice(0, MAX_LINES);
  const overflow = lines.length - shown.length;

  return (
    <Pressable style={styles.cell} onPress={onPress}>
      <View style={styles.topRow}>
        <View style={[styles.numberWrap, isToday && styles.numberToday]}>
          <Text
            style={[
              styles.number,
              !inCurrentMonth && styles.numberDimmed,
              isToday && styles.numberTextToday,
            ]}
          >
            {formatDayNumber(date)}
          </Text>
        </View>
        {dayMarkSegments.length > 0 && (
          <DayMark segments={dayMarkSegments} categoryColorOf={categoryColorOf} size={18} />
        )}
      </View>
      <View style={styles.lines}>
        {shown.map((line) => (
          <View key={line.key} style={styles.line}>
            <View style={[styles.rail, { backgroundColor: line.color }]} />
            <Text style={styles.lineText} numberOfLines={1}>
              {line.title}
            </Text>
          </View>
        ))}
        {overflow > 0 && <Text style={styles.more}>+{overflow} more</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    minHeight: 84,
    borderWidth: 0.5,
    borderColor: palette.hairline,
    padding: spacing.xxs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  numberWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberToday: {
    backgroundColor: palette.ink,
  },
  number: {
    fontSize: typeScale.label,
    color: palette.ink,
    fontWeight: weight.medium,
  },
  numberDimmed: {
    color: palette.inkSecondary,
    opacity: 0.5,
  },
  numberTextToday: {
    color: palette.surface,
  },
  lines: {
    marginTop: 2,
    gap: 1,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rail: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  lineText: {
    fontSize: 10,
    color: palette.inkSecondary,
    flexShrink: 1,
  },
  more: {
    fontSize: 10,
    color: palette.inkSecondary,
    fontWeight: weight.medium,
  },
});
