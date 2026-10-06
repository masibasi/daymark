import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isAfter, isSameDay, isSameMonth, isValid, parseISO, startOfDay, startOfMonth, startOfWeek, subMonths, subWeeks } from 'date-fns';
import { DayOrbit } from '@/components/DayOrbit';
import { FadeOnChange } from '@/components/FadeOnChange';
import { PressableScale } from '@/components/PressableScale';
import { SegmentedControl } from '@/components/SegmentedControl';
import { now } from '@/domain/clock';
import { selectDayOrbit, selectReflection, type Reflection } from '@/domain/selectors';
import type { Category, Task } from '@/domain/types';
import { useCategoryPalette } from '@/store/useCategoryPalette';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';

type Period = 'week' | 'month';

// All copy lives here so it can move into the string dictionaries later (A3).
const STR = {
  eyebrow: 'Reflect',
  week: 'Week',
  month: 'Month',
  thisWeek: 'This week',
  thisMonth: 'This month',
  weekOf: (date: Date) => `Week of ${format(date, 'MMM d')}`,
  monthTitle: (date: Date) => format(date, 'MMMM yyyy'),
  previous: (period: Period) => `Previous ${period}`,
  next: (period: Period) => `Next ${period}`,
  done: (count: number) => `${count} done`,
  acrossDays: (days: number) => `across ${days} ${days === 1 ? 'day' : 'days'}`,
  emptyCurrent: (period: Period) => `Nothing checked off yet this ${period}. Your marks will gather here.`,
  emptyPast: (period: Period) => `A quiet ${period}.`,
  whereItWent: 'Where it went',
  folders: 'Folders',
  steps: (count: number) => `${count} ${count === 1 ? 'step' : 'steps'}`,
  finished: 'Finished',
  routines: 'Routines',
  times: (count: number) => `${count} ${count === 1 ? 'time' : 'times'}`,
  fullestDay: 'Fullest day',
  fullestLine: (date: Date, count: number) => `${format(date, 'EEEE')} · ${count} done`,
  open: (date: Date) => `Open ${format(date, 'MMMM d')}`,
} as const;

const keyOf = (date: Date) => format(date, 'yyyy-MM-dd');
// Monday-first, like the Calendar tab.
const WEEK = { weekStartsOn: 1 } as const;

function rangeFor(period: Period, anchor: Date) {
  return period === 'week' ? { start: startOfWeek(anchor, WEEK), end: endOfWeek(anchor, WEEK) } : { start: startOfMonth(anchor), end: endOfMonth(anchor) };
}

function parseParams(period?: string, date?: string): { period: Period; anchor: Date } {
  const parsed = date ? parseISO(date) : undefined;
  const today = now();
  const anchor = parsed && isValid(parsed) && !isAfter(startOfDay(parsed), startOfDay(today)) ? parsed : today;
  return { period: period === 'month' ? 'month' : 'week', anchor };
}

interface MarkProps { day: Date; tasks: Task[]; categories: Category[]; size: number; strokeWidth: number }

// A day's Day Mark; segments come only from selectDayOrbit.
function DayMark({ day, tasks, categories, size, strokeWidth }: MarkProps) {
  return <DayOrbit segments={selectDayOrbit(tasks, day, categories)} size={size} strokeWidth={strokeWidth} />;
}

function openDay(day: Date, setSelected: (date: string) => void) {
  setSelected(keyOf(day));
  router.push('/');
}

