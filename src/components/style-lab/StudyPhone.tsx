import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import type { DayOrbitSegment } from '@/domain/selectors';
import { DayOrbit } from '@/components/DayOrbit';
import { glassBlobOpacity, glassBlobs, studyPalette, studySurface, type StudyDirection, type StudyScheme } from '@/theme/styleStudies';
import { fontFamily, onSolid, radius, space, type, type CategoryColorKey } from '@/theme/tokens';

const seg = (colorKey: CategoryColorKey, share: number, completion: number): DayOrbitSegment => ({ categoryId: colorKey, colorKey, share, completion });
const todaySegments = [seg('study', 0.4, 0.34), seg('personal', 0.3, 1), seg('routine', 0.3, 0)];
const week: Array<{ d: string; segments: DayOrbitSegment[]; today?: boolean }> = [
  { d: '27', segments: [seg('study', 0.5, 1), seg('personal', 0.5, 1)] },
  { d: '28', segments: [seg('study', 0.5, 1), seg('personal', 0.5, 0.5)] },
  { d: '29', segments: [seg('study', 1, 0.6)] },
  { d: '30', segments: [seg('study', 0.34, 1), seg('personal', 0.33, 1), seg('routine', 0.33, 1)] },
  { d: '1', segments: todaySegments, today: true },
  { d: '2', segments: [] },
  { d: '3', segments: [] },
];

function Check({ checked, color, dashed, scheme, well }: { checked: boolean; color: string; dashed?: boolean; scheme: StudyScheme; well: object | null }) {
  const circle = (
    <View style={[styles.check, { borderColor: color }, dashed && styles.dashed, checked && { backgroundColor: color }]}>
      {checked ? <Ionicons name="checkmark" size={14} color={onSolid(color)} /> : null}
    </View>
  );
  return well ? <View style={well}>{circle}</View> : circle;
}

