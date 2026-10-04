import { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { DayOrbitSegment } from '@/domain/selectors';
import { isMarkPath, presetNames, presetStroke, processStroke, type MarkPath, type PresetName, type Pt } from '@/domain/markPath';
import { PathMark } from '@/components/PathMark';
import { colors, darkColors, fontFamily, radius, space, type } from '@/theme/tokens';

// Lab-only experiment: draw your own Day Mark. Not part of the store, sync or Appearance; the last drawing lives in localStorage on web.
const STORAGE_KEY = 'daymark-lab-mark';
const ORDER = ['study', 'career', 'personal', 'routine'] as const;
const GRID = 8;

const evenSegments = (progress: number): DayOrbitSegment[] => ORDER.map((categoryId, index) => ({ categoryId, colorKey: categoryId, share: 0.25, completion: Math.max(0, Math.min(1, progress * 4 - index)) }));
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
const weekSamples: Array<{ day: string; segments: DayOrbitSegment[] }> = [
  { day: '15', segments: [] },
  { day: '16', segments: [{ categoryId: 'study', colorKey: 'study', share: 0.5, completion: 1 }, { categoryId: 'career', colorKey: 'career', share: 0.5, completion: 0 }] },
  { day: '17', segments: [{ categoryId: 'study', colorKey: 'study', share: 0.34, completion: 1 }, { categoryId: 'personal', colorKey: 'personal', share: 0.33, completion: 0.5, lateCompletion: 0.5 }, { categoryId: 'routine', colorKey: 'routine', share: 0.33, completion: 0 }] },
  { day: '18', segments: evenSegments(1) },
  { day: '19', segments: [{ categoryId: 'career', colorKey: 'career', share: 0.6, completion: 0.4 }, { categoryId: 'routine', colorKey: 'routine', share: 0.4, completion: 0 }] },
  { day: '20', segments: [] },
  { day: '21', segments: evenSegments(1) },
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

const toD = (pts: Pt[], close = false) => (pts.length < 2 ? '' : `M ${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')}${close ? ' Z' : ''}`);

interface Props { todaySegments: DayOrbitSegment[]; wide: boolean }

export function DrawMarkLab({ todaySegments, wide }: Props) {
  const padSize = wide ? 320 : 280;
  const [mark, setMark] = useState<MarkPath | null>(loadMark);
  const [history, setHistory] = useState<Array<MarkPath | null>>([]);
  const [live, setLive] = useState<Pt[]>([]);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0.55);
  const stroke = useRef<Pt[]>([]);
  const markRef = useRef(mark);
  markRef.current = mark;
  const padSizeRef = useRef(padSize);
  padSizeRef.current = padSize;

  const commit = useCallback((next: MarkPath | null) => {
    setHistory((h) => [...h.slice(-19), markRef.current]);
    setMark(next);
    saveMark(next);
  }, []);
  const finish = useCallback(() => {
    const raw = stroke.current;
    stroke.current = [];
    setLive([]);
    if (raw.length === 0) return;
    const result = processStroke(raw, padSizeRef.current);
    if (result.ok) { setMessage(''); commit(result.mark); } else setMessage(result.reason);
  }, [commit]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => {
      stroke.current = [[event.nativeEvent.locationX, event.nativeEvent.locationY]];
      setLive(stroke.current);
    },
    onPanResponderMove: (event) => {
      stroke.current = [...stroke.current, [event.nativeEvent.locationX, event.nativeEvent.locationY]];
      setLive(stroke.current);
    },
    onPanResponderRelease: finish,
    onPanResponderTerminate: finish,
  }), [finish]);

  const applyPreset = (name: PresetName) => {
    const result = processStroke(presetStroke(name, padSize), padSize);
    if (result.ok) { setMessage(''); commit(result.mark); }
  };
  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setMark(previous);
    saveMark(previous);
    setMessage('');
  };

  const shown = mark ?? (() => { const r = processStroke(presetStroke('Heart', padSize), padSize); return r.ok ? r.mark : null; })();
  const sliderSegments = evenSegments(progress);
  const dots: Array<[number, number]> = [];
  for (let i = 1; i < GRID; i += 1) for (let j = 1; j < GRID; j += 1) dots.push([(i * padSize) / GRID, (j * padSize) / GRID]);
  const padStyle = { width: padSize, height: padSize, ...(Platform.OS === 'web' ? { touchAction: 'none', userSelect: 'none', cursor: 'crosshair' } : {}) } as object;
  const committedPts = shown ? shown.pts.map(([x, y]): Pt => [x * padSize, y * padSize]) : [];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Draw your mark (experiment)</Text>
      <Text style={styles.description}>Draw one stroke with a finger or the mouse — a star, a heart, a line, anything. The day fills along it in list colors, starting where you started. Lab only: kept in this browser, not in the app, sync or Appearance.</Text>
      <View style={[styles.body, wide && styles.bodyWide]}>
        <View style={styles.padCol}>
          <View style={[styles.pad, { width: padSize, height: padSize }]}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <Svg width={padSize} height={padSize} viewBox={`0 0 ${padSize} ${padSize}`}>
                {dots.map(([x, y]) => <Circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} fill={colors.line} opacity={0.55} />)}
                {live.length === 0 && committedPts.length > 1 ? <Path d={toD(committedPts, shown?.closed)} fill="none" stroke={colors.accent} strokeOpacity={0.35} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /> : null}
                {live.length > 0 ? <Path d={toD(live)} fill="none" stroke={colors.accent} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /> : null}
              </Svg>
            </View>
            <View style={padStyle} accessibilityLabel="Drawing pad" {...responder.panHandlers} />
          </View>
          {message ? <Text style={styles.message}>{message}</Text> : <Text style={styles.hint}>One continuous stroke. End near where you began to close the shape.</Text>}
          <View style={styles.buttons}>
            <Pressable accessibilityRole="button" onPress={() => { commit(null); setMessage(''); }} style={styles.button}><Text style={styles.buttonText}>Clear</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={undo} disabled={history.length === 0} style={[styles.button, history.length === 0 && styles.buttonOff]}><Text style={styles.buttonText}>Undo</Text></Pressable>
          </View>
          <View style={styles.buttons}>
            {presetNames.map((name) => (
              <Pressable key={name} accessibilityRole="button" onPress={() => applyPreset(name)} style={styles.chip}><Text style={styles.chipText}>{name}</Text></Pressable>
            ))}
          </View>
        </View>
        <View style={styles.previewCol}>
          {shown ? <>
            <Text style={styles.groupLabel}>{shown.closed ? 'Closed shape' : 'Open line'} · live progress {Math.round(progress * 100)}%</Text>
            <View style={styles.sliderRow}>
              <PathMark path={shown} segments={sliderSegments} size={132} strokeWidth={9} />
              <View style={styles.sliderCol}>
                <Slider value={progress} onChange={setProgress} />
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

// Minimal 0..1 slider (pointer drag via PanResponder; the track is the touch target).
function Slider({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const width = useRef(200);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => onChange(Math.min(1, Math.max(0, event.nativeEvent.locationX / width.current))),
    onPanResponderMove: (event) => onChange(Math.min(1, Math.max(0, event.nativeEvent.locationX / width.current))),
  }), [onChange]);
  const webStyle = (Platform.OS === 'web' ? { touchAction: 'none', userSelect: 'none' } : {}) as object;
  return (
    <View accessibilityRole="adjustable" accessibilityLabel="Progress" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }} onLayout={(event) => { width.current = event.nativeEvent.layout.width; }} style={[styles.sliderTrack, webStyle]} {...responder.panHandlers}>
      <View pointerEvents="none" style={styles.sliderRail}>
        <View style={[styles.sliderFill, { width: `${value * 100}%` }]} />
      </View>
      <View pointerEvents="none" style={[styles.sliderKnob, { left: `${value * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingVertical: space.xl, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  sectionTitle: { ...type.section, color: colors.ink, fontFamily },
  description: { ...type.body, color: colors.inkSoft, marginTop: space.xxs, maxWidth: 620, fontFamily },
  body: { gap: space.lg, marginTop: space.lg },
  bodyWide: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xl },
  padCol: { gap: space.sm, flexShrink: 0 },
  pad: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, backgroundColor: colors.canvas, overflow: 'hidden' },
  hint: { ...type.meta, color: colors.muted, fontFamily },
  message: { ...type.meta, color: colors.inkSoft, fontFamily },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  button: { paddingVertical: space.xs, paddingHorizontal: space.md, borderRadius: radius.sm, backgroundColor: colors.track },
  buttonOff: { opacity: 0.45 },
  buttonText: { ...type.bodyMedium, color: colors.ink, fontFamily },
  chip: { paddingVertical: space.xxs, paddingHorizontal: space.sm, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong },
  chipText: { ...type.meta, color: colors.inkSoft, fontFamily },
  previewCol: { flex: 1, gap: space.sm },
  groupLabel: { ...type.meta, color: colors.muted, letterSpacing: 0.6, marginTop: space.sm, fontFamily },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, flexWrap: 'wrap' },
  sliderCol: { flex: 1, minWidth: 140, gap: space.xs },
  sliderTrack: { height: 32, justifyContent: 'center' },
  sliderRail: { height: 4, borderRadius: 2, backgroundColor: colors.track, overflow: 'hidden' },
  sliderFill: { height: 4, backgroundColor: colors.accent },
  sliderKnob: { position: 'absolute', top: 8, marginLeft: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent },
  samples: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  sample: { alignItems: 'center', gap: space.xxs, minWidth: 64 },
  percent: { ...type.meta, color: colors.muted, fontFamily },
  week: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  weekDay: { alignItems: 'center', gap: 4 },
  weekNumber: { fontSize: 10, lineHeight: 13, color: colors.muted, fontFamily },
  weekNumberDark: { fontSize: 10, lineHeight: 13, color: darkColors.muted, fontFamily },
  darkPanel: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', backgroundColor: darkColors.canvas, borderRadius: radius.md, padding: space.md },
});
