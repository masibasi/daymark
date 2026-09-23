import { StyleSheet, Text, View } from 'react-native';
import { formatTime } from '../domain/dateUtils';
import { palette, radii, spacing, type as typeScale, weight } from '../theme/tokens';

interface CalendarEventBlockProps {
  title: string;
  start: string;
  end: string;
  color: string;
  style?: object;
  compact?: boolean;
}

/** External calendar event: soft tint + solid left rail (see docs/DESIGN.md
 * "Event states" — distinct from TaskTimeBlock's dashed rail). */
export function CalendarEventBlock({ title, start, end, color, style, compact }: CalendarEventBlockProps) {
  return (
    <View style={[styles.container, { backgroundColor: withAlpha(color, 0.16) }, style]}>
      <View style={[styles.rail, { backgroundColor: color }]} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={compact ? 1 : 2}>
          {title}
        </Text>
        {!compact && (
          <Text style={styles.time}>
            {formatTime(start)} – {formatTime(end)}
          </Text>
        )}
      </View>
    </View>
  );
}

function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
    width: 3,
    borderRadius: 2,
    marginRight: spacing.xxs,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: typeScale.micro,
    fontWeight: weight.semibold,
    color: palette.ink,
  },
  time: {
    fontSize: 10,
    color: palette.inkSecondary,
    marginTop: 1,
  },
});
