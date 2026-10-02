import { Animated, Platform, View } from 'react-native';
import { useEffect, useId, useRef, useState } from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path } from 'react-native-svg';
import type { DayOrbitSegment } from '@/domain/selectors';
import type { DayMarkVariant } from '@/domain/types';
import { categoryPalette, colors, darkColors, lightColors, motion, type CategoryColorKey } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/useReducedMotion';
import { useDaymarkStore } from '@/store/useDaymarkStore';

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

// Tweens each category's arc length (and the wash fade) when the segments change on the animated mark. Arcs stay contiguous because
// offsets are derived from the tweened lengths. Driven by one Animated.Value + a listener (cheap: one state update per frame, large mark only).
function useTweenedArcs(keys: string[], targets: number[], enabled: boolean) {
  const shown = useRef<Record<string, number>>({});
  const washShown = useRef(0);
  const [, setFrame] = useState(0);
  const progress = useRef(new Animated.Value(1)).current;
  const wash = useRef(new Animated.Value(0)).current;
  const first = useRef(true);
  const sig = `${keys.join('|')}:${targets.map((t) => t.toFixed(2)).join(',')}`;
  useEffect(() => {
    const to: Record<string, number> = {};
    keys.forEach((key, index) => { to[key] = targets[index]; });
    const washTarget = targets.some((t) => t > 0.01) ? 1 : 0;
    if (!enabled) { shown.current = to; washShown.current = washTarget; first.current = false; return undefined; }
    const from = { ...shown.current };
    const isFirst = first.current;
    first.current = false;
    const arcId = progress.addListener(({ value }) => {
      const next: Record<string, number> = {};
      keys.forEach((key) => { const start = from[key] ?? 0; next[key] = start + (to[key] - start) * value; });
      shown.current = next;
      setFrame((frame) => frame + 1);
    });
    const washId = wash.addListener(({ value }) => { washShown.current = value; setFrame((frame) => frame + 1); });
    progress.setValue(0);
    const duration = isFirst ? motion.ringIn : motion.ring;
    const growing = washTarget > washShown.current;
    const animation = Animated.parallel([
      Animated.timing(progress, { toValue: 1, duration, easing: motion.easeOut, useNativeDriver: false }),
      Animated.timing(wash, { toValue: washTarget, delay: growing ? (isFirst ? duration - 200 : motion.washDelay) : 0, duration: growing ? motion.wash : motion.base, easing: motion.easeOut, useNativeDriver: false }),
    ]);
    animation.start();
    return () => { animation.stop(); progress.removeListener(arcId); wash.removeListener(washId); };
  }, [sig, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!enabled) return { lengths: targets, wash: 1 };
  return { lengths: keys.map((key) => shown.current[key] ?? 0), wash: washShown.current };
}

// One soft ring that expands ~12% outward from the mark and fades. Rendered in its own larger layer so it is never clipped.
function Ripple({ size, radiusValue, color, fireKey, outline }: { size: number; radiusValue: number; color: string; fireKey: number; outline?: string }) {
  const [value, setValue] = useState(-1);
  useEffect(() => {
    if (fireKey === 0) return undefined;
    const driver = new Animated.Value(0);
    const id = driver.addListener(({ value: next }) => setValue(next));
    const animation = Animated.timing(driver, { toValue: 1, duration: motion.settle, easing: motion.easeOut, useNativeDriver: false });
    animation.start(({ finished }) => { if (finished) setValue(-1); });
    return () => { animation.stop(); driver.removeListener(id); };
  }, [fireKey]);
  if (value < 0 || value >= 1) return null;
  const pad = size * 0.25;
  const outer = size + pad * 2;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: -pad, top: -pad, width: outer, height: outer }}>
      <Svg width={outer} height={outer} viewBox={`0 0 ${outer} ${outer}`}>
        {outline ? (
          <G transform={`translate(${outer / 2} ${outer / 2}) scale(${1 + motion.rippleGrow * value}) translate(${-outer / 2} ${-outer / 2}) translate(${pad} ${pad})`}>
            <Path d={outline} fill="none" stroke={color} strokeWidth={1.25} opacity={motion.rippleOpacity * (1 - value)} />
          </G>
        ) : <Circle cx={outer / 2} cy={outer / 2} r={radiusValue * (1 + motion.rippleGrow * value)} fill="none" stroke={color} strokeWidth={1.25} opacity={motion.rippleOpacity * (1 - value)} />}
      </Svg>
    </View>
  );
}

