import { StyleSheet, Text, View } from 'react-native';
import { format, parseISO } from 'date-fns';
import type { Task } from '@/domain/types';
import { categoryPalette, colors, fontFamily, radius, space, type, type CategoryColorKey } from '@/theme/tokens';

interface MissedRowProps { task: Task; colorKey: CategoryColorKey; folderName?: string }

// On a past day: a task that was left undone there and has since moved. Muted and inert (no toggle, no drag): the day remembers it was planned.
export function MissedRow({ task, colorKey, folderName }: MissedRowProps) {
  const note = task.scheduledDate ? `→ moved to ${format(parseISO(task.scheduledDate), 'MMM d')}` : folderName ? `→ back in ${folderName}` : '→ no longer scheduled';
  return (
    <View style={styles.row} accessibilityLabel={`${task.title}, not done on this day, ${note.replace('→ ', '')}`}>
      <View style={[styles.circle, { borderColor: categoryPalette[colorKey].solid }]} />
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={2}>{task.title}</Text>
        <Text style={styles.note} numberOfLines={1}>{note}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs, opacity: 0.55 },
  circle: { width: 22, height: 22, borderRadius: radius.round, borderWidth: 1.7, borderStyle: 'dashed' },
  copy: { flex: 1, minWidth: 0 },
  title: { ...type.task, color: colors.muted, fontFamily },
  note: { ...type.meta, color: colors.muted, fontFamily },
});
