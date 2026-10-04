import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { DayOrbitSegment } from '@/domain/selectors';
import { isMarkPath, presetStroke, processStroke, type MarkPath } from '@/domain/markPath';
import { MarkDrawPad, ProgressSlider, evenSegments, weekSamples } from '@/components/MarkDrawPad';
import { PathMark } from '@/components/PathMark';
import { colors, darkColors, fontFamily, radius, space, type } from '@/theme/tokens';

// Lab playground for drawn Day Marks (the shipped version is Settings > Appearance > Custom (beta)); its drawing lives only in localStorage on web.
const STORAGE_KEY = 'daymark-lab-mark';

const unevenSegments: DayOrbitSegment[] = [
  { categoryId: 'study', colorKey: 'study', share: 0.5, completion: 1 },
  { categoryId: 'career', colorKey: 'career', share: 0.3, completion: 0.5 },
  { categoryId: 'routine', colorKey: 'routine', share: 0.2, completion: 1 },
];
const stateSamples = [
  { label: '0%', segments: evenSegments(0) },
  { label: '25%', segments: evenSegments(0.25) },
  { label: '50%', segments: evenSegments(0.5) },
  { label: '100%', segments: evenSegments(1) },
  { label: 'uneven', segments: unevenSegments },
];
function loadMark(): MarkPath | null {
  if (Platform.OS !== 'web') return null;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isMarkPath(parsed) ? parsed : null;
  } catch { return null; }
}
function saveMark(mark: MarkPath | null) {
  if (Platform.OS !== 'web') return;
  try {
    if (typeof localStorage === 'undefined') return;
    if (mark) localStorage.setItem(STORAGE_KEY, JSON.stringify(mark)); else localStorage.removeItem(STORAGE_KEY);
  } catch { /* storage unavailable: the drawing just won't survive a reload */ }
}

interface Props { todaySegments: DayOrbitSegment[]; wide: boolean; onDrawingChange?: (drawing: boolean) => void }

export function DrawMarkLab({ todaySegments, wide, onDrawingChange }: Props) {
  const padSize = wide ? 320 : 280;
  const [mark, setMark] = useState<MarkPath | null>(loadMark);
  const [initial] = useState(mark);
  const [progress, setProgress] = useState(0.55);
  const onChange = useCallback((next: MarkPath | null) => { setMark(next); saveMark(next); }, []);

  const shown = mark ?? (() => { const r = processStroke(presetStroke('Heart', padSize), padSize); return r.ok ? r.mark : null; })();
  const sliderSegments = evenSegments(progress);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Draw your mark (experiment)</Text>
      <Text style={styles.description}>Draw one stroke with a finger or the mouse — a star, a heart, a line, anything. The day fills along it in list colors, starting where you started. This is the playground; the real thing is Settings, Appearance, Custom (beta). Here the drawing stays in this browser only.</Text>
      <View style={[styles.body, wide && styles.bodyWide]}>
        <MarkDrawPad size={padSize} initial={initial} onChange={onChange} onDrawingChange={onDrawingChange} />
        <View style={styles.previewCol}>
          {shown ? <>
            <Text style={styles.groupLabel}>{shown.closed ? 'Closed shape' : 'Open line'} · live progress {Math.round(progress * 100)}%</Text>
            <View style={styles.sliderRow}>
              <PathMark path={shown} segments={sliderSegments} size={132} strokeWidth={9} />
              <View style={styles.sliderCol}>
                <ProgressSlider value={progress} onChange={setProgress} />
                <Text style={styles.hint}>Four lists, shared evenly.</Text>
              </View>
            </View>
            <Text style={styles.groupLabel}>States</Text>
            <View style={styles.samples}>
              {stateSamples.map((sample) => (
                <View key={sample.label} style={styles.sample}>
                  <PathMark path={shown} segments={sample.segments} size={64} strokeWidth={6.4} />
                  <Text style={styles.percent}>{sample.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.groupLabel}>Calendar size (22px)</Text>
            <View style={styles.week}>
              {weekSamples.map((sample) => (
                <View key={sample.day} style={styles.weekDay}>
                  <PathMark path={shown} segments={sample.segments} size={22} strokeWidth={3.5} />
                  <Text style={styles.weekNumber}>{sample.day}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.groupLabel}>Dark mode</Text>
            <View style={styles.darkPanel}>
              <PathMark path={shown} segments={stateSamples[3].segments} size={64} strokeWidth={6.4} scheme="dark" />
              <PathMark path={shown} segments={stateSamples[4].segments} size={64} strokeWidth={6.4} scheme="dark" />
              {weekSamples.map((sample) => (
                <View key={sample.day} style={styles.weekDay}>
                  <PathMark path={shown} segments={sample.segments} size={22} strokeWidth={3.5} scheme="dark" />
                  <Text style={styles.weekNumberDark}>{sample.day}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.groupLabel}>Today (live, animated)</Text>
            <PathMark path={shown} segments={todaySegments} size={132} strokeWidth={9} animate />
          </> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingVertical: space.xl, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  sectionTitle: { ...type.section, color: colors.ink, fontFamily },
  description: { ...type.body, color: colors.inkSoft, marginTop: space.xxs, maxWidth: 620, fontFamily },
  hint: { ...type.meta, color: colors.muted, fontFamily },
  body: { gap: space.lg, marginTop: space.lg },
  bodyWide: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xl },
  previewCol: { flex: 1, gap: space.sm },
  groupLabel: { ...type.meta, color: colors.muted, letterSpacing: 0.6, marginTop: space.sm, fontFamily },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, flexWrap: 'wrap' },
  sliderCol: { flex: 1, minWidth: 140, gap: space.xs },
  samples: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  sample: { alignItems: 'center', gap: space.xxs, minWidth: 64 },
  percent: { ...type.meta, color: colors.muted, fontFamily },
  week: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  weekDay: { alignItems: 'center', gap: 4 },
  weekNumber: { fontSize: 10, lineHeight: 13, color: colors.muted, fontFamily },
  weekNumberDark: { fontSize: 10, lineHeight: 13, color: darkColors.muted, fontFamily },
  darkPanel: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', backgroundColor: darkColors.canvas, borderRadius: radius.md, padding: space.md },
});
