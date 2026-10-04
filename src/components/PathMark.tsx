import { Animated, Platform, View } from 'react-native';
import { useEffect, useMemo, useRef } from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';
import type { DayOrbitSegment } from '@/domain/selectors';
import { simplifyForSize, subpath, pointAtFraction, type MarkPath, type Pt } from '@/domain/markPath';
import { listColors, type ListColors } from '@/theme/palette';
import { colors, darkColors, lightColors } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/useReducedMotion';
import { useTweenedArcs } from '@/components/DayOrbit';

// Lab experiment: a Day Mark drawn along a user-made path (Doodle's rendering rules on an arbitrary polyline).
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
  const unit = useMemo(() => simplifyForSize(path, size), [path, size]);
  const pts = useMemo<Pt[]>(() => unit.map(([x, y]) => [inset + x * span, inset + y * span]), [unit, inset, span]);
  // Arc-length fractions are scale-free, so the subpaths are cut from the unit path and scaled afterwards.
  const place = (cut: Pt[]) => cut.map(([x, y]) => `${(inset + x * span).toFixed(2)} ${(inset + y * span).toFixed(2)}`);
  const d = (from: number, to: number) => { const cut = place(subpath(unit, from, to)); return cut.length < 2 ? '' : `M ${cut.join(' L ')}`; };
  const at = (fraction: number): Pt => { const p = pointAtFraction(unit, fraction); return [inset + p[0] * span, inset + p[1] * span]; };

  const tween = animate && !reduceMotion;
  const arcs = useTweenedArcs(
    [...segments.map((segment) => segment.categoryId), ...segments.map((segment) => `${segment.categoryId}:late`)],
    [...segments.map((segment) => segment.share * segment.completion), ...segments.map((segment) => segment.share * (segment.lateCompletion ?? 0))],
    tween,
  );
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
  const filled = runs.length > 0 ? Math.min(1, runs[runs.length - 1].to) : 0;
  const closed = path.closed && filled >= 0.9995;
  const first = runs[0];
  const last = runs[runs.length - 1];
  const markColor = (segment: DayOrbitSegment) => { const c = segmentColors(segment); return isDark ? c.markDark : c.markLight; };
  const trackD = `M ${pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L ')}${path.closed ? ' Z' : ''}`;
  const capR = stroke / 2;
  const glow = Platform.OS === 'web' && size >= 80 && runs.length > 0;
  const solo = closed && runs.length === 1;
  const closedD = `M ${place(unit).join(' L ')} Z`;

  const layer = (
    <>
      {runs.map((run) => run.fill > 0.0005 ? (
        <Path key={run.segment.categoryId} d={solo && run.late <= 0.0005 ? closedD : d(run.from, Math.min(run.mid, 1))} fill="none" stroke={markColor(run.segment)} strokeWidth={stroke} strokeLinecap="butt" strokeLinejoin="round" />
      ) : null)}
      {!closed && first && filled > 0.001 && first.fill > 0.0005 ? <Circle cx={at(first.from)[0]} cy={at(first.from)[1]} r={capR} fill={markColor(first.segment)} /> : null}
      {!closed && last && filled > 0.001 && last.late <= 0.0005 ? <Circle cx={at(filled)[0]} cy={at(filled)[1]} r={capR} fill={markColor(last.segment)} /> : null}
      <G opacity={lateOpacity}>
        {runs.map((run) => run.late > 0.0005 ? (
          <Path key={run.segment.categoryId} d={solo && run.fill <= 0.0005 ? closedD : d(run.mid, Math.min(run.to, 1))} fill="none" stroke={markColor(run.segment)} strokeWidth={stroke} strokeLinecap="butt" strokeLinejoin="round" />
        ) : null)}
        {!closed && first && filled > 0.001 && first.fill <= 0.0005 ? <Circle cx={at(first.from)[0]} cy={at(first.from)[1]} r={capR} fill={markColor(first.segment)} /> : null}
        {!closed && last && filled > 0.001 && last.late > 0.0005 ? <Circle cx={at(filled)[0]} cy={at(filled)[1]} r={capR} fill={markColor(last.segment)} /> : null}
      </G>
    </>
  );
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
    </Animated.View>
  );
}
