import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  currentHour,
  formatDayLabel,
  formatDayNumber,
  hourOf,
  toDateKey,
} from '../domain/dateUtils';
import type { CategoryColorKey } from '../theme/categoryColors';
import { palette, spacing, type as typeScale, weight } from '../theme/tokens';
import { CalendarEventBlock } from './CalendarEventBlock';
import { TaskTimeBlock } from './TaskTimeBlock';

export interface GridBlock {
  id: string;
  kind: 'event' | 'task';
  title: string;
  start: string;
  end: string;
  color?: string;
  categoryColor?: CategoryColorKey;
  completed?: boolean;
}

interface WeekTimeGridProps {
  days: Date[];
  today: Date;
  blocksByDay: Map<string, GridBlock[]>;
  placing: boolean;
  onSlotPress: (dateKey: string, hour: number) => void;
}

const HOUR_START = 6;
const HOUR_END = 22;
const HOUR_HEIGHT = 56;
const GUTTER_WIDTH = 48;

/** Simple greedy column-packing for overlap layout within a single day.
 * V0 simplification (see docs/ARCHITECTURE.md edge cases): column count is
 * computed per-day rather than per-overlap-cluster, which is exactly
 * correct for our mock data (at most one overlap cluster per day) and only
 * slightly conservative in denser hypothetical days. */
function layoutDay(blocks: GridBlock[]): { block: GridBlock; col: number; colCount: number }[] {
  const sorted = [...blocks].sort((a, b) => hourOf(a.start) - hourOf(b.start));
  const columnEnds: number[] = [];
  const placed: { block: GridBlock; col: number }[] = [];

  for (const block of sorted) {
    const start = hourOf(block.start);
    const end = hourOf(block.end);
    let col = columnEnds.findIndex((endHour) => endHour <= start);
    if (col === -1) {
      col = columnEnds.length;
      columnEnds.push(end);
    } else {
      columnEnds[col] = end;
    }
    placed.push({ block, col });
  }

  const colCount = Math.max(1, columnEnds.length);
  return placed.map((p) => ({ ...p, colCount }));
}

export function WeekTimeGrid({ days, today, blocksByDay, placing, onSlotPress }: WeekTimeGridProps) {
  const todayKey = toDateKey(today);
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const nowHour = currentHour();

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <View style={{ width: GUTTER_WIDTH }} />
        {days.map((day) => {
          const key = toDateKey(day);
          const isToday = key === todayKey;
          return (
            <View key={key} style={styles.dayHeaderCell}>
              <Text style={styles.dayLabel}>{formatDayLabel(day)}</Text>
              <View style={[styles.dayNumberWrap, isToday && styles.dayNumberToday]}>
                <Text style={[styles.dayNumber, isToday && styles.dayNumberTextToday]}>
                  {formatDayNumber(day)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <ScrollView>
        <View style={styles.gridRow}>
          <View style={{ width: GUTTER_WIDTH }}>
            {hours.map((h) => (
              <View key={h} style={{ height: HOUR_HEIGHT }}>
                <Text style={styles.hourLabel}>{formatHour(h)}</Text>
              </View>
            ))}
          </View>

          {days.map((day) => {
            const key = toDateKey(day);
            const dayBlocks = blocksByDay.get(key) ?? [];
            const laidOut = layoutDay(dayBlocks);
            const isToday = key === todayKey;

            return (
              <View key={key} style={styles.dayColumn}>
                {hours.map((h) => (
                  <Pressable
                    key={h}
                    style={[styles.hourCell, placing && styles.hourCellPlacing]}
                    onPress={() => onSlotPress(key, h)}
                  >
                    <View style={styles.hourLine} />
                  </Pressable>
                ))}

                {isToday && nowHour >= HOUR_START && nowHour <= HOUR_END && (
                  <View
                    style={[styles.nowLine, { top: (nowHour - HOUR_START) * HOUR_HEIGHT }]}
                  />
                )}

                {laidOut.map(({ block, col, colCount }) => {
                  const start = hourOf(block.start);
                  const end = Math.max(start + 0.34, hourOf(block.end));
                  const top = (start - HOUR_START) * HOUR_HEIGHT;
                  const height = (end - start) * HOUR_HEIGHT;
                  const widthPct = 100 / colCount;
                  const leftPct = col * widthPct;
                  const blockStyle = {
                    top,
                    height,
                    left: `${leftPct}%` as unknown as number,
                    width: `${widthPct - 3}%` as unknown as number,
                  };

                  if (block.kind === 'event') {
                    return (
                      <CalendarEventBlock
                        key={block.id}
                        title={block.title}
                        start={block.start}
                        end={block.end}
                        color={block.color ?? palette.inkSecondary}
                        style={blockStyle}
                        compact={height < 40}
                      />
                    );
                  }
                  return (
                    <TaskTimeBlock
                      key={block.id}
                      title={block.title}
                      start={block.start}
                      end={block.end}
                      categoryColor={block.categoryColor ?? 'study'}
                      completed={!!block.completed}
                      style={blockStyle}
                      compact={height < 40}
                    />
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function formatHour(h: number): string {
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: palette.hairline,
    paddingBottom: spacing.xs,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  dayLabel: {
    fontSize: typeScale.micro,
    color: palette.inkSecondary,
    fontWeight: weight.medium,
  },
  dayNumberWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberToday: {
    backgroundColor: palette.ink,
  },
  dayNumber: {
    fontSize: typeScale.label,
    color: palette.ink,
    fontWeight: weight.semibold,
  },
  dayNumberTextToday: {
    color: palette.surface,
  },
  gridRow: {
    flexDirection: 'row',
  },
  hourLabel: {
    fontSize: 10,
    color: palette.inkSecondary,
    marginTop: -6,
  },
  dayColumn: {
    flex: 1,
    position: 'relative',
    borderLeftWidth: 1,
    borderLeftColor: palette.hairline,
  },
  hourCell: {
    height: HOUR_HEIGHT,
    justifyContent: 'flex-end',
  },
  hourCellPlacing: {
    backgroundColor: 'rgba(91, 141, 239, 0.05)',
  },
  hourLine: {
    height: 1,
    backgroundColor: palette.hairline,
  },
  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: palette.coral,
    zIndex: 5,
  },
});
