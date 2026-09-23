import { StyleSheet, Text, View } from 'react-native';
import { formatTime } from '../domain/dateUtils';
import { categoryColors, type CategoryColorKey } from '../theme/categoryColors';
import { palette, radii, spacing, type as typeScale, weight } from '../theme/tokens';

interface TaskTimeBlockProps {
  title: string;
  start: string;
  end: string;
  categoryColor: CategoryColorKey;
  completed: boolean;
  style?: object;
  compact?: boolean;
}

/** A Task scheduled onto the calendar — category soft tint + DASHED rail +
 * task dot, always visually distinct from an external CalendarEventBlock. */
export function TaskTimeBlock({
  title,
  start,
  end,
  categoryColor,
  completed,
  style,
  compact,
}: TaskTimeBlockProps) {
  const colors = categoryColors[categoryColor];
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.soft, opacity: completed ? 0.55 : 1 },
        style,
      ]}
    >
      <View style={[styles.rail, { borderColor: colors.solid }]} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={[styles.dot, { backgroundColor: colors.solid }]} />
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={compact ? 1 : 2}>
            {title}
          </Text>
        </View>
        {!compact && (
          <Text style={styles.time}>
            {formatTime(start)} – {formatTime(end)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radii.sm,
    overflow: 'hidden',
    position: 'absolute',
    padding: spacing.xxs,
  },
  rail: {
    borderLeftWidth: 2,
    borderStyle: 'dashed',
    marginRight: spacing.xxs,
  },
  body: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  title: {
    fontSize: typeScale.micro,
    fontWeight: weight.semibold,
    flexShrink: 1,
  },
  time: {
    fontSize: 10,
    color: palette.inkSecondary,
    marginTop: 1,
  },
});
