import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { Task } from '@/domain/types';
import type { ResolvedPalette } from '@/theme/palette';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';
import { useFormat, useT } from '@/i18n';

interface MissedRowProps { task: Task; day: string; palette: ResolvedPalette; folderName?: string }

// On a past day: a task that was left undone there and has since moved. Muted and inert (no toggle, no drag): the day remembers it was planned.
export function MissedRow({ task, day, palette, folderName }: MissedRowProps) {
  const t = useT();
  const fmt = useFormat();
  const doneOn = task.completedAt && differenceInCalendarDays(parseISO(task.completedAt), parseISO(day)) > 0 ? fmt(parseISO(task.completedAt), 'monthDay') : undefined;
  const noteText = task.scheduledDate ? t.tasks.movedTo(fmt(parseISO(task.scheduledDate), 'monthDay')) : folderName ? t.tasks.backIn(folderName) : t.tasks.noLongerScheduled;
  const note = `→ ${noteText}`;
  return (
    <View style={styles.row} accessibilityLabel={t.tasks.notDoneOnDay(task.title, doneOn ? t.tasks.doneOn(doneOn) : noteText)}>
      <View style={[styles.circle, { borderColor: palette.solid }]} />
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={2}>{task.title}</Text>
        {doneOn ? (
          <View style={styles.noteRow}><Ionicons name="checkmark" size={12} color={colors.muted} /><Text style={styles.note} numberOfLines={1}>{t.tasks.doneOn(doneOn)}</Text></View>
        ) : <Text style={styles.note} numberOfLines={1}>{note}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs, opacity: 0.55 },
  circle: { width: 22, height: 22, borderRadius: radius.round, borderWidth: 1.7, borderStyle: 'dashed' },
  copy: { flex: 1, minWidth: 0 },
  title: { ...type.task, color: colors.muted, fontFamily },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  note: { ...type.meta, color: colors.muted, fontFamily },
});
