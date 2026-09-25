import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { differenceInMinutes, format, parseISO, setHours, setMinutes, startOfDay } from 'date-fns';
import type { AgendaItem, FreeSlot } from '@/domain/selectors';
import { categoryPalette, colors, fontFamily, radius, space, type, type CategoryColorKey } from '@/theme/tokens';

const RAIL_START_HOUR = 8;
const RAIL_END_HOUR = 21;
const RAIL_MINUTES = (RAIL_END_HOUR - RAIL_START_HOUR) * 60;
const TICK_HOURS = [8, 11, 14, 17, 20];

interface TodayTimelineProps {
  day: Date;
  isToday: boolean;
  now: Date;
  agenda: AgendaItem[];
  /** Gaps to highlight while a Reserve time tray is open; empty otherwise. */
  freeSlots: FreeSlot[];
  /** Category tint to use for highlighted gaps, matching the open tray's Task. */
  highlightCategoryKey?: CategoryColorKey;
  /** Tapping a highlighted gap reserves the open Task starting there. */
  onReserveGap?: (startAt: string) => void;
  onRemoveBlock: (blockId: string) => void;
  /** Rail only, for embedding inside a Reserve time tray. */
  compact?: boolean;
}

function railPercent(date: Date, day: Date): number {
  const start = setMinutes(setHours(startOfDay(day), RAIL_START_HOUR), 0);
  const minutes = differenceInMinutes(date, start);
  return Math.min(100, Math.max(0, (minutes / RAIL_MINUTES) * 100));
}