export default function ReflectScreen() {
  const { width } = useWindowDimensions();
  const desk = width >= 760;
  const params = useLocalSearchParams<{ period?: string; date?: string }>();
  const initial = parseParams(typeof params.period === 'string' ? params.period : undefined, typeof params.date === 'string' ? params.date : undefined);
  const [period, setPeriod] = useState<Period>(initial.period);
  const [anchor, setAnchor] = useState<Date>(initial.anchor);
  const tasks = useDaymarkStore((state) => state.tasks);
  const categories = useDaymarkStore((state) => state.categories);
  const projects = useDaymarkStore((state) => state.projects);
  const routines = useDaymarkStore((state) => state.routines);
  const setSelectedTodayDate = useDaymarkStore((state) => state.setSelectedTodayDate);
  const paletteFor = useCategoryPalette();

  const today = startOfDay(now());
  const { start, end } = rangeFor(period, anchor);
  const isCurrent = !isAfter(today, end) && !isAfter(start, today);
  const nextDisabled = !isAfter(today, end); // the period already reaches today
  const reflection = selectReflection(tasks, categories, projects, routines, start, end);
  const title = isCurrent ? (period === 'week' ? STR.thisWeek : STR.monthTitle(start)) : period === 'week' ? STR.weekOf(start) : STR.monthTitle(start);
  const step = (direction: -1 | 1) => setAnchor((current) => (period === 'week' ? (direction < 0 ? subWeeks : addWeeks) : (direction < 0 ? subMonths : addMonths))(current, 1));
  const changePeriod = (next: Period) => { setPeriod(next); setAnchor((current) => (isAfter(startOfDay(current), today) ? today : current)); };
  const select = (day: Date) => openDay(day, setSelectedTodayDate);

  const markSize = desk ? 52 : 34;
  const days = eachDayOfInterval({ start, end });
  const gridDays = eachDayOfInterval({ start: startOfWeek(start, WEEK), end: endOfWeek(end, WEEK) });
  const topCount = reflection.byList[0]?.count ?? 1;

  const renderDay = (day: Date, size: number, strokeWidth: number, numberStyle: object, cellStyle: object = styles.dayCell) => {
    const future = isAfter(startOfDay(day), today);
    const label = <Text style={[styles.dayNumber, numberStyle, isSameDay(day, today) && styles.dayNumberToday]}>{format(day, 'd')}</Text>;
    // Only days with something done get a mark; empty and future days stay a plain number (Reflection never shows what was left).
    if (future || !reflection.perDay[keyOf(day)]) return <View key={keyOf(day)} style={cellStyle}><View style={{ height: size }} />{label}</View>;
    return (
      <PressableScale key={keyOf(day)} accessibilityRole="button" accessibilityLabel={STR.open(day)} onPress={() => select(day)} style={cellStyle}>
        <DayMark day={day} tasks={tasks} categories={categories} size={size} strokeWidth={strokeWidth} />
        {label}
      </PressableScale>
    );
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, desk && styles.contentDesk]} showsVerticalScrollIndicator={false}>
      <View style={styles.column}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{STR.eyebrow}</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
          <View style={styles.periodControls}>
            <Pressable accessibilityRole="button" accessibilityLabel={STR.previous(period)} onPress={() => step(-1)} style={styles.iconButton}><Ionicons name="chevron-back" size={18} color={colors.ink} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={STR.next(period)} accessibilityState={{ disabled: nextDisabled }} disabled={nextDisabled} onPress={() => step(1)} style={[styles.iconButton, nextDisabled && styles.iconDisabled]}><Ionicons name="chevron-forward" size={18} color={colors.ink} /></Pressable>
          </View>
        </View>
        <View style={styles.segment}><SegmentedControl value={period} options={[{ value: 'week', label: STR.week }, { value: 'month', label: STR.month }]} onChange={changePeriod} /></View>

        <FadeOnChange token={`${period}-${keyOf(start)}`}>
          <Hero reflection={reflection} period={period} isCurrent={isCurrent} />

          {period === 'week' ? (
            <View style={styles.weekRow}>
              <View style={styles.weekdayRow}>{days.map((day) => <Text key={keyOf(day)} style={styles.weekday}>{format(day, 'EEEEE')}</Text>)}</View>
              <View style={styles.weekMarks}>{days.map((day) => renderDay(day, markSize, desk ? 7 : 5, desk ? styles.dayNumberDesk : {}))}</View>
            </View>
          ) : (
            <View style={styles.monthCard}>
              <View style={styles.weekdayRow}>{gridDays.slice(0, 7).map((day) => <Text key={keyOf(day)} style={styles.weekday}>{format(day, 'EEEEE')}</Text>)}</View>
              <View style={styles.monthGrid}>
                {gridDays.map((day) => (isSameMonth(day, start) ? renderDay(day, desk ? 36 : 28, desk ? 5 : 4, {}, styles.monthDay) : <View key={keyOf(day)} style={styles.monthCell} />))}
              </View>
            </View>
          )}

          {reflection.byList.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{STR.whereItWent}</Text>
              {reflection.byList.map(({ category, count }) => (
                <View key={category.id} style={styles.barRow}>
                  <Text style={styles.barLabel} numberOfLines={1}>{category.name} · {count}</Text>
                  <View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.max(4, Math.round((count / topCount) * 100))}%`, backgroundColor: paletteFor(category).solid }]} /></View>
                </View>
              ))}
            </View>
          ) : null}

          {reflection.folders.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{STR.folders}</Text>
              {reflection.folders.map(({ project, steps, finished }) => (
                <View key={project.id} style={styles.listRow}>
                  <View style={[styles.dot, { backgroundColor: paletteFor(project.categoryId).solid }]} />
                  <Text style={styles.rowTitle} numberOfLines={1}>{project.title}</Text>
                  {finished ? <View style={styles.tag}><Text style={styles.tagText}>{STR.finished}</Text></View> : null}
                  <Text style={styles.rowMeta}>{STR.steps(steps)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {reflection.routines.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{STR.routines}</Text>
              {reflection.routines.map(({ routine, count }) => (
                <View key={routine.id} style={styles.listRow}>
                  <View style={[styles.dot, { backgroundColor: paletteFor(routine.categoryId).solid }]} />
                  <Text style={styles.rowTitle} numberOfLines={1}>{routine.title}</Text>
                  <Text style={styles.rowMeta}>{STR.times(count)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {reflection.fullestDay ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{STR.fullestDay}</Text>
              <PressableScale accessibilityRole="button" accessibilityLabel={STR.open(parseISO(reflection.fullestDay.day))} onPress={() => select(parseISO(reflection.fullestDay?.day ?? keyOf(today)))} style={styles.fullest}>
                <DayMark day={parseISO(reflection.fullestDay.day)} tasks={tasks} categories={categories} size={72} strokeWidth={8} />
                <Text style={styles.fullestText}>{STR.fullestLine(parseISO(reflection.fullestDay.day), reflection.fullestDay.count)}</Text>
              </PressableScale>
            </View>
          ) : null}
        </FadeOnChange>
      </View>
    </ScrollView>
  );
}

function Hero({ reflection, period, isCurrent }: { reflection: Reflection; period: Period; isCurrent: boolean }) {
  if (reflection.total === 0) return <View style={styles.hero}><Text style={styles.emptyLine}>{isCurrent ? STR.emptyCurrent(period) : STR.emptyPast(period)}</Text></View>;
  return (
    <View style={styles.hero}>
      <Text style={styles.heroNumber}>{STR.done(reflection.total)}</Text>
      <Text style={styles.heroSub}>{STR.acrossDays(reflection.activeDays)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.xxl * 2 },
  contentDesk: { paddingTop: space.xl },
  column: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { ...type.meta, color: colors.accent, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: space.xs, fontFamily },
  title: { ...type.display, color: colors.ink, fontFamily },
  periodControls: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.xs },
  iconButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  iconDisabled: { opacity: 0.35 },
  segment: { alignSelf: 'flex-start', marginTop: space.md },
  hero: { marginTop: space.xl },
  heroNumber: { fontSize: 52, lineHeight: 58, fontWeight: '700', letterSpacing: -1.6, color: colors.ink, fontFamily },
  heroSub: { ...type.body, color: colors.inkSoft, marginTop: space.xxs, fontFamily },
  emptyLine: { ...type.body, color: colors.inkSoft, fontFamily },
  weekRow: { marginTop: space.lg },
  weekdayRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', ...type.meta, color: colors.muted, marginBottom: space.xs, fontFamily },
  weekMarks: { flexDirection: 'row' },
  dayCell: { flex: 1, alignItems: 'center', gap: space.xxs },
  dayNumber: { fontSize: 11, lineHeight: 14, color: colors.inkSoft, fontFamily },
  dayNumberDesk: { fontSize: 13, lineHeight: 16 },
  dayNumberToday: { color: colors.ink, fontWeight: '700' },
  monthCard: { marginTop: space.lg, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthDay: { width: `${100 / 7}%`, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 2 },
  monthCell: { width: `${100 / 7}%`, minHeight: 52 },
  section: { marginTop: space.xl },
  sectionTitle: { ...type.section, color: colors.ink, marginBottom: space.sm, fontFamily },
  barRow: { marginBottom: space.sm },
  barLabel: { ...type.meta, color: colors.inkSoft, marginBottom: 5, fontFamily },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: colors.track, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  listRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: space.xs, borderBottomWidth: 1, borderColor: colors.lineFaint },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowTitle: { ...type.bodyMedium, flex: 1, minWidth: 0, color: colors.ink, fontFamily },
  rowMeta: { ...type.meta, color: colors.muted, fontFamily },
  tag: { paddingHorizontal: space.xs, paddingVertical: 2, borderRadius: radius.round, backgroundColor: colors.track },
  tagText: { ...type.meta, color: colors.inkSoft, fontFamily },
  fullest: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  fullestText: { ...type.bodyMedium, color: colors.ink, fontFamily },
});
