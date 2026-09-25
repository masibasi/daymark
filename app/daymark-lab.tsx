import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Link } from 'expo-router';
import { parseISO } from 'date-fns';
import type { DayOrbitSegment } from '@/domain/selectors';
import { selectDayOrbit } from '@/domain/selectors';
import type { CategoryId, DayMarkVariant } from '@/domain/types';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { DayOrbit } from '@/components/DayOrbit';
import { DeadlineStrip } from '@/components/DeadlineStrip';
import type { Project } from '@/domain/types';
import { prototypeDate } from '@/store/mockData';
import { addDays, format } from 'date-fns';
import { colors, darkColors, fontFamily, radius, space, type } from '@/theme/tokens';

const concepts: Array<{ variant: DayMarkVariant; title: string; description: string }> = [
  { variant: 'ribbon', title: '01  Soft ribbon', description: 'A quiet, continuous band of category color on a neutral track. No interior fill — completion reads from the ring alone.' },
  { variant: 'glass', title: '02  Glass vessel', description: 'The same band drawn like a thin glass rim: a soft specular highlight, a faint inner disc, one dominant tint only when the day closes.' },
  { variant: 'wash', title: '03  Watercolor wash', description: 'Each color bleeds softly inward from its own arc. Colors touch but never mix, and the center stays light even on a full day.' },
  { variant: 'current', title: '04  Current (baseline)', description: 'The live shipped version, kept here for direct comparison: rising liquid pigment and gentle rotation.' },
];

const ORDER: CategoryId[] = ['study', 'career', 'personal', 'routine'];

function evenSegments(progress: number): DayOrbitSegment[] {
  return ORDER.map((categoryId, index) => ({ categoryId, share: 0.25, completion: Math.max(0, Math.min(1, progress * 4 - index)) }));
}

const unevenSegments: DayOrbitSegment[] = [
  { categoryId: 'study', share: 0.5, completion: 1 },
  { categoryId: 'career', share: 0.3, completion: 0.5 },
  { categoryId: 'routine', share: 0.2, completion: 1 },
];

const stateSamples: Array<{ label: string; segments: DayOrbitSegment[] }> = [
  { label: '0%', segments: evenSegments(0) },
  { label: '25%', segments: evenSegments(0.25) },
  { label: '50%', segments: evenSegments(0.5) },
  { label: '100%', segments: evenSegments(1) },
  { label: 'uneven', segments: unevenSegments },
];

const weekSamples: Array<{ day: string; segments: DayOrbitSegment[] }> = [
  { day: '15', segments: [] },
  { day: '16', segments: [{ categoryId: 'study', share: 0.5, completion: 1 }, { categoryId: 'career', share: 0.5, completion: 0 }] },
  { day: '17', segments: [{ categoryId: 'study', share: 0.34, completion: 1 }, { categoryId: 'personal', share: 0.33, completion: 1 }, { categoryId: 'routine', share: 0.33, completion: 0 }] },
  { day: '18', segments: evenSegments(1) },
  { day: '19', segments: [{ categoryId: 'career', share: 0.6, completion: 0.4 }, { categoryId: 'routine', share: 0.4, completion: 0 }] },
  { day: '20', segments: [] },
  { day: '21', segments: evenSegments(1) },
];

const toneSamples: Project[] = [
  { days: 20, title: 'Far away · neutral', categoryId: 'career' as const },
  { days: 6, title: 'In attention window · category tint', categoryId: 'study' as const },
  { days: 3, title: 'D−3 · warm', categoryId: 'personal' as const },
  { days: 1, title: 'D−1 · rose', categoryId: 'study' as const },
  { days: 0, title: 'Due today · rose', categoryId: 'routine' as const },
].map((sample) => ({ id: `tone-${sample.days}`, title: sample.title, categoryId: sample.categoryId, deadline: format(addDays(prototypeDate, sample.days), 'yyyy-MM-dd'), status: 'active' }));