export function TodayTimeline({ day, isToday, now, agenda, freeSlots, highlightCategoryKey, onReserveGap, onRemoveBlock, compact = false }: TodayTimelineProps) {
  const [selected, setSelected] = useState<AgendaItem | null>(null);
  const nowPercent = isToday ? railPercent(now, day) : -1;
  const showNowTick = nowPercent >= 0 && nowPercent <= 100;
  const highlightPalette = highlightCategoryKey ? categoryPalette[highlightCategoryKey] : null;

  const nextLine = agenda
    .filter((item) => (item.kind === 'event' ? parseISO(item.event.endAt) : parseISO(item.block.endAt)) > now || !isToday)
    .slice(0, 3)
    .map((item) => {
      const start = parseISO(item.kind === 'event' ? item.event.startAt : item.block.startAt);
      const label = item.kind === 'event' ? item.event.title : item.task.title;
      return `${format(start, 'h:mm')} ${label}`;
    })
    .join(' · ');

  return (
    <View style={compact ? styles.wrapCompact : styles.wrap}>
      {compact ? null : <View style={styles.header}>
        <Text style={styles.title}>{isToday ? 'Time today' : `Time on ${format(day, 'MMM d')}`}</Text>
        <Text style={styles.hint}>Events from your calendar (sample)</Text>
      </View>}
      <View style={styles.ticks}>
        {(compact ? TICK_HOURS.slice(0, -1) : TICK_HOURS).map((hour) => <Text key={hour} style={[styles.tick, { left: `${((hour - RAIL_START_HOUR) / (RAIL_END_HOUR - RAIL_START_HOUR)) * 100}%` }]}>{format(setHours(startOfDay(day), hour), 'h a')}</Text>)}
      </View>
      <View style={[styles.rail, compact && styles.railCompact]}>
        {freeSlots.map((slot) => {
          const left = railPercent(parseISO(slot.startAt), day);
          const width = railPercent(parseISO(slot.endAt), day) - left;
          if (width <= 0) return null;
          const content = <View style={[styles.gap, { left: `${left}%`, width: `${width}%`, backgroundColor: highlightPalette?.soft ?? colors.track, borderColor: highlightPalette?.solid ?? colors.lineStrong }]} />;
          return onReserveGap ? (
            <Pressable
              key={slot.startAt}
              accessibilityRole="button"
              accessibilityLabel={`Reserve time starting ${format(parseISO(slot.startAt), 'h:mm a')}`}
              onPress={() => onReserveGap(slot.startAt)}
              style={[styles.gapPressable, { left: `${left}%`, width: `${width}%` }]}
            >
              <View style={[styles.gap, { left: 0, width: '100%', backgroundColor: highlightPalette?.soft ?? colors.track, borderColor: highlightPalette?.solid ?? colors.lineStrong }]} />
            </Pressable>
          ) : <View key={slot.startAt}>{content}</View>;
        })}
        {agenda.map((item) => {
          const startAt = item.kind === 'event' ? item.event.startAt : item.block.startAt;
          const endAt = item.kind === 'event' ? item.event.endAt : item.block.endAt;
          const left = railPercent(parseISO(startAt), day);
          const width = Math.max(1.5, railPercent(parseISO(endAt), day) - left);
          const palette = item.kind === 'block' ? categoryPalette[item.task.categoryId] : null;
          const background = palette?.soft ?? colors.eventSoft;
          const edge = palette?.solid ?? colors.event;
          const label = item.kind === 'event' ? item.event.title : item.task.title;
          const key = item.kind === 'event' ? item.event.id : item.block.id;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`${label}, ${format(parseISO(startAt), 'h:mm a')} to ${format(parseISO(endAt), 'h:mm a')}`}
              disabled={compact}
              onPress={() => setSelected((current) => (current === item ? null : item))}
              style={[styles.segment, { left: `${left}%`, width: `${width}%`, backgroundColor: background, borderColor: edge }]}
            />
          );
        })}
        {showNowTick ? <View style={[styles.nowTick, { left: `${nowPercent}%` }]} /> : null}
      </View>
      {compact ? null : nextLine ? <Text style={styles.nextLine} numberOfLines={1}>{nextLine}</Text> : <Text style={styles.nextLine} numberOfLines={1}>Open all day.</Text>}
      {selected && !compact ? (
        <View style={styles.caption}>
          <Text style={styles.captionText} numberOfLines={1}>
            {selected.kind === 'event' ? selected.event.title : selected.task.title}
            {'  '}
            {format(parseISO(selected.kind === 'event' ? selected.event.startAt : selected.block.startAt), 'h:mm a')}–{format(parseISO(selected.kind === 'event' ? selected.event.endAt : selected.block.endAt), 'h:mm a')}
          </Text>
          {selected.kind === 'block' ? (
            <Pressable accessibilityRole="button" onPress={() => { onRemoveBlock(selected.block.id); setSelected(null); }}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 700, marginTop: space.xl },
  wrapCompact: { width: '100%' },
  railCompact: { height: 32 },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginBottom: space.sm },
  title: { ...type.section, color: colors.ink, fontFamily },
  hint: { ...type.meta, color: colors.muted, fontFamily },
  ticks: { height: 14, position: 'relative' },
  tick: { position: 'absolute', fontSize: 10, lineHeight: 12, color: colors.muted, fontFamily },
  rail: { height: 44, borderRadius: radius.sm, backgroundColor: colors.lineFaint, position: 'relative', overflow: 'hidden' },
  gap: { position: 'absolute', top: 4, bottom: 4, borderRadius: 6, borderWidth: 1, borderStyle: 'dashed' },
  gapPressable: { position: 'absolute', top: 0, bottom: 0, zIndex: 1 },
  segment: { position: 'absolute', top: 4, bottom: 4, borderRadius: 6, borderLeftWidth: 3, zIndex: 2 },
  nowTick: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.ink, zIndex: 3 },
  nextLine: { ...type.meta, color: colors.muted, marginTop: space.xs, fontFamily },
  caption: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs, paddingVertical: 6, paddingHorizontal: space.sm, borderRadius: radius.sm, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  captionText: { ...type.meta, color: colors.ink, flex: 1, fontFamily },
  removeText: { ...type.meta, color: colors.danger, fontFamily },
});
