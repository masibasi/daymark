import { Animated, Platform, View } from 'react-native';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import type { DayOrbitSegment } from '@/domain/selectors';
import { customToMarkPath } from '@/domain/markPath';
import type { DayMarkVariant } from '@/domain/types';
import { listColors, type ListColors } from '@/theme/palette';
import { colors, darkColors, lightColors, motion } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/useReducedMotion';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { PathMark } from '@/components/PathMark';
import { Ripple, useTweenedArcs } from '@/components/orbitMotion';

interface DayOrbitProps {
  segments: DayOrbitSegment[];
  size?: number;
  strokeWidth?: number;
  animate?: boolean;
  variant?: DayMarkVariant;
  scheme?: 'light' | 'dark';
}


// Doodle geometry: a closed organic loop r(θ) = R·(1 + a·sin(2θ+p1) + b·sin(3θ+p2)), slightly squashed vertically. Sampled once per
// (size, radius); arc positions are looked up by fraction of total length so category shares stay proportional along the stroke.
const DOODLE = { a: 0.05, b: 0.032, p1: 0.6, p2: 1.9, squash: 0.95 } as const;
interface DoodleLoop { pts: Array<[number, number]>; cum: number[]; total: number }
function buildDoodle(center: number, radius: number, samples: number): DoodleLoop {
  const base = radius / (1 + DOODLE.a + DOODLE.b);
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = (i / samples) * Math.PI * 2; // clockwise from 12 o'clock
    const th = t - Math.PI / 2;
    const r = base * (1 + DOODLE.a * Math.sin(2 * th + DOODLE.p1) + DOODLE.b * Math.sin(3 * th + DOODLE.p2));
    pts.push([center + r * Math.cos(th), center + r * Math.sin(th) * DOODLE.squash]);
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i += 1) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, total: cum[cum.length - 1] };
}
function doodlePointAt(loop: DoodleLoop, fraction: number): [number, number] {
  const target = Math.min(1, Math.max(0, fraction)) * loop.total;
  let lo = 0;
  let hi = loop.cum.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (loop.cum[mid] <= target) lo = mid; else hi = mid; }
  const span = loop.cum[hi] - loop.cum[lo] || 1;
  const k = (target - loop.cum[lo]) / span;
  return [loop.pts[lo][0] + (loop.pts[hi][0] - loop.pts[lo][0]) * k, loop.pts[lo][1] + (loop.pts[hi][1] - loop.pts[lo][1]) * k];
}
function doodleArcPath(loop: DoodleLoop, from: number, to: number): string {
  const n = loop.pts.length - 1;
  const fmt = (p: [number, number]) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
  const start = doodlePointAt(loop, from);
  let d = `M ${fmt(start)}`;
  const fromT = from * loop.total;
  const toT = to * loop.total;
  for (let i = 1; i < n; i += 1) if (loop.cum[i] > fromT && loop.cum[i] < toT) d += ` L ${fmt(loop.pts[i])}`;
  return `${d} L ${fmt(doodlePointAt(loop, to))}`;
}
function doodleClosedPath(loop: DoodleLoop): string {
  return `${loop.pts.slice(0, -1).map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ')} Z`;
}


type Colored = Pick<DayOrbitSegment, 'colors' | 'colorKey'>;
const segmentColors = (segment: Colored): ListColors => segment.colors ?? listColors({ colorKey: segment.colorKey ?? 'study' });

// 'custom' draws the user's own path; without a stored mark (not synced to this device yet) it falls back to Doodle.
export function DayOrbit(props: DayOrbitProps) {
  const storeVariant = useDaymarkStore((s) => s.dayMarkVariant);
  const customMark = useDaymarkStore((s) => s.customMark);
  const activeVariant = props.variant ?? storeVariant;
  const path = useMemo(() => (customMark ? customToMarkPath(customMark) : null), [customMark]);
  if (activeVariant === 'custom' && path) return <PathMark path={path} segments={props.segments} size={props.size ?? 42} strokeWidth={(props.strokeWidth ?? 6) * 1.2} animate={props.animate} scheme={props.scheme} />;
  return <RingOrbit {...props} variant={activeVariant === 'custom' ? 'doodle' : activeVariant} />;
}