function Backdrop({ scheme }: { scheme: StudyScheme }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { cat } = studyPalette(scheme);
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        {glassBlobs.map((b) => (
          <RadialGradient key={b.key} id={`${id}${b.key}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={cat(b.key).mark} stopOpacity={glassBlobOpacity[scheme]} />
            <Stop offset="1" stopColor={cat(b.key).mark} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      {glassBlobs.map((b) => <Rect key={b.key} x={`${(b.cx - b.r) * 100}%`} y={`${(b.cy - b.r * 0.7) * 100}%`} width={`${b.r * 200}%`} height={`${b.r * 140}%`} fill={`url(#${id}${b.key})`} />)}
    </Svg>
  );
}

interface TaskDef { title: string; done?: boolean; meta?: string }
const study: TaskDef[] = [{ title: 'Read chapter 4 notes', done: true }, { title: 'Draft thesis outline', meta: 'Thesis draft' }, { title: 'Email advisor about meeting' }];
const health: TaskDef[] = [{ title: 'Book dentist appointment' }, { title: 'Evening walk, 20 min' }];

export function StudyPhone({ dir, scheme, width }: { dir: StudyDirection; scheme: StudyScheme; width: number }) {
  const { c, cat } = studyPalette(scheme);
  const s = studySurface(dir, scheme);
  const text = { color: c.ink, fontFamily };
  const muted = { color: c.muted, fontFamily };

  const section = (name: string, key: CategoryColorKey, tasks: TaskDef[], extras: boolean) => {
    const p = cat(key);
    return (
      <View style={s.section}>
        <View style={styles.heading}>
          <View style={[styles.dot, { backgroundColor: p.solid }]} />
          <Text style={[styles.name, text]}>{name}</Text>
          <Text style={[styles.count, muted]}>{tasks.filter((t) => t.done).length}/{tasks.length + (extras ? 1 : 0)}</Text>
        </View>
        <View style={s.rows}>
          {tasks.map((t) => (
            <View key={t.title} style={[styles.row, s.row]}>
              <Check checked={Boolean(t.done)} color={p.solid} scheme={scheme} well={s.checkWell} />
              <View style={styles.copy}>
                <Text style={[styles.title, text, t.done && muted]} numberOfLines={1}>{t.title}</Text>
                {t.meta ? <View style={styles.metaRow}><Ionicons name="layers-outline" size={11} color={c.muted} /><Text style={[styles.meta, muted]} numberOfLines={1}>{t.meta}</Text></View> : null}
              </View>
            </View>
          ))}
          {extras ? (
            <>
              <View style={[styles.row, s.row]}>
                <Check checked={false} dashed color={p.solid} scheme={scheme} well={s.checkWell} />
                <View style={styles.copy}><Text style={[styles.title, muted]} numberOfLines={1}>Morning stretch</Text><View style={styles.metaRow}><Ionicons name="repeat" size={11} color={c.muted} /><Text style={[styles.meta, muted]}>Every weekday</Text></View></View>
              </View>
              <View style={[styles.row, styles.addRow]}><Ionicons name="add" size={18} color={c.muted} style={styles.addIcon} /><Text style={[styles.title, muted]}>Add</Text></View>
            </>
          ) : null}
        </View>
      </View>
    );
  };

  const card = (title: string, days: number, key: CategoryColorKey, done: number, total: number) => {
    const p = cat(key);
    const urgent = days <= 3;
    return (
      <View style={[styles.cardBase, s.card(p.solid, p.mark)]}>
        {dir === 'tactile' ? <View style={[styles.spine, { backgroundColor: p.solid }]} /> : null}
        <View style={styles.topline}>
          {dir === 'tactile' ? <View /> : <View style={[styles.dot, { backgroundColor: p.solid }]} />}
          <Text style={[styles.days, { color: urgent ? c.danger : c.inkSoft, fontFamily }]}>D−{days}</Text>
        </View>
        <Text style={[styles.cardTitle, text]} numberOfLines={1}>{title}</Text>
        <View style={styles.progressRow}>
          <View style={[styles.track, { backgroundColor: c.track }]}><View style={[styles.fill, { width: `${(done / total) * 100}%`, backgroundColor: p.solid }]} /></View>
          <Text style={[styles.meta, muted]}>{done}/{total}</Text>
        </View>
      </View>
    );
  };

  const tabs = [{ label: 'Today', icon: 'sunny', on: true }, { label: 'Calendar', icon: 'calendar-outline', on: false }, { label: 'Folders', icon: 'folder-outline', on: false }] as const;

  return (
    <View style={[styles.frame, { width, borderColor: c.lineStrong }, s.page]}>
      {dir === 'glass' ? <Backdrop scheme={scheme} /> : null}
      <View style={[styles.content, { paddingBottom: s.contentBottom }]}>
        <View style={styles.dateRow}><Text style={[styles.eyebrow, muted]}>THURSDAY</Text><Text style={[styles.dateTitle, text]}>Today</Text></View>
        <View style={[styles.summary, s.summary]}>
          <DayOrbit variant="wash" segments={todaySegments} size={44} strokeWidth={6} animate={false} scheme={scheme} />
          <Text style={[styles.count2, text]}>4 of 9</Text>
          <View style={styles.week}>
            {week.map((w) => (
              <View key={w.d} style={styles.day}>
                <View style={[styles.markWrap, w.today && { backgroundColor: cat('routine').soft, borderWidth: 1, borderColor: cat('routine').solid }]}><DayOrbit variant="wash" segments={w.segments} size={22} strokeWidth={3.5} animate={false} scheme={scheme} /></View>
                <Text style={[styles.dayNum, { color: w.today ? cat('routine').ink : c.inkSoft, fontFamily }]}>{w.d}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.cards}>{card('Thesis draft', 5, 'study', 3, 8)}{card('Portfolio site', 12, 'career', 2, 9)}</View>
        {section('Study', 'study', study, true)}
        {section('Health', 'personal', health, false)}
      </View>
      <View style={[styles.bar, s.bar, { flexDirection: 'row' }]}>
        {tabs.map((t) => (
          <View key={t.label} style={styles.tab}>
            <Ionicons name={t.icon} size={22} color={t.on ? c.ink : c.muted} />
            <Text style={[styles.tabLabel, { color: t.on ? c.ink : c.muted, fontWeight: t.on ? '800' : '600', fontFamily }]}>{t.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: 36, borderWidth: 1, overflow: 'hidden', position: 'relative', minHeight: 760 },
  content: { paddingHorizontal: space.md, paddingTop: space.lg },
  dateRow: { paddingBottom: space.xs },
  eyebrow: { ...type.meta, letterSpacing: 1 },
  dateTitle: { ...type.title },
  summary: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingVertical: space.xxs, marginBottom: space.md },
  count2: { ...type.bodyMedium },
  week: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  day: { width: 27, alignItems: 'center', gap: 1 },
  markWrap: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: 9, lineHeight: 12 },
  cards: { flexDirection: 'row', gap: space.sm, marginBottom: space.lg },
  cardBase: { flex: 1, minWidth: 0 },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  days: { ...type.meta },
  cardTitle: { ...type.bodyMedium, marginTop: 6 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: 8 },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.xs, paddingVertical: space.xxs },
  name: { ...type.section },
  count: { ...type.meta, marginLeft: 'auto' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  copy: { flex: 1, minWidth: 0 },
  title: { ...type.task },
  meta: { ...type.meta },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  check: { width: 22, height: 22, borderRadius: radius.round, borderWidth: 1.7, alignItems: 'center', justifyContent: 'center' },
  dashed: { borderStyle: 'dashed' },
  addRow: { minHeight: 40 },
  addIcon: { width: 22, textAlign: 'center' },
  bar: { position: 'absolute' },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { fontSize: 10, lineHeight: 14 },
});
