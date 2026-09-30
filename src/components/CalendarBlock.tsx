import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import type { CalendarEvent, Task, TimeBlock } from '@/domain/types';
import { useCategoryPalette } from '@/store/useCategoryPalette';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';

interface CalendarBlockProps { event?: CalendarEvent; block?: TimeBlock; task?: Task; compact?: boolean }

export function CalendarBlock({ event, block, task, compact = false }: CalendarBlockProps) {
  const paletteFor = useCategoryPalette();
  const isTask = Boolean(block && task);
  const palette = task ? paletteFor(task.categoryId) : null;
  const startAt = event?.startAt ?? block?.startAt ?? '';
  const endAt = event?.endAt ?? block?.endAt ?? '';
  const background = palette?.soft ?? colors.eventSoft;
  const accent = palette?.solid ?? colors.event;
  return (
    <View style={[styles.root, { backgroundColor: background, borderLeftColor: accent }, compact && styles.compact]}>
      <View style={styles.labelRow}>
        {isTask ? <Ionicons name="checkmark-circle-outline" size={compact ? 10 : 12} color={accent} /> : null}
        <Text style={[styles.title, { color: palette?.ink ?? colors.ink }, compact && styles.compactTitle]} numberOfLines={compact ? 1 : 2}>{task?.title ?? event?.title}</Text>
      </View>
      {!compact ? <Text style={[styles.time, { color: accent }]}>{format(parseISO(startAt), 'h:mm')}–{format(parseISO(endAt), 'h:mm a')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.xs, borderRadius: radius.sm, borderLeftWidth: 3, overflow: 'hidden' },
  compact: { paddingVertical: 3, paddingHorizontal: 5, minHeight: 20, borderRadius: 5, borderLeftWidth: 2 },
  labelRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 3 },
  title: { ...type.meta, flex: 1, fontFamily },
  compactTitle: { fontSize: 10, lineHeight: 13 },
  time: { fontSize: 10, lineHeight: 14, fontWeight: '600', marginTop: 2, fontFamily },
});