function RingOrbit({ segments, size = 42, strokeWidth = 6, animate = false, variant, scheme }: DayOrbitProps) {
  const activeVariant = variant ?? 'doodle';
  const reduceMotion = useReducedMotion();
  const clipId = `liquid-${useId().replace(/:/g, '')}`;
  const radiusValue = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const complete = segments.length > 0 && segments.every((segment) => segment.completion === 1);
  const completion = segments.reduce((total, segment) => total + segment.share * segment.completion, 0);
  const innerRadius = Math.max(0, radiusValue - strokeWidth / 2 - 1.5);
  const innerTop = size / 2 - innerRadius;
  const innerBottom = size / 2 + innerRadius;
  const liquidY = complete ? innerTop - 1 : innerBottom - innerRadius * 2 * completion;
  const breathe = useRef(new Animated.Value(0)).current;
  const isDark = scheme ? scheme === 'dark' : colors.canvas === darkColors.canvas;
  const activeColors = scheme === 'light' ? lightColors : scheme === 'dark' ? darkColors : colors;
  const markColor = (segment: Colored) => { const c = segmentColors(segment); return isDark ? c.markDark : c.markLight; };
  let completedOffset = 0;

  const tweenEnabled = animate && !reduceMotion && activeVariant !== 'current';
  const lateOpacity = isDark ? 0.45 : 0.35;
  const arcs = useTweenedArcs(
    [...segments.map((segment) => segment.categoryId), ...segments.map((segment) => `${segment.categoryId}:late`)],
    [...segments.map((segment) => circumference * segment.share * segment.completion), ...segments.map((segment) => circumference * segment.share * (segment.lateCompletion ?? 0))],
    tweenEnabled,
  );
  const [rippleKey, setRippleKey] = useState(0);
  const wasComplete = useRef(complete);
  const shareSig = segments.map((segment) => `${segment.categoryId}:${segment.share.toFixed(4)}`).join('|');
  const lastShareSig = useRef(shareSig);
  useEffect(() => {
    const before = wasComplete.current;
    const sameDay = lastShareSig.current === shareSig; // a different set of tasks (another day) is a navigation, not a completion
    wasComplete.current = complete;
    lastShareSig.current = shareSig;
    if (!animate || reduceMotion || before || !complete || !sameDay) return undefined;
    const timer = setTimeout(() => setRippleKey((key) => key + 1), motion.ring * 0.75);
    return () => clearTimeout(timer);
  }, [complete, shareSig]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!animate || reduceMotion) return undefined;
    const isBaseline = activeVariant === 'current';
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: isBaseline ? 3200 : 4200, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(breathe, { toValue: 0, duration: isBaseline ? 3600 : 4200, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [animate, breathe, reduceMotion, activeVariant]);

  const baselineAnimatedStyle = animate && !reduceMotion ? {
    transform: [
      { scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.992, 1.008] }) },
      { rotate: breathe.interpolate({ inputRange: [0, 1], outputRange: ['-0.8deg', '0.8deg'] }) },
    ],
  } : undefined;

  const breathingAnimatedStyle = animate && !reduceMotion ? {
    transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.99, 1.01] }) }],
  } : undefined;

  if (activeVariant === 'current') {
    const liquidSegments = segments.filter((segment) => segment.completion > 0);
    let liquidX = size / 2 - innerRadius;
    return (
      <Animated.View accessibilityLabel={complete ? 'Completed daily mark' : 'Daily completion orbit'} style={[{ width: size, height: size }, baselineAnimatedStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <ClipPath id={clipId}><Circle cx={size / 2} cy={size / 2} r={innerRadius} /></ClipPath>
          </Defs>
          {completion > 0 ? <G clipPath={`url(#${clipId})`}>
            <Path
              d={`M ${size / 2 - innerRadius - 2} ${liquidY} C ${size * 0.38} ${liquidY - size * 0.018}, ${size * 0.62} ${liquidY + size * 0.018}, ${size / 2 + innerRadius + 2} ${liquidY} L ${size} ${size} L 0 ${size} Z`}
              fill={(isDark ? segmentColors(segments[0]).softDark : segmentColors(segments[0]).softLight)}
              opacity={0.34}
            />
            {liquidSegments.map((segment, index) => {
              const width = innerRadius * 2 * segment.share;
              const start = liquidX;
              const end = liquidX + width;
              liquidX = end;
              const angle = -Math.PI / 2 + (index / liquidSegments.length) * Math.PI * 2;
              const blobRadiusX = complete ? innerRadius * 0.82 : Math.max(width * 0.82, innerRadius * 0.34);
              const blobRadiusY = complete ? innerRadius * 0.76 : innerRadius * 0.72;
              const centerX = complete ? size / 2 + Math.cos(angle) * innerRadius * 0.28 : (start + end) / 2 + (index % 2 === 0 ? -size * 0.012 : size * 0.012);
              const centerY = complete ? size / 2 + Math.sin(angle) * innerRadius * 0.24 : liquidY + blobRadiusY + (index % 2 === 0 ? size * 0.008 : -size * 0.006);
              const color = segmentColors(segment).solid;
              return (
                <G key={`liquid-${segment.categoryId}`}>
                  <Ellipse cx={centerX} cy={centerY} rx={blobRadiusX} ry={blobRadiusY} fill={color} opacity={complete ? 0.3 : 0.18 + segment.completion * 0.12} />
                  <Ellipse cx={centerX + size * 0.018} cy={centerY - size * 0.018} rx={blobRadiusX * 0.72} ry={blobRadiusY * 0.82} fill={color} opacity={0.08} />
                </G>
              );
            })}
          </G> : null}
          <Circle cx={size / 2} cy={size / 2} r={radiusValue} fill="none" stroke={colors.track} strokeWidth={strokeWidth} />
          {segments.map((segment) => {
            const fillDash = circumference * segment.share * segment.completion;
            const start = completedOffset;
            completedOffset += fillDash;
            const palette = segmentColors(segment);
            const lateDash = circumference * segment.share * (segment.lateCompletion ?? 0);
            completedOffset += lateDash;
            return (
              <G key={segment.categoryId}>
                {fillDash > 0 ? (
                  <Circle
                    cx={size / 2} cy={size / 2} r={radiusValue} fill="none"
                    stroke={palette.solid} strokeWidth={strokeWidth} strokeLinecap="butt"
                    strokeDasharray={`${fillDash} ${circumference - fillDash}`}
                    strokeDashoffset={-start} transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  />
                ) : null}
                {lateDash > 0 ? (
                  <Circle
                    cx={size / 2} cy={size / 2} r={radiusValue} fill="none"
                    stroke={palette.solid} strokeWidth={strokeWidth} strokeLinecap="butt" strokeOpacity={lateOpacity}
                    strokeDasharray={`${lateDash} ${circumference - lateDash}`}
                    strokeDashoffset={-(start + fillDash)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  />
                ) : null}
              </G>
            );
          })}
        </Svg>
      </Animated.View>
    );
  }

  // Shared ribbon-band ring: contiguous mark-colored arcs on a neutral track, in category order.
  // Each category's arc is its solid completed run followed by its lighter "resolved later" run (same color, lower opacity), packed contiguously.
  const ringArcs = segments.map((segment, index) => {
    const fillDash = arcs.lengths[index];
    const lateDash = arcs.lengths[segments.length + index];
    const start = completedOffset;
    completedOffset += fillDash + lateDash;
    return { segment, fillDash, lateDash, start };
  });

  const center = size / 2;
  const dominantSegment = segments.length > 0 ? segments.reduce((a, b) => (b.share > a.share ? b : a)) : undefined;
  const ripple = animate && dominantSegment ? <Ripple size={size} radiusValue={radiusValue} color={markColor(dominantSegment)} fireKey={rippleKey} /> : null;
  const label = `${Math.round(completion * 100)} percent complete daily mark`;

  if (activeVariant === 'doodle') {
    const doodleStroke = strokeWidth * 1.2;
    const loop = buildDoodle(center, (size - doodleStroke) / 2, size < 30 ? 48 : size < 80 ? 90 : 160);
    const runs = ringArcs.filter((arc) => arc.fillDash > 0 || arc.lateDash > 0).map((arc) => ({ ...arc, from: arc.start / circumference, mid: (arc.start + arc.fillDash) / circumference, to: (arc.start + arc.fillDash + arc.lateDash) / circumference }));
    const filled = runs.length > 0 ? runs[runs.length - 1].to : 0;
    const closed = filled >= 0.9995;
    const first = runs[0];
    const last = runs[runs.length - 1];
    const capR = doodleStroke / 2;
    const glow = Platform.OS === 'web' && size >= 80 && runs.length > 0;
    const layer = (withCaps: boolean) => (
      <>
        {runs.map((arc) => arc.fillDash > 0 ? (
          <Path key={arc.segment.categoryId} d={closed && runs.length === 1 && arc.lateDash <= 0 ? doodleClosedPath(loop) : doodleArcPath(loop, arc.from, Math.min(arc.mid, 1))} fill="none" stroke={markColor(arc.segment)} strokeWidth={doodleStroke} strokeLinecap="butt" strokeLinejoin="round" />
        ) : null)}
        {withCaps && !closed && first && last && filled > 0.001 && first.fillDash > 0 ? <Circle cx={doodlePointAt(loop, first.from)[0]} cy={doodlePointAt(loop, first.from)[1]} r={capR} fill={markColor(first.segment)} /> : null}
        {withCaps && !closed && first && last && filled > 0.001 && last.lateDash <= 0 ? <Circle cx={doodlePointAt(loop, filled)[0]} cy={doodlePointAt(loop, filled)[1]} r={capR} fill={markColor(last.segment)} /> : null}
        <G opacity={lateOpacity}>
          {runs.map((arc) => arc.lateDash > 0 ? (
            <Path key={arc.segment.categoryId} d={closed && runs.length === 1 && arc.fillDash <= 0 ? doodleClosedPath(loop) : doodleArcPath(loop, arc.mid, Math.min(arc.to, 1))} fill="none" stroke={markColor(arc.segment)} strokeWidth={doodleStroke} strokeLinecap="butt" strokeLinejoin="round" />
          ) : null)}
          {withCaps && !closed && first && last && filled > 0.001 && first.fillDash <= 0 ? <Circle cx={doodlePointAt(loop, first.from)[0]} cy={doodlePointAt(loop, first.from)[1]} r={capR} fill={markColor(first.segment)} /> : null}
          {withCaps && !closed && first && last && filled > 0.001 && last.lateDash > 0 ? <Circle cx={doodlePointAt(loop, filled)[0]} cy={doodlePointAt(loop, filled)[1]} r={capR} fill={markColor(last.segment)} /> : null}
        </G>
      </>
    );
    const glowStyle = { position: 'absolute', left: 0, top: 0, width: size, height: size, opacity: isDark ? 0.4 : 0.32, filter: `blur(${(size * 0.05).toFixed(1)}px)` } as const;
    return (
      <Animated.View accessibilityLabel={label} style={[{ width: size, height: size }, breathingAnimatedStyle]}>
        {glow ? (
          <View pointerEvents="none" style={glowStyle as object}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{layer(true)}</Svg>
          </View>
        ) : null}
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Path d={doodleClosedPath(loop)} fill="none" stroke={activeColors.track} strokeWidth={doodleStroke} strokeLinejoin="round" />
          {layer(true)}
        </Svg>
        {animate && dominantSegment ? <Ripple size={size} radiusValue={radiusValue} color={markColor(dominantSegment)} fireKey={rippleKey} outline={doodleClosedPath(loop)} /> : null}
      </Animated.View>
    );
  }

  if (activeVariant === 'ribbon') {
    return (
      <Animated.View accessibilityLabel={label} style={[{ width: size, height: size }, breathingAnimatedStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={center} cy={center} r={radiusValue} fill="none" stroke={activeColors.track} strokeWidth={strokeWidth} />
          {ringArcs.map(({ segment, fillDash, start }) => fillDash > 0 ? (
            <Circle
              key={segment.categoryId} cx={center} cy={center} r={radiusValue} fill="none"
              stroke={markColor(segment)} strokeWidth={strokeWidth} strokeLinecap="butt"
              strokeDasharray={`${fillDash} ${circumference - fillDash}`}
              strokeDashoffset={-start} transform={`rotate(-90 ${center} ${center})`}
            />
          ) : null)}
          {ringArcs.map(({ segment, fillDash, lateDash, start }) => lateDash > 0 ? (
            <Circle
              key={`${segment.categoryId}-late`} cx={center} cy={center} r={radiusValue} fill="none"
              stroke={markColor(segment)} strokeOpacity={lateOpacity} strokeWidth={strokeWidth} strokeLinecap="butt"
              strokeDasharray={`${lateDash} ${circumference - lateDash}`}
              strokeDashoffset={-(start + fillDash)} transform={`rotate(-90 ${center} ${center})`}
            />
          ) : null)}
          {complete ? <Circle cx={center} cy={center} r={innerRadius} fill="none" stroke={activeColors.ink} strokeWidth={1} opacity={0.08} /> : null}
        </Svg>
        {ripple}
      </Animated.View>
    );
  }

  if (activeVariant === 'glass') {
    // Clear glass tube (wider than the liquid) filling with each category's own liquid; highlights sit above the liquid.
    const tier = size >= 80 ? 'full' : size >= 40 ? 'mid' : 'mini';
    const tubeW = strokeWidth * (tier === 'mini' ? 1.1 : 1.32);
    const pad = tier === 'full' && !isDark ? size * 0.03 : 0;
    const tubeR = size / 2 - tubeW / 2 - pad;
    const tubeOuter = tubeR + tubeW / 2;
    const tubeInner = tubeR - tubeW / 2;
    const liquidW = tubeW * (tier === 'mini' ? 0.7 : 0.64);
    const liquidR = tubeR;
    const liquidC = 2 * Math.PI * liquidR;
    const gid = clipId;
    const polar = (deg: number, r: number) => { const a = (deg * Math.PI) / 180; return `${(center + r * Math.cos(a)).toFixed(2)} ${(center + r * Math.sin(a)).toFixed(2)}`; };
    const arcPath = (from: number, to: number, r: number) => `M ${polar(from, r)} A ${r} ${r} 0 0 1 ${polar(to, r)}`;
    const runs = ringArcs.filter((arc) => arc.fillDash > 0 || arc.lateDash > 0).map((arc) => ({ ...arc, from: arc.start / circumference, len: Math.min(1, arc.fillDash / circumference), lateLen: Math.min(1, arc.lateDash / circumference) }));
    const filled = runs.length > 0 ? Math.min(1, runs[runs.length - 1].from + runs[runs.length - 1].len + runs[runs.length - 1].lateLen) : 0;
    const closed = filled >= 0.9995;
    const first = runs[0];
    const last = runs[runs.length - 1];
    const dashOf = (fraction: number) => `${liquidC * fraction} ${liquidC}`;
    const rot = `rotate(-90 ${center} ${center})`;
    const body = isDark
      ? { rim: activeColors.white, rimOpacity: 0.22, inner: 0.1, mid: 0.03, outer: 0.13, hi: 0.4, glint: 0.2 }
      : { rim: activeColors.ink, rimOpacity: 0.24, inner: 0.95, mid: 0.5, outer: 0.7, hi: 0.95, glint: 0.7 };
    const bodyTint = isDark ? '#FFFFFF' : '#D3DCE6';
    const hiW = Math.max(1, tubeW * 0.14);
    return (
      <Animated.View accessibilityLabel={label} style={[{ width: size, height: size }, breathingAnimatedStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <RadialGradient id={`${gid}b`} cx={center} cy={center} r={tubeOuter} gradientUnits="userSpaceOnUse">
              <Stop offset={tubeInner / tubeOuter} stopColor={isDark ? '#FFFFFF' : '#FFFFFF'} stopOpacity={body.inner} />
              <Stop offset={(tubeInner / tubeOuter + 1) / 2 + 0.01} stopColor={bodyTint} stopOpacity={body.mid} />
              <Stop offset="1" stopColor={isDark ? '#FFFFFF' : '#F4F7FA'} stopOpacity={body.outer} />
            </RadialGradient>
            <RadialGradient id={`${gid}l`} cx={center} cy={center} r={liquidR + liquidW / 2} gradientUnits="userSpaceOnUse">
              <Stop offset={(liquidR - liquidW / 2) / (liquidR + liquidW / 2)} stopColor="#FFFFFF" stopOpacity={isDark ? 0.22 : 0.38} />
              <Stop offset={liquidR / (liquidR + liquidW / 2)} stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="1" stopColor="#000000" stopOpacity={isDark ? 0.3 : 0.16} />
            </RadialGradient>
            <LinearGradient id={`${gid}h`} gradientUnits="userSpaceOnUse" x1={polar(196, tubeR - tubeW * 0.22).split(' ')[0]} y1={polar(196, tubeR - tubeW * 0.22).split(' ')[1]} x2={polar(266, tubeR - tubeW * 0.22).split(' ')[0]} y2={polar(266, tubeR - tubeW * 0.22).split(' ')[1]}>
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={body.hi} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id={`${gid}g`} gradientUnits="userSpaceOnUse" x1={polar(18, tubeInner + tubeW * 0.16).split(' ')[0]} y1={polar(18, tubeInner + tubeW * 0.16).split(' ')[1]} x2={polar(62, tubeInner + tubeW * 0.16).split(' ')[0]} y2={polar(62, tubeInner + tubeW * 0.16).split(' ')[1]}>
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={body.glint} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {pad > 0 ? <Circle cx={center} cy={center + size * 0.035} r={tubeR} fill="none" stroke={activeColors.ink} strokeWidth={tubeW} opacity={0.05} /> : null}
          {pad > 0 ? <Circle cx={center} cy={center + size * 0.02} r={tubeR} fill="none" stroke={activeColors.ink} strokeWidth={tubeW * 0.8} opacity={0.05} /> : null}
          <Circle cx={center} cy={center} r={tubeR} fill="none" stroke={tier === 'mini' ? activeColors.track : `url(#${gid}b)`} strokeWidth={tubeW} />
          {runs.map((arc) => arc.len > 0 ? (
            <Circle
              key={arc.segment.categoryId} cx={center} cy={center} r={liquidR} fill="none"
              stroke={markColor(arc.segment)} strokeWidth={liquidW} strokeLinecap="butt"
              strokeDasharray={dashOf(arc.len)} strokeDashoffset={-arc.from * liquidC} transform={rot}
            />
          ) : null)}
          {!closed && first && last && filled > 0.0005 && first.len > 0 ? <Circle cx={center + liquidR * Math.cos(-Math.PI / 2 + first.from * Math.PI * 2)} cy={center + liquidR * Math.sin(-Math.PI / 2 + first.from * Math.PI * 2)} r={liquidW / 2} fill={markColor(first.segment)} /> : null}
          {!closed && first && last && filled > 0.0005 && last.lateLen <= 0 ? <Circle cx={center + liquidR * Math.cos(-Math.PI / 2 + filled * Math.PI * 2)} cy={center + liquidR * Math.sin(-Math.PI / 2 + filled * Math.PI * 2)} r={liquidW / 2} fill={markColor(last.segment)} /> : null}
          <G opacity={lateOpacity}>
            {runs.map((arc) => arc.lateLen > 0 ? (
              <Circle
                key={arc.segment.categoryId} cx={center} cy={center} r={liquidR} fill="none"
                stroke={markColor(arc.segment)} strokeWidth={liquidW} strokeLinecap="butt"
                strokeDasharray={dashOf(arc.lateLen)} strokeDashoffset={-(arc.from + arc.len) * liquidC} transform={rot}
              />
            ) : null)}
            {!closed && first && last && filled > 0.0005 && first.len <= 0 ? <Circle cx={center + liquidR * Math.cos(-Math.PI / 2 + first.from * Math.PI * 2)} cy={center + liquidR * Math.sin(-Math.PI / 2 + first.from * Math.PI * 2)} r={liquidW / 2} fill={markColor(first.segment)} /> : null}
            {!closed && first && last && filled > 0.0005 && last.lateLen > 0 ? <Circle cx={center + liquidR * Math.cos(-Math.PI / 2 + filled * Math.PI * 2)} cy={center + liquidR * Math.sin(-Math.PI / 2 + filled * Math.PI * 2)} r={liquidW / 2} fill={markColor(last.segment)} /> : null}
          </G>
          {tier !== 'mini' && filled > 0.0005 ? (
            <>
              <Circle cx={center} cy={center} r={liquidR} fill="none" stroke={`url(#${gid}l)`} strokeWidth={liquidW} strokeLinecap={closed ? 'butt' : 'round'} strokeDasharray={dashOf(filled)} strokeDashoffset={-first.from * liquidC} transform={rot} />
              <Circle cx={center} cy={center} r={liquidR - liquidW * 0.3} fill="none" stroke="#FFFFFF" strokeWidth={Math.max(0.6, liquidW * 0.09)} strokeLinecap="round" opacity={isDark ? 0.28 : 0.5} strokeDasharray={`${Math.max(0, liquidC * filled * 0.96 * (liquidR - liquidW * 0.3) / liquidR)} ${liquidC}`} strokeDashoffset={-(first.from * liquidC + liquidC * filled * 0.02) * (liquidR - liquidW * 0.3) / liquidR} transform={rot} />
            </>
          ) : null}
          {tier !== 'mini' ? (
            <>
              <Circle cx={center} cy={center} r={tubeOuter - 0.4} fill="none" stroke={body.rim} strokeWidth={0.8} opacity={body.rimOpacity} />
              <Circle cx={center} cy={center} r={tubeInner + 0.4} fill="none" stroke={body.rim} strokeWidth={0.8} opacity={body.rimOpacity * 0.8} />
            </>
          ) : <Circle cx={center} cy={center} r={tubeOuter - 0.3} fill="none" stroke={body.rim} strokeWidth={0.6} opacity={body.rimOpacity * 0.7} />}
          <Path d={arcPath(196, 266, tier === 'mini' ? tubeR - tubeW * 0.15 : tubeR - tubeW * 0.22)} fill="none" stroke={tier === 'mini' ? '#FFFFFF' : `url(#${gid}h)`} strokeWidth={tier === 'mini' ? 1 : hiW} strokeLinecap="round" opacity={tier === 'mini' ? (isDark ? 0.35 : 0.8) : 1} />
          {tier === 'full' ? <Path d={arcPath(18, 62, tubeInner + tubeW * 0.16)} fill="none" stroke={`url(#${gid}g)`} strokeWidth={Math.max(1, tubeW * 0.09)} strokeLinecap="round" /> : null}
        </Svg>
        {ripple}
      </Animated.View>
    );
  }

  // wash: pigment bleeds inward from each category's own painted arc in stacked, fading bands.
  // Bands follow the ring's arc fractions, so neighbouring categories touch but never overlap or mix.
  const washLayers = size < 30 ? 2 : 4;
  const shownCompletion = ringArcs.reduce((total, arc) => total + arc.fillDash, 0) / circumference;
  const washDepth = innerRadius * (0.32 + 0.4 * shownCompletion);
  const washOpacity = (size < 30 ? 0.12 : 0.15) * (complete ? 1.15 : 1) * arcs.wash;
  const washBands = shownCompletion > 0.0005 ? Array.from({ length: washLayers }, (_, layer) => {
    const bandWidth = washDepth / washLayers;
    const bandRadius = innerRadius - bandWidth * (layer + 0.5);
    const bandCircumference = 2 * Math.PI * bandRadius;
    return ringArcs.flatMap(({ segment, fillDash, start }) => fillDash > 0 ? [{
      key: `${layer}-${segment.categoryId}`, colors: segment.colors, colorKey: segment.colorKey, radius: bandRadius, width: bandWidth + 0.4,
      dash: (fillDash / circumference) * bandCircumference, offset: (start / circumference) * bandCircumference, circumference: bandCircumference,
      opacity: washOpacity * (1 - layer / washLayers),
    }] : []);
  }).flat() : [];

  return (
    <Animated.View accessibilityLabel={label} style={[{ width: size, height: size }, breathingAnimatedStyle]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {washBands.map((band) => (
          <Circle
            key={band.key} cx={center} cy={center} r={band.radius} fill="none"
            stroke={markColor(band)} strokeOpacity={band.opacity} strokeWidth={band.width} strokeLinecap="butt"
            strokeDasharray={`${band.dash} ${band.circumference - band.dash}`}
            strokeDashoffset={-band.offset} transform={`rotate(-90 ${center} ${center})`}
          />
        ))}
        <Circle cx={center} cy={center} r={radiusValue} fill="none" stroke={activeColors.track} strokeWidth={strokeWidth} />
        {ringArcs.map(({ segment, fillDash, start }) => fillDash > 0 ? (
          <Circle
            key={segment.categoryId} cx={center} cy={center} r={radiusValue} fill="none"
            stroke={markColor(segment)} strokeWidth={strokeWidth} strokeLinecap="butt"
            strokeDasharray={`${fillDash} ${circumference - fillDash}`}
            strokeDashoffset={-start} transform={`rotate(-90 ${center} ${center})`}
          />
        ) : null)}
        {ringArcs.map(({ segment, fillDash, lateDash, start }) => lateDash > 0 ? (
          <Circle
            key={`${segment.categoryId}-late`} cx={center} cy={center} r={radiusValue} fill="none"
            stroke={markColor(segment)} strokeOpacity={lateOpacity} strokeWidth={strokeWidth} strokeLinecap="butt"
            strokeDasharray={`${lateDash} ${circumference - lateDash}`}
            strokeDashoffset={-(start + fillDash)} transform={`rotate(-90 ${center} ${center})`}
          />
        ) : null)}
      </Svg>
      {ripple}
    </Animated.View>
  );
}