export default function DayMarkLab() {
  const { width } = useWindowDimensions();
  const wide = width >= 1000;
  const tasks = useDaymarkStore((s) => s.tasks);
  const selectedTodayDate = useDaymarkStore((s) => s.selectedTodayDate);
  const dayMarkVariant = useDaymarkStore((s) => s.dayMarkVariant);
  const setDayMarkVariant = useDaymarkStore((s) => s.setDayMarkVariant);
  const todaySegments = selectDayOrbit(tasks, parseISO(selectedTodayDate));
  const largeSize = wide ? 132 : 112;

  return <ScrollView contentContainerStyle={styles.scroll}>
    <View style={styles.page}>
      <Link href="/" style={styles.back}>← Today</Link>
      <Text style={styles.eyebrow}>VISUAL STUDY · V0</Text>
      <Text style={styles.title}>Day Mark studies</Text>
      <Text style={styles.intro}>Four treatments of the same completion data, at Today size and at calendar size, in light and dark.</Text>
      {concepts.map((concept, index) => {
        const isActive = dayMarkVariant === concept.variant;
        return (
          <View key={concept.variant} style={[styles.section, index > 0 && styles.sectionDivider]}>
            <View style={[styles.sectionBody, wide && styles.sectionBodyWide]}>
              <View style={[styles.largeCol, wide && styles.largeColWide]}>
                <Text style={styles.conceptTitle}>{concept.title}</Text>
                <Text style={styles.description}>{concept.description}</Text>
                <View style={styles.largeMarkWrap}>
                  <DayOrbit variant={concept.variant} segments={todaySegments} size={largeSize} strokeWidth={largeSize * 0.095} animate />
                  <Text style={styles.largeLabel}>Today (live)</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDayMarkVariant(concept.variant)}
                  disabled={isActive}
                  style={[styles.chooseButton, isActive ? styles.chooseButtonActive : styles.choosePrimary]}
                >
                  <Text style={[styles.chooseText, isActive ? styles.chooseTextActive : styles.chooseTextPrimary]}>{isActive ? 'Using on Today ✓' : 'Use on Today'}</Text>
                </Pressable>
              </View>
              <View style={[styles.detailCol, wide && styles.detailColWide]}>
                <Text style={styles.groupLabel}>States</Text>
                <View style={styles.samples}>
                  {stateSamples.map((sample) => (
                    <View key={sample.label} style={styles.sample}>
                      <DayOrbit variant={concept.variant} segments={sample.segments} size={64} strokeWidth={6.4} />
                      <Text style={styles.percent}>{sample.label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.groupLabel}>Calendar size (22px)</Text>
                <View style={styles.week}>
                  {weekSamples.map((sample) => (
                    <View key={sample.day} style={styles.weekDay}>
                      <DayOrbit variant={concept.variant} segments={sample.segments} size={22} strokeWidth={3.5} />
                      <Text style={styles.weekNumber}>{sample.day}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.groupLabel}>Dark mode</Text>
                <View style={styles.darkPanel}>
                  {weekSamples.map((sample) => (
                    <View key={sample.day} style={styles.weekDay}>
                      <DayOrbit variant={concept.variant} segments={sample.segments} size={22} strokeWidth={3.5} scheme="dark" />
                      <Text style={styles.weekNumberDark}>{sample.day}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        );
      })}
      <View style={[styles.section, styles.sectionDivider]}>
        <Text style={styles.conceptTitle}>Deadline tones</Text>
        <Text style={styles.description}>The same Upcoming card at each urgency step, with the default seven-day attention window. Check that D−3 and D−1 feel noticeable without making the page anxious.</Text>
        <View style={styles.toneStrip}><DeadlineStrip projects={toneSamples} tasks={[]} now={prototypeDate} /></View>
      </View>
      <Text style={styles.footer}>Choosing a study here only changes this prototype session; nothing is saved.</Text>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  page: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.xxl },
  back: { ...type.meta, color: colors.accent, fontFamily, marginBottom: space.xl },
  eyebrow: { ...type.meta, color: colors.accent, letterSpacing: 1.4, fontFamily },
  title: { ...type.display, color: colors.ink, fontFamily, marginTop: space.xs },
  intro: { ...type.body, color: colors.inkSoft, maxWidth: 560, marginTop: space.sm, marginBottom: space.lg, fontFamily },
  section: { paddingVertical: space.xl },
  toneStrip: { marginTop: space.lg },
  sectionDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  sectionBody: { gap: space.lg },
  sectionBodyWide: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xl },
  largeCol: { gap: space.xs },
  largeColWide: { width: 280, flexShrink: 0 },
  conceptTitle: { ...type.section, color: colors.ink, fontFamily },
  description: { ...type.body, color: colors.inkSoft, marginTop: space.xxs, fontFamily },
  largeMarkWrap: { alignItems: 'center', gap: space.xs, marginTop: space.md, marginBottom: space.sm },
  largeLabel: { ...type.meta, color: colors.muted, fontFamily },
  chooseButton: { alignSelf: 'flex-start', paddingVertical: space.xs, paddingHorizontal: space.md, borderRadius: radius.sm },
  choosePrimary: { backgroundColor: colors.accent },
  chooseButtonActive: { backgroundColor: colors.track },
  chooseText: { ...type.bodyMedium, fontFamily },
  chooseTextPrimary: { color: colors.white },
  chooseTextActive: { color: colors.inkSoft },
  detailCol: { gap: space.sm },
  detailColWide: { flex: 1 },
  groupLabel: { ...type.meta, color: colors.muted, letterSpacing: 0.6, marginTop: space.sm, fontFamily },
  samples: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  sample: { alignItems: 'center', gap: space.xxs, minWidth: 64 },
  percent: { ...type.meta, color: colors.muted, fontFamily },
  week: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  weekDay: { alignItems: 'center', gap: 4 },
  weekNumber: { fontSize: 10, lineHeight: 13, color: colors.muted, fontFamily },
  weekNumberDark: { fontSize: 10, lineHeight: 13, color: darkColors.muted, fontFamily },
  darkPanel: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', backgroundColor: darkColors.canvas, borderRadius: radius.md, padding: space.md },
  footer: { ...type.meta, color: colors.muted, marginTop: space.xl, fontFamily },
});
