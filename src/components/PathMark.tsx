import { Animated, Platform, View } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';
import type { DayOrbitSegment } from '@/domain/selectors';
import { cutRange, simplifyForSize, type MarkPath, type MarkPiece, type Pt } from '@/domain/markPath';
import { listColors, type ListColors } from '@/theme/palette';
import { colors, darkColors, lightColors, motion } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/useReducedMotion';
import { Ripple, useTweenedArcs } from '@/components/orbitMotion';

// The Custom (beta) Day Mark: drawn along a user-made path of one or more strokes, filled in drawing order (Doodle's rendering rules on arbitrary polylines).
interface PathMarkProps {
  path: MarkPath;
  segments: DayOrbitSegment[];
  size?: number;
  strokeWidth?: number;
  scheme?: 'light' | 'dark';
  animate?: boolean;
}

const segmentColors = (segment: Pick<DayOrbitSegment, 'colors' | 'colorKey'>): ListColors => segment.colors ?? listColors({ colorKey: segment.colorKey ?? 'study' });

export function PathMark({ path, segments, size = 132, strokeWidth = 6, scheme, animate = false }: PathMarkProps) {
  const reduceMotion = useReducedMotion();
  const breathe = useRef(new Animated.Value(0)).current;
  const isDark = scheme ? scheme === 'dark' : colors.canvas === darkColors.canvas;
  const activeColors = scheme === 'light' ? lightColors : scheme === 'dark' ? darkColors : colors;
  const lateOpacity = isDark ? 0.45 : 0.35;
  // Small marks get a relatively thicker stroke and a simpler path so the shape survives at calendar size.
  const stroke = size < 30 ? Math.max(strokeWidth, size * 0.2) : strokeWidth;
  const inset = stroke / 2 + 1;
  const span = size - inset * 2;
  const strokes = useMemo(() => simplifyForSize(path, size), [path, size]);
  // Arc-length fractions are scale-free, so pieces are cut from the unit strokes and scaled afterwards.
  const place = (p: Pt): Pt => [inset + p[0] * span, inset + p[1] * span];
  const coords = (pts: Pt[]) => pts.map((p) => { const q = place(p); return `${q[0].toFixed(2)} ${q[1].toFixed(2)}`; }).join(' L ');

  const tween = animate && !reduceMotion;
  const arcs = useTweenedArcs(
    [...segments.map((segment) => segment.categoryId), ...segments.map((segment) => `${segment.categoryId}:late`)],
    [...segments.map((segment) => segment.share * segment.completion), ...segments.map((segment) => segment.share * (segment.lateCompletion ?? 0))],
    tween,
  );
  const complete = segments.length > 0 && segments.every((segment) => segment.completion === 1);
  const [rippleKey, setRippleKey] = useState(0);
  const wasComplete = useRef(complete);
  const shareSig = segments.map((segment) => `${segment.categoryId}:${segment.share.toFixed(4)}`).join('|');
  const lastShareSig = useRef(shareSig);
  useEffect(() => {
    const before = wasComplete.current;
    const sameDay = lastShareSig.current === shareSig; // another day's task set is navigation, not a completion
    wasComplete.current = complete;
    lastShareSig.current = shareSig;
    if (!tween || before || !complete || !sameDay) return undefined;
    const timer = setTimeout(() => setRippleKey((key) => key + 1), motion.ring * 0.75);
    return () => clearTimeout(timer);
  }, [complete, shareSig]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!tween) return undefined;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 4200, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(breathe, { toValue: 0, duration: 4200, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [tween, breathe]);

  let offset = 0;
  const runs = segments.map((segment, index) => {
    const fill = arcs.lengths[index];
    const late = arcs.lengths[segments.length + index];
    const from = offset;
    offset += fill + late;
    return { segment, from, mid: from + fill, to: from + fill + late, fill, late };
  }).filter((run) => run.fill > 0.0005 || run.late > 0.0005);
  const markColor = (segment: DayOrbitSegment) => { const c = segmentColors(segment); return isDark ? c.markDark : c.markLight; };
  const trackD = strokes.map((one) => (one.pts.length < 2 ? '' : `M ${coords(one.pts)}${one.closed ? ' Z' : ''}`)).join(' ');
  const capR = stroke / 2;
  const glow = Platform.OS === 'web' && size >= 80 && runs.length > 0;

  // Each run's solid and late pieces, cut across the strokes in drawing order.
  interface Piece extends MarkPiece { run: (typeof runs)[number]; kind: 'fill' | 'late' }
  const pieces: Piece[] = [];
  runs.forEach((run) => {
    if (run.fill > 0.0005) cutRange(strokes, run.from, Math.min(run.mid, 1)).forEach((piece) => pieces.push({ ...piece, run, kind: 'fill' }));
    if (run.late > 0.0005) cutRange(strokes, run.mid, Math.min(run.to, 1)).forEach((piece) => pieces.push({ ...piece, run, kind: 'late' }));
  });
  // A closed stroke filled all the way round by one piece draws as a closed path (no seam, no caps).
  const pieceD = (piece: Piece) => {
    const source = strokes[piece.index];
    if (source.closed && piece.localFrom <= 0.0001 && piece.localTo >= 0.9999) return `M ${coords(source.pts.slice(0, -1))} Z`;
    return piece.pts.length < 2 ? '' : `M ${coords(piece.pts)}`;
  };
  const runD = (run: Piece['run'], kind: Piece['kind']) => pieces.filter((piece) => piece.run === run && piece.kind === kind).map(pieceD).filter(Boolean).join(' ');
  // Round caps at each filled stroke's start and at its end (the fill head, or the end of a fully filled open stroke).
  const caps: Array<{ key: string; at: Pt; piece: Piece }> = [];
  strokes.forEach((source, index) => {
    const own = pieces.filter((piece) => piece.index === index);
    if (own.length === 0) return;
    const firstPiece = own[0];
    const lastPiece = own[own.length - 1];
    if (source.closed && lastPiece.localTo >= 0.9999) return;
    caps.push({ key: `s${index}`, at: place(firstPiece.pts[0]), piece: firstPiece }, { key: `e${index}`, at: place(lastPiece.pts[lastPiece.pts.length - 1]), piece: lastPiece });
  });
  const capCircles = (kind: Piece['kind']) => caps.filter((cap) => cap.piece.kind === kind).map((cap) => <Circle key={cap.key} cx={cap.at[0]} cy={cap.at[1]} r={capR} fill={markColor(cap.piece.run.segment)} />);

  const layer = (
    <>
      {runs.map((run) => { const d = runD(run, 'fill'); return d ? <Path key={run.segment.categoryId} d={d} fill="none" stroke={markColor(run.segment)} strokeWidth={stroke} strokeLinecap="butt" strokeLinejoin="round" /> : null; })}
      {capCircles('fill')}
      <G opacity={lateOpacity}>
        {runs.map((run) => { const d = runD(run, 'late'); return d ? <Path key={run.segment.categoryId} d={d} fill="none" stroke={markColor(run.segment)} strokeWidth={stroke} strokeLinecap="butt" strokeLinejoin="round" /> : null; })}
        {capCircles('late')}
      </G>
    </>
  );
  const dominant = segments.length > 0 ? segments.reduce((a, b) => (b.share > a.share ? b : a)) : undefined;
  const completion = segments.reduce((total, segment) => total + segment.share * segment.completion, 0);
  const glowStyle = { position: 'absolute', left: 0, top: 0, width: size, height: size, opacity: isDark ? 0.4 : 0.32, filter: `blur(${(size * 0.05).toFixed(1)}px)` } as const;
  const breathing = tween ? { transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.99, 1.01] }) }] } : undefined;

  return (
    <Animated.View accessibilityLabel={`${Math.round(completion * 100)} percent complete drawn mark`} style={[{ width: size, height: size }, breathing]}>
      {glow ? (
        <View pointerEvents="none" style={glowStyle as object}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{layer}</Svg>
        </View>
      ) : null}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Path d={trackD} fill="none" stroke={activeColors.track} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
        {layer}
      </Svg>
      {tween && dominant ? <Ripple size={size} radiusValue={span / 2} color={markColor(dominant)} fireKey={rippleKey} outline={trackD} /> : null}
    </Animated.View>
  );
}
