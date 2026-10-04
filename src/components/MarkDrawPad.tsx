import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { DayOrbitSegment } from '@/domain/selectors';
import { presetNames, presetStroke, processStroke, type MarkPath, type PresetName, type Pt } from '@/domain/markPath';
import { colors, fontFamily, radius, space, type } from '@/theme/tokens';

const GRID = 8;
const ORDER = ['study', 'career', 'personal', 'routine'] as const;

// Four lists sharing a day evenly, filled in order: the sample day the drawing screens preview with.
export const evenSegments = (progress: number): DayOrbitSegment[] => ORDER.map((categoryId, index) => ({ categoryId, colorKey: categoryId, share: 0.25, completion: Math.max(0, Math.min(1, progress * 4 - index)) }));
export const weekSamples: Array<{ day: string; segments: DayOrbitSegment[] }> = [
  { day: '15', segments: [] },
  { day: '16', segments: [{ categoryId: 'study', colorKey: 'study', share: 0.5, completion: 1 }, { categoryId: 'career', colorKey: 'career', share: 0.5, completion: 0 }] },
  { day: '17', segments: [{ categoryId: 'study', colorKey: 'study', share: 0.34, completion: 1 }, { categoryId: 'personal', colorKey: 'personal', share: 0.33, completion: 0.5, lateCompletion: 0.5 }, { categoryId: 'routine', colorKey: 'routine', share: 0.33, completion: 0 }] },
  { day: '18', segments: evenSegments(1) },
  { day: '19', segments: [{ categoryId: 'career', colorKey: 'career', share: 0.6, completion: 0.4 }, { categoryId: 'routine', colorKey: 'routine', share: 0.4, completion: 0 }] },
  { day: '20', segments: [] },
  { day: '21', segments: evenSegments(1) },
];

const toD = (pts: Pt[], close = false) => (pts.length < 2 ? '' : `M ${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')}${close ? ' Z' : ''}`);

interface PadProps {
  size: number;
  initial: MarkPath | null;
  // Called after every change. `rejected` is true while the last stroke was too short (the mark is then still the previous one).
  onChange: (mark: MarkPath | null, rejected: boolean) => void;
  // True while a finger/mouse is down on the pad, so the parent can freeze its ScrollView.
  onDrawingChange?: (drawing: boolean) => void;
}

