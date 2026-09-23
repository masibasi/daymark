import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Project } from '../domain/types';
import { daysUntil } from '../domain/dateUtils';
import { selectDeadlineUrgencyTier } from '../domain/selectors';
import { categoryColors, type CategoryColorKey } from '../theme/categoryColors';
import { palette, spacing, type as typeScale, weight } from '../theme/tokens';
import { ProjectProgress } from './ProjectProgress';

interface DeadlinePreviewProps {
  project: Project;
  categoryColor: CategoryColorKey;
  progressFraction: number;
  today: Date;
  onPress: () => void;
}

const TIER_COLOR: Record<string, string> = {
  far: palette.inkSecondary,
  week: palette.ink,
  soon: palette.amber,
  urgent: palette.coral,
};

export function DeadlinePreview({
  project,
  categoryColor,
  progressFraction,
  today,
  onPress,
}: DeadlinePreviewProps) {
  const d = daysUntil(project.deadline, today);
  const tier = selectDeadlineUrgencyTier(project.deadline, today);
  const label = d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? 'Due today' : `D-${d}`;
  const colors = categoryColors[categoryColor];

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.dot, { backgroundColor: colors.solid }]} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {project.title}
        </Text>
        <ProjectProgress fraction={progressFraction} color={colors.solid} />
      </View>
      <Text style={[styles.dday, { color: TIER_COLOR[tier] }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  title: {
    fontSize: typeScale.body,
    fontWeight: weight.medium,
    color: palette.ink,
  },
  dday: {
    fontSize: typeScale.label,
    fontWeight: weight.semibold,
    minWidth: 40,
    flexShrink: 0,
    textAlign: 'right',
  },
});