export function DayOrbit({ segments, size = 42, strokeWidth = 6, animate = false, variant, scheme }: DayOrbitProps) {
  const storeVariant = useDaymarkStore((s) => s.dayMarkVariant);
  const activeVariant = variant ?? storeVariant;
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
  const markColor = (colorKey: CategoryColorKey) => (isDark ? categoryPalette[colorKey].markDark : categoryPalette[colorKey].markLight);
  let completedOffset = 0;

  const tweenEnabled = animate && !reduceMotion && activeVariant !== 'current';
  const arcs = useTweenedArcs(segments.map((segment) => segment.categoryId), segments.map((segment) => circumference * segment.share * segment.completion), tweenEnabled);
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
              fill={categoryPalette[segments[0].colorKey].soft}
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
              const color = categoryPalette[segment.colorKey].solid;
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
            const palette = categoryPalette[segment.colorKey];
            return fillDash > 0 ? (
              <Circle
                key={segment.categoryId}
                cx={size / 2} cy={size / 2} r={radiusValue} fill="none"
                stroke={palette.solid} strokeWidth={strokeWidth} strokeLinecap="butt"
                strokeDasharray={`${fillDash} ${circumference - fillDash}`}
                strokeDashoffset={-start} transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            ) : null;
          })}
        </Svg>
      </Animated.View>
    );
  }

  // Shared ribbon-band ring: contiguous mark-colored arcs on a neutral track, in category order.
  const ringArcs = segments.map((segment, index) => {
    const fillDash = arcs.lengths[index];
    const start = completedOffset;
    completedOffset += fillDash;
    return { segment, fillDash, start };
  });

  const center = size / 2;
  const dominantSegment = segments.length > 0 ? segments.reduce((a, b) => (b.share > a.share ? b : a)) : undefined;
  const ripple = animate && dominantSegment ? <Ripple size={size} radiusValue={radiusValue} color={markColor(dominantSegment.colorKey)} fireKey={rippleKey} /> : null;
  const label = `${Math.round(completion * 100)} percent complete daily mark`;

  if (activeVariant === 'doodle') {
    const doodleStroke = strokeWidth * 1.2;
    const loop = buildDoodle(center, (size - doodleStroke) / 2, size < 30 ? 48 : size < 80 ? 90 : 160);
    const runs = ringArcs.filter((arc) => arc.fillDash > 0).map((arc) => ({ ...arc, from: arc.start / circumference, to: (arc.start + arc.fillDash) / circumference }));
    const filled = runs.length > 0 ? runs[runs.length - 1].to : 0;
    const closed = filled >= 0.9995;
    const first = runs[0];
    const last = runs[runs.length - 1];
    const capR = doodleStroke / 2;
    const glow = Platform.OS === 'web' && size >= 80 && runs.length > 0;
    const layer = (withCaps: boolean) => (
      <>
        {runs.map((arc) => (
          <Path key={arc.segment.categoryId} d={closed && runs.length === 1 ? doodleClosedPath(loop) : doodleArcPath(loop, arc.from, Math.min(arc.to, 1))} fill="none" stroke={markColor(arc.segment.colorKey)} strokeWidth={doodleStroke} strokeLinecap="butt" strokeLinejoin="round" />
        ))}
        {withCaps && !closed && first && last && filled > 0.001 ? (
          <>
            <Circle cx={doodlePointAt(loop, first.from)[0]} cy={doodlePointAt(loop, first.from)[1]} r={capR} fill={markColor(first.segment.colorKey)} />
            <Circle cx={doodlePointAt(loop, filled)[0]} cy={doodlePointAt(loop, filled)[1]} r={capR} fill={markColor(last.segment.colorKey)} />
          </>
        ) : null}
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
        {animate && dominantSegment ? <Ripple size={size} radiusValue={radiusValue} color={markColor(dominantSegment.colorKey)} fireKey={rippleKey} outline={doodleClosedPath(loop)} /> : null}
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
              stroke={markColor(segment.colorKey)} strokeWidth={strokeWidth} strokeLinecap="butt"
              strokeDasharray={`${fillDash} ${circumference - fillDash}`}
              strokeDashoffset={-start} transform={`rotate(-90 ${center} ${center})`}
            />
          ) : null)}
          {complete ? <Circle cx={center} cy={center} r={innerRadius} fill="none" stroke={activeColors.ink} strokeWidth={1} opacity={0.08} /> : null}
        </Svg>
        {ripple}
      </Animated.View>
    );
  }

  if (activeVariant === 'glass') {
    const glassStroke = strokeWidth * 1.08;
    const dominant = segments.length > 0 ? segments.reduce((a, b) => (b.share > a.share ? b : a)) : undefined;
    const showHighlight = size >= 40;
    return (
      <Animated.View accessibilityLabel={label} style={[{ width: size, height: size }, breathingAnimatedStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={center} cy={center} r={radiusValue} fill="none" stroke={activeColors.track} strokeWidth={glassStroke} />
          {ringArcs.map(({ segment, fillDash, start }) => fillDash > 0 ? (
            <Circle
              key={segment.categoryId} cx={center} cy={center} r={radiusValue} fill="none"
              stroke={markColor(segment.colorKey)} strokeOpacity={0.8} strokeWidth={glassStroke} strokeLinecap="butt"
              strokeDasharray={`${fillDash} ${circumference - fillDash}`}
              strokeDashoffset={-start} transform={`rotate(-90 ${center} ${center})`}
            />
          ) : null)}
          <Circle cx={center} cy={center} r={innerRadius} fill={isDark ? activeColors.white : activeColors.ink} opacity={isDark ? 0.03 : 0.02} />
          <Circle cx={center} cy={center} r={innerRadius} fill="none" stroke={activeColors.ink} strokeWidth={0.75} opacity={0.08} />
          {complete && dominant ? <Circle cx={center} cy={center} r={innerRadius} fill={markColor(dominant.colorKey)} opacity={0.12} /> : null}
          {showHighlight ? (
            <Path
              d={`M ${center - radiusValue * 0.62} ${center - radiusValue * 0.74} A ${radiusValue} ${radiusValue} 0 0 1 ${center + radiusValue * 0.1} ${center - radiusValue * 0.99}`}
              fill="none" stroke={activeColors.white} strokeWidth={Math.max(1, glassStroke * 0.18)} strokeLinecap="round" opacity={isDark ? 0.18 : 0.5}
            />
          ) : null}
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
      key: `${layer}-${segment.categoryId}`, colorKey: segment.colorKey, radius: bandRadius, width: bandWidth + 0.4,
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
            stroke={markColor(band.colorKey)} strokeOpacity={band.opacity} strokeWidth={band.width} strokeLinecap="butt"
            strokeDasharray={`${band.dash} ${band.circumference - band.dash}`}
            strokeDashoffset={-band.offset} transform={`rotate(-90 ${center} ${center})`}
          />
        ))}
        <Circle cx={center} cy={center} r={radiusValue} fill="none" stroke={activeColors.track} strokeWidth={strokeWidth} />
        {ringArcs.map(({ segment, fillDash, start }) => fillDash > 0 ? (
          <Circle
            key={segment.categoryId} cx={center} cy={center} r={radiusValue} fill="none"
            stroke={markColor(segment.colorKey)} strokeWidth={strokeWidth} strokeLinecap="butt"
            strokeDasharray={`${fillDash} ${circumference - fillDash}`}
            strokeDashoffset={-start} transform={`rotate(-90 ${center} ${center})`}
          />
        ) : null)}
      </Svg>
      {ripple}
    </Animated.View>
  );
}