// The drawing pad + Clear/Undo + presets. Web uses native pointer/touch listeners on the pad's DOM node (iOS Safari and standalone web apps
// do not reliably feed RN's PanResponder through a scrolling parent); native uses PanResponder with capture.
export function MarkDrawPad({ size, initial, onChange, onDrawingChange }: PadProps) {
  const [mark, setMark] = useState<MarkPath | null>(initial);
  const [history, setHistory] = useState<Array<MarkPath | null>>([]);
  const [live, setLive] = useState<Pt[]>([]);
  const [message, setMessage] = useState('');
  const stroke = useRef<Pt[]>([]);
  const frame = useRef<number | null>(null);
  const markRef = useRef(mark);
  markRef.current = mark;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const drawingRef = useRef(onDrawingChange);
  drawingRef.current = onDrawingChange;
  const padRef = useRef<View>(null);

  const commit = useCallback((next: MarkPath | null) => {
    setHistory((h) => [...h.slice(-19), markRef.current]);
    setMark(next);
    setMessage('');
    changeRef.current(next, false);
  }, []);
  const flush = useCallback(() => {
    frame.current = null;
    setLive(stroke.current.slice());
  }, []);
  const begin = useCallback((p: Pt) => {
    stroke.current = [p];
    drawingRef.current?.(true);
    setLive([p]);
  }, []);
  const extend = useCallback((p: Pt) => {
    stroke.current.push(p);
    if (frame.current === null) frame.current = requestAnimationFrame(flush);
  }, [flush]);
  const finish = useCallback(() => {
    if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null; }
    const raw = stroke.current;
    stroke.current = [];
    setLive([]);
    drawingRef.current?.(false);
    if (raw.length === 0) return;
    const result = processStroke(raw, sizeRef.current);
    if (result.ok) commit(result.mark); else { setMessage(result.reason); changeRef.current(markRef.current, true); }
  }, [commit]);

  // Native: PanResponder, captured so a parent ScrollView never steals the gesture.
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => begin([event.nativeEvent.locationX, event.nativeEvent.locationY]),
    onPanResponderMove: (event) => extend([event.nativeEvent.locationX, event.nativeEvent.locationY]),
    onPanResponderRelease: finish,
    onPanResponderTerminate: finish,
  }), [begin, extend, finish]);

  // Web: pointer events with capture, plus touch events (non-passive, preventDefault) as the fallback. Whichever starts a stroke owns it.
  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const el = padRef.current as unknown as HTMLElement | null;
    if (!el) return undefined;
    el.style.touchAction = 'none';
    el.style.userSelect = 'none';
    el.style.webkitUserSelect = 'none';
    (el.style as CSSStyleDeclaration & { webkitTouchCallout: string }).webkitTouchCallout = 'none';
    let owner: 'pointer' | 'touch' | null = null;
    let pointerId = -1;
    const at = (x: number, y: number): Pt => { const rect = el.getBoundingClientRect(); return [x - rect.left, y - rect.top]; };
    const onPointerDown = (e: PointerEvent) => {
      if (owner || (e.pointerType === 'mouse' && e.button !== 0)) return;
      owner = 'pointer'; pointerId = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch { /* capture is best effort */ }
      e.preventDefault();
      begin(at(e.clientX, e.clientY));
    };
    const onPointerMove = (e: PointerEvent) => {
      if (owner !== 'pointer' || e.pointerId !== pointerId) return;
      e.preventDefault();
      const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
      (events.length > 0 ? events : [e]).forEach((item) => extend(at(item.clientX, item.clientY)));
    };
    const onPointerEnd = (e: PointerEvent) => {
      if (owner !== 'pointer' || e.pointerId !== pointerId) return;
      owner = null;
      try { el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      if (e.type === 'pointerup') extend(at(e.clientX, e.clientY));
      finish();
    };
    const onTouchStart = (e: TouchEvent) => {
      if (owner === 'pointer') { e.preventDefault(); return; }
      if (owner || e.touches.length !== 1) return;
      owner = 'touch';
      e.preventDefault();
      begin(at(e.touches[0].clientX, e.touches[0].clientY));
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault(); // keeps the page and pull-to-refresh still
      if (owner !== 'touch' || e.touches.length === 0) return;
      extend(at(e.touches[0].clientX, e.touches[0].clientY));
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (owner === 'pointer') return;
      if (e.cancelable) e.preventDefault();
      if (owner !== 'touch') return;
      owner = null;
      finish();
    };
    const onMenu = (e: Event) => e.preventDefault();
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerEnd);
    el.addEventListener('pointercancel', onPointerEnd);
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    el.addEventListener('touchcancel', onTouchEnd, { passive: false });
    el.addEventListener('contextmenu', onMenu);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerEnd);
      el.removeEventListener('pointercancel', onPointerEnd);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('contextmenu', onMenu);
      drawingRef.current?.(false);
    };
  }, [begin, extend, finish]);

  const applyPreset = (name: PresetName) => {
    const result = processStroke(presetStroke(name, size), size);
    if (result.ok) commit(result.mark);
  };
  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setMark(previous);
    setMessage('');
    onChange(previous, false);
  };

  const dots: Array<[number, number]> = [];
  for (let i = 1; i < GRID; i += 1) for (let j = 1; j < GRID; j += 1) dots.push([(i * size) / GRID, (j * size) / GRID]);
  const padStyle = { width: size, height: size, ...(Platform.OS === 'web' ? { touchAction: 'none', userSelect: 'none', cursor: 'crosshair' } : {}) } as object;
  const committedPts = mark ? mark.pts.map(([x, y]): Pt => [x * size, y * size]) : [];

  return (
    <View style={styles.padCol}>
      <View style={[styles.pad, { width: size, height: size }]}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {dots.map(([x, y]) => <Circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} fill={colors.line} opacity={0.55} />)}
            {live.length === 0 && committedPts.length > 1 ? <Path d={toD(committedPts, mark?.closed)} fill="none" stroke={colors.accent} strokeOpacity={0.35} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /> : null}
            {live.length > 0 ? <Path d={toD(live)} fill="none" stroke={colors.accent} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /> : null}
          </Svg>
        </View>
        <View ref={padRef} style={padStyle} accessibilityLabel="Drawing pad" {...(Platform.OS === 'web' ? {} : responder.panHandlers)} />
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : <Text style={styles.hint}>One continuous stroke. End near where you began to close the shape.</Text>}
      <View style={styles.buttons}>
        <Pressable accessibilityRole="button" onPress={() => commit(null)} style={styles.button}><Text style={styles.buttonText}>Clear</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={undo} disabled={history.length === 0} style={[styles.button, history.length === 0 && styles.buttonOff]}><Text style={styles.buttonText}>Undo</Text></Pressable>
      </View>
      <View style={styles.buttons}>
        {presetNames.map((name) => (
          <Pressable key={name} accessibilityRole="button" onPress={() => applyPreset(name)} style={styles.chip}><Text style={styles.chipText}>{name}</Text></Pressable>
        ))}
      </View>
    </View>
  );
}

// Minimal 0..1 slider (pointer drag via PanResponder; the track is the touch target).
export function ProgressSlider({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const width = useRef(200);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
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
  sliderTrack: { height: 32, justifyContent: 'center' },
  sliderRail: { height: 4, borderRadius: 2, backgroundColor: colors.track, overflow: 'hidden' },
  sliderFill: { height: 4, backgroundColor: colors.accent },
  sliderKnob: { position: 'absolute', top: 8, marginLeft: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent },
});
