import { AccessibilityInfo, Animated, Platform } from 'react-native';
import { useEffect, useId, useRef, useState } from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path } from 'react-native-svg';
import type { DayOrbitSegment } from '@/domain/selectors';
import type { CategoryId, DayMarkVariant } from '@/domain/types';
import { categoryPalette, colors, darkColors, lightColors } from '@/theme/tokens';
import { useDaymarkStore } from '@/store/useDaymarkStore';

interface DayOrbitProps {
  segments: DayOrbitSegment[];
  size?: number;
  strokeWidth?: number;
  animate?: boolean;
  variant?: DayMarkVariant;
  scheme?: 'light' | 'dark';
}


export function DayOrbit({ segments, size = 42, strokeWidth = 6, animate = false, variant, scheme }: DayOrbitProps) {
  const storeVariant = useDaymarkStore((s) => s.dayMarkVariant);
  const activeVariant = variant ?? storeVariant;
  const [reduceMotion, setReduceMotion] = useState(false);
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
  const markColor = (categoryId: CategoryId) => (isDark ? categoryPalette[categoryId].markDark : categoryPalette[categoryId].markLight);
  let completedOffset = 0;

  useEffect(() => {
    if (!animate) return undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, [animate]);

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
              fill={categoryPalette[segments[0].categoryId].soft}
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
              const color = categoryPalette[segment.categoryId].solid;
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
            const palette = categoryPalette[segment.categoryId];
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
  const ringArcs = segments.map((segment) => {
    const fillDash = circumference * segment.share * segment.completion;
    const start = completedOffset;
    completedOffset += fillDash;
    return { segment, fillDash, start };
  });

  const center = size / 2;
  const label = `${Math.round(completion * 100)} percent complete daily mark`;

  if (activeVariant === 'ribbon') {
    return (
      <Animated.View accessibilityLabel={label} style={[{ width: size, height: size }, breathingAnimatedStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={center} cy={center} r={radiusValue} fill="none" stroke={activeColors.track} strokeWidth={strokeWidth} />
          {ringArcs.map(({ segment, fillDash, start }) => fillDash > 0 ? (
            <Circle
              key={segment.categoryId} cx={center} cy={center} r={radiusValue} fill="none"
              stroke={markColor(segment.categoryId)} strokeWidth={strokeWidth} strokeLinecap="butt"
              strokeDasharray={`${fillDash} ${circumference - fillDash}`}
              strokeDashoffset={-start} transform={`rotate(-90 ${center} ${center})`}
            />
          ) : null)}
          {complete ? <Circle cx={center} cy={center} r={innerRadius} fill="none" stroke={activeColors.ink} strokeWidth={1} opacity={0.08} /> : null}
        </Svg>
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
              stroke={markColor(segment.categoryId)} strokeOpacity={0.8} strokeWidth={glassStroke} strokeLinecap="butt"
              strokeDasharray={`${fillDash} ${circumference - fillDash}`}
              strokeDashoffset={-start} transform={`rotate(-90 ${center} ${center})`}
            />
          ) : null)}
          <Circle cx={center} cy={center} r={innerRadius} fill={isDark ? activeColors.white : activeColors.ink} opacity={isDark ? 0.03 : 0.02} />
          <Circle cx={center} cy={center} r={innerRadius} fill="none" stroke={activeColors.ink} strokeWidth={0.75} opacity={0.08} />
          {complete && dominant ? <Circle cx={center} cy={center} r={innerRadius} fill={markColor(dominant.categoryId)} opacity={0.12} /> : null}
          {showHighlight ? (
            <Path
              d={`M ${center - radiusValue * 0.62} ${center - radiusValue * 0.74} A ${radiusValue} ${radiusValue} 0 0 1 ${center + radiusValue * 0.1} ${center - radiusValue * 0.99}`}
              fill="none" stroke={activeColors.white} strokeWidth={Math.max(1, glassStroke * 0.18)} strokeLinecap="round" opacity={isDark ? 0.18 : 0.5}
            />
          ) : null}
        </Svg>
      </Animated.View>
    );
  }

  // wash: pigment bleeds inward from each category's own painted arc in stacked, fading bands.
  // Bands follow the ring's arc fractions, so neighbouring categories touch but never overlap or mix.
  const washLayers = size < 30 ? 2 : 4;
  const washDepth = innerRadius * (0.32 + 0.4 * completion);
  const washOpacity = (size < 30 ? 0.12 : 0.15) * (complete ? 1.15 : 1);
  const washBands = completion > 0 ? Array.from({ length: washLayers }, (_, layer) => {
    const bandWidth = washDepth / washLayers;
    const bandRadius = innerRadius - bandWidth * (layer + 0.5);
    const bandCircumference = 2 * Math.PI * bandRadius;
    return ringArcs.flatMap(({ segment, fillDash, start }) => fillDash > 0 ? [{
      key: `${layer}-${segment.categoryId}`, categoryId: segment.categoryId, radius: bandRadius, width: bandWidth + 0.4,
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
            stroke={markColor(band.categoryId)} strokeOpacity={band.opacity} strokeWidth={band.width} strokeLinecap="butt"
            strokeDasharray={`${band.dash} ${band.circumference - band.dash}`}
            strokeDashoffset={-band.offset} transform={`rotate(-90 ${center} ${center})`}
          />
        ))}
        <Circle cx={center} cy={center} r={radiusValue} fill="none" stroke={activeColors.track} strokeWidth={strokeWidth} />
        {ringArcs.map(({ segment, fillDash, start }) => fillDash > 0 ? (
          <Circle
            key={segment.categoryId} cx={center} cy={center} r={radiusValue} fill="none"
            stroke={markColor(segment.categoryId)} strokeWidth={strokeWidth} strokeLinecap="butt"
            strokeDasharray={`${fillDash} ${circumference - fillDash}`}
            strokeDashoffset={-start} transform={`rotate(-90 ${center} ${center})`}
          />
        ) : null)}
      </Svg>
    </Animated.View>
  );
}
